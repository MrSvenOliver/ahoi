-- Ahoi · Beta · Status läuft ab, Gruppen-Emoji, Push-Mitteilungen
-- Einmal im Supabase-SQL-Editor ausführen (nach 01–08). Danach die Edge Function „push“ anlegen (supabase/functions/push/index.ts).
-- Status: gilt 24 Stunden, danach zeigt die App keinen Status mehr an.
-- Gruppen: eigenes Emoji statt Profilbildern.
-- Push: Abos je Gerät; neue Nachrichten gehen an alle im Chat außer an den Absender, an stumm geschaltete Chats und an Personen,
--   die Chat-Mitteilungen ausgeschaltet haben. Einmal im Monat fragt Ahoi per Push, ob man noch am selben Ort ist
--   (oder, laut Reiseplan, ob man jetzt woanders ist). Die Schlüssel für Push erzeugt die Edge Function selbst und legt sie
--   in push_schluessel ab; diese Tabelle kann niemand über die App lesen, nur der öffentliche Teil ist abrufbar.

-- ---------- Status läuft nach 24 Stunden ab ----------
alter table public.profile add column if not exists status_am timestamptz;
create or replace function public.status_zeit() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then new.status_am := case when new.status is null then null else now() end; end if;
  return new;
end $$;
drop trigger if exists status_zeit on public.profile;
create trigger status_zeit before update of status on public.profile for each row execute function public.status_zeit();
update public.profile set status_am = now() where status is not null and status_am is null;
grant select (status_am) on public.profile to authenticated;

create or replace view public.wer_ist_wo as
  select p.id, p.name, p.foto, p.sprache,
         case when p.status_am is null or p.status_am > now() - interval '24 hours' then p.status end as status,
         p.art, p.freigegeben, p.ist_admin,
         case when p.geist and p.id <> auth.uid() then null else p.ort end as ort,
         case when p.geist and p.id <> auth.uid() then null else p.land end as land,
         case when p.geist and p.id <> auth.uid() then null else p.lat end as lat,
         case when p.geist and p.id <> auth.uid() then null else p.lon end as lon,
         p.zeitzone, p.geist, p.standort_am
  from public.profile p
  where p.id = auth.uid()
     or (public.ist_mitglied() and p.freigegeben and p.art = 'nomade')
     or public.sieht_als_familie(p.id);

-- Ort bestätigen, ohne ihn zu ändern („Ja, ich bin noch in …“)
create or replace function public.ort_bestaetigen() returns void
language sql security definer set search_path = public as $$
  update profile set standort_am = now() where id = auth.uid() and ort is not null;
$$;
revoke execute on function public.ort_bestaetigen() from public, anon;
grant execute on function public.ort_bestaetigen() to authenticated;

-- ---------- Gruppen-Emoji ----------
alter table public.chat add column if not exists emoji text check (char_length(emoji) <= 16);
drop function if exists public.gruppe_erstellen(text, uuid[]);
create or replace function public.gruppe_erstellen(name text, leute uuid[], emoji text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); c uuid;
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  insert into chat (art, name, emoji, erstellt_von)
    values ('gruppe', left(coalesce(nullif(trim(name), ''), 'Gruppe'), 60), left(nullif(trim(emoji), ''), 16), ich) returning id into c;
  insert into chat_mitglied (chat, person)
    select c, p.id from profile p where (p.id = ich or p.id = any (leute)) and p.freigegeben and p.art = 'nomade'
    on conflict do nothing;
  insert into nachricht (chat, von, text, system) values (c, ich, 'erstellt', true);
  return c;
end $$;
create or replace function public.chat_emoji_setzen(c uuid, emoji text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from chat_mitglied m join chat k on k.id = m.chat where m.chat = c and m.person = auth.uid() and k.art = 'gruppe') then raise exception 'Nur Gruppenmitglieder'; end if;
  update chat set emoji = left(nullif(trim(chat_emoji_setzen.emoji), ''), 16) where id = c;
end $$;
revoke execute on function public.gruppe_erstellen(text, uuid[], text), public.chat_emoji_setzen(uuid, text) from public, anon;
grant execute on function public.gruppe_erstellen(text, uuid[], text), public.chat_emoji_setzen(uuid, text) to authenticated;

-- ---------- Push: Einstellungen, stumme Chats, Abos ----------
alter table public.profile add column if not exists push_chat boolean not null default true;
grant select (push_chat) on public.profile to authenticated;

create table if not exists public.chat_stumm (
  chat uuid not null references public.chat (id) on delete cascade,
  person uuid not null default auth.uid() references public.profile (id) on delete cascade,
  primary key (chat, person)
);
alter table public.chat_stumm enable row level security;
drop policy if exists "stumm eigene" on public.chat_stumm;
create policy "stumm eigene" on public.chat_stumm for all using (person = auth.uid()) with check (person = auth.uid() and public.im_chat(chat));
grant select, insert, delete on public.chat_stumm to authenticated;

create table if not exists public.push_abo (
  endpunkt text primary key,
  person uuid not null default auth.uid() references public.profile (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  geraet text,
  erstellt_am timestamptz not null default now()
);
alter table public.push_abo enable row level security;
drop policy if exists "abo eigene" on public.push_abo;
create policy "abo eigene" on public.push_abo for all using (person = auth.uid()) with check (person = auth.uid());
grant select, insert, update, delete on public.push_abo to authenticated;

-- Schlüssel der Edge Function (nur der öffentliche Teil ist über die App abrufbar)
create table if not exists public.push_schluessel (
  id int primary key default 1 check (id = 1),
  oeffentlich text not null,
  privat text not null,
  erstellt_am timestamptz not null default now()
);
alter table public.push_schluessel enable row level security;
revoke all on public.push_schluessel from anon, authenticated;
create or replace function public.push_schluessel_oeffentlich() returns text
language sql stable security definer set search_path = public as $$ select oeffentlich from push_schluessel where id = 1; $$;
revoke execute on function public.push_schluessel_oeffentlich() from public, anon;
grant execute on function public.push_schluessel_oeffentlich() to authenticated;

-- Damit jede Nachricht nur einmal verschickt wird
alter table public.nachricht add column if not exists push_raus boolean not null default false;
-- Wann zuletzt per Push nach dem Ort gefragt wurde
alter table public.profile add column if not exists ort_frage_am timestamptz;

-- Neue Nachricht → Edge Function „push“ (über pg_net, ohne Schlüssel; die Funktion prüft selbst alles in der Datenbank)
create extension if not exists pg_net with schema extensions;
create or replace function public.push_ausloesen() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not new.system then
    perform net.http_post(
      url := 'https://zsmulyttciqruuqrcebv.supabase.co/functions/v1/push',
      body := jsonb_build_object('nachricht', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end $$;
revoke execute on function public.push_ausloesen() from public, anon, authenticated;
drop trigger if exists push_ausloesen on public.nachricht;
create trigger push_ausloesen after insert on public.nachricht for each row execute function public.push_ausloesen();

-- Einmal täglich: wer seit 30 Tagen keinen neuen Ort hatte (oder laut Reiseplan woanders ist), bekommt höchstens einmal im Monat eine Frage
create extension if not exists pg_cron;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'ahoi-ort-frage') then perform cron.unschedule('ahoi-ort-frage'); end if;
end $$;
select cron.schedule('ahoi-ort-frage', '7 9 * * *', $$
  select net.http_post(url := 'https://zsmulyttciqruuqrcebv.supabase.co/functions/v1/push',
    body := '{"ortfrage": true}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb);
$$);
