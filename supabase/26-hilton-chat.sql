-- Ahoi · Beta · Hilton: Recherche über Claude im Chat (kostenlos) statt über die API
-- Neue oder geänderte Hotels stehen auf „recherche“, Sven bekommt eine Mitteilung „🏨 Hilton-Hotel wartet“
-- und schreibt Claude „Hilton nachtragen“; Claude recherchiert und trägt die Details im SQL-Editor ein.
-- Einmal im Supabase-SQL-Editor ausführen (nach 25), danach die Edge Function „push“ neu veröffentlichen.

create or replace function public.hilton_vorher() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.ort is null then new.ort := new.ort_eingabe; end if;
    if new.status = 'recherche' then new.recherche_am := now(); end if;
    return new;
  end if;
  if current_user = 'authenticated' then
    -- Mitglieder dürfen nur neu anfragen, nicht selbst „fertig“ melden
    if new.status is distinct from old.status and new.status <> 'recherche' then
      raise exception 'Nur neu recherchieren lassen ist erlaubt';
    end if;
    if new.name is distinct from old.name or new.ort_eingabe is distinct from old.ort_eingabe then
      new.ort := new.ort_eingabe; new.status := 'recherche';
    end if;
  end if;
  if new.status = 'recherche' and old.status is distinct from 'recherche' then new.recherche_am := now(); end if;
  return new;
end $$;

grant update (status) on public.hilton to authenticated;

-- Mitteilung an Sven (Admin), wenn ein Hotel auf die Recherche wartet
create or replace function public.push_hilton() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'recherche' and (tg_op = 'INSERT' or old.status is distinct from 'recherche') then
    perform public.push_ereignis(jsonb_build_object('ereignis', 'hilton', 'hotel', new.id));
  end if;
  return new;
end $$;
revoke execute on function public.push_hilton() from public, anon, authenticated;
drop trigger if exists push_hilton on public.hilton;
create trigger push_hilton after insert or update of status on public.hilton
  for each row execute function public.push_hilton();
