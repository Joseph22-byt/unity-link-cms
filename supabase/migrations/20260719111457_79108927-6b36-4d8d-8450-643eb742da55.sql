DROP POLICY IF EXISTS "Anyone can view their own request by email" ON public.membership_requests;
REVOKE SELECT ON public.membership_requests FROM anon;