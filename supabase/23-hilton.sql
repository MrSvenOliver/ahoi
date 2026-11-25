-- Ahoi · Beta · Wishlist „🏨 Hilton“: Inspiration ohne Daten, Hotels mit bis zu 5 Highlights, sortiert nach Ländern
-- Einmal im Supabase-SQL-Editor ausführen (nach 22). Alle Mitglieder sehen und teilen; ändern/löschen: wer geteilt hat oder Sven (Admin).

create or replace function public.hilton_punkte_ok(p text[]) returns boolean
language sql immutable set search_path = public as $$
  select cardinality(p) <= 5 and coalesce((select bool_and(char_length(btrim(x)) between 1 and 90) from unnest(p) x), true);
$$;

create table if not exists public.hilton (
  id uuid primary key default gen_random_uuid(),
  von uuid not null default auth.uid() references public.profile (id) on delete cascade,
  link text not null check (link ~ '^https://' and char_length(link) <= 600),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  bild_url text check (bild_url is null or (bild_url ~ '^https://' and char_length(bild_url) <= 1000)),
  ort text check (ort is null or char_length(ort) <= 120),
  land text check (land is null or land ~ '^[A-Z]{2}$'),
  lat double precision, lon double precision,
  highlights text[] not null default '{}' check (public.hilton_punkte_ok(highlights)),
  erstellt_am timestamptz not null default now()
);
create index if not exists hilton_land on public.hilton (land);
create table if not exists public.hilton_herz (
  hotel uuid not null references public.hilton (id) on delete cascade,
  person uuid not null default auth.uid() references public.profile (id) on delete cascade,
  primary key (hotel, person)
);

alter table public.hilton enable row level security;
alter table public.hilton_herz enable row level security;
drop policy if exists "hilton lesen" on public.hilton;
create policy "hilton lesen" on public.hilton for select using (public.ist_mitglied());
drop policy if exists "hilton anlegen" on public.hilton;
create policy "hilton anlegen" on public.hilton for insert with check (public.ist_mitglied() and von = auth.uid());
drop policy if exists "hilton aendern" on public.hilton;
create policy "hilton aendern" on public.hilton for update using (von = auth.uid() or public.ist_admin()) with check (von = auth.uid() or public.ist_admin());
drop policy if exists "hilton loeschen" on public.hilton;
create policy "hilton loeschen" on public.hilton for delete using (von = auth.uid() or public.ist_admin());
drop policy if exists "hilton herz lesen" on public.hilton_herz;
create policy "hilton herz lesen" on public.hilton_herz for select using (public.ist_mitglied());
drop policy if exists "hilton herz eigenes" on public.hilton_herz;
create policy "hilton herz eigenes" on public.hilton_herz for insert with check (public.ist_mitglied() and person = auth.uid());
drop policy if exists "hilton herz weg" on public.hilton_herz;
create policy "hilton herz weg" on public.hilton_herz for delete using (person = auth.uid());

revoke all on public.hilton, public.hilton_herz from anon, authenticated;
grant select, delete on public.hilton to authenticated;
grant insert (link, name, bild_url, ort, land, lat, lon, highlights), update (link, name, bild_url, ort, land, lat, lon, highlights) on public.hilton to authenticated;
grant select, insert, delete on public.hilton_herz to authenticated;
