-- Ahoi · Beta · Grundlagen
-- Einmal im Supabase-SQL-Editor ausführen.
-- Inhalt: Profile mit Standort, Einladungen mit Freigabe durch den Admin, Speicher für Profilbilder,
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
-- Mitglieder schlagen eine E-Mail-Adresse vor, der Admin gibt frei.
-- Wer sich mit einer freigegebenen Adresse anmeldet, ist automatisch Mitglied.
create table if not exists public.einladung (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  name text check (char_length(name) <= 40),
  von uuid references public.profile (id) on delete set null,
  stand text not null default 'vorgeschlagen' check (stand in ('vorgeschlagen', 'freigegeben', 'abgelehnt', 'eingeloest')),
  erstellt_am timestamptz not null default now(),
  unique (email)
);
alter table public.einladung enable row level security;

drop policy if exists "einladung vorschlagen" on public.einladung;
create policy "einladung vorschlagen" on public.einladung for insert
  with check (public.ist_mitglied() and von = auth.uid()
              and (stand = 'vorgeschlagen' or public.ist_admin()));

drop policy if exists "einladung lesen" on public.einladung;
create policy "einladung lesen" on public.einladung for select
  using (von = auth.uid() or public.ist_admin());

drop policy if exists "einladung verwalten" on public.einladung;
create policy "einladung verwalten" on public.einladung for update
  using (public.ist_admin()) with check (public.ist_admin());

-- Neues Konto: Profil anlegen; freigegeben, wenn die Adresse eingeladen und freigegeben ist
create or replace function public.neues_konto() returns trigger
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update einladung set stand = 'eingeloest'
    where email = lower(new.email) and stand = 'freigegeben'
    returning true into ok;
  insert into profile (id, freigegeben) values (new.id, coalesce(ok, false))
    on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists neues_konto on auth.users;
create trigger neues_konto after insert on auth.users
  for each row execute function public.neues_konto();

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

-- ---------- Erster Admin ----------
-- Nach Svens erster Anmeldung einmal von Hand im SQL-Editor (E-Mail nur dort eintragen, nicht hier speichern):
-- update public.profile set freigegeben = true, ist_admin = true
--   where id = (select id from auth.users where email = '<deine-adresse>');
