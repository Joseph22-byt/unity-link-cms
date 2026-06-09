
CREATE POLICY "Members read own photo" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'member-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid())));

CREATE POLICY "Members upload own photo" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Members update own photo" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'member-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid())));

CREATE POLICY "Members delete own photo" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'member-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid())));
