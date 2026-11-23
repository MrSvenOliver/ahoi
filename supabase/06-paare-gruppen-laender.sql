-- Ahoi · Beta · Paare, Reisegruppen und Meine Länder in der Datenbank
-- Einmal im Supabase-SQL-Editor ausführen (nach 01–05).
-- Paar: einer fragt an, der andere bestätigt; jeder hat höchstens einen Partner.
-- Reisegruppe: „Reist ihr zusammen?“ wird gegenseitig bestätigt; jeder ist in höchstens einer Gruppe.
--   Wer weiterzieht (über 50 km von allen anderen weg), fällt heraus; bleibt nur einer, endet die Gruppe.
-- Meine Länder: Liste der besuchten Staaten (ISO-Codes) im eigenen Profil, damit Freunde sie im Steckbrief sehen.

-- ---------- Meine Länder ----------
create or replace function public.laender_ok(a text[]) returns boolean
language sql immutable as $$
  select coalesce(array_length(a, 1), 0) <= 260 and coalesce(bool_and(x ~ '^[A-Z]{2}$'), true) from unnest(a) x;
$$;
alter table public.profile add column if not exists laender text[] not null default '{}';
alter table public.profile drop constraint if exists profile_laender_check;
alter table public.profile add constraint profile_laender_check check (public.laender_ok(laender));
grant select (laender) on public.profile to authenticated;

-- ---------- Paare ----------
create table if not exists public.paar (
  von uuid not null references public.profile (id) on delete cascade,
  an uuid not null references public.profile (id) on delete cascade,
  bestaetigt boolean not null default false,
  erstellt_am timestamptz not null default now(),
  primary key (von, an),
  check (von <> an)
);
alter table public.paar enable row level security;
drop policy if exists "paar lesen" on public.paar;
create policy "paar lesen" on public.paar for select
  using (von = auth.uid() or an = auth.uid() or (bestaetigt and public.ist_mitglied()));
grant select on public.paar to authenticated;

-- Anfragen: gibt 'angefragt', 'bestaetigt' (die andere Person hatte schon gefragt) oder 'vergeben' zurück
create or replace function public.paar_anfragen(ziel uuid) returns text
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid();
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  if ziel = ich or not exists (select 1 from profile where id = ziel and freigegeben and art = 'nomade') then raise exception 'Unbekannte Person'; end if;
  if exists (select 1 from paar where bestaetigt and (von in (ich, ziel) or an in (ich, ziel))) then return 'vergeben'; end if;
  if exists (select 1 from paar where von = ziel and an = ich) then
    update paar set bestaetigt = true where von = ziel and an = ich;
    delete from paar where not bestaetigt and (von in (ich, ziel) or an in (ich, ziel));
    return 'bestaetigt';
  end if;
  delete from paar where von = ich and not bestaetigt;
  insert into paar (von, an) values (ich, ziel) on conflict do nothing;
  return 'angefragt';
end $$;

create or replace function public.paar_antworten(ziel uuid, ja boolean) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from paar where von = ziel and an = auth.uid() and not bestaetigt) then return 'weg'; end if;
  if ja then return public.paar_anfragen(ziel); end if;
  delete from paar where von = ziel and an = auth.uid() and not bestaetigt;
  return 'abgelehnt';
end $$;

create or replace function public.paar_loesen() returns void
language sql security definer set search_path = public as $$
  delete from paar where von = auth.uid() or an = auth.uid();
$$;

-- ---------- Reisegruppen ----------
create table if not exists public.reisegruppe (
  id uuid primary key default gen_random_uuid(),
  erstellt_am timestamptz not null default now()
);
create table if not exists public.reisegruppe_mitglied (
  person uuid primary key references public.profile (id) on delete cascade,
  gruppe uuid not null references public.reisegruppe (id) on delete cascade,
  seit timestamptz not null default now()
);
create table if not exists public.mitreise_anfrage (
  von uuid not null references public.profile (id) on delete cascade,
  an uuid not null references public.profile (id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  primary key (von, an),
  check (von <> an)
);
alter table public.reisegruppe enable row level security;
alter table public.reisegruppe_mitglied enable row level security;
alter table public.mitreise_anfrage enable row level security;
drop policy if exists "gruppe lesen" on public.reisegruppe;
create policy "gruppe lesen" on public.reisegruppe for select using (public.ist_mitglied());
drop policy if exists "gruppe mitglieder lesen" on public.reisegruppe_mitglied;
create policy "gruppe mitglieder lesen" on public.reisegruppe_mitglied for select using (public.ist_mitglied() or person = auth.uid());
drop policy if exists "mitreise anfrage lesen" on public.mitreise_anfrage;
create policy "mitreise anfrage lesen" on public.mitreise_anfrage for select using (von = auth.uid() or an = auth.uid());
grant select on public.reisegruppe, public.reisegruppe_mitglied, public.mitreise_anfrage to authenticated;

-- Abstand in km (Großkreis), für „über 50 km weg“
create or replace function public.abstand_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision) returns double precision
language sql immutable as $$
  select 2 * 6371 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)));
$$;

-- Zwei Personen in dieselbe Gruppe bringen (neue Gruppe, dazustoßen oder zwei Gruppen zusammenlegen); nur intern
create or replace function public.gruppen_verbinden(a uuid, b uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ga uuid; gb uuid;
begin
  select gruppe into ga from reisegruppe_mitglied where person = a;
  select gruppe into gb from reisegruppe_mitglied where person = b;
  if ga is null and gb is null then
    insert into reisegruppe default values returning id into ga;
    insert into reisegruppe_mitglied (person, gruppe) values (a, ga), (b, ga);
  elsif ga is null then
    insert into reisegruppe_mitglied (person, gruppe) values (a, gb);
  elsif gb is null then
    insert into reisegruppe_mitglied (person, gruppe) values (b, ga);
  elsif ga <> gb then
    update reisegruppe_mitglied set gruppe = ga where gruppe = gb;
    delete from reisegruppe where id = gb;
  end if;
end $$;
revoke execute on function public.gruppen_verbinden(uuid, uuid) from public, anon, authenticated;

-- Anfragen: 'angefragt', 'zusammen' (die andere Person hatte schon gefragt) oder 'schon'
create or replace function public.mitreisen_anfragen(ziel uuid) returns text
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid();
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  if ziel = ich or not exists (select 1 from profile where id = ziel and freigegeben and art = 'nomade') then raise exception 'Unbekannte Person'; end if;
  if exists (select 1 from reisegruppe_mitglied x join reisegruppe_mitglied y on x.gruppe = y.gruppe where x.person = ich and y.person = ziel) then return 'schon'; end if;
  if exists (select 1 from mitreise_anfrage where von = ziel and an = ich) then
    delete from mitreise_anfrage where (von = ziel and an = ich) or (von = ich and an = ziel);
    perform public.gruppen_verbinden(ich, ziel);
    return 'zusammen';
  end if;
  insert into mitreise_anfrage (von, an) values (ich, ziel) on conflict do nothing;
  return 'angefragt';
end $$;

create or replace function public.mitreisen_antworten(ziel uuid, ja boolean) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from mitreise_anfrage where von = ziel and an = auth.uid()) then return 'weg'; end if;
  if ja then return public.mitreisen_anfragen(ziel); end if;
  delete from mitreise_anfrage where von = ziel and an = auth.uid();
  return 'nein';
end $$;

create or replace function public.gruppe_verlassen() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from reisegruppe_mitglied where person = auth.uid();
  delete from reisegruppe g where (select count(*) from reisegruppe_mitglied m where m.gruppe = g.id) < 2;
end $$;

-- Nach jedem neuen Standort: bin ich von allen anderen der Gruppe über 50 km weg, falle ich heraus
create or replace function public.gruppe_pruefen() returns void
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); g uuid; me profile;
begin
  select gruppe into g from reisegruppe_mitglied where person = ich;
  if g is null then return; end if;
  select * into me from profile where id = ich;
  if me.lat is null or not exists (
    select 1 from reisegruppe_mitglied m join profile p on p.id = m.person
    where m.gruppe = g and m.person <> ich and p.lat is not null and public.abstand_km(me.lat, me.lon, p.lat, p.lon) < 50
  ) then
    perform public.gruppe_verlassen();
  end if;
end $$;

-- Offene Anfragen an Personen, die nicht mehr in der Nähe sind, verfallen nach 3 Tagen
create or replace function public.alte_anfragen_weg() returns void
language sql security definer set search_path = public as $$
  delete from mitreise_anfrage where erstellt_am < now() - interval '3 days';
$$;

grant execute on function public.paar_anfragen(uuid), public.paar_antworten(uuid, boolean), public.paar_loesen(),
  public.mitreisen_anfragen(uuid), public.mitreisen_antworten(uuid, boolean), public.gruppe_verlassen(), public.gruppe_pruefen(),
  public.alte_anfragen_weg() to authenticated;
revoke execute on function public.paar_anfragen(uuid), public.paar_antworten(uuid, boolean), public.paar_loesen(),
  public.mitreisen_anfragen(uuid), public.mitreisen_antworten(uuid, boolean), public.gruppe_verlassen(), public.gruppe_pruefen(),
  public.alte_anfragen_weg() from public, anon;
