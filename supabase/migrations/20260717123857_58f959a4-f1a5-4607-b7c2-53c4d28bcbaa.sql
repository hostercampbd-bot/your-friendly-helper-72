
CREATE POLICY "Admins manage plugin-releases objects"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'plugin-releases' AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'plugin-releases' AND private.has_role(auth.uid(), 'admin'::app_role));
