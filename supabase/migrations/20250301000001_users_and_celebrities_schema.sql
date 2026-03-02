-- Replace users and celebrities tables with new schema
-- WARNING: This drops existing users and celebrities data. Run only on a fresh DB or when you're ready to reset.

-- Drop dependent objects first (e.g. RLS policies, triggers, FKs from other tables)
DROP TABLE IF EXISTS user_photos CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS celebrities CASCADE;

-- =============================================================================
-- Celebrities
-- =============================================================================
CREATE TABLE celebrities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  image_url  text NOT NULL,
  gender     text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_celebrities_slug ON celebrities (slug);

-- =============================================================================
-- Users
-- =============================================================================
CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id               uuid UNIQUE,
  selfie_url            text,
  selected_celebrity_id uuid REFERENCES celebrities (id),
  similarity_score      numeric,
  is_match              boolean,
  confidence            text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_users_auth_id ON users (auth_id);
CREATE INDEX idx_users_selected_celebrity ON users (selected_celebrity_id);

-- =============================================================================
-- Updated_at trigger for users
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- =============================================================================
-- Seed 10 celebrities (replace image_url in Table Editor with real face photo URLs)
-- =============================================================================
INSERT INTO celebrities (name, slug, image_url) VALUES
  ('Leonardo DiCaprio', 'leonardo-dicaprio', 'https://rutaizvihlfgknwuzdus.supabase.co/storage/v1/object/public/celebrities/leonardo-dicaprio.jpg'),
  ('Brad Pitt', 'brad-pitt', 'https://placeholder.com/brad-pitt'),
  ('Michael B. Jordan', 'michael-b-jordan', 'https://placeholder.com/michael-b-jordan'),
  ('Denzel Washington', 'denzel-washington', 'https://placeholder.com/denzel-washington'),
  ('Timothée Chalamet', 'timothee-chalamet', 'https://placeholder.com/timothee-chalamet'),
  ('Zendaya', 'zendaya', 'https://placeholder.com/zendaya'),
  ('Rihanna', 'rihanna', 'https://placeholder.com/rihanna'),
  ('Beyoncé', 'beyonce', 'https://placeholder.com/beyonce'),
  ('Margot Robbie', 'margot-robbie', 'https://placeholder.com/margot-robbie'),
  ('Scarlett Johansson', 'scarlett-johansson', 'https://placeholder.com/scarlett-johansson');
