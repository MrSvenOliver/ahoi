-- Ahoi · Beta · eigener Schalter für die monatliche Nachfrage zum Ort
-- Einmal im Supabase-SQL-Editor ausführen (nach 09). Danach die Edge Function „push“ neu veröffentlichen.
alter table public.profile add column if not exists push_ort boolean not null default true;
grant select (push_ort) on public.profile to authenticated;
