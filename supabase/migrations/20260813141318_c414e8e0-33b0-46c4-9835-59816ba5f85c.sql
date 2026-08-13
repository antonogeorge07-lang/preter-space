
create or replace function public.shares_conversation(_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where (auth.uid())::text = any (c.participant_ids)
      and (_other)::text = any (c.participant_ids)
  )
$$;

revoke all on function public.shares_conversation(uuid) from public;
grant execute on function public.shares_conversation(uuid) to authenticated;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_self_or_contacts" on public.profiles
for select to authenticated
using (id = auth.uid() or public.shares_conversation(id));

drop policy if exists "presence_select_authenticated" on public.user_presence;
create policy "presence_select_self_or_contacts" on public.user_presence
for select to authenticated
using (user_id = auth.uid() or public.shares_conversation(user_id));

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
for select to authenticated
using ((auth.uid())::text = any (participant_ids));

drop policy if exists "conversations_update" on public.conversations;
create policy "conversations_update" on public.conversations
for update to authenticated
using ((auth.uid())::text = any (participant_ids))
with check ((auth.uid())::text = any (participant_ids));

drop policy if exists "chat_media_read" on storage.objects;
create policy "chat_media_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-media'
  and (
    owner = auth.uid()
    or (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      and public.shares_conversation(((storage.foldername(name))[1])::uuid)
    )
  )
);
