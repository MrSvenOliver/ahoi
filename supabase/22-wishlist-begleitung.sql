-- Ahoi · Beta · Wishlist: Begleitung (Ahoi-Mitglied voll dabei oder Gast mit Namen), Reise auch für die Person, die teilt
-- Einmal im Supabase-SQL-Editor ausführen (nach 21).
-- Begleitung = Liste der Mitreisenden einer Zusage (ohne die Person selbst), z. B. [{"id": "<uuid>"}, {"name": "Max"}].
-- Mitglieder in der Begleitung sind „voll dabei“: Reise in „Reisen“ und Platz in der Chat-Gruppe.

create or replace function public.begleitung_ok(j jsonb) returns boolean
language sql immutable set search_path = public as $$
  select jsonb_typeof(j) = 'array' and jsonb_array_length(j) <= 9 and coalesce((
    select bool_and(jsonb_typeof(e) = 'object'
      and (e ? 'id' and (e ->> 'id') ~ '^[0-9a-f-]{36}$' or not e ? 'id')
      and char_length(coalesce(e ->> 'name', '')) <= 40)
    from jsonb_array_elements(j) e), true);
$$;
alter table public.wunsch_dabei add column if not exists begleitung jsonb not null default '[]';
alter table public.wunsch add column if not exists ersteller_begleitung jsonb not null default '[]';
alter table public.wunsch_dabei drop constraint if exists begleitung_ok;
alter table public.wunsch_dabei add constraint begleitung_ok check (public.begleitung_ok(begleitung));
alter table public.wunsch drop constraint if exists ersteller_begleitung_ok;
alter table public.wunsch add constraint ersteller_begleitung_ok check (public.begleitung_ok(ersteller_begleitung));
grant insert (ersteller_begleitung) on public.wunsch to authenticated;

-- Begleitung bereinigen: nur freigegebene Nomaden, nicht man selbst, keine doppelten; Namen gekürzt
create or replace function public.begleitung_sauber(j jsonb, ich uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by n), '[]') from (
    select distinct on (coalesce(e ->> 'id', 'name' || n)) n,
      case when e ? 'id' then jsonb_build_object('id', e ->> 'id')
           else jsonb_build_object('name', left(btrim(coalesce(e ->> 'name', '')), 40)) end as x
    from jsonb_array_elements(case when jsonb_typeof(j) = 'array' then j else '[]' end) with ordinality as a(e, n)
    where not e ? 'id' or ((e ->> 'id') ~ '^[0-9a-f-]{36}$' and (e ->> 'id')::uuid <> ich
      and exists (select 1 from profile p where p.id = (e ->> 'id')::uuid and p.freigegeben and p.art = 'nomade'))
    order by coalesce(e ->> 'id', 'name' || n), n) s;
$$;
revoke execute on function public.begleitung_sauber(jsonb, uuid) from public, anon, authenticated;

-- Mitglieder in einer Begleitung
create or replace function public.begleitung_ids(j jsonb) returns setof uuid
language sql immutable set search_path = public as $$
  select (e ->> 'id')::uuid from jsonb_array_elements(case when jsonb_typeof(j) = 'array' then j else '[]' end) e where e ? 'id';
$$;

-- Alle Ahoi-Mitglieder, die bei einem Wunsch dabei sind (Ersteller nur, wenn dabei; mit Begleitung)
create or replace function public.wunsch_teilnehmer(w uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select x.von from wunsch x where x.id = w and x.ersteller_dabei
  union select public.begleitung_ids(x.ersteller_begleitung) from wunsch x where x.id = w and x.ersteller_dabei
  union select d.person from wunsch_dabei d where d.wunsch = w
  union select public.begleitung_ids(d.begleitung) from wunsch_dabei d where d.wunsch = w;
$$;
revoke execute on function public.wunsch_teilnehmer(uuid) from public, anon, authenticated;

-- Chat-Gruppe anlegen (falls nötig) und Mitglieder hinzufügen
create or replace function public.wunsch_chat_dazu(w uuid, leute uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare x wunsch; p uuid;
begin
  select * into x from wunsch where id = w;
  if not found or coalesce(array_length(leute, 1), 0) = 0 then return x.chat; end if;
  if x.chat is null then
    insert into chat (art, name, emoji, erstellt_von) values ('gruppe', left(coalesce(nullif(x.titel, ''), x.ort), 60), '🏡', x.von) returning id into x.chat;
    update wunsch set chat = x.chat where id = w;
    insert into chat_mitglied (chat, person) values (x.chat, x.von) on conflict do nothing;
    insert into nachricht (chat, von, text, system) values (x.chat, x.von, 'erstellt', true);
  end if;
  foreach p in array leute loop insert into chat_mitglied (chat, person) values (x.chat, p) on conflict do nothing; end loop;
  return x.chat;
end $$;
revoke execute on function public.wunsch_chat_dazu(uuid, uuid[]) from public, anon, authenticated;

-- Dabei an/aus, Personen/Zimmer und Begleitung ändern
drop function if exists public.wunsch_dabei_setzen(uuid, boolean, boolean, int, int);
create or replace function public.wunsch_dabei_setzen(w uuid, ja boolean, reise_weg boolean default false, personen_zahl int default 1,
  zimmer_zahl int default 1, begleitung jsonb default '[]') returns uuid
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); x wunsch; belegt int; pz int := least(greatest(coalesce(personen_zahl, 1), 1), 10);
  zz int := least(greatest(coalesce(zimmer_zahl, 1), 1), 10); neu jsonb; alt uuid[]; jetzt uuid[]; p uuid; chat_id uuid;
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  select * into x from wunsch where id = w for update;
  if not found then raise exception 'Gibt es nicht'; end if;
  if x.gebucht then raise exception 'Schon gebucht'; end if;
  -- Begleitung: höchstens Personen − 1; Mitglieder, die schon anderweitig dabei sind, nicht doppelt
  neu := public.begleitung_sauber(begleitung, ich);
  select coalesce(jsonb_agg(e), '[]') into neu from (select e from jsonb_array_elements(neu) with ordinality a(e, n)
    where not e ? 'id' or (e ->> 'id')::uuid not in (
      select t from public.wunsch_teilnehmer(w) t where t not in (
        select public.begleitung_ids(case when x.von = ich then x.ersteller_begleitung else coalesce((select d.begleitung from wunsch_dabei d where d.wunsch = w and d.person = ich), '[]') end)))
    order by n limit pz - 1) s;
  if ja and x.plaetze is not null then
    select (case when x.ersteller_dabei and x.von <> ich then x.ersteller_personen else 0 end) + coalesce(sum(d.personen), 0) into belegt
      from wunsch_dabei d where d.wunsch = w and d.person <> ich;
    if belegt + pz > x.plaetze then raise exception 'Leider voll'; end if;
  end if;
  if ja and x.von <> ich and ich in (select public.begleitung_ids(x.ersteller_begleitung) union select public.begleitung_ids(d.begleitung) from wunsch_dabei d where d.wunsch = w and d.person <> ich) then
    raise exception 'Schon dabei als Begleitung';
  end if;
  -- bisherige Begleitung (Mitglieder)
  alt := array(select public.begleitung_ids(case when x.von = ich then (case when x.ersteller_dabei then x.ersteller_begleitung else '[]' end)
                 else coalesce((select d.begleitung from wunsch_dabei d where d.wunsch = w and d.person = ich), '[]') end));
  jetzt := case when ja then array(select public.begleitung_ids(neu)) else '{}' end;
  if x.von = ich then
    update wunsch set ersteller_dabei = ja, ersteller_personen = case when ja then pz else ersteller_personen end,
                      ersteller_zimmer = case when ja then zz else ersteller_zimmer end,
                      ersteller_begleitung = case when ja then neu else '[]' end where id = w;
  elsif ja then
    insert into wunsch_dabei (wunsch, person, personen, zimmer, begleitung) values (w, ich, pz, zz, neu)
      on conflict (wunsch, person) do update set personen = excluded.personen, zimmer = excluded.zimmer, begleitung = excluded.begleitung;
  else
    delete from wunsch_dabei where wunsch = w and person = ich;
  end if;
  -- Reisen und Chat: ich und meine Begleitung
  if ja then
    perform public.wunsch_reise_setzen(w, ich);
    foreach p in array jetzt loop perform public.wunsch_reise_setzen(w, p); end loop;
    chat_id := public.wunsch_chat_dazu(w, case when x.von = ich then jetzt else array_append(jetzt, ich) end);
  end if;
  -- wer nicht mehr dabei ist (ich beim Austreten, entfernte Begleitung): Reise löschen oder behalten, raus aus dem Chat
  foreach p in array (case when ja then '{}'::uuid[] else array[ich] end) || array(select unnest(alt) except select unnest(jetzt)) loop
    if ja or reise_weg then delete from reise where wunsch = w and von = p; else update reise set wunsch = null where wunsch = w and von = p; end if;
    if p <> x.von then delete from chat_mitglied where chat = coalesce(chat_id, x.chat) and person = p; end if;
  end loop;
  return coalesce(chat_id, (select chat from wunsch where id = w));
end $$;
revoke execute on function public.wunsch_dabei_setzen(uuid, boolean, boolean, int, int, jsonb) from public, anon;
grant execute on function public.wunsch_dabei_setzen(uuid, boolean, boolean, int, int, jsonb) to authenticated;

-- Gebucht: Reise für alle Teilnehmer inkl. Begleitung
create or replace function public.wunsch_gebucht(w uuid) returns int
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); x wunsch; n int := 0; p uuid;
begin
  select * into x from wunsch where id = w for update;
  if not found then raise exception 'Gibt es nicht'; end if;
  if not (x.von = ich or ich in (select public.wunsch_teilnehmer(w))) then raise exception 'Nur wer dabei ist'; end if;
  if x.anreise is null or x.abreise is null then raise exception 'Zeitraum fehlt'; end if;
  for p in select public.wunsch_teilnehmer(w) loop perform public.wunsch_reise_setzen(w, p); n := n + 1; end loop;
  update wunsch set gebucht = true where id = w;
  return n;
end $$;
revoke execute on function public.wunsch_gebucht(uuid) from public, anon;
grant execute on function public.wunsch_gebucht(uuid) to authenticated;

-- Neue Daten: Reisen aller Teilnehmer (inkl. Begleitung) wandern mit
create or replace function public.wunsch_reisen_nachziehen() returns trigger
language plpgsql security definer set search_path = public as $$
declare p uuid;
begin
  if new.anreise is null or new.abreise is null then
    delete from reise where wunsch = new.id;
  else
    update reise set ankunft = new.anreise, abreise = new.abreise where wunsch = new.id;
    for p in select public.wunsch_teilnehmer(new.id) loop perform public.wunsch_reise_setzen(new.id, p); end loop;
  end if;
  return new;
end $$;

-- Neuer Eintrag: Begleitung bereinigen; Reise und Chat für die Person, die teilt, und ihre Begleitung
create or replace function public.wunsch_neu_vorher() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.ersteller_begleitung := (select coalesce(jsonb_agg(e), '[]') from (select e from jsonb_array_elements(public.begleitung_sauber(new.ersteller_begleitung, new.von)) with ordinality a(e, n) order by n limit new.ersteller_personen - 1) s);
  return new;
end $$;
create or replace function public.wunsch_neu_nachher() returns trigger
language plpgsql security definer set search_path = public as $$
declare p uuid; mit uuid[];
begin
  if new.ersteller_dabei then
    for p in select public.wunsch_teilnehmer(new.id) loop perform public.wunsch_reise_setzen(new.id, p); end loop;
    mit := array(select public.begleitung_ids(new.ersteller_begleitung));
    perform public.wunsch_chat_dazu(new.id, mit);
  end if;
  return new;
end $$;
revoke execute on function public.wunsch_neu_vorher(), public.wunsch_neu_nachher() from public, anon, authenticated;
drop trigger if exists wunsch_neu_vorher on public.wunsch;
create trigger wunsch_neu_vorher before insert on public.wunsch for each row execute function public.wunsch_neu_vorher();
drop trigger if exists wunsch_neu_nachher on public.wunsch;
create trigger wunsch_neu_nachher after insert on public.wunsch for each row execute function public.wunsch_neu_nachher();
