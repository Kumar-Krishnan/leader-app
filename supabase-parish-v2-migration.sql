-- ============================================
-- PARISH V2 MIGRATION
-- Adds: leader-helper role, join request approval system
-- Run this AFTER the base parish migration
-- ============================================

-- ============================================
-- UPDATE PARISH_MEMBERS ROLE CHECK
-- ============================================
ALTER TABLE parish_members 
  DROP CONSTRAINT IF EXISTS parish_members_role_check;

ALTER TABLE parish_members 
  ADD CONSTRAINT parish_members_role_check 
  CHECK (role IN ('member', 'leader-helper', 'leader', 'admin'));

-- ============================================
-- PARISH JOIN REQUESTS TABLE
-- ============================================
CREATE TABLE parish_join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parish_id, user_id)
);

ALTER TABLE parish_join_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR JOIN REQUESTS
-- ============================================

-- Users can view their own requests
CREATE POLICY "Users can view their own join requests" ON parish_join_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Parish leaders can view requests for their parish
CREATE POLICY "Parish leaders can view join requests" ON parish_join_requests
  FOR SELECT
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- Anyone can create a join request
CREATE POLICY "Users can request to join" ON parish_join_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Leaders can update requests (approve/reject)
CREATE POLICY "Leaders can review join requests" ON parish_join_requests
  FOR UPDATE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- ============================================
-- UPDATE PARISH CREATION POLICY
-- Only global leaders can create parishes
-- ============================================
DROP POLICY IF EXISTS "Leaders can create parishes" ON parishes;

CREATE POLICY "Global leaders can create parishes" ON parishes
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin')
  );

-- ============================================
-- UPDATE PARISH MEMBER POLICIES
-- ============================================
DROP POLICY IF EXISTS "Parish admins can add members" ON parish_members;

-- Only allow adding members through approval process or initial creation
CREATE POLICY "Leaders can add approved members" ON parish_members
  FOR INSERT
  WITH CHECK (
    -- Allow parish creator (no existing members yet)
    NOT EXISTS (SELECT 1 FROM parish_members WHERE parish_id = parish_members.parish_id)
    OR
    -- Allow leaders/admins to add members
    parish_id IN (
      SELECT pm.parish_id FROM parish_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- Leaders can update member roles
CREATE POLICY "Leaders can update member roles" ON parish_members
  FOR UPDATE
  USING (
    parish_id IN (
      SELECT pm.parish_id FROM parish_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('leader', 'admin')
    )
  );

-- ============================================
-- FUNCTION: Request to join parish
-- ============================================
CREATE OR REPLACE FUNCTION request_to_join_parish(parish_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_parish_id UUID;
  v_request_id UUID;
BEGIN
  -- Find parish by code
  SELECT id INTO v_parish_id FROM parishes WHERE code = parish_code;
  
  IF v_parish_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parish code';
  END IF;
  
  -- Check if already a member
  IF EXISTS (SELECT 1 FROM parish_members WHERE parish_id = v_parish_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already a member of this parish';
  END IF;
  
  -- Check if request already exists
  IF EXISTS (SELECT 1 FROM parish_join_requests WHERE parish_id = v_parish_id AND user_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending request for this parish';
  END IF;
  
  -- Create join request
  INSERT INTO parish_join_requests (parish_id, user_id, status)
  VALUES (v_parish_id, auth.uid(), 'pending')
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Approve join request
-- ============================================
CREATE OR REPLACE FUNCTION approve_join_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_request parish_join_requests%ROWTYPE;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM parish_join_requests WHERE id = request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request has already been processed';
  END IF;
  
  -- Check if user is a leader in this parish
  IF NOT EXISTS (
    SELECT 1 FROM parish_members 
    WHERE parish_id = v_request.parish_id 
      AND user_id = auth.uid() 
      AND role IN ('leader-helper', 'leader', 'admin')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to approve requests';
  END IF;
  
  -- Update request status
  UPDATE parish_join_requests 
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = request_id;
  
  -- Add user as member
  INSERT INTO parish_members (parish_id, user_id, role)
  VALUES (v_request.parish_id, v_request.user_id, 'member');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Reject join request
-- ============================================
CREATE OR REPLACE FUNCTION reject_join_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_request parish_join_requests%ROWTYPE;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM parish_join_requests WHERE id = request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request has already been processed';
  END IF;
  
  -- Check if user is a leader in this parish
  IF NOT EXISTS (
    SELECT 1 FROM parish_members 
    WHERE parish_id = v_request.parish_id 
      AND user_id = auth.uid() 
      AND role IN ('leader-helper', 'leader', 'admin')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to reject requests';
  END IF;
  
  -- Update request status
  UPDATE parish_join_requests 
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = request_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Promote member to leader-helper or leader
-- ============================================
CREATE OR REPLACE FUNCTION update_member_role(member_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_member parish_members%ROWTYPE;
BEGIN
  -- Validate role
  IF new_role NOT IN ('member', 'leader-helper', 'leader') THEN
    RAISE EXCEPTION 'Invalid role. Must be member, leader-helper, or leader';
  END IF;
  
  -- Get the member
  SELECT * INTO v_member FROM parish_members WHERE id = member_id;
  
  IF v_member IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  
  -- Check if current user is leader/admin in this parish
  IF NOT EXISTS (
    SELECT 1 FROM parish_members 
    WHERE parish_id = v_member.parish_id 
      AND user_id = auth.uid() 
      AND role IN ('leader', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only leaders and admins can change member roles';
  END IF;
  
  -- Update role
  UPDATE parish_members SET role = new_role WHERE id = member_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_join_requests_parish_id ON parish_join_requests(parish_id);
CREATE INDEX idx_join_requests_user_id ON parish_join_requests(user_id);
CREATE INDEX idx_join_requests_status ON parish_join_requests(status);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE parish_join_requests;

