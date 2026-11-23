-- Ahoi · Beta · Orte-Verlauf
-- Einmal im Supabase-SQL-Editor ausführen (nach 01–06).
-- Jeder neue Ort (Stadt) wird mit Datum festgehalten. Daraus entstehen später Rückblicke (Nomadenjahr, Halbjahr)
-- und „Pionier“ (wer aus dem Freundeskreis als Erster in einem Land war).
-- Den eigenen Verlauf sieht nur man selbst. Freunde sehen nur das Ergebnis „Pionier“ (Land und Person), keine Daten.
-- Orte, die im Geistermodus gespeichert wurden, zählen für „Pionier“ nicht.

create table if not exists public.ort_verlauf (
  id bigint generated always as identity primary key,
  person uuid not null references public.profile (id) on delete cascade,
  ort text not null,
  land text check (land ~ '^[A-Z]{2}$'),
  lat double precision,
  lon double precision,
  am timestamptz not null default now(),
  geist boolean not null default false
);
create index if not exists ort_verlauf_person_am on public.ort_verlauf (person, am);
create index if not exists ort_verlauf_land_am on public.ort_verlauf (land, am);
alter table public.ort_verlauf enable row level security;
drop policy if exists "verlauf lesen" on public.ort_verlauf;
create policy "verlauf lesen" on public.ort_verlauf for select using (person = auth.uid());
grant select on public.ort_verlauf to authenticated;

-- Wenn sich Ort oder Land im Profil ändern, kommt ein Eintrag dazu (nur Nomaden, nicht die Familie)
create or replace function public.ort_merken() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.art = 'nomade' and new.ort is not null
     and (tg_op = 'INSERT' or new.ort is distinct from old.ort or new.land is distinct from old.land) then
    insert into ort_verlauf (person, ort, land, lat, lon, am, geist)
    values (new.id, new.ort, new.land, new.lat, new.lon, coalesce(new.standort_am, now()), new.geist);
  end if;
  return new;
end $$;
revoke execute on function public.ort_merken() from public, anon, authenticated;
drop trigger if exists ort_merken on public.profile;
create trigger ort_merken after insert or update of ort, land on public.profile
  for each row execute function public.ort_merken();

-- Startwert: der aktuelle Ort aller Nomaden, falls noch kein Eintrag da ist
insert into public.ort_verlauf (person, ort, land, lat, lon, am, geist)
select p.id, p.ort, p.land, p.lat, p.lon, coalesce(p.standort_am, now()), p.geist
from public.profile p
where p.art = 'nomade' and p.ort is not null and not exists (select 1 from public.ort_verlauf v where v.person = p.id);

-- Pionier: je Land die Person, die als Erste dort war (nur freigegebene Nomaden, ohne Geistermodus-Einträge)
create or replace function public.pioniere() returns table (land text, person uuid, am timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (v.land) v.land, v.person, v.am
  from ort_verlauf v join profile p on p.id = v.person
  where public.ist_mitglied() and v.land is not null and not v.geist and p.freigegeben and p.art = 'nomade'
  order by v.land, v.am, v.id;
$$;
revoke execute on function public.pioniere() from public, anon;
grant execute on function public.pioniere() to authenticated;
