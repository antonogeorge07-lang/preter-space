CREATE TABLE public.conversation_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid,
  reason text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.conversation_reports TO authenticated;
GRANT ALL ON public.conversation_reports TO service_role;
ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reports_insert_own ON public.conversation_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY reports_select_own ON public.conversation_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_message_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON p.id::text = ANY (c.participant_ids)
    WHERE c.id = NEW.conversation_id
      AND p.id::text <> NEW.sender_id
      AND NEW.sender_id = ANY (p.blocked_user_ids)
  ) INTO blocked;

  IF blocked THEN
    RAISE EXCEPTION 'Message blocked by recipient';
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER messages_enforce_block
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_block();