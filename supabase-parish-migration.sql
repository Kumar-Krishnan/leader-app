-- ============================================
-- PARISH MIGRATION
-- Run this after the base schema is set up
-- ============================================

-- ============================================
-- PARISHES TABLE
-- ============================================
CREATE TABLE parishes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE, -- Join code for the parish
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE parishes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARISH MEMBERS TABLE (many-to-many)
-- ============================================
CREATE TABLE parish_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parish_id, user_id)
);

ALTER TABLE parish_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADD PARISH_ID TO EXISTING TABLES
-- ============================================

-- Threads belong to a parish
ALTER TABLE threads ADD COLUMN parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE;

-- Meetings belong to a parish
ALTER TABLE meetings ADD COLUMN parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE;

-- Resources belong to a parish
ALTER TABLE resources ADD COLUMN parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_parish_members_user_id ON parish_members(user_id);
CREATE INDEX idx_parish_members_parish_id ON parish_members(parish_id);
CREATE INDEX idx_threads_parish_id ON threads(parish_id);
CREATE INDEX idx_meetings_parish_id ON meetings(parish_id);
CREATE INDEX idx_resources_parish_id ON resources(parish_id);

-- ============================================
-- RLS POLICIES FOR PARISHES
-- ============================================

-- Anyone can view parishes they're a member of
CREATE POLICY "Users can view their parishes" ON parishes
  FOR SELECT
  USING (
    id IN (SELECT parish_id FROM parish_members WHERE user_id = auth.uid())
  );

-- Leaders/admins can create parishes
CREATE POLICY "Leaders can create parishes" ON parishes
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin')
  );

-- Parish admins can update their parish
CREATE POLICY "Parish admins can update parish" ON parishes
  FOR UPDATE
  USING (
    id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES FOR PARISH_MEMBERS
-- ============================================

-- Users can view members of parishes they belong to
CREATE POLICY "Users can view parish members" ON parish_members
  FOR SELECT
  USING (
    parish_id IN (SELECT parish_id FROM parish_members WHERE user_id = auth.uid())
  );

-- Parish admins can add members
CREATE POLICY "Parish admins can add members" ON parish_members
  FOR INSERT
  WITH CHECK (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
    OR NOT EXISTS (SELECT 1 FROM parish_members WHERE parish_id = parish_members.parish_id)
  );

-- Users can join via code (handled by function below)
-- Parish admins can remove members
CREATE POLICY "Parish admins can remove members" ON parish_members
  FOR DELETE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid() -- Users can leave
  );

-- ============================================
-- UPDATE EXISTING POLICIES TO BE PARISH-SCOPED
-- ============================================

-- Drop old thread policies
DROP POLICY IF EXISTS "Users can view their threads" ON threads;
DROP POLICY IF EXISTS "Leaders can create threads" ON threads;
DROP POLICY IF EXISTS "Leaders can update threads" ON threads;

-- New thread policies (parish-scoped)
CREATE POLICY "Users can view parish threads" ON threads
  FOR SELECT
  USING (
    parish_id IN (SELECT parish_id FROM parish_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Parish leaders can create threads" ON threads
  FOR INSERT
  WITH CHECK (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

CREATE POLICY "Parish leaders can update threads" ON threads
  FOR UPDATE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- Drop old meeting policies
DROP POLICY IF EXISTS "Anyone can view meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders can create meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders can update meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders can delete meetings" ON meetings;

-- New meeting policies (parish-scoped)
CREATE POLICY "Users can view parish meetings" ON meetings
  FOR SELECT
  USING (
    parish_id IN (SELECT parish_id FROM parish_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Parish leaders can create meetings" ON meetings
  FOR INSERT
  WITH CHECK (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

CREATE POLICY "Parish leaders can update meetings" ON meetings
  FOR UPDATE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

CREATE POLICY "Parish leaders can delete meetings" ON meetings
  FOR DELETE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- Drop old resource policies
DROP POLICY IF EXISTS "Users can view public resources" ON resources;
DROP POLICY IF EXISTS "Leaders can create resources" ON resources;
DROP POLICY IF EXISTS "Leaders can update resources" ON resources;
DROP POLICY IF EXISTS "Leaders can delete resources" ON resources;

-- New resource policies (parish-scoped)
CREATE POLICY "Users can view parish resources" ON resources
  FOR SELECT
  USING (
    parish_id IN (SELECT parish_id FROM parish_members WHERE user_id = auth.uid())
    AND (
      visibility = 'all'
      OR (
        visibility = 'leaders_only' 
        AND parish_id IN (
          SELECT parish_id FROM parish_members 
          WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
        )
      )
    )
  );

CREATE POLICY "Parish leaders can create resources" ON resources
  FOR INSERT
  WITH CHECK (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

CREATE POLICY "Parish leaders can update resources" ON resources
  FOR UPDATE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

CREATE POLICY "Parish leaders can delete resources" ON resources
  FOR DELETE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- ============================================
-- FUNCTION: Join parish by code
-- ============================================
CREATE OR REPLACE FUNCTION join_parish_by_code(parish_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_parish_id UUID;
BEGIN
  -- Find parish by code
  SELECT id INTO v_parish_id FROM parishes WHERE code = parish_code;
  
  IF v_parish_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parish code';
  END IF;
  
  -- Add user as member
  INSERT INTO parish_members (parish_id, user_id, role)
  VALUES (v_parish_id, auth.uid(), 'member')
  ON CONFLICT (parish_id, user_id) DO NOTHING;
  
  RETURN v_parish_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE TRIGGER update_parishes_updated_at
  BEFORE UPDATE ON parishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE parishes;
ALTER PUBLICATION supabase_realtime ADD TABLE parish_members;

