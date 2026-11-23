-- Ahoi · Beta · Chat
-- Einmal im Supabase-SQL-Editor ausführen (nach 01–07).
-- Drei Arten: „Alle“ (ein gemeinsamer Chat für alle Mitglieder, nur in der Beta), Gruppen und Einzelchats.
-- Lesen und schreiben darf nur, wer im Chat ist; „Alle“ sehen alle freigegebenen Nomaden. Die Familie hat keinen Chat.
-- Neue Nachrichten kommen über Supabase Realtime sofort bei den anderen an.

create table if not exists public.chat (
  id uuid primary key default gen_random_uuid(),
  art text not null check (art in ('alle', 'gruppe', 'einzel')),
  name text check (char_length(name) <= 60),
  erstellt_von uuid references public.profile (id) on delete set null,
  erstellt_am timestamptz not null default now()
);
create unique index if not exists chat_nur_ein_alle on public.chat (art) where art = 'alle';
insert into public.chat (art, name) select 'alle', 'Alle' where not exists (select 1 from public.chat where art = 'alle');

create table if not exists public.chat_mitglied (
  chat uuid not null references public.chat (id) on delete cascade,
  person uuid not null references public.profile (id) on delete cascade,
  primary key (chat, person)
);
create table if not exists public.nachricht (
  id bigint generated always as identity primary key,
  chat uuid not null references public.chat (id) on delete cascade,
  von uuid default auth.uid() references public.profile (id) on delete set null,
  text text not null check (char_length(text) between 1 and 2000),
  sprache text check (sprache ~ '^[a-z]{2}$'),
  system boolean not null default false,
  am timestamptz not null default now()
);
create index if not exists nachricht_chat_am on public.nachricht (chat, am);

-- Darf ich in diesen Chat? (freigegebener Nomade und: „Alle“ oder Mitglied)
create or replace function public.im_chat(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.ist_mitglied() and (
    exists (select 1 from chat where id = c and art = 'alle')
    or exists (select 1 from chat_mitglied where chat = c and person = auth.uid())
  );
$$;
revoke execute on function public.im_chat(uuid) from public, anon;
grant execute on function public.im_chat(uuid) to authenticated;

alter table public.chat enable row level security;
alter table public.chat_mitglied enable row level security;
alter table public.nachricht enable row level security;
drop policy if exists "chat lesen" on public.chat;
create policy "chat lesen" on public.chat for select using (public.im_chat(id));
drop policy if exists "chat mitglieder lesen" on public.chat_mitglied;
create policy "chat mitglieder lesen" on public.chat_mitglied for select using (public.im_chat(chat));
drop policy if exists "nachricht lesen" on public.nachricht;
create policy "nachricht lesen" on public.nachricht for select using (public.im_chat(chat));
drop policy if exists "nachricht schreiben" on public.nachricht;
create policy "nachricht schreiben" on public.nachricht for insert with check (von = auth.uid() and not system and public.im_chat(chat));
grant select on public.chat, public.chat_mitglied, public.nachricht to authenticated;
grant insert (chat, text, sprache) on public.nachricht to authenticated;

-- Einzelchat mit einer Person finden oder anlegen
create or replace function public.einzelchat(ziel uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); c uuid;
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  if ziel = ich or not exists (select 1 from profile where id = ziel and freigegeben and art = 'nomade') then raise exception 'Unbekannte Person'; end if;
  select m1.chat into c from chat_mitglied m1 join chat_mitglied m2 on m1.chat = m2.chat join chat k on k.id = m1.chat
    where k.art = 'einzel' and m1.person = ich and m2.person = ziel limit 1;
  if c is null then
    insert into chat (art, erstellt_von) values ('einzel', ich) returning id into c;
    insert into chat_mitglied (chat, person) values (c, ich), (c, ziel);
  end if;
  return c;
end $$;

-- Gruppe mit Name und Personen anlegen; die Gruppe bekommt eine Systemzeile „hat die Gruppe erstellt“
create or replace function public.gruppe_erstellen(name text, leute uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); c uuid;
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  insert into chat (art, name, erstellt_von) values ('gruppe', left(coalesce(nullif(trim(name), ''), 'Gruppe'), 60), ich) returning id into c;
  insert into chat_mitglied (chat, person)
    select c, p.id from profile p where (p.id = ich or p.id = any (leute)) and p.freigegeben and p.art = 'nomade'
    on conflict do nothing;
  insert into nachricht (chat, von, text, system) values (c, ich, 'erstellt', true);
  return c;
end $$;

create or replace function public.chat_verlassen(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from chat where id = c and art = 'gruppe') then raise exception 'Nur Gruppen kann man verlassen'; end if;
  if not exists (select 1 from chat_mitglied where chat = c and person = auth.uid()) then return; end if;
  insert into nachricht (chat, von, text, system) values (c, auth.uid(), 'verlassen', true);
  delete from chat_mitglied where chat = c and person = auth.uid();
  delete from chat k where k.id = c and not exists (select 1 from chat_mitglied m where m.chat = c);
end $$;

revoke execute on function public.einzelchat(uuid), public.gruppe_erstellen(text, uuid[]), public.chat_verlassen(uuid) from public, anon;
grant execute on function public.einzelchat(uuid), public.gruppe_erstellen(text, uuid[]), public.chat_verlassen(uuid) to authenticated;

-- Realtime: neue Nachrichten sofort an alle, die sie lesen dürfen
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nachricht') then
    alter publication supabase_realtime add table public.nachricht;
  end if;
end $$;
