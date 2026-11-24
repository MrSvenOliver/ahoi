-- Ahoi · Beta · Freundschaften, Ahoi-Name und persönlicher QR-Code (Entscheidung C + E vom 24.11.2026)
-- Einmal im Supabase-SQL-Editor ausführen (nach 14).
-- Vorerst sehen weiter alle Mitglieder alle; die Freundschaften laufen im Hintergrund mit (für Vorschläge und später).
-- Wer über den QR-Code eines Mitglieds neu dazukommt, wartet wie bisher auf Svens Freigabe.

-- ---------- Ahoi-Name und QR-Code im Profil ----------
alter table public.profile add column if not exists ahoi_name text;
alter table public.profile add column if not exists qr_code text;
alter table public.profile drop constraint if exists ahoi_name_ok;
alter table public.profile add constraint ahoi_name_ok check (ahoi_name ~ '^[a-z0-9][a-z0-9._]{2,19}$');
create unique index if not exists profile_ahoi_name on public.profile (ahoi_name);
create unique index if not exists profile_qr_code on public.profile (qr_code);
grant select (ahoi_name), update (ahoi_name) on public.profile to authenticated;
-- Den eigenen QR-Code sieht nur man selbst (über diese Funktion), sonst könnte jeder sich mit jedem verbinden
create or replace function public.mein_qr_code() returns text
language sql stable security definer set search_path = public as $$ select qr_code from profile where id = auth.uid(); $$;
revoke execute on function public.mein_qr_code() from public, anon;
grant execute on function public.mein_qr_code() to authenticated;

-- Vorschlag für einen freien Ahoi-Namen aus dem Namen (Umlaute und Akzente vereinfacht)
create or replace function public.ahoi_name_frei(wunsch text) returns text
language plpgsql stable security definer set search_path = public as $$
declare basis text; kandidat text; n int := 1;
begin
  basis := translate(lower(coalesce(wunsch, '')), 'äöüßáàâãåéèêëíìîïóòôõúùûýčďěľĺňřšťžćłńśźżñçøæ', 'aousaaaaaeeeeiiiioooouuuycdellnrstzclnszzncoa');
  basis := regexp_replace(basis, '[^a-z0-9]+', '', 'g');
  if char_length(basis) < 3 then basis := 'ahoi' || basis; end if;
  basis := left(basis, 16); kandidat := basis;
  while exists (select 1 from profile where ahoi_name = kandidat) loop n := n + 1; kandidat := basis || n; end loop;
  return kandidat;
end $$;

-- Jedes Konto bekommt Ahoi-Namen und QR-Code (auch neue Konten über einen Trigger)
create or replace function public.profil_kennung() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ahoi_name is null then new.ahoi_name := public.ahoi_name_frei(new.name); end if;
  if new.qr_code is null then new.qr_code := 'q' || replace(gen_random_uuid()::text, '-', ''); end if;
  return new;
end $$;
drop trigger if exists profil_kennung on public.profile;
create trigger profil_kennung before insert or update of name on public.profile for each row execute function public.profil_kennung();
update public.profile set name = name where ahoi_name is null or qr_code is null;

-- ---------- Freundschaften ----------
create table if not exists public.freundschaft (
  a uuid not null references public.profile (id) on delete cascade,
  b uuid not null references public.profile (id) on delete cascade,
  seit timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create table if not exists public.freund_anfrage (
  von uuid not null default auth.uid() references public.profile (id) on delete cascade,
  an uuid not null references public.profile (id) on delete cascade,
  am timestamptz not null default now(),
  primary key (von, an)
);
alter table public.freundschaft enable row level security;
alter table public.freund_anfrage enable row level security;
drop policy if exists "freundschaft eigene" on public.freundschaft;
create policy "freundschaft eigene" on public.freundschaft for select using (a = auth.uid() or b = auth.uid());
drop policy if exists "freundschaft loesen" on public.freundschaft;
create policy "freundschaft loesen" on public.freundschaft for delete using (a = auth.uid() or b = auth.uid());
drop policy if exists "anfrage eigene" on public.freund_anfrage;
create policy "anfrage eigene" on public.freund_anfrage for select using (von = auth.uid() or an = auth.uid());
drop policy if exists "anfrage weg" on public.freund_anfrage;
create policy "anfrage weg" on public.freund_anfrage for delete using (von = auth.uid() or an = auth.uid());
revoke all on public.freundschaft, public.freund_anfrage from anon, authenticated;
grant select, delete on public.freundschaft, public.freund_anfrage to authenticated;

create or replace function public.befreunden(x uuid, y uuid) returns void
language sql security definer set search_path = public as $$
  insert into freundschaft (a, b) select least(x, y), greatest(x, y) where x <> y on conflict do nothing;
  delete from freund_anfrage where (von = x and an = y) or (von = y and an = x);
$$;
revoke execute on function public.befreunden(uuid, uuid) from public, anon, authenticated;

-- Heute: alle freigegebenen Nomaden sind miteinander befreundet
select public.befreunden(p.id, q.id) from public.profile p join public.profile q on p.id < q.id
where p.freigegeben and q.freigegeben and p.art = 'nomade' and q.art = 'nomade';

-- Neu freigegeben: automatisch befreundet mit der Person, die eingeladen hat
create or replace function public.freund_bei_freigabe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.freigegeben and new.art = 'nomade' and new.eingeladen_von is not null
     and (tg_op = 'INSERT' or not old.freigegeben) then
    perform public.befreunden(new.id, new.eingeladen_von);
  end if;
  return new;
end $$;
drop trigger if exists freund_bei_freigabe on public.profile;
create trigger freund_bei_freigabe after insert or update of freigegeben on public.profile for each row execute function public.freund_bei_freigabe();

-- Anfragen: „Kennst du …?“ → Anfrage; fragt die andere Person schon, sind beide sofort befreundet
create or replace function public.freund_anfragen(ziel uuid) returns text
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid();
begin
  if not public.ist_mitglied() or ziel = ich or not exists (select 1 from profile where id = ziel and freigegeben and art = 'nomade') then raise exception 'Geht nicht'; end if;
  if exists (select 1 from freundschaft where a = least(ich, ziel) and b = greatest(ich, ziel)) then return 'schon'; end if;
  if exists (select 1 from freund_anfrage where von = ziel and an = ich) then perform public.befreunden(ich, ziel); return 'befreundet'; end if;
  insert into freund_anfrage (von, an) values (ich, ziel) on conflict do nothing;
  return 'angefragt';
end $$;
create or replace function public.freund_antworten(ziel uuid, ja boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if ja and exists (select 1 from freund_anfrage where von = ziel and an = auth.uid()) then perform public.befreunden(auth.uid(), ziel);
  else delete from freund_anfrage where von = ziel and an = auth.uid(); end if;
end $$;
-- QR-Code gescannt: Code zeigen heißt einverstanden, also sofort befreundet
create or replace function public.freund_per_qr(code text) returns json
language plpgsql security definer set search_path = public as $$
declare p profile;
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  select * into p from profile where qr_code = code and freigegeben and art = 'nomade';
  if not found then return null; end if;
  if p.id <> auth.uid() then perform public.befreunden(auth.uid(), p.id); end if;
  return json_build_object('id', p.id, 'name', p.name, 'selbst', p.id = auth.uid());
end $$;
-- Ahoi-Name suchen
create or replace function public.freund_suchen(name text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('id', id, 'name', profile.name, 'ahoi_name', ahoi_name) from profile
  where public.ist_mitglied() and ahoi_name = lower(trim(leading '@' from trim(freund_suchen.name))) and freigegeben and art = 'nomade';
$$;
-- Vorschläge: Freunde von Freunden, die man noch nicht als Freund hat (mit bis zu zwei gemeinsamen Namen)
create or replace function public.freund_vorschlaege() returns table (id uuid, name text, gemeinsam int, ueber text[])
language sql stable security definer set search_path = public as $$
  with meine as (select case when a = auth.uid() then b else a end as f from freundschaft where a = auth.uid() or b = auth.uid()),
  fof as (select case when fr.a = m.f then fr.b else fr.a end as kandidat, m.f as ueber
          from freundschaft fr join meine m on fr.a = m.f or fr.b = m.f)
  select p.id, p.name, count(*)::int, (array_agg(q.name order by q.name))[1:2]
  from fof join profile p on p.id = fof.kandidat join profile q on q.id = fof.ueber
  where public.ist_mitglied() and fof.kandidat <> auth.uid() and fof.kandidat not in (select f from meine)
    and p.freigegeben and p.art = 'nomade'
    and not exists (select 1 from freund_anfrage where von = auth.uid() and an = p.id)
  group by p.id, p.name order by count(*) desc limit 10;
$$;
revoke execute on function public.freund_anfragen(uuid), public.freund_antworten(uuid, boolean), public.freund_per_qr(text), public.freund_suchen(text), public.freund_vorschlaege() from public, anon;
grant execute on function public.freund_anfragen(uuid), public.freund_antworten(uuid, boolean), public.freund_per_qr(text), public.freund_suchen(text), public.freund_vorschlaege() to authenticated;

-- ---------- QR-Code als Einladung für Leute, die noch nicht dabei sind ----------
-- Der Link …/ahoi/?einladung=<qr_code> funktioniert wie eine Einladung von dieser Person; Sven gibt danach frei.
create or replace function public.einladung_info(c text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select json_build_object('name', p.name, 'art', e.art, 'frei', e.vorab_frei) from einladung e join profile p on p.id = e.von
      where e.code = c and e.fuer is null and e.gueltig_bis > now()),
    (select json_build_object('name', p.name, 'art', 'freund', 'frei', false) from profile p
      where p.qr_code = c and p.freigegeben and p.art = 'nomade'));
$$;
revoke all on function public.einladung_info(text) from public;
grant execute on function public.einladung_info(text) to anon, authenticated;

create or replace function public.neues_konto() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c text := nullif(trim(new.raw_user_meta_data ->> 'einladung'), '');
  n text := left(coalesce(trim(new.raw_user_meta_data ->> 'name'), ''), 40);
  s text := coalesce(new.raw_user_meta_data ->> 'sprache', 'en');
  e einladung%rowtype;
  qr profile%rowtype;
  erstes boolean := not exists (select 1 from profile);
begin
  if s not in ('de', 'en', 'sk') then s := 'en'; end if;
  if erstes then
    insert into profile (id, name, sprache, freigegeben, ist_admin, gratis) values (new.id, n, s, true, true, true);
    return new;
  end if;
  select * into e from einladung where code = c and fuer is null and gueltig_bis > now() for update;
  if not found then
    -- persönlicher QR-Code eines Mitglieds: wie eine Freundes-Einladung, wartet auf Freigabe
    select * into qr from profile where qr_code = c and freigegeben and art = 'nomade';
    if not found then raise exception 'Einladung ungültig oder abgelaufen' using errcode = 'P0001'; end if;
    insert into profile (id, name, sprache, eingeladen_von, freigegeben, gratis) values (new.id, n, s, qr.id, false, false);
    return new;
  end if;
  if e.art = 'familie' then
    insert into profile (id, name, sprache, eingeladen_von, freigegeben, gratis, art)
      values (new.id, coalesce(nullif(n, ''), e.name, ''), s, e.von, true, e.gratis, 'familie');
    insert into familie_sicht (nomade, familie) values (e.von, new.id);
  else
    insert into profile (id, name, sprache, eingeladen_von, freigegeben, gratis)
      values (new.id, coalesce(nullif(n, ''), e.name, ''), s, e.von, e.vorab_frei, e.gratis);
  end if;
  update einladung set fuer = new.id where code = e.code;
  return new;
end $$;
