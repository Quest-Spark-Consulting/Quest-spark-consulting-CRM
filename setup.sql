-- Run this in your Supabase SQL Editor (SQL Editor > New Query)
-- at https://supabase.com/dashboard/project/fncdviwlfcvtpxhvuvke/sql/new

-- 1. Create the app_data table
CREATE TABLE IF NOT EXISTS app_data (
  id integer PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Insert the initial row
INSERT INTO app_data (id, data) VALUES (1, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow public access (no auth in this app)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON app_data
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Realtime for cross-device sync
ALTER TABLE app_data REPLICA IDENTITY FULL;

-- Also enable Realtime via the publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE app_data;
COMMIT;

-- Verify everything worked
SELECT * FROM app_data;
