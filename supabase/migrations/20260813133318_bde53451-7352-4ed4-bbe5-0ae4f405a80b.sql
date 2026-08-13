DROP POLICY "messages_select_participants" ON public.messages;
DROP POLICY "messages_insert_own" ON public.messages;
DROP POLICY "messages_update_participants" ON public.messages;

CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid()::text = ANY (c.participant_ids)));
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid()::text AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid()::text = ANY (c.participant_ids)));
CREATE POLICY "messages_update_participants" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid()::text = ANY (c.participant_ids)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid()::text = ANY (c.participant_ids)));

DROP FUNCTION public.is_conversation_participant(uuid, uuid);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;