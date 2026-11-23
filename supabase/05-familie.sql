-- Ahoi · Beta · Familien-Zugang und Schutz der Orte
-- Einmal im Supabase-SQL-Editor ausführen (nach 01–04).
-- Familie (Eltern, Geschwister …): meldet sich nur mit Name, E-Mail und Passwort an, braucht keine Freigabe,
-- sieht nur die Nomaden, die sie eingeladen haben (Ort und Reisen), teilt selbst nichts und erscheint für niemanden.

alter table public.profile add column if not exists art text not null default 'nomade' check (art in ('nomade', 'familie'));
alter table public.einladung add column if not exists art text not null default 'freund' check (art in ('freund', 'familie'));

-- Wer welche Nomaden sehen darf; der Nomade kann die Sicht jederzeit pausieren (aktiv = false)
create table if not exists public.familie_sicht (
  nomade uuid not null references public.profile (id) on delete cascade,
  familie uuid not null references public.profile (id) on delete cascade,
  aktiv boolean not null default true,
  erstellt_am timestamptz not null default now(),
  primary key (nomade, familie)
);
alter table public.familie_sicht enable row level security;
drop policy if exists "familie sicht lesen" on public.familie_sicht;
create policy "familie sicht lesen" on public.familie_sicht for select using (nomade = auth.uid() or familie = auth.uid() or public.ist_admin());
drop policy if exists "familie sicht schalten" on public.familie_sicht;
create policy "familie sicht schalten" on public.familie_sicht for update using (nomade = auth.uid()) with check (nomade = auth.uid());
drop policy if exists "familie sicht entfernen" on public.familie_sicht;
create policy "familie sicht entfernen" on public.familie_sicht for delete using (nomade = auth.uid() or public.ist_admin());
grant select, update, delete on public.familie_sicht to authenticated;

-- Mitglied heißt jetzt: freigegebener Nomade (Familie zählt nicht dazu)
create or replace function public.ist_mitglied() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile where id = auth.uid() and freigegeben and art = 'nomade');
$$;
create or replace function public.sieht_als_familie(n uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from familie_sicht where familie = auth.uid() and nomade = n and aktiv);
$$;
create or replace function public.ist_meine_familie(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from familie_sicht where nomade = auth.uid() and familie = f);
$$;

-- Profile lesen: sich selbst; Nomaden untereinander; Familie nur ihre Nomaden; Nomaden ihre eigene Familie
drop policy if exists "profil lesen" on public.profile;
create policy "profil lesen" on public.profile for select
  using (id = auth.uid() or (public.ist_mitglied() and freigegeben and art = 'nomade')
         or public.sieht_als_familie(id) or public.ist_meine_familie(id));

-- Orte nur noch über die Ansicht wer_ist_wo (dort greift der Geistermodus); die Tabelle gibt keine Orte mehr heraus
revoke select on public.profile from authenticated;
grant select (id, name, foto, sprache, status, zeitzone, geist, freigegeben, ist_admin, eingeladen_von,
              standort_am, erstellt_am, gratis, art) on public.profile to authenticated;

drop view if exists public.wer_ist_wo;
create view public.wer_ist_wo as
  select p.id, p.name, p.foto, p.sprache, p.status, p.art, p.freigegeben, p.ist_admin,
         case when p.geist and p.id <> auth.uid() then null else p.ort end as ort,
         case when p.geist and p.id <> auth.uid() then null else p.land end as land,
         case when p.geist and p.id <> auth.uid() then null else p.lat end as lat,
         case when p.geist and p.id <> auth.uid() then null else p.lon end as lon,
         p.zeitzone, p.geist, p.standort_am
  from public.profile p
  where p.id = auth.uid()
     or (public.ist_mitglied() and p.freigegeben and p.art = 'nomade')
     or public.sieht_als_familie(p.id);
revoke all on public.wer_ist_wo from anon, public;
grant select on public.wer_ist_wo to authenticated;

-- Art (Nomade/Familie) darf man nicht selbst ändern
create or replace function public.profil_schutz() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.ist_admin() then
    new.freigegeben := old.freigegeben;
    new.ist_admin := old.ist_admin;
    new.eingeladen_von := old.eingeladen_von;
    new.gratis := old.gratis;
    new.art := old.art;
  end if;
  return new;
end $$;

-- Reisen: Familie sieht die Reisen ihrer Nomaden
drop policy if exists "reise lesen" on public.reise;
create policy "reise lesen" on public.reise for select using (public.ist_mitglied() or public.sieht_als_familie(von));

-- Fotos: Familie sieht die Fotos ihrer Nomaden, Nomaden die Fotos ihrer Familie
drop policy if exists "fotos lesen" on storage.objects;
create policy "fotos lesen" on storage.objects for select
  using (bucket_id = 'profilbilder' and (public.ist_mitglied()
         or (storage.foldername(name))[1] = auth.uid()::text
         or exists (select 1 from public.familie_sicht f where f.aktiv and f.familie = auth.uid() and f.nomade::text = (storage.foldername(name))[1])
         or exists (select 1 from public.familie_sicht f where f.nomade = auth.uid() and f.familie::text = (storage.foldername(name))[1])));

-- Neues Konto: Familien-Links machen ein Familien-Konto (sofort frei, sieht nur die einladende Person)
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

-- Vor der Registrierung: wer lädt ein und als was (Freund oder Familie)
create or replace function public.einladung_info(c text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('name', p.name, 'art', e.art, 'frei', e.vorab_frei) from einladung e join profile p on p.id = e.von
  where e.code = c and e.fuer is null and e.gueltig_bis > now();
$$;
revoke all on function public.einladung_info(text) from public;
grant execute on function public.einladung_info(text) to anon, authenticated;
grant execute on function public.sieht_als_familie(uuid), public.ist_meine_familie(uuid) to authenticated;
