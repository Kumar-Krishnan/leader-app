-- ============================================
-- RLS HARDENING MIGRATION
-- Run in Supabase SQL Editor
-- All changes are idempotent (DROP IF EXISTS before CREATE)
-- ============================================

-- ============================================
-- SECTION 1: FIX meeting_attendees RLS (CRITICAL)
-- Current: 4 policies all just check auth.uid() IS NOT NULL
-- New: Proper group-membership and role checks
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "attendees_select" ON meeting_attendees;
DROP POLICY IF EXISTS "attendees_insert" ON meeting_attendees;
DROP POLICY IF EXISTS "attendees_update" ON meeting_attendees;
DROP POLICY IF EXISTS "attendees_delete" ON meeting_attendees;

-- SELECT: User is member of the meeting's group
CREATE POLICY "attendees_select" ON meeting_attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = meeting_attendees.meeting_id
        AND gm.user_id = auth.uid()
    )
  );

-- INSERT: User is leader-helper/leader/admin in the meeting's group
CREATE POLICY "attendees_insert" ON meeting_attendees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = meeting_attendees.meeting_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- UPDATE: User is updating their own record OR is leader/admin in the group
CREATE POLICY "attendees_update" ON meeting_attendees
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM meetings m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = meeting_attendees.meeting_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('leader', 'admin')
    )
  );

-- DELETE: User is leader/admin in the meeting's group
CREATE POLICY "attendees_delete" ON meeting_attendees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = meeting_attendees.meeting_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('leader', 'admin')
    )
  );

-- Add indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);


-- ============================================
-- SECTION 2: HARDEN SECURITY DEFINER FUNCTIONS
-- These bypass RLS — add internal authorization checks
-- ============================================

-- 2a. approve_join_request: Verify caller is leader-helper+ in the request's group
CREATE OR REPLACE FUNCTION approve_join_request(request_id UUID)
RETURNS VOID AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM group_join_requests WHERE id = request_id;

  IF req IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Authorization: caller must be leader-helper+ in the request's group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = req.group_id
      AND user_id = auth.uid()
      AND role IN ('leader-helper', 'leader', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: you must be a leader-helper or above in this group';
  END IF;

  -- Add user to group
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (req.group_id, req.user_id, 'member');

  -- Update request status
  UPDATE group_join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2b. reject_join_request: Verify caller is leader-helper+ in the request's group
CREATE OR REPLACE FUNCTION reject_join_request(request_id UUID)
RETURNS VOID AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM group_join_requests WHERE id = request_id;

  IF req IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Authorization: caller must be leader-helper+ in the request's group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = req.group_id
      AND user_id = auth.uid()
      AND role IN ('leader-helper', 'leader', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: you must be a leader-helper or above in this group';
  END IF;

  UPDATE group_join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2c. update_member_role: Verify caller is leader/admin; prevent role escalation
CREATE OR REPLACE FUNCTION update_member_role(member_id UUID, new_role TEXT)
RETURNS VOID AS $$
DECLARE
  v_target RECORD;
  v_caller_role TEXT;
BEGIN
  -- Validate role value
  IF new_role NOT IN ('member', 'leader-helper', 'leader', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Get the target member's group
  SELECT * INTO v_target FROM group_members WHERE id = member_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Get caller's role in the same group
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = v_target.group_id
    AND user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Permission denied: you are not a member of this group';
  END IF;

  -- Only leader or admin can change roles
  IF v_caller_role NOT IN ('leader', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: only leaders and admins can change roles';
  END IF;

  -- Non-admins cannot grant admin role
  IF new_role = 'admin' AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied: only admins can grant admin role';
  END IF;

  UPDATE group_members
  SET role = new_role
  WHERE id = member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2d. create_placeholder_member: Verify caller is leader-helper+ in target group; prevent role escalation
CREATE OR REPLACE FUNCTION create_placeholder_member(
  p_group_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
  v_placeholder_id UUID;
  v_existing_user_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Validate role value
  IF p_role NOT IN ('member', 'leader-helper', 'leader', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Authorization: caller must be leader-helper+ in the target group
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = p_group_id
    AND user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('leader-helper', 'leader', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: you must be a leader-helper or above in this group';
  END IF;

  -- Prevent role escalation: cannot assign a role higher than your own
  -- Role hierarchy: member < leader-helper < leader < admin
  IF p_role = 'admin' AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied: only admins can assign admin role';
  END IF;

  IF p_role = 'leader' AND v_caller_role NOT IN ('leader', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: only leaders and admins can assign leader role';
  END IF;

  -- Check if real user with this email already exists
  SELECT id INTO v_existing_user_id
  FROM profiles
  WHERE LOWER(email) = LOWER(p_email);

  IF v_existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A user with email % already exists. Add them as a regular member instead.', p_email;
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

  RETURN v_placeholder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2e. rsvp_to_series: Verify p_user_id = auth.uid(); validate status value
CREATE OR REPLACE FUNCTION rsvp_to_series(
  p_series_id UUID,
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Authorization: can only RSVP for yourself
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: you can only RSVP for yourself';
  END IF;

  -- Validate status value
  IF p_status NOT IN ('invited', 'accepted', 'declined', 'maybe') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

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


-- ============================================
-- SECTION 3: PREVENT PROFILE ROLE ESCALATION
-- Current: Users can update own profile including role
-- Fix: WITH CHECK prevents changing role column
-- ============================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with WITH CHECK that prevents role changes
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );


-- ============================================
-- SECTION 4: SCOPE STORAGE BUCKET POLICIES
-- Current: All 4 policies just check auth.role() = 'authenticated'
-- Fix: Extract group_id from file path and check membership
-- File path format: {groupId}/... or {groupId}/{folder}/...
-- ============================================

-- Drop existing permissive storage policies
DROP POLICY IF EXISTS "Users can view resource files" ON storage.objects;
DROP POLICY IF EXISTS "Leaders can upload resource files" ON storage.objects;
DROP POLICY IF EXISTS "Leaders can update resource files" ON storage.objects;
DROP POLICY IF EXISTS "Leaders can delete resource files" ON storage.objects;

-- SELECT: User is member of file's group
CREATE POLICY "Users can view resource files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.user_id = auth.uid()
        AND group_members.group_id = (storage.foldername(name))[1]::uuid
    )
  );

-- INSERT: User is leader-helper+ in file's group
CREATE POLICY "Leaders can upload resource files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.user_id = auth.uid()
        AND group_members.group_id = (storage.foldername(name))[1]::uuid
        AND group_members.role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- UPDATE: User is leader-helper+ in file's group
CREATE POLICY "Leaders can update resource files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.user_id = auth.uid()
        AND group_members.group_id = (storage.foldername(name))[1]::uuid
        AND group_members.role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- DELETE: User is leader/admin in file's group
CREATE POLICY "Leaders can delete resource files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.user_id = auth.uid()
        AND group_members.group_id = (storage.foldername(name))[1]::uuid
        AND group_members.role IN ('leader', 'admin')
    )
  );


-- ============================================
-- SECTION 5: ADD MISSING DELETE POLICIES
-- ============================================

-- 5a. groups: Creator or group admin can delete
DROP POLICY IF EXISTS "Delete groups" ON groups;
CREATE POLICY "Delete groups" ON groups
  FOR DELETE USING (
    created_by = auth.uid()
    OR id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5b. threads: Creator or leader/admin in group can delete
DROP POLICY IF EXISTS "Delete threads" ON threads;
CREATE POLICY "Delete threads" ON threads
  FOR DELETE USING (
    created_by = auth.uid()
    OR group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- 5c. thread_members: Self-removal or leader/admin in group can delete
DROP POLICY IF EXISTS "Delete thread members" ON thread_members;
CREATE POLICY "Delete thread members" ON thread_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR thread_id IN (
      SELECT id FROM threads WHERE group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
      )
    )
  );


-- ============================================
-- SECTION 6: DOCUMENT resource_shares (LEGACY)
-- RLS enabled + zero policies = all access denied by default
-- This is intentional — leaving a comment for documentation
-- ============================================

COMMENT ON TABLE resource_shares IS
  'Legacy table. RLS enabled with no policies — all direct access denied by default. '
  'Access is handled through application-level logic or SECURITY DEFINER functions if needed.';
