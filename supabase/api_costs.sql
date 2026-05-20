-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS api_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  api_name text NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  cost_usd numeric(10, 4) NOT NULL,
  duration_seconds int,
  has_audio boolean DEFAULT false,
  error_message text,
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE api_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service insert" ON api_costs;
DROP POLICY IF EXISTS "service select" ON api_costs;

CREATE POLICY "service insert" ON api_costs
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "service select" ON api_costs
  FOR SELECT TO public USING (true);
