
-- Department enum
CREATE TYPE public.volunteer_department AS ENUM (
  'food','parking','helper','children_management','water_keeper','pastor_assistant'
);

-- Events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text,
  event_date timestamptz NOT NULL,
  cover_photo_url text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view events" ON public.events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update events" ON public.events
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete events" ON public.events
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Event volunteers
CREATE TABLE public.event_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  department public.volunteer_department NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, department)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_volunteers TO authenticated;
GRANT ALL ON public.event_volunteers TO service_role;

ALTER TABLE public.event_volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own registrations" ON public.event_volunteers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all registrations" ON public.event_volunteers
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Members register self" ON public.event_volunteers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members cancel own registration" ON public.event_volunteers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff manage registrations" ON public.event_volunteers
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_event_volunteers_updated_at
  BEFORE UPDATE ON public.event_volunteers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for event-photos bucket (bucket created via tool)
CREATE POLICY "Public read event photos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'event-photos');
CREATE POLICY "Staff upload event photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-photos' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update event photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'event-photos' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete event photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'event-photos' AND public.is_staff(auth.uid()));
