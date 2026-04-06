-- NOSONAR: S1192 — 'contracts' is the bucket name; cannot define SQL constants in migrations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Authenticated users can read contracts" ON storage.objects;
CREATE POLICY "Authenticated users can read contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Service role manages contracts" ON storage.objects;
CREATE POLICY "Service role manages contracts"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'contracts')
  WITH CHECK (bucket_id = 'contracts');
