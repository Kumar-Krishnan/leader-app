-- Anonymous Location Events for Analytics
-- This table stores location events WITHOUT linking to specific users
-- Used for understanding geographic distribution of app usage

-- Create the anonymous location events table
CREATE TABLE IF NOT EXISTS location_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Approximate location (2 decimal places = ~1km grid)
  lat DECIMAL(5,2) NOT NULL,  -- e.g., 33.75 (not 33.7489)
  lng DECIMAL(6,2) NOT NULL,  -- e.g., -84.39 (not -84.3880)
  
  -- Event metadata
  event_type TEXT NOT NULL DEFAULT 'app_open', -- 'app_open', 'login', 'signup'
  platform TEXT, -- 'ios', 'android', 'web'
  
  -- Timestamp only (no user reference)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for analytics queries
CREATE INDEX idx_location_events_created_at ON location_events(created_at);
CREATE INDEX idx_location_events_coords ON location_events(lat, lng);
CREATE INDEX idx_location_events_type ON location_events(event_type);

-- RLS: Allow inserts from authenticated users (anonymous - no user_id stored)
ALTER TABLE location_events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert (we don't store who)
CREATE POLICY "Allow anonymous location inserts"
  ON location_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can view (for analytics dashboard)
CREATE POLICY "Admins can view location events"
  ON location_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT INSERT ON location_events TO authenticated;
GRANT SELECT ON location_events TO authenticated;

-- Useful analytics views
CREATE OR REPLACE VIEW location_events_daily AS
SELECT 
  DATE(created_at) as date,
  lat,
  lng,
  event_type,
  platform,
  COUNT(*) as event_count
FROM location_events
GROUP BY DATE(created_at), lat, lng, event_type, platform
ORDER BY date DESC;

CREATE OR REPLACE VIEW location_events_by_region AS
SELECT 
  ROUND(lat::numeric, 1) as lat_region,  -- ~10km regions
  ROUND(lng::numeric, 1) as lng_region,
  COUNT(*) as total_events,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM location_events
GROUP BY lat_region, lng_region
ORDER BY total_events DESC;

-- Comment explaining the privacy model
COMMENT ON TABLE location_events IS 
'Anonymous location events for analytics. 
NO user_id is stored - events cannot be linked to specific users.
Coordinates are rounded to 2 decimals (~1km accuracy) for privacy.
Used for understanding geographic distribution of app usage.';

