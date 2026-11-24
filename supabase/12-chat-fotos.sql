-- Ahoi · Beta · Fotos im Chat
-- Einmal im Supabase-SQL-Editor ausführen (nach 11).
-- Fotos liegen privat im Speicher „chatfotos“ unter <chat-id>/<zufall>.jpg. Sehen kann sie nur, wer im Chat ist.
-- Die App verkleinert jedes Foto vorher auf höchstens 1600 Pixel (meist 200–400 KB).

alter table public.nachricht add column if not exists foto text;
alter table public.nachricht drop constraint if exists nachricht_text_check;
alter table public.nachricht drop constraint if exists nachricht_inhalt;
alter table public.nachricht add constraint nachricht_inhalt check (
  char_length(text) <= 2000 and (char_length(text) >= 1 or foto is not null)
  and (foto is null or foto ~ ('^' || chat::text || '/[a-z0-9-]{8,40}\.jpg$'))
);
grant insert (foto) on public.nachricht to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chatfotos', 'chatfotos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

-- Ordnername = Chat; nur wer im Chat ist, darf lesen und hochladen; löschen nur eigene Fotos
create or replace function public.im_chat_ordner(pfad text) returns boolean
language plpgsql stable security definer set search_path = public, storage as $$
declare c uuid;
begin
  begin c := ((storage.foldername(pfad))[1])::uuid; exception when others then return false; end;
  return public.im_chat(c);
end $$;
revoke execute on function public.im_chat_ordner(text) from public, anon;
grant execute on function public.im_chat_ordner(text) to authenticated;

drop policy if exists "chatfotos lesen" on storage.objects;
create policy "chatfotos lesen" on storage.objects for select
  using (bucket_id = 'chatfotos' and public.im_chat_ordner(name));
drop policy if exists "chatfotos hochladen" on storage.objects;
create policy "chatfotos hochladen" on storage.objects for insert
  with check (bucket_id = 'chatfotos' and public.im_chat_ordner(name));
drop policy if exists "chatfotos loeschen" on storage.objects;
create policy "chatfotos loeschen" on storage.objects for delete
  using (bucket_id = 'chatfotos' and owner_id = auth.uid()::text);
