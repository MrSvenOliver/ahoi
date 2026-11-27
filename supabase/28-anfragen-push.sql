-- Ahoi · Beta · Mitteilung bei Paar- und Mitreise-Anfragen, alte Mitreise-Anfragen aufräumen
-- Einmal im Supabase-SQL-Editor ausführen (nach 27). Danach die Edge Function „push“ neu bereitstellen.
-- Push „❤️ {Name} möchte euch als Paar verknüpfen“ bzw. „👥 {Name} sagt, ihr reist zusammen“ an die angefragte Person
-- (Schalter „Neue Leute und Anfragen“). Anfragen zwischen Leuten, die schon in derselben Reisegruppe sind, werden gelöscht.

create or replace function public.push_paar_mitreise() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'paar' then
    if not new.bestaetigt then
      perform public.push_ereignis(jsonb_build_object('ereignis', 'paar_anfrage', 'von', new.von, 'an', new.an));
    end if;
  else
    perform public.push_ereignis(jsonb_build_object('ereignis', 'mitreise_anfrage', 'von', new.von, 'an', new.an));
  end if;
  return new;
end $$;
revoke execute on function public.push_paar_mitreise() from public, anon, authenticated;
drop trigger if exists push_paar_anfrage on public.paar;
create trigger push_paar_anfrage after insert on public.paar for each row execute function public.push_paar_mitreise();
drop trigger if exists push_mitreise_anfrage on public.mitreise_anfrage;
create trigger push_mitreise_anfrage after insert on public.mitreise_anfrage for each row execute function public.push_paar_mitreise();

-- Gruppe verbinden: danach alle offenen Anfragen innerhalb der Gruppe löschen
create or replace function public.gruppen_verbinden(a uuid, b uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ga uuid; gb uuid;
begin
  select gruppe into ga from reisegruppe_mitglied where person = a;
  select gruppe into gb from reisegruppe_mitglied where person = b;
  if ga is null and gb is null then
    insert into reisegruppe default values returning id into ga;
    insert into reisegruppe_mitglied (person, gruppe) values (a, ga), (b, ga);
  elsif ga is null then
    insert into reisegruppe_mitglied (person, gruppe) values (a, gb);
  elsif gb is null then
    insert into reisegruppe_mitglied (person, gruppe) values (b, ga);
  elsif ga <> gb then
    update reisegruppe_mitglied set gruppe = ga where gruppe = gb;
    delete from reisegruppe where id = gb;
  end if;
  delete from mitreise_anfrage m where exists (
    select 1 from reisegruppe_mitglied x join reisegruppe_mitglied y on x.gruppe = y.gruppe where x.person = m.von and y.person = m.an);
end $$;
revoke execute on function public.gruppen_verbinden(uuid, uuid) from public, anon, authenticated;

-- Schon zusammen: offene Anfragen zwischen beiden löschen
create or replace function public.mitreisen_anfragen(ziel uuid) returns text
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid();
begin
  if not public.ist_mitglied() then raise exception 'Nur für Mitglieder'; end if;
  if ziel = ich or not exists (select 1 from profile where id = ziel and freigegeben and art = 'nomade') then raise exception 'Unbekannte Person'; end if;
  if exists (select 1 from reisegruppe_mitglied x join reisegruppe_mitglied y on x.gruppe = y.gruppe where x.person = ich and y.person = ziel) then
    delete from mitreise_anfrage where (von = ziel and an = ich) or (von = ich and an = ziel);
    return 'schon';
  end if;
  if exists (select 1 from mitreise_anfrage where von = ziel and an = ich) then
    delete from mitreise_anfrage where (von = ziel and an = ich) or (von = ich and an = ziel);
    perform public.gruppen_verbinden(ich, ziel);
    return 'zusammen';
  end if;
  insert into mitreise_anfrage (von, an) values (ich, ziel) on conflict do nothing;
  return 'angefragt';
end $$;
grant execute on function public.mitreisen_anfragen(uuid) to authenticated;
revoke execute on function public.mitreisen_anfragen(uuid) from public, anon;

-- Einmal aufräumen: Anfragen zwischen Leuten, die schon zusammen in einer Gruppe sind
delete from public.mitreise_anfrage m where exists (
  select 1 from public.reisegruppe_mitglied x join public.reisegruppe_mitglied y on x.gruppe = y.gruppe where x.person = m.von and y.person = m.an);

select (select count(*) from public.mitreise_anfrage) as offene_mitreise_anfragen,
       (select count(*) from pg_trigger where tgname in ('push_paar_anfrage', 'push_mitreise_anfrage')) as trigger;
