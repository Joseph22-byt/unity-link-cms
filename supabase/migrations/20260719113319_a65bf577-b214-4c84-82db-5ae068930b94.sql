
-- Restrict membership_requests SELECT to staff only
DROP POLICY IF EXISTS "Authenticated users can view all requests" ON public.membership_requests;
CREATE POLICY "Staff can view membership requests"
  ON public.membership_requests
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Restrict event-photos bucket read to authenticated users
DROP POLICY IF EXISTS "Public read event photos" ON storage.objects;
CREATE POLICY "Authenticated read event photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-photos');
