-- Ahoi · Beta · Chat „Alle“ ist raus, Push für Chats: aus / nur Einzelchats / nur Gruppen / alles (Entscheidung 24.11.2026)
-- Einmal im Supabase-SQL-Editor ausführen (nach 16). Danach die Edge Function „push“ neu veröffentlichen.
-- Der Chat „Alle“ bleibt mit seinen Nachrichten in der Datenbank, die App zeigt ihn nicht mehr; neue Nachrichten dort sind gesperrt.
alter table public.profile drop constraint if exists push_chat_art_ok;
-- bisher „gruppen“ = Einzel und Gruppen, „alle“ = zusätzlich der Chat „Alle“ → beides heißt jetzt „alle“ (alles)
update public.profile set push_chat_art = 'alle' where push_chat_art in ('gruppen', 'alle');
alter table public.profile alter column push_chat_art set default 'alle';
alter table public.profile add constraint push_chat_art_ok check (push_chat_art in ('aus', 'einzel', 'gruppen', 'alle'));

drop policy if exists "nachricht schreiben" on public.nachricht;
create policy "nachricht schreiben" on public.nachricht for insert
  with check (von = auth.uid() and not system and public.im_chat(chat) and not exists (select 1 from public.chat k where k.id = chat and k.art = 'alle'));
