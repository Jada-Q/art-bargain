-- Storage bucket for artwork images.
-- Public read (so the browse page can render images without signed URLs).
-- Authenticated users may write within a folder matching their auth.uid().

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artworks',
  'artworks',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop any prior policies (idempotent re-run safety).
DROP POLICY IF EXISTS "artworks_storage_read_public"   ON storage.objects;
DROP POLICY IF EXISTS "artworks_storage_insert_own"    ON storage.objects;
DROP POLICY IF EXISTS "artworks_storage_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "artworks_storage_delete_own"    ON storage.objects;

CREATE POLICY "artworks_storage_read_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'artworks');

CREATE POLICY "artworks_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artworks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "artworks_storage_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'artworks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "artworks_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'artworks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
