-- Moro — user_photos table (ChatGPT-style normalized schema)
-- Run this in Supabase SQL Editor. Run AFTER schema-and-seed.sql and rls-policies.sql.

-- =============================================================================
-- 1. Create user_photos table
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id      text NOT NULL,
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_photos_auth_id ON user_photos (auth_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_display_order ON user_photos (auth_id, display_order);

-- =============================================================================
-- 2. Enable RLS
-- =============================================================================
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read any user's photos (for profile viewing)
CREATE POLICY "Authenticated can read user photos"
  ON user_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own photos"
  ON user_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid()::text);

CREATE POLICY "Users can update own photos"
  ON user_photos FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid()::text)
  WITH CHECK (auth_id = auth.uid()::text);

CREATE POLICY "Users can delete own photos"
  ON user_photos FOR DELETE
  TO authenticated
  USING (auth_id = auth.uid()::text);

-- NOTE: Existing users with additional_photo_urls will need to re-add photos from
-- the profile tab, or run a custom migration to copy URLs into user_photos.

