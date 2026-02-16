-- ============================================
-- PLACEHOLDER PROFILES MIGRATION
-- Allows group admins to create placeholder profiles
-- for users who haven't signed up yet
-- ============================================

-- ============================================
-- 1. CREATE PLACEHOLDER PROFILES TABLE
-- ============================================
CREATE TABLE placeholder_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)  -- One placeholder per email globally
);

CREATE INDEX idx_placeholder_profiles_email ON placeholder_profiles(email);

ALTER TABLE placeholder_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view placeholders in their groups
CREATE POLICY "View placeholder profiles" ON placeholder_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS: Leaders can create placeholder profiles
CREATE POLICY "Create placeholder profiles" ON placeholder_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- RLS: Leaders can update placeholder profiles
CREATE POLICY "Update placeholder profiles" ON placeholder_profiles
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS: Leaders can delete placeholder profiles
CREATE POLICY "Delete placeholder profiles" ON placeholder_profiles
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 2. MODIFY GROUP_MEMBERS TABLE
-- ============================================

-- Add nullable placeholder_id column
ALTER TABLE group_members
ADD COLUMN placeholder_id UUID REFERENCES placeholder_profiles(id) ON DELETE CASCADE;

-- Make user_id nullable
ALTER TABLE group_members ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing unique constraint on (group_id, user_id)
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

-- Either user_id OR placeholder_id must be set (not both)
ALTER TABLE group_members
ADD CONSTRAINT group_members_user_or_placeholder
CHECK (
  (user_id IS NOT NULL AND placeholder_id IS NULL) OR
  (user_id IS NULL AND placeholder_id IS NOT NULL)
);

-- Separate unique indexes for each type
CREATE UNIQUE INDEX group_members_group_user_key
  ON group_members(group_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX group_members_group_placeholder_key
  ON group_members(group_id, placeholder_id) WHERE placeholder_id IS NOT NULL;

-- ============================================
-- 3. MODIFY MEETING_ATTENDEES TABLE
-- ============================================

-- First, check if meeting_attendees exists and has user_id as NOT NULL
-- Add nullable placeholder_id column
ALTER TABLE meeting_attendees
ADD COLUMN placeholder_id UUID REFERENCES placeholder_profiles(id) ON DELETE CASCADE;

-- Make user_id nullable
ALTER TABLE meeting_attendees ALTER COLUMN user_id DROP NOT NULL;

-- Either user_id OR placeholder_id must be set (not both)
ALTER TABLE meeting_attendees
ADD CONSTRAINT meeting_attendees_user_or_placeholder
CHECK (
  (user_id IS NOT NULL AND placeholder_id IS NULL) OR
  (user_id IS NULL AND placeholder_id IS NOT NULL)
);

-- Drop existing unique constraint if any
ALTER TABLE meeting_attendees DROP CONSTRAINT IF EXISTS meeting_attendees_meeting_id_user_id_key;

-- Separate unique indexes
CREATE UNIQUE INDEX meeting_attendees_meeting_user_key
  ON meeting_attendees(meeting_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX meeting_attendees_meeting_placeholder_key
  ON meeting_attendees(meeting_id, placeholder_id) WHERE placeholder_id IS NOT NULL;

-- ============================================
-- 4. RPC FUNCTION: CREATE PLACEHOLDER MEMBER
-- ============================================
CREATE OR REPLACE FUNCTION create_placeholder_member(
  p_group_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
  v_placeholder_id UUID;
  v_existing_user_id UUID;
  v_existing_user_name TEXT;
  v_already_member BOOLEAN := FALSE;
  v_inserted_count INTEGER;
BEGIN
  -- Check if real user with this email already exists
  SELECT id, full_name INTO v_existing_user_id, v_existing_user_name
  FROM profiles
  WHERE LOWER(email) = LOWER(p_email);

  IF v_existing_user_id IS NOT NULL THEN
    -- Try to add the existing user to the group
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (p_group_id, v_existing_user_id, p_role)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    v_already_member := (v_inserted_count = 0);

    RETURN jsonb_build_object(
      'id', v_existing_user_id,
      'is_existing_user', TRUE,
      'already_member', v_already_member,
      'full_name', v_existing_user_name
    );
  END IF;

  -- Find or create placeholder_profile record
  INSERT INTO placeholder_profiles (email, full_name, created_by)
  VALUES (LOWER(p_email), p_full_name, auth.uid())
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, placeholder_profiles.full_name)
  RETURNING id INTO v_placeholder_id;

  -- Add placeholder to group_members with specified role
  INSERT INTO group_members (group_id, placeholder_id, role)
  VALUES (p_group_id, v_placeholder_id, p_role)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_placeholder_id,
    'is_existing_user', FALSE,
    'already_member', FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. RPC FUNCTION: MIGRATE PLACEHOLDER TO USER
-- ============================================
CREATE OR REPLACE FUNCTION migrate_placeholder_to_user(
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS VOID AS $$
DECLARE
  v_placeholder_id UUID;
BEGIN
  -- Find placeholder with matching email
  SELECT id INTO v_placeholder_id
  FROM placeholder_profiles
  WHERE LOWER(email) = LOWER(p_user_email);

  IF v_placeholder_id IS NULL THEN
    -- No placeholder to migrate
    RETURN;
  END IF;

  -- Transfer group_members records
  UPDATE group_members
  SET user_id = p_user_id, placeholder_id = NULL
  WHERE placeholder_id = v_placeholder_id;

  -- Transfer meeting_attendees records
  UPDATE meeting_attendees
  SET user_id = p_user_id, placeholder_id = NULL
  WHERE placeholder_id = v_placeholder_id;

  -- Delete placeholder_profile (no longer needed)
  DELETE FROM placeholder_profiles WHERE id = v_placeholder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER: AUTO-MIGRATE ON PROFILE CREATION
-- ============================================
CREATE OR REPLACE FUNCTION on_profile_created_migrate_placeholder()
RETURNS TRIGGER AS $$
BEGIN
  -- Attempt to migrate any placeholder with matching email
  PERFORM migrate_placeholder_to_user(NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_migrate_placeholder_on_profile ON profiles;
CREATE TRIGGER trigger_migrate_placeholder_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION on_profile_created_migrate_placeholder();

-- ============================================
-- 7. ADD PLACEHOLDER PROFILES TO REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE placeholder_profiles;
