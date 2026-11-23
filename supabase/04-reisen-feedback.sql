-- Ahoi · Beta · Reisen und Feedback
-- Einmal im Supabase-SQL-Editor ausführen (nach 01–03).

-- ---------- Reisen ----------
-- Feste Reise: Ort + Ankunft + Abreise. Vielleicht-Plan: Ort + Monat, ohne genaue Daten.
create table if not exists public.reise (
  id uuid primary key default gen_random_uuid(),
  von uuid not null default auth.uid() references public.profile (id) on delete cascade,
  ort text not null check (char_length(ort) between 1 and 80),
  land text check (land ~ '^[A-Z]{2}$'),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  ankunft date,
  abreise date,
  monat text check (monat ~ '^[0-9]{4}-[0-9]{2}$'),
  vielleicht boolean not null default false,
  erstellt_am timestamptz not null default now(),
  check ((not vielleicht and ankunft is not null and abreise is not null and abreise >= ankunft)
      or (vielleicht and monat is not null))
);
alter table public.reise enable row level security;

drop policy if exists "reise lesen" on public.reise;
create policy "reise lesen" on public.reise for select using (public.ist_mitglied());
drop policy if exists "reise anlegen" on public.reise;
create policy "reise anlegen" on public.reise for insert with check (public.ist_mitglied() and von = auth.uid());
drop policy if exists "reise aendern" on public.reise;
create policy "reise aendern" on public.reise for update using (von = auth.uid()) with check (von = auth.uid());
drop policy if exists "reise loeschen" on public.reise;
create policy "reise loeschen" on public.reise for delete using (von = auth.uid() or public.ist_admin());

grant select, insert, update, delete on public.reise to authenticated;

-- ---------- Feedback ----------
-- Fehler, Ideen, Sonstiges an Sven, optional mit Screenshot. Nur Sven sieht alles, jeder sieht sein eigenes.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  von uuid default auth.uid() references public.profile (id) on delete set null,
  art text not null default 'fehler' check (art in ('fehler', 'idee', 'sonstiges')),
  text text not null check (char_length(text) between 1 and 2000),
  bild text,
  geraet text check (char_length(geraet) <= 200),
  erledigt boolean not null default false,
  erstellt_am timestamptz not null default now()
);
alter table public.feedback enable row level security;

drop policy if exists "feedback senden" on public.feedback;
create policy "feedback senden" on public.feedback for insert with check (auth.uid() is not null and von = auth.uid() and not erledigt);
drop policy if exists "feedback lesen" on public.feedback;
create policy "feedback lesen" on public.feedback for select using (von = auth.uid() or public.ist_admin());
drop policy if exists "feedback abhaken" on public.feedback;
create policy "feedback abhaken" on public.feedback for update using (public.ist_admin()) with check (public.ist_admin());

grant select, insert, update on public.feedback to authenticated;

-- Screenshots: privater Speicher, jeder lädt in seinen eigenen Ordner, nur der Admin sieht alle
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "feedback bild hochladen" on storage.objects;
create policy "feedback bild hochladen" on storage.objects for insert
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "feedback bild lesen" on storage.objects;
create policy "feedback bild lesen" on storage.objects for select
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = auth.uid()::text or public.ist_admin()));
