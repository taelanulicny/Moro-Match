-- Moro — Add matched_celebrity_name for Clarifai (stores celebrity name when not in our DB)
-- Run in Supabase SQL Editor if you've already run schema-and-seed.sql

ALTER TABLE users
ADD COLUMN IF NOT EXISTS matched_celebrity_name text;

COMMENT ON COLUMN users.matched_celebrity_name IS 'Celebrity name from Clarifai when not in celebrities table';
