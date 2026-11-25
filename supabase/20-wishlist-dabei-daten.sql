-- Ahoi · Beta · Wishlist: wer geteilt hat, muss nicht dabei sein; Zeitraum änderbar; Push bei neuen Daten
-- Einmal im Supabase-SQL-Editor ausführen (nach 19). Danach die Edge Function „push“ neu veröffentlichen.

alter table public.wunsch add column if not exists ersteller_dabei boolean not null default true;

-- „Ich wäre dabei“ an/aus, auch für die Person, die geteilt hat
create or replace function public.wunsch_dabei_setzen(w uuid, ja boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); x wunsch; belegt int;
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  select * into x from wunsch where id = w for update;
  if not found then raise exception 'Gibt es nicht'; end if;
  if x.gebucht then raise exception 'Schon gebucht'; end if;
  if ja and x.plaetze is not null then
    select (case when x.ersteller_dabei and x.von <> ich then 1 else 0 end) + count(*) into belegt from wunsch_dabei where wunsch = w and person <> ich;
    if belegt >= x.plaetze then raise exception 'Leider voll'; end if;
  end if;
  if x.von = ich then
    update wunsch set ersteller_dabei = ja where id = w;
    return x.chat;
  end if;
  if ja then
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

-- „Gebucht“: Reise für alle, die dabei sind; die Person, die geteilt hat, nur wenn sie selbst dabei ist
create or replace function public.wunsch_gebucht(w uuid) returns int
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); x wunsch; n int := 0; p uuid;
begin
  select * into x from wunsch where id = w for update;
  if not found then raise exception 'Gibt es nicht'; end if;
  if not (x.von = ich or exists (select 1 from wunsch_dabei where wunsch = w and person = ich)) then raise exception 'Nur wer dabei ist'; end if;
  if x.anreise is null or x.abreise is null then raise exception 'Zeitraum fehlt'; end if;
  for p in select x.von where x.ersteller_dabei union select person from wunsch_dabei where wunsch = w loop
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

-- Zeitraum nur sinnvoll: beide Daten oder keins, Abreise nach Anreise
alter table public.wunsch drop constraint if exists wunsch_zeitraum_ok;
alter table public.wunsch add constraint wunsch_zeitraum_ok check ((anreise is null) = (abreise is null) and (abreise is null or abreise > anreise)) not valid;

-- Push: neue Daten melden (zusätzlich zu gebucht und Preis)
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
    elsif (new.anreise, new.abreise) is distinct from (old.anreise, old.abreise) and new.anreise is not null and new.abreise is not null then
      perform public.push_ereignis(jsonb_build_object('ereignis', 'wunsch_zeit', 'wunsch', new.id, 'wer', auth.uid()));
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
create trigger push_wunsch after insert or update of gebucht, preis, anreise, abreise on public.wunsch for each row execute function public.push_bei_ereignis();
