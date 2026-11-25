-- Ahoi · Beta · Wishlist-Unterkunft löschen: Reise behalten oder für alle absagen, alle Beteiligten bekommen Bescheid
-- Einmal im Supabase-SQL-Editor ausführen (nach 26), danach die Edge Function „push“ neu veröffentlichen.

-- Kurzer Vermerk über gelöschte Unterkünfte, damit die Mitteilung danach noch Ort und Daten kennt
create table if not exists public.wunsch_geloescht (
  id uuid primary key default gen_random_uuid(),
  von uuid references public.profile (id) on delete set null,
  ort text, anreise date, abreise date,
  reisen_weg boolean not null,
  an uuid[] not null default '{}',
  am timestamptz not null default now()
);
alter table public.wunsch_geloescht enable row level security;
revoke all on public.wunsch_geloescht from anon, authenticated;

-- Löschen nur über diese Funktion (wer geteilt hat oder Admin).
-- reisen_weg = true: die Reisen aus dieser Unterkunft verschwinden bei allen; false: alle Reisen bleiben, nur ohne Unterkunft.
create or replace function public.wunsch_loeschen(w uuid, reisen_weg boolean) returns void
language plpgsql security definer set search_path = public as $$
declare x wunsch; leute uuid[]; vermerk uuid;
begin
  select * into x from wunsch where id = w;
  if not found then return; end if;
  if x.von <> auth.uid() and not public.ist_admin() then raise exception 'Nur wer geteilt hat, kann löschen'; end if;
  leute := array(select p from public.wunsch_teilnehmer(w) p where p is not null and p <> auth.uid());
  insert into wunsch_geloescht (von, ort, anreise, abreise, reisen_weg, an)
    values (auth.uid(), x.ort, x.anreise, x.abreise, reisen_weg, leute) returning id into vermerk;
  if reisen_weg then
    -- Mitteilungen „neue Reise“ betreffen das Löschen nicht; die Reisen verschwinden einfach
    delete from reise where wunsch = w;
  end if;
  delete from wunsch where id = w;
  if coalesce(array_length(leute, 1), 0) > 0 then
    perform public.push_ereignis(jsonb_build_object('ereignis', 'wunsch_weg', 'vermerk', vermerk));
  end if;
end $$;
revoke execute on function public.wunsch_loeschen(uuid, boolean) from public, anon;
grant execute on function public.wunsch_loeschen(uuid, boolean) to authenticated;

-- Hilton: wann der Preis zuletzt geprüft wurde (Preis-Update alle 10 Tage über das Backup-Repository)
alter table public.hilton add column if not exists preis_am timestamptz;
