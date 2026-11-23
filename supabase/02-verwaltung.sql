-- Ahoi · Beta · Verwaltung
-- Einmal im Supabase-SQL-Editor ausführen (nach 01-grundlagen.sql).
-- Der Admin kann ein neues Startpasswort setzen, wenn jemand sein Passwort vergessen hat
-- (die App verschickt keine E-Mails, deshalb kein „Passwort zurücksetzen per Mail“).

create or replace function public.admin_passwort_setzen(person uuid, neu text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'Nur für den Admin'; end if;
  if char_length(neu) < 8 then raise exception 'Passwort zu kurz'; end if;
  update auth.users set encrypted_password = extensions.crypt(neu, extensions.gen_salt('bf')), updated_at = now()
    where id = person;
  if not found then raise exception 'Person nicht gefunden'; end if;
end $$;
revoke all on function public.admin_passwort_setzen(uuid, text) from public, anon;
grant execute on function public.admin_passwort_setzen(uuid, text) to authenticated;
