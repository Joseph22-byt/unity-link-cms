
CREATE POLICY "Authenticated read ebooks" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'ebooks');
CREATE POLICY "Staff write ebooks" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ebooks' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update ebooks" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'ebooks' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete ebooks" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'ebooks' AND public.is_staff(auth.uid()));

CREATE POLICY "Authenticated read gallery" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'gallery');
CREATE POLICY "Staff write gallery" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update gallery" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'gallery' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete gallery" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND public.is_staff(auth.uid()));
