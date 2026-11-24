-- Ahoi · Beta · Freundeskreise in der Datenbank, Chat „Alle“ gelöscht
-- Einmal im Supabase-SQL-Editor ausführen (nach 17).
-- Freundeskreise sind ein privater Filter: nur die Person, der der Kreis gehört, sieht und ändert ihn.
-- Wer im Kreis steht, erfährt davon nichts; wer wen sehen kann, ändert sich dadurch nicht.

-- 1) Chat „Alle“ endgültig weg (Nachrichten, Mitglieder und Stummschaltungen gehen mit)
delete from public.chat where art = 'alle';
drop index if exists public.chat_nur_ein_alle;
alter table public.chat drop constraint if exists chat_art_check;
alter table public.chat add constraint chat_art_check check (art in ('gruppe', 'einzel'));
create or replace function public.im_chat(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.ist_mitglied() and exists (select 1 from chat_mitglied where chat = c and person = auth.uid());
$$;
drop policy if exists "nachricht schreiben" on public.nachricht;
create policy "nachricht schreiben" on public.nachricht for insert
  with check (von = auth.uid() and not system and public.im_chat(chat));

-- 2) Freundeskreise
create table if not exists public.kreis (
  id uuid primary key default gen_random_uuid(),
  besitzer uuid not null default auth.uid() references public.profile (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  symbol text not null default '⭐' check (char_length(symbol) between 1 and 8),
  leute uuid[] not null default '{}' check (cardinality(leute) between 1 and 300),
  erstellt_am timestamptz not null default now()
);
create index if not exists kreis_besitzer on public.kreis (besitzer);
alter table public.kreis enable row level security;
drop policy if exists "kreis eigene" on public.kreis;
create policy "kreis eigene" on public.kreis for all
  using (besitzer = auth.uid())
  with check (besitzer = auth.uid() and public.ist_mitglied());
revoke all on public.kreis from anon, authenticated;
grant select, delete on public.kreis to authenticated;
grant insert (name, symbol, leute) on public.kreis to authenticated;
grant update (name, symbol, leute) on public.kreis to authenticated;
