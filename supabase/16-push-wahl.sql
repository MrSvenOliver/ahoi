-- Ahoi · Beta · Mehr Push-Mitteilungen zum Auswählen (Entscheidung vom 24.11.2026)
-- Einmal im Supabase-SQL-Editor ausführen (nach 15). Danach die Edge Function „push“ neu veröffentlichen.
-- Chat: aus / nur Einzel- und Gruppenchats / alle · Wishlist: neuer Eintrag, jemand ist dabei, gebucht oder Preis neu
-- Orte: Freund in der Nähe, neuer Treffer, neue Reise · Neue Leute und Anfragen · Ruhezeit 22–8 Uhr (Ortszeit)

-- ---------- Einstellungen im Profil ----------
alter table public.profile add column if not exists push_chat_art text not null default 'gruppen';
alter table public.profile drop constraint if exists push_chat_art_ok;
alter table public.profile add constraint push_chat_art_ok check (push_chat_art in ('aus', 'gruppen', 'alle'));
alter table public.profile add column if not exists push_wunsch_neu boolean not null default false;
alter table public.profile add column if not exists push_wunsch_dabei boolean not null default true;
alter table public.profile add column if not exists push_wunsch_update boolean not null default true;
alter table public.profile add column if not exists push_naehe boolean not null default true;
alter table public.profile add column if not exists push_treffer boolean not null default true;
alter table public.profile add column if not exists push_reise boolean not null default false;
alter table public.profile add column if not exists push_leute boolean not null default true;
alter table public.profile add column if not exists push_ruhe boolean not null default true;
-- bisher ausgeschaltete Chat-Mitteilungen bleiben aus
update public.profile set push_chat_art = 'aus' where not push_chat and push_chat_art <> 'aus';
grant select (push_chat_art, push_wunsch_neu, push_wunsch_dabei, push_wunsch_update, push_naehe, push_treffer, push_reise, push_leute, push_ruhe),
      update (push_chat, push_chat_art, push_wunsch_neu, push_wunsch_dabei, push_wunsch_update, push_naehe, push_treffer, push_reise, push_leute, push_ruhe, push_ort)
  on public.profile to authenticated;

-- ---------- Ruhezeit: was nachts käme, wartet bis morgens ----------
create table if not exists public.push_warten (
  person uuid not null references public.profile (id) on delete cascade,
  tag text not null,                       -- gleiche Art von Mitteilung ersetzt die ältere (z. B. derselbe Chat)
  inhalt jsonb not null,
  ab timestamptz not null,
  primary key (person, tag)
);
alter table public.push_warten enable row level security;
revoke all on public.push_warten from anon, authenticated;

-- Jedes Ereignis wird höchstens einmal verschickt (die Funktion ist ohne Anmeldung erreichbar)
create table if not exists public.push_gesendet (
  schluessel text primary key,
  am timestamptz not null default now()
);
alter table public.push_gesendet enable row level security;
revoke all on public.push_gesendet from anon, authenticated;

-- ---------- Ereignisse an die Edge Function „push“ ----------
create or replace function public.push_ereignis(daten jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(url := 'https://zsmulyttciqruuqrcebv.supabase.co/functions/v1/push', body := daten, headers := '{"Content-Type": "application/json"}'::jsonb);
end $$;
revoke execute on function public.push_ereignis(jsonb) from public, anon, authenticated;

create or replace function public.push_bei_ereignis() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'wunsch' and tg_op = 'INSERT' then
    perform public.push_ereignis(jsonb_build_object('ereignis', 'wunsch_neu', 'wunsch', new.id));
  elsif tg_table_name = 'wunsch' and tg_op = 'UPDATE' then
    if new.gebucht and not old.gebucht then
      perform public.push_ereignis(jsonb_build_object('ereignis', 'wunsch_gebucht', 'wunsch', new.id, 'wer', auth.uid()));
    elsif new.preis is distinct from old.preis and new.preis is not null then
      perform public.push_ereignis(jsonb_build_object('ereignis', 'wunsch_preis', 'wunsch', new.id, 'wer', auth.uid()));
    end if;
  elsif tg_table_name = 'wunsch_dabei' then
    perform public.push_ereignis(jsonb_build_object('ereignis', 'wunsch_dabei', 'wunsch', new.wunsch, 'wer', new.person));
  elsif tg_table_name = 'reise' then
    if not new.vielleicht then perform public.push_ereignis(jsonb_build_object('ereignis', 'reise', 'reise', new.id)); end if;
  elsif tg_table_name = 'freund_anfrage' then
    perform public.push_ereignis(jsonb_build_object('ereignis', 'anfrage', 'von', new.von, 'an', new.an));
  elsif tg_table_name = 'profile' then
    if new.freigegeben and new.art = 'nomade' and (tg_op = 'INSERT' or not old.freigegeben) then
      perform public.push_ereignis(jsonb_build_object('ereignis', 'neu_dabei', 'person', new.id));
    elsif tg_op = 'UPDATE' and new.freigegeben and not new.geist and new.lat is not null
          and (new.ort is distinct from old.ort or new.land is distinct from old.land) then
      perform public.push_ereignis(jsonb_build_object('ereignis', 'ort', 'person', new.id));
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.push_bei_ereignis() from public, anon, authenticated;

drop trigger if exists push_wunsch on public.wunsch;
create trigger push_wunsch after insert or update of gebucht, preis on public.wunsch for each row execute function public.push_bei_ereignis();
drop trigger if exists push_wunsch_dabei on public.wunsch_dabei;
create trigger push_wunsch_dabei after insert on public.wunsch_dabei for each row execute function public.push_bei_ereignis();
drop trigger if exists push_reise on public.reise;
create trigger push_reise after insert on public.reise for each row execute function public.push_bei_ereignis();
drop trigger if exists push_anfrage on public.freund_anfrage;
create trigger push_anfrage after insert on public.freund_anfrage for each row execute function public.push_bei_ereignis();
drop trigger if exists push_profil on public.profile;
create trigger push_profil after insert or update of freigegeben, ort, land on public.profile for each row execute function public.push_bei_ereignis();

-- Alle 15 Minuten: Mitteilungen aus der Ruhezeit verschicken
do $$ begin
  if exists (select 1 from cron.job where jobname = 'ahoi-push-warten') then perform cron.unschedule('ahoi-push-warten'); end if;
end $$;
select cron.schedule('ahoi-push-warten', '*/15 * * * *', $$
  select net.http_post(url := 'https://zsmulyttciqruuqrcebv.supabase.co/functions/v1/push',
    body := '{"warten": true}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb)
  where exists (select 1 from public.push_warten where ab <= now());
$$);
