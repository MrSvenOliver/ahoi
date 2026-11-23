-- Ahoi · Beta · Persönliche Einladungen von Sven
-- Einmal im Supabase-SQL-Editor ausführen (nach 01 und 02).
-- Sven nennt Name und E-Mail eines Freundes; Claude legt im SQL-Editor einen persönlichen Link an.
-- Solche Links sind vorab freigegeben (kein Warten) und können „lebenslang kostenlos“ mitgeben.
-- Namen und E-Mail-Adressen stehen nur in der Datenbank, nie in diesem öffentlichen Repository.

alter table public.einladung add column if not exists name text check (char_length(name) <= 40);
alter table public.einladung add column if not exists email text;
alter table public.einladung add column if not exists vorab_frei boolean not null default false;
alter table public.einladung add column if not exists gratis boolean not null default false;
alter table public.profile add column if not exists gratis boolean not null default false;

-- Mitglieder dürfen beim normalen Einladen weder Vorab-Freigabe noch Gratis setzen
drop policy if exists "einladung erstellen" on public.einladung;
create policy "einladung erstellen" on public.einladung for insert
  with check (public.ist_mitglied() and von = auth.uid() and fuer is null
              and ((not vorab_frei and not gratis) or public.ist_admin()));

-- Gratis darf man sich nicht selbst geben
create or replace function public.profil_schutz() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.ist_admin() then
    new.freigegeben := old.freigegeben;
    new.ist_admin := old.ist_admin;
    new.eingeladen_von := old.eingeladen_von;
    new.gratis := old.gratis;
  end if;
  return new;
end $$;

-- Neues Konto: vorab freigegebene Links lassen die Person sofort hinein
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
    insert into profile (id, name, sprache, freigegeben, ist_admin, gratis) values (new.id, n, s, true, true, true);
    return new;
  end if;
  select * into e from einladung where code = c and fuer is null and gueltig_bis > now() for update;
  if not found then
    raise exception 'Einladung ungültig oder abgelaufen' using errcode = 'P0001';
  end if;
  insert into profile (id, name, sprache, eingeladen_von, freigegeben, gratis)
    values (new.id, coalesce(nullif(n, ''), e.name, ''), s, e.von, e.vorab_frei, e.gratis);
  update einladung set fuer = new.id where code = e.code;
  return new;
end $$;
