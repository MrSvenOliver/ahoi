-- Ahoi · Beta · Hilton mit automatischer Recherche
-- Mitglieder geben nur Name und Ort ein; die Edge Function „hilton“ sucht das Hotel (hilton.com, Foto, Kategorie,
-- Executive Lounge, ungefährer Zimmerpreis, Top 5 auf DE/EN/SK) und trägt alles ein.
-- Einmal im Supabase-SQL-Editor ausführen (nach 24), danach die Edge Function „hilton“ anlegen.

alter table public.hilton add column if not exists status text not null default 'fertig';
alter table public.hilton drop constraint if exists hilton_status_ok;
alter table public.hilton add constraint hilton_status_ok check (status in ('recherche', 'fertig', 'fehler'));
alter table public.hilton alter column status set default 'recherche';
alter table public.hilton add column if not exists ort_eingabe text check (ort_eingabe is null or char_length(btrim(ort_eingabe)) between 1 and 120);
alter table public.hilton add column if not exists kategorie text check (kategorie is null or kategorie in ('luxury', 'premium', 'classic', 'budget'));
alter table public.hilton add column if not exists lounge boolean;
alter table public.hilton add column if not exists preis_ca int check (preis_ca is null or preis_ca between 1 and 9999);
alter table public.hilton add column if not exists texte jsonb;           -- Top 5 je Sprache: {"de": [...], "en": [...], "sk": [...]}
alter table public.hilton add column if not exists notiz text;            -- Quellen der Recherche oder Fehlergrund (wird nicht angezeigt)
alter table public.hilton add column if not exists recherche_am timestamptz;
update public.hilton set ort_eingabe = ort where ort_eingabe is null and ort is not null;

-- Neue Einträge: der Ort aus der Eingabe gilt, bis die Recherche ihn genauer einträgt
create or replace function public.hilton_vorher() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.ort is null then new.ort := new.ort_eingabe; end if;
  if tg_op = 'UPDATE' and (new.name is distinct from old.name or new.ort_eingabe is distinct from old.ort_eingabe)
     and current_user = 'authenticated' then
    new.ort := new.ort_eingabe;
  end if;
  return new;
end $$;
drop trigger if exists hilton_vorher on public.hilton;
create trigger hilton_vorher before insert or update on public.hilton for each row execute function public.hilton_vorher();

-- Mitglieder schreiben nur Name und Ort; alles andere trägt die Recherche ein (Edge Function mit Datenbankzugriff)
revoke insert, update on public.hilton from authenticated;
grant insert (name, ort_eingabe) on public.hilton to authenticated;
grant update (name, ort_eingabe) on public.hilton to authenticated;
