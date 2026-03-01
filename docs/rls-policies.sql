-- Moro — Row Level Security (RLS) policies
-- Run this in Supabase SQL Editor AFTER schema-and-seed.sql so the app can read/write data.

-- =============================================================================
-- 1. Enable RLS on tables
-- =============================================================================
ALTER TABLE celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Celebrities: anyone can read (for search, profiles)
-- =============================================================================
CREATE POLICY "Anyone can read celebrities"
  ON celebrities FOR SELECT
  USING (true);

-- =============================================================================
-- 3. Users: authenticated can read all (for profiles, search, randomize)
-- =============================================================================
CREATE POLICY "Authenticated can read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- 4. Users: can insert own row (on sign up)
-- =============================================================================
CREATE POLICY "Users can insert own row"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid()::text);

-- =============================================================================
-- 5. Users: can update own row only
-- =============================================================================
CREATE POLICY "Users can update own row"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid()::text)
  WITH CHECK (auth_id = auth.uid()::text);
