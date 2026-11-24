-- Ahoi · Beta · Wishlist: maximale Gästezahl aus der Airbnb-Vorschau
-- Einmal im Supabase-SQL-Editor ausführen (nach 13).
alter table public.wunsch add column if not exists gaeste int check (gaeste between 1 and 50);
grant insert (gaeste), update (gaeste) on public.wunsch to authenticated;
