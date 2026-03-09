-- ============================================
-- MEETING SERIES SUPPORT
-- Add series tracking for recurring events
-- ============================================

-- Add series_id to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS series_id UUID;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS series_index INTEGER; -- 1, 2, 3... for display like "Event (1/4)"
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS series_total INTEGER; -- Total events in series

-- Create index for faster series lookups
CREATE INDEX IF NOT EXISTS idx_meetings_series_id ON meetings(series_id);

-- Add series-level RSVP tracking to meeting_attendees
-- When a user RSVPs to a series, we create individual records for each meeting
-- but track that it was a series-level decision
ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS is_series_rsvp BOOLEAN DEFAULT false;

-- Function to RSVP to all meetings in a series
CREATE OR REPLACE FUNCTION rsvp_to_series(
  p_series_id UUID,
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update all attendee records for this user in this series
  UPDATE meeting_attendees ma
  SET 
    status = p_status,
    responded_at = NOW(),
    is_series_rsvp = true
  FROM meetings m
  WHERE ma.meeting_id = m.id
    AND m.series_id = p_series_id
    AND ma.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get series info for a meeting
CREATE OR REPLACE FUNCTION get_series_meetings(p_series_id UUID)
RETURNS TABLE (
  meeting_id UUID,
  title TEXT,
  date TIMESTAMPTZ,
  series_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.title, m.date, m.series_index
  FROM meetings m
  WHERE m.series_id = p_series_id
  ORDER BY m.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

