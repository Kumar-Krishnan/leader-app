-- ============================================
-- MEETING ATTENDEES TABLE
-- ============================================
CREATE TABLE meeting_attendees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'maybe')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
);

-- Enable RLS (but keep permissive for development)
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON meeting_attendees TO authenticated;

-- Permissive policies for development
CREATE POLICY "attendees_select" ON meeting_attendees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendees_insert" ON meeting_attendees FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "attendees_update" ON meeting_attendees FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendees_delete" ON meeting_attendees FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add realtime for meeting updates
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_attendees;

