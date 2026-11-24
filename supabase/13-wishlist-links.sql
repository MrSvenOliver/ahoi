-- Ahoi · Beta · Wishlist (Unterkünfte und Ortstipps) und Links im Profil
-- Einmal im Supabase-SQL-Editor ausführen (nach 12). Danach die Edge Function „vorschau“ anlegen.
-- Sichtbar für alle freigegebenen Nomaden (Familie sieht die Wishlist nicht).

-- ---------- Profil: Social Media und Webseite (alles freiwillig) ----------
alter table public.profile add column if not exists links jsonb not null default '{}'::jsonb;
create or replace function public.links_ok(j jsonb) returns boolean
language sql immutable set search_path = public as $$
  select jsonb_typeof(j) = 'object' and coalesce((
    select bool_and(k in ('instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'web') and jsonb_typeof(v) = 'string' and char_length(v #>> '{}') between 1 and 200)
    from jsonb_each(j) as e(k, v)), true);
$$;
alter table public.profile drop constraint if exists links_ok;
alter table public.profile add constraint links_ok check (public.links_ok(links));
grant select (links), update (links) on public.profile to authenticated;

-- ---------- Unterkünfte ----------
create table if not exists public.wunsch (
  id uuid primary key default gen_random_uuid(),
  von uuid not null default auth.uid() references public.profile (id) on delete cascade,
  link text not null check (link ~ '^https://' and char_length(link) <= 600),
  titel text check (char_length(titel) <= 160),
  bild_url text check (bild_url ~ '^https://' and char_length(bild_url) <= 800),   -- Vorschaubild der Seite
  foto text,                                                                           -- eigenes Foto im Speicher „wunschbilder“
  quelle text check (char_length(quelle) <= 40),
  ort text not null check (char_length(ort) between 1 and 80),
  land text check (land ~ '^[A-Z]{2}$'),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  anreise date,
  abreise date,
  preis int check (preis between 1 and 100000),
  plaetze int check (plaetze between 1 and 30),
  notiz text check (char_length(notiz) <= 200),
  gebucht boolean not null default false,
  chat uuid references public.chat (id) on delete set null,
  erstellt_am timestamptz not null default now(),
  check (abreise is null or anreise is not null and abreise >= anreise),
  check (foto is null or foto ~ ('^' || von::text || '/[a-z0-9-]{8,40}\.jpg$'))
);
alter table public.wunsch enable row level security;
drop policy if exists "wunsch lesen" on public.wunsch;
create policy "wunsch lesen" on public.wunsch for select using (public.ist_mitglied());
drop policy if exists "wunsch anlegen" on public.wunsch;
create policy "wunsch anlegen" on public.wunsch for insert with check (public.ist_mitglied() and von = auth.uid());
drop policy if exists "wunsch aendern" on public.wunsch;
create policy "wunsch aendern" on public.wunsch for update using (von = auth.uid()) with check (von = auth.uid());
drop policy if exists "wunsch loeschen" on public.wunsch;
create policy "wunsch loeschen" on public.wunsch for delete using (von = auth.uid() or public.ist_admin());
revoke all on public.wunsch from anon, authenticated;
grant select, delete on public.wunsch to authenticated;
grant insert (link, titel, bild_url, foto, quelle, ort, land, lat, lon, anreise, abreise, preis, plaetze, notiz),
      update (titel, bild_url, foto, ort, land, lat, lon, anreise, abreise, preis, plaetze, notiz) on public.wunsch to authenticated;

create table if not exists public.wunsch_dabei (
  wunsch uuid not null references public.wunsch (id) on delete cascade,
  person uuid not null default auth.uid() references public.profile (id) on delete cascade,
  primary key (wunsch, person)
);
create table if not exists public.wunsch_herz (
  wunsch uuid not null references public.wunsch (id) on delete cascade,
  person uuid not null default auth.uid() references public.profile (id) on delete cascade,
  primary key (wunsch, person)
);
alter table public.wunsch_dabei enable row level security;
alter table public.wunsch_herz enable row level security;
drop policy if exists "dabei lesen" on public.wunsch_dabei;
create policy "dabei lesen" on public.wunsch_dabei for select using (public.ist_mitglied());
drop policy if exists "herz lesen" on public.wunsch_herz;
create policy "herz lesen" on public.wunsch_herz for select using (public.ist_mitglied());
drop policy if exists "herz eigenes" on public.wunsch_herz;
create policy "herz eigenes" on public.wunsch_herz for insert with check (public.ist_mitglied() and person = auth.uid());
drop policy if exists "herz weg" on public.wunsch_herz;
create policy "herz weg" on public.wunsch_herz for delete using (person = auth.uid());
revoke all on public.wunsch_dabei, public.wunsch_herz from anon, authenticated;
grant select on public.wunsch_dabei to authenticated;
grant select, insert, delete on public.wunsch_herz to authenticated;

-- „Ich wäre dabei“: an- oder abmelden; dazu eine Gruppe im Chat mit allen, die dabei sind
create or replace function public.wunsch_dabei_setzen(w uuid, ja boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); x wunsch; frei int;
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  select * into x from wunsch where id = w for update;
  if not found then raise exception 'Gibt es nicht'; end if;
  if x.von = ich then return x.chat; end if;
  if ja then
    if x.plaetze is not null then
      select x.plaetze - 1 - count(*) into frei from wunsch_dabei where wunsch = w and person <> ich;
      if frei <= 0 then raise exception 'Leider voll'; end if;
    end if;
    insert into wunsch_dabei (wunsch, person) values (w, ich) on conflict do nothing;
    if x.chat is null then
      insert into chat (art, name, emoji, erstellt_von) values ('gruppe', left(coalesce(nullif(x.titel, ''), x.ort), 60), '🏡', x.von) returning id into x.chat;
      update wunsch set chat = x.chat where id = w;
      insert into chat_mitglied (chat, person) values (x.chat, x.von) on conflict do nothing;
      insert into nachricht (chat, von, text, system) values (x.chat, x.von, 'erstellt', true);
    end if;
    insert into chat_mitglied (chat, person) values (x.chat, ich) on conflict do nothing;
  else
    delete from wunsch_dabei where wunsch = w and person = ich;
    if x.chat is not null then delete from chat_mitglied where chat = x.chat and person = ich; end if;
  end if;
  return x.chat;
end $$;

-- „Gebucht“: trägt die Reise für alle ein, die dabei sind (nur mit Zeitraum)
create or replace function public.wunsch_gebucht(w uuid) returns int
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); x wunsch; n int := 0; p uuid;
begin
  select * into x from wunsch where id = w for update;
  if not found then raise exception 'Gibt es nicht'; end if;
  if not (x.von = ich or exists (select 1 from wunsch_dabei where wunsch = w and person = ich)) then raise exception 'Nur wer dabei ist'; end if;
  if x.anreise is null or x.abreise is null then raise exception 'Zeitraum fehlt'; end if;
  for p in select x.von union select person from wunsch_dabei where wunsch = w loop
    if not exists (select 1 from reise r where r.von = p and r.ort = x.ort and r.ankunft = x.anreise and r.abreise = x.abreise) then
      insert into reise (von, ort, land, lat, lon, ankunft, abreise) values (p, x.ort, x.land, x.lat, x.lon, x.anreise, x.abreise);
      n := n + 1;
    end if;
  end loop;
  update wunsch set gebucht = true where id = w;
  return n;
end $$;
revoke execute on function public.wunsch_dabei_setzen(uuid, boolean), public.wunsch_gebucht(uuid) from public, anon;
grant execute on function public.wunsch_dabei_setzen(uuid, boolean), public.wunsch_gebucht(uuid) to authenticated;

-- Eigene Fotos zu Unterkünften
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wunschbilder', 'wunschbilder', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];
drop policy if exists "wunschbilder lesen" on storage.objects;
create policy "wunschbilder lesen" on storage.objects for select using (bucket_id = 'wunschbilder' and public.ist_mitglied());
drop policy if exists "wunschbilder hochladen" on storage.objects;
create policy "wunschbilder hochladen" on storage.objects for insert
  with check (bucket_id = 'wunschbilder' and public.ist_mitglied() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "wunschbilder loeschen" on storage.objects;
create policy "wunschbilder loeschen" on storage.objects for delete
  using (bucket_id = 'wunschbilder' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Ortstipps ----------
create table if not exists public.tipp (
  id uuid primary key default gen_random_uuid(),
  von uuid not null default auth.uid() references public.profile (id) on delete cascade,
  ort text not null check (char_length(ort) between 1 and 80),
  land text check (land ~ '^[A-Z]{2}$'),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  art text not null check (art in ('cafe', 'essen', 'erleben', 'arbeiten', 'praktisch')),
  text text not null check (char_length(text) between 1 and 500),
  erstellt_am timestamptz not null default now()
);
create table if not exists public.tipp_daumen (
  tipp uuid not null references public.tipp (id) on delete cascade,
  person uuid not null default auth.uid() references public.profile (id) on delete cascade,
  primary key (tipp, person)
);
alter table public.tipp enable row level security;
alter table public.tipp_daumen enable row level security;
drop policy if exists "tipp lesen" on public.tipp;
create policy "tipp lesen" on public.tipp for select using (public.ist_mitglied());
drop policy if exists "tipp anlegen" on public.tipp;
create policy "tipp anlegen" on public.tipp for insert with check (public.ist_mitglied() and von = auth.uid());
drop policy if exists "tipp loeschen" on public.tipp;
create policy "tipp loeschen" on public.tipp for delete using (von = auth.uid() or public.ist_admin());
drop policy if exists "daumen lesen" on public.tipp_daumen;
create policy "daumen lesen" on public.tipp_daumen for select using (public.ist_mitglied());
drop policy if exists "daumen eigener" on public.tipp_daumen;
create policy "daumen eigener" on public.tipp_daumen for insert with check (public.ist_mitglied() and person = auth.uid());
drop policy if exists "daumen weg" on public.tipp_daumen;
create policy "daumen weg" on public.tipp_daumen for delete using (person = auth.uid());
revoke all on public.tipp, public.tipp_daumen from anon, authenticated;
grant select, delete on public.tipp to authenticated;
grant insert (ort, land, lat, lon, art, text) on public.tipp to authenticated;
grant select, insert, delete on public.tipp_daumen to authenticated;
