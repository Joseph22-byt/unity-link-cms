CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view messages" ON public.messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Staff update messages" ON public.messages
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff delete messages" ON public.messages
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX messages_created_at_idx ON public.messages (created_at DESC);