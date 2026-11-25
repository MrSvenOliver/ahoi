-- Ahoi · Beta · Fehlermeldungen aus der App und Push „{Name} nimmt dich mit“
-- Einmal im Supabase-SQL-Editor ausführen (nach 23), danach die Edge Function „push“ neu veröffentlichen.

-- ---------- Fehler, die in der App passieren, landen automatisch bei Sven ----------
-- Gleiche Meldung (Text, Stelle, Version) wird nur hochgezählt. Neue Meldungen: Push an den Admin.
create table if not exists public.app_fehler (
  id uuid primary key default gen_random_uuid(),
  von uuid default auth.uid() references public.profile (id) on delete set null,
  meldung text not null check (char_length(meldung) between 1 and 500),
  stelle text check (char_length(stelle) <= 300),
  version text check (char_length(version) <= 40),
  geraet text check (char_length(geraet) <= 200),
  anzahl int not null default 1,
  erledigt boolean not null default false,
  erstellt_am timestamptz not null default now(),
  zuletzt timestamptz not null default now()
);
alter table public.app_fehler enable row level security;
drop policy if exists "fehler lesen" on public.app_fehler;
create policy "fehler lesen" on public.app_fehler for select using (public.ist_admin());
drop policy if exists "fehler abhaken" on public.app_fehler;
create policy "fehler abhaken" on public.app_fehler for update using (public.ist_admin()) with check (public.ist_admin());
drop policy if exists "fehler loeschen" on public.app_fehler;
create policy "fehler loeschen" on public.app_fehler for delete using (public.ist_admin());
revoke all on public.app_fehler from anon, authenticated;
grant select, delete on public.app_fehler to authenticated;
grant update (erledigt) on public.app_fehler to authenticated;

-- Melden nur über diese Funktion (keine direkten Einträge); höchstens 20 neue Meldungen pro Person und Tag
create or replace function public.fehler_melden(m_text text, m_stelle text default null, m_version text default null, m_geraet text default null) returns void
language plpgsql security definer set search_path = public as $$
declare ich uuid := auth.uid(); m text := left(btrim(coalesce(m_text, '')), 500); s text := nullif(left(m_stelle, 300), '');
  v text := nullif(left(m_version, 40), ''); g text := left(m_geraet, 200); neu_id uuid;
begin
  if ich is null or m = '' or not exists (select 1 from profile where id = ich) then return; end if;
  update app_fehler f set anzahl = f.anzahl + 1, zuletzt = now(), geraet = coalesce(g, f.geraet)
    where f.meldung = m and f.stelle is not distinct from s and f.version is not distinct from v and not f.erledigt;
  if found then return; end if;
  if (select count(*) from app_fehler f where f.von = ich and f.erstellt_am > now() - interval '1 day') >= 20 then return; end if;
  insert into app_fehler (von, meldung, stelle, version, geraet) values (ich, m, s, v, g) returning id into neu_id;
  perform public.push_ereignis(jsonb_build_object('ereignis', 'fehler', 'fehler', neu_id));
end $$;
revoke execute on function public.fehler_melden(text, text, text, text) from public, anon;
grant execute on function public.fehler_melden(text, text, text, text) to authenticated;

-- ---------- Wishlist: Mitglied als Begleitung mitgenommen → Push an dieses Mitglied ----------
create or replace function public.push_mitgenommen() returns trigger
language plpgsql security definer set search_path = public as $$
declare w uuid; wer uuid; neu uuid[]; alt uuid[]; p uuid;
begin
  if tg_table_name = 'wunsch' then
    w := new.id; wer := new.von;
    neu := case when new.ersteller_dabei then array(select public.begleitung_ids(new.ersteller_begleitung)) else '{}' end;
    alt := case when tg_op = 'UPDATE' and old.ersteller_dabei then array(select public.begleitung_ids(old.ersteller_begleitung)) else '{}' end;
  else
    w := new.wunsch; wer := new.person;
    neu := array(select public.begleitung_ids(new.begleitung));
    alt := case when tg_op = 'UPDATE' then array(select public.begleitung_ids(old.begleitung)) else '{}' end;
  end if;
  foreach p in array array(select unnest(neu) except select unnest(alt)) loop
    perform public.push_ereignis(jsonb_build_object('ereignis', 'wunsch_mit', 'wunsch', w, 'wer', wer, 'an', p));
  end loop;
  return new;
end $$;
revoke execute on function public.push_mitgenommen() from public, anon, authenticated;
drop trigger if exists push_mit_wunsch on public.wunsch;
create trigger push_mit_wunsch after insert or update of ersteller_begleitung, ersteller_dabei on public.wunsch
  for each row execute function public.push_mitgenommen();
drop trigger if exists push_mit_dabei on public.wunsch_dabei;
create trigger push_mit_dabei after insert or update of begleitung on public.wunsch_dabei
  for each row execute function public.push_mitgenommen();

-- ---------- Hilton ohne Link: Name und Ort reichen, eigenes Foto möglich (Screenshot aus der Hilton-App) ----------
-- Ohne Link sucht der Knopf das Hotel auf hilton.com. Fotos liegen wie bei den Unterkünften im privaten Speicher „wunschbilder“.
alter table public.hilton alter column link drop not null;
alter table public.hilton add column if not exists foto text check (foto is null or char_length(foto) <= 300);
grant insert (foto), update (foto) on public.hilton to authenticated;
