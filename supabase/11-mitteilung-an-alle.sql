-- Ahoi · Beta · Mitteilung an alle (nur Sven als Admin), sofort oder zu einem festen Zeitpunkt
-- Einmal im Supabase-SQL-Editor ausführen (nach 10). Danach die Edge Function „push“ neu veröffentlichen.
-- Erste Zeile = fette Überschrift der Push-Mitteilung, der Rest (falls vorhanden) steht darunter.

create table if not exists public.rundruf (
  id bigint generated always as identity primary key,
  text text not null check (char_length(trim(text)) between 1 and 300),
  senden_am timestamptz not null default now(),
  raus boolean not null default false,          -- schon verschickt
  von uuid not null default auth.uid() references public.profile (id) on delete cascade,
  erstellt_am timestamptz not null default now()
);
alter table public.rundruf enable row level security;

-- Admin: alles; Mitglieder: nur Verschicktes lesen (für den Hinweis in der App, falls Push aus ist)
drop policy if exists "rundruf admin" on public.rundruf;
create policy "rundruf admin" on public.rundruf for all using (public.ist_admin()) with check (public.ist_admin() and von = auth.uid());
drop policy if exists "rundruf lesen" on public.rundruf;
create policy "rundruf lesen" on public.rundruf for select using (public.ist_mitglied() and raus);
revoke all on public.rundruf from anon, authenticated;
grant select (id, text, senden_am, raus, erstellt_am), insert (text, senden_am), delete on public.rundruf to authenticated;

-- Fällige Mitteilungen gehen an die Edge Function: sofort beim Speichern und alle 5 Minuten für geplante
create or replace function public.rundruf_ausloesen() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.senden_am <= now() + interval '1 minute' then
    perform net.http_post(
      url := 'https://zsmulyttciqruuqrcebv.supabase.co/functions/v1/push',
      body := jsonb_build_object('rundruf', true),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end $$;
revoke execute on function public.rundruf_ausloesen() from public, anon, authenticated;
drop trigger if exists rundruf_ausloesen on public.rundruf;
create trigger rundruf_ausloesen after insert on public.rundruf for each row execute function public.rundruf_ausloesen();

do $$ begin
  if exists (select 1 from cron.job where jobname = 'ahoi-rundruf') then perform cron.unschedule('ahoi-rundruf'); end if;
end $$;
select cron.schedule('ahoi-rundruf', '*/5 * * * *', $$
  select net.http_post(url := 'https://zsmulyttciqruuqrcebv.supabase.co/functions/v1/push',
    body := '{"rundruf": true}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb)
  where exists (select 1 from public.rundruf where not raus and senden_am <= now());
$$);
