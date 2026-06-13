DROP POLICY IF EXISTS "Anyone can view their own request by email" ON public.membership_requests;
DROP POLICY IF EXISTS "Authenticated users can view all requests" ON public.membership_requests;

CREATE POLICY "Staff can view membership requests"
  ON public.membership_requests
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Members update own profile" ON public.profiles;

CREATE POLICY "Members update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );
