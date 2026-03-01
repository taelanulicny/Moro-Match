-- Next Best — Minimal MVP Schema
-- Run against Postgres (e.g. Supabase). For pgvector, enable extension first:
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Optional: use vector(n) when pgvector is enabled; otherwise omit face_embedding columns
-- and do all similarity in application code.

-- =============================================================================
-- Celebrities (curated list; precomputed embeddings)
-- =============================================================================
CREATE TABLE celebrities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  -- face_embedding vector(512),  -- uncomment when using pgvector
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_celebrities_slug ON celebrities (slug);

-- =============================================================================
-- Users
-- =============================================================================
CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id               text NOT NULL UNIQUE,
  display_name          text NOT NULL,
  selfie_url            text,
  -- face_embedding      vector(512),  -- uncomment when using pgvector
  matched_celebrity_id  uuid REFERENCES celebrities (id),
  instagram_handle      text,
  tiktok_handle         text,
  subscription_tier     text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_ends_at  timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_auth_id ON users (auth_id);
CREATE INDEX idx_users_matched_celebrity ON users (matched_celebrity_id);

-- =============================================================================
-- Phase 2: Extra matches for premium ($1/mo)
-- =============================================================================
-- CREATE TABLE user_celebrity_matches (
--   user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
--   celebrity_id uuid NOT NULL REFERENCES celebrities (id),
--   rank         smallint NOT NULL,
--   score        real,
--   created_at   timestamptz NOT NULL DEFAULT now(),
--   PRIMARY KEY (user_id, celebrity_id)
-- );
-- CREATE INDEX idx_user_celebrity_matches_user ON user_celebrity_matches (user_id);

-- =============================================================================
-- Updated_at trigger (optional)
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
