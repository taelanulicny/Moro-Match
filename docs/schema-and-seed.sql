-- Moro — Run this ENTIRE script once in Supabase SQL Editor
-- It creates the tables (if they don't exist) and seeds celebrities.

-- =============================================================================
-- 1. Celebrities table
-- =============================================================================
CREATE TABLE IF NOT EXISTS celebrities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_celebrities_slug ON celebrities (slug);

-- =============================================================================
-- 2. Users table
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id               text NOT NULL UNIQUE,
  display_name          text NOT NULL,
  gender                text,
  age                   integer,
  selfie_url            text,
  additional_photo_urls text[] DEFAULT '{}',
  matched_celebrity_id   uuid REFERENCES celebrities (id),
  matched_celebrity_name text,
  similarity_percent     integer DEFAULT 0,
  bio                   text,
  instagram_handle      text,
  tiktok_handle         text,
  socials_visible       boolean NOT NULL DEFAULT true,
  subscription_tier     text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_ends_at  timestamptz,
  push_enabled          boolean NOT NULL DEFAULT true,
  discovery_gender      text NOT NULL DEFAULT 'everyone' CHECK (discovery_gender IN ('everyone', 'men', 'women')),
  discovery_age_min     integer NOT NULL DEFAULT 18,
  discovery_age_max     integer NOT NULL DEFAULT 99,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users (auth_id);
CREATE INDEX IF NOT EXISTS idx_users_matched_celebrity ON users (matched_celebrity_id);

-- =============================================================================
-- 3. Updated_at trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- =============================================================================
-- 4. Seed celebrities (safe to run more than once)
-- =============================================================================
INSERT INTO celebrities (name, slug) VALUES
  ('Leonardo DiCaprio', 'leonardo-dicaprio'),
  ('Zendaya', 'zendaya'),
  ('Timothée Chalamet', 'timothee-chalamet'),
  ('Margot Robbie', 'margot-robbie'),
  ('Ryan Gosling', 'ryan-gosling')
ON CONFLICT (slug) DO NOTHING;
