-- Moro — Storage bucket policies (for Avatars bucket)
-- Run this in Supabase SQL Editor so the app can upload selfies.
-- Safe to run multiple times: drops existing policies first.
--
-- IMPORTANT: Make the Avatars bucket PUBLIC so images load in the app.
-- Supabase Dashboard → Storage → Avatars → ⋮ menu → Edit → Enable "Public bucket"

DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;

-- Allow authenticated users to upload only to their own folder: {auth_id}/...
-- bucket_id can be 'Avatars' or 'avatars' depending on how the bucket was created
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    (bucket_id = 'Avatars' OR bucket_id = 'avatars')
    AND name LIKE ((SELECT auth.uid())::text || '/%')
  );

-- Allow authenticated users to read any object in the bucket (for public profile photos)
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'Avatars' OR bucket_id = 'avatars');

-- Allow authenticated users to update/delete their own files
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    (bucket_id = 'Avatars' OR bucket_id = 'avatars')
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    (bucket_id = 'Avatars' OR bucket_id = 'avatars')
    AND name LIKE (auth.uid()::text || '/%')
  );
