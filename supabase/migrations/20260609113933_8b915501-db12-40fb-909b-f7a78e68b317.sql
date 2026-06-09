CREATE TABLE public.membership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('member','pastor','staff')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.membership_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_requests TO authenticated;
GRANT ALL ON public.membership_requests TO service_role;

ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a membership request"
ON public.membership_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view their own request by email"
ON public.membership_requests FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated users can view all requests"
ON public.membership_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can update membership requests"
ON public.membership_requests FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete membership requests"
ON public.membership_requests FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_membership_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_membership_requests_updated_at
BEFORE UPDATE ON public.membership_requests
FOR EACH ROW EXECUTE FUNCTION public.update_membership_requests_updated_at();