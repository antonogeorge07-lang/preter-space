-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  default_language text DEFAULT 'en',
  blocked_user_ids text[] NOT NULL DEFAULT '{}',
  active_sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_ids text[] NOT NULL DEFAULT '{}',
  participant_names text[] NOT NULL DEFAULT '{}',
  participant_languages text,
  participant_name text,
  participant_avatar text,
  preferred_language text DEFAULT 'en',
  invite_code text UNIQUE,
  invite_open boolean NOT NULL DEFAULT false,
  last_message_preview text,
  last_message_time timestamptz,
  last_message_sender_id text,
  unread_counts text,
  typing_user_ids text,
  online_user_ids text,
  last_seen text,
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  muted boolean NOT NULL DEFAULT false,
  is_group boolean NOT NULL DEFAULT false,
  group_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid()::text = ANY (participant_ids) OR invite_open = true);
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = ANY (participant_ids));
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid()::text = ANY (participant_ids) OR invite_open = true)
  WITH CHECK (auth.uid()::text = ANY (participant_ids) OR invite_open = true);
CREATE POLICY "conversations_delete" ON public.conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id AND _user_id::text = ANY (c.participant_ids)
  )
$$;

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  sender_name text,
  content text,
  translated_content text,
  original_language text,
  target_language text,
  type text NOT NULL DEFAULT 'text',
  audio_url text,
  video_url text,
  image_url text,
  file_url text,
  file_name text,
  file_size numeric,
  transcript text,
  translated_transcript text,
  duration text,
  reply_to_id text,
  reply_to_content text,
  reply_to_sender text,
  reactions text,
  read_by text,
  deleted boolean NOT NULL DEFAULT false,
  edited boolean NOT NULL DEFAULT false,
  is_guide boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid()::text AND public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "messages_update_participants" ON public.messages FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()))
  WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid()::text);

-- CALL SESSIONS
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id text NOT NULL,
  caller_name text,
  callee_id text,
  callee_name text,
  call_type text NOT NULL DEFAULT 'audio',
  status text NOT NULL DEFAULT 'ringing',
  offer_sdp text,
  answer_sdp text,
  ice_candidates_caller text,
  ice_candidates_callee text,
  caller_heartbeat timestamptz,
  callee_heartbeat timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_select" ON public.call_sessions FOR SELECT TO authenticated
  USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);
CREATE POLICY "calls_insert" ON public.call_sessions FOR INSERT TO authenticated
  WITH CHECK (caller_id = auth.uid()::text);
CREATE POLICY "calls_update" ON public.call_sessions FOR UPDATE TO authenticated
  USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text)
  WITH CHECK (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);
CREATE POLICY "calls_delete" ON public.call_sessions FOR DELETE TO authenticated
  USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);

-- PRESENCE
CREATE TABLE public.user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  last_active timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'online',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_select_authenticated" ON public.user_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "presence_insert_own" ON public.user_presence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_update_own" ON public.user_presence FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_delete_own" ON public.user_presence FOR DELETE TO authenticated USING (user_id = auth.uid());

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER call_sessions_updated_at BEFORE UPDATE ON public.call_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_presence_updated_at BEFORE UPDATE ON public.user_presence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- chat media storage policies
CREATE POLICY "chat_media_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-media');
CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media' AND owner = auth.uid());
CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media' AND owner = auth.uid());