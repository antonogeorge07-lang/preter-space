
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create or replace function private.shares_conversation(_other uuid)
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

revoke all on function private.shares_conversation(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.shares_conversation(uuid) to authenticated;

drop policy if exists "profiles_select_self_or_contacts" on public.profiles;
create policy "profiles_select_self_or_contacts" on public.profiles
for select to authenticated
using (id = auth.uid() or private.shares_conversation(id));

drop policy if exists "presence_select_self_or_contacts" on public.user_presence;
create policy "presence_select_self_or_contacts" on public.user_presence
for select to authenticated
using (user_id = auth.uid() or private.shares_conversation(user_id));

drop policy if exists "chat_media_read" on storage.objects;
create policy "chat_media_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-media'
  and (
    owner = auth.uid()
    or (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      and private.shares_conversation(((storage.foldername(name))[1])::uuid)
    )
  )
);

drop function if exists public.shares_conversation(uuid);
