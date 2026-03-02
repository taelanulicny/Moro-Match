-- Add image_url to celebrities (required for 1-to-1 face match)
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS image_url text;

-- Insert your first 10 celebrities (image_url is NULL initially — add URLs in Supabase Table Editor)
INSERT INTO celebrities (name, slug, image_url) VALUES
  ('Leonardo DiCaprio', 'leonardo-dicaprio', NULL),
  ('Brad Pitt', 'brad-pitt', NULL),
  ('Michael B. Jordan', 'michael-b-jordan', NULL),
  ('Denzel Washington', 'denzel-washington', NULL),
  ('Timothée Chalamet', 'timothee-chalamet', NULL),
  ('Zendaya', 'zendaya', NULL),
  ('Rihanna', 'rihanna', NULL),
  ('Beyoncé', 'beyonce', NULL),
  ('Margot Robbie', 'margot-robbie', NULL),
  ('Scarlett Johansson', 'scarlett-johansson', NULL)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  image_url = COALESCE(celebrities.image_url, EXCLUDED.image_url);
