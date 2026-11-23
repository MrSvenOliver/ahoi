-- Ahoi · Beta · Grundlagen
-- Einmal im Supabase-SQL-Editor ausführen.
-- Inhalt: Profile mit Standort, Einladungslinks mit Freigabe durch den Admin, Speicher für Profilbilder,
-- Sicherheitsregeln (nur freigegebene Mitglieder sehen etwas).
-- Keine E-Mail-Adressen oder Namen in dieser Datei: das Repository ist öffentlich.

-- ---------- Profile ----------
create table if not exists public.profile (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  foto text,                                   -- Pfad im Speicher „profilbilder“
  sprache text not null default 'en' check (sprache in ('de', 'en', 'sk')),
  status text check (char_length(status) <= 60),  -- Schlüssel einer Vorlage (z. B. 'treffen') oder eigener Text
  ort text,                                    -- Stadtname
  land text check (land ~ '^[A-Z]{2}$'),       -- ISO-Ländercode
  lat double precision check (lat between -90 and 90),   -- nur stadtgenau gespeichert (die App rundet vorher)
  lon double precision check (lon between -180 and 180),
  zeitzone text,
  geist boolean not null default false,        -- Geistermodus: Standort für niemanden sichtbar
  freigegeben boolean not null default false,  -- erst nach Freigabe sichtbar und mit Zugriff
  ist_admin boolean not null default false,
  eingeladen_von uuid references public.profile (id) on delete set null,
  standort_am timestamptz,
  erstellt_am timestamptz not null default now()
);

-- Hilfsfunktionen (security definer, damit die Regeln sich nicht im Kreis aufrufen)
create or replace function public.ist_mitglied() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile where id = auth.uid() and freigegeben);
$$;
create or replace function public.ist_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile where id = auth.uid() and ist_admin);
$$;

alter table public.profile enable row level security;

-- Lesen: das eigene Profil immer; die anderen nur als freigegebenes Mitglied
drop policy if exists "profil lesen" on public.profile;
create policy "profil lesen" on public.profile for select
  using (id = auth.uid() or (public.ist_mitglied() and freigegeben));

-- Ändern: nur das eigene Profil
drop policy if exists "profil aendern" on public.profile;
create policy "profil aendern" on public.profile for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Freigabe und Admin-Recht darf man sich nicht selbst geben
create or replace function public.profil_schutz() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() ist leer im SQL-Editor (Verwaltung), dort gilt die Sperre nicht
  if auth.uid() is not null and not public.ist_admin() then
    new.freigegeben := old.freigegeben;
    new.ist_admin := old.ist_admin;
    new.eingeladen_von := old.eingeladen_von;
  end if;
  return new;
end $$;
drop trigger if exists profil_schutz on public.profile;
create trigger profil_schutz before update on public.profile
  for each row execute function public.profil_schutz();

-- Geistermodus: Standort wird für andere ausgeblendet (Sicht statt Tabelle lesen)
create or replace view public.wer_ist_wo with (security_invoker = true) as
  select id, name, foto, sprache, status,
         case when geist and id <> auth.uid() then null else ort end as ort,
         case when geist and id <> auth.uid() then null else land end as land,
         case when geist and id <> auth.uid() then null else lat end as lat,
         case when geist and id <> auth.uid() then null else lon end as lon,
         zeitzone, geist, standort_am
  from public.profile
  where freigegeben or id = auth.uid();

-- ---------- Einladungen ----------
-- Anmeldung mit E-Mail und Passwort, ohne Bestätigungsmail (die App verschickt keine E-Mails).
-- Ein Mitglied tippt „Freund einladen“ und schickt den Link (…/?einladung=CODE) per Messenger.
-- Die neue Person registriert sich mit diesem Code und wartet, bis der Admin sie freigibt.
-- Ohne gültigen Code ist keine Registrierung möglich (außer dem allerersten Konto, das wird Admin).
create table if not exists public.einladung (
  code text primary key default left(replace(gen_random_uuid()::text, '-', ''), 16),
  von uuid not null references public.profile (id) on delete cascade,
  fuer uuid references public.profile (id) on delete set null,   -- wer den Link eingelöst hat
  gueltig_bis timestamptz not null default now() + interval '14 days',
  erstellt_am timestamptz not null default now()
);
alter table public.einladung enable row level security;

drop policy if exists "einladung erstellen" on public.einladung;
create policy "einladung erstellen" on public.einladung for insert
  with check (public.ist_mitglied() and von = auth.uid() and fuer is null);

drop policy if exists "einladung lesen" on public.einladung;
create policy "einladung lesen" on public.einladung for select
  using (von = auth.uid() or public.ist_admin());

-- Neues Konto: nur mit gültigem, unbenutztem Code; Profil wartet auf Freigabe
create or replace function public.neues_konto() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c text := nullif(trim(new.raw_user_meta_data ->> 'einladung'), '');
  n text := left(coalesce(trim(new.raw_user_meta_data ->> 'name'), ''), 40);
  s text := coalesce(new.raw_user_meta_data ->> 'sprache', 'en');
  e einladung%rowtype;
  erstes boolean := not exists (select 1 from profile);
begin
  if s not in ('de', 'en', 'sk') then s := 'en'; end if;
  if erstes then
    insert into profile (id, name, sprache, freigegeben, ist_admin) values (new.id, n, s, true, true);
    return new;
  end if;
  select * into e from einladung where code = c and fuer is null and gueltig_bis > now() for update;
  if not found then
    raise exception 'Einladung ungültig oder abgelaufen' using errcode = 'P0001';
  end if;
  insert into profile (id, name, sprache, eingeladen_von) values (new.id, n, s, e.von);
  update einladung set fuer = new.id where code = e.code;
  return new;
end $$;
drop trigger if exists neues_konto on auth.users;
create trigger neues_konto after insert on auth.users
  for each row execute function public.neues_konto();

-- Vor der Registrierung prüft die App den Code, damit eine verständliche Meldung kommt
create or replace function public.einladung_pruefen(c text) returns text
language sql stable security definer set search_path = public as $$
  select p.name from einladung e join profile p on p.id = e.von
  where e.code = c and e.fuer is null and e.gueltig_bis > now();
$$;
revoke all on function public.einladung_pruefen(text) from public;
grant execute on function public.einladung_pruefen(text) to anon, authenticated;

-- Admin: wartende Personen sehen, freigeben, ablehnen
drop policy if exists "admin lesen" on public.profile;
create policy "admin lesen" on public.profile for select using (public.ist_admin());
drop policy if exists "admin aendern" on public.profile;
create policy "admin aendern" on public.profile for update using (public.ist_admin()) with check (true);
drop policy if exists "admin entfernen" on public.profile;
create policy "admin entfernen" on public.profile for delete using (public.ist_admin() and id <> auth.uid());

-- ---------- Profilbilder ----------
-- Privater Speicher: nur Mitglieder sehen Fotos; jeder schreibt nur in seinen eigenen Ordner (<id>/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profilbilder', 'profilbilder', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "fotos lesen" on storage.objects;
create policy "fotos lesen" on storage.objects for select
  using (bucket_id = 'profilbilder' and (public.ist_mitglied() or (storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists "fotos hochladen" on storage.objects;
create policy "fotos hochladen" on storage.objects for insert
  with check (bucket_id = 'profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos ersetzen" on storage.objects;
create policy "fotos ersetzen" on storage.objects for update
  using (bucket_id = 'profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos loeschen" on storage.objects;
create policy "fotos loeschen" on storage.objects for delete
  using (bucket_id = 'profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Zugriffsrechte für die App ----------
-- Neue Tabellen werden nicht automatisch freigegeben; was die App braucht, steht hier.
-- Was jemand davon wirklich sieht oder ändern darf, entscheiden die Regeln oben.
grant usage on schema public to anon, authenticated;
grant select, update, delete on public.profile to authenticated;
grant select, insert on public.einladung to authenticated;
grant select on public.wer_ist_wo to authenticated;
grant execute on function public.ist_mitglied(), public.ist_admin() to authenticated;

-- ---------- Erster Admin ----------
-- Das erste Konto, das sich registriert, wird automatisch Admin (Sven registriert sich direkt nach der Einrichtung).
