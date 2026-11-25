-- Ahoi · Beta · Wishlist: wie viele Personen und Schlafzimmer jemand belegt (Preis wird pro Zimmer geteilt)
-- Einmal im Supabase-SQL-Editor ausführen (nach 20). Danach die Edge Function „push“ neu veröffentlichen.

alter table public.wunsch_dabei add column if not exists personen smallint not null default 1 check (personen between 1 and 10);
alter table public.wunsch_dabei add column if not exists zimmer smallint not null default 1 check (zimmer between 1 and 10);
alter table public.wunsch add column if not exists ersteller_personen smallint not null default 1 check (ersteller_personen between 1 and 10);
alter table public.wunsch add column if not exists ersteller_zimmer smallint not null default 1 check (ersteller_zimmer between 1 and 10);
grant insert (ersteller_personen, ersteller_zimmer), update (ersteller_personen, ersteller_zimmer) on public.wunsch to authenticated;

-- Dabei an/aus oder Personen/Zimmer ändern (Plätze zählen Personen)
drop function if exists public.wunsch_dabei_setzen(uuid, boolean);
drop function if exists public.wunsch_dabei_setzen(uuid, boolean, boolean);
create or replace function public.wunsch_dabei_setzen(w uuid, ja boolean, reise_weg boolean default false, personen_zahl int default 1, zimmer_zahl int default 1) returns uuid
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); x wunsch; belegt int; pz int := least(greatest(coalesce(personen_zahl, 1), 1), 10); zz int := least(greatest(coalesce(zimmer_zahl, 1), 1), 10);
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  select * into x from wunsch where id = w for update;
  if not found then raise exception 'Gibt es nicht'; end if;
  if x.gebucht then raise exception 'Schon gebucht'; end if;
  if ja and x.plaetze is not null then
    select (case when x.ersteller_dabei and x.von <> ich then x.ersteller_personen else 0 end) + coalesce(sum(d.personen), 0) into belegt
      from wunsch_dabei d where d.wunsch = w and d.person <> ich;
    if belegt + pz > x.plaetze then raise exception 'Leider voll'; end if;
  end if;
  if ja then perform public.wunsch_reise_setzen(w, ich);
  elsif reise_weg then delete from reise where wunsch = w and von = ich;
  else update reise set wunsch = null where wunsch = w and von = ich;
  end if;
  if x.von = ich then
    update wunsch set ersteller_dabei = ja, ersteller_personen = case when ja then pz else ersteller_personen end,
                      ersteller_zimmer = case when ja then zz else ersteller_zimmer end where id = w;
    return x.chat;
  end if;
  if ja then
    insert into wunsch_dabei (wunsch, person, personen, zimmer) values (w, ich, pz, zz)
      on conflict (wunsch, person) do update set personen = excluded.personen, zimmer = excluded.zimmer;
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
revoke execute on function public.wunsch_dabei_setzen(uuid, boolean, boolean, int, int) from public, anon;
grant execute on function public.wunsch_dabei_setzen(uuid, boolean, boolean, int, int) to authenticated;
