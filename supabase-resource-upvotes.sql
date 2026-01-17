-- ============================================
-- RESOURCE UPVOTES
-- Track upvotes on resources with leader/user distinction
-- ============================================

-- Create resource_upvotes table
CREATE TABLE IF NOT EXISTS resource_upvotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_leader_upvote BOOLEAN NOT NULL DEFAULT false,  -- True if user was a leader when they upvoted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Each user can only upvote a resource once
  UNIQUE(resource_id, user_id)
);

-- Enable RLS
ALTER TABLE resource_upvotes ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_upvotes_resource ON resource_upvotes(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_upvotes_user ON resource_upvotes(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view upvotes on accessible resources" ON resource_upvotes;
DROP POLICY IF EXISTS "Users can upvote accessible resources" ON resource_upvotes;
DROP POLICY IF EXISTS "Users can remove own upvotes" ON resource_upvotes;

-- Users can view upvotes on resources they have access to
CREATE POLICY "Users can view upvotes on accessible resources"
ON resource_upvotes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM resources r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = resource_upvotes.resource_id
    AND gm.user_id = auth.uid()
  )
);

-- Users can upvote resources they have access to
CREATE POLICY "Users can upvote accessible resources"
ON resource_upvotes FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM resources r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = resource_upvotes.resource_id
    AND gm.user_id = auth.uid()
  )
);

-- Users can remove their own upvotes
CREATE POLICY "Users can remove own upvotes"
ON resource_upvotes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- HELPER VIEW FOR UPVOTE COUNTS
-- ============================================
DROP VIEW IF EXISTS resource_upvote_counts;

CREATE VIEW resource_upvote_counts AS
SELECT 
  resource_id,
  COUNT(*) as total_upvotes,
  COUNT(*) FILTER (WHERE is_leader_upvote = true) as leader_upvotes,
  COUNT(*) FILTER (WHERE is_leader_upvote = false) as user_upvotes
FROM resource_upvotes
GROUP BY resource_id;

-- Grant access to the view
GRANT SELECT ON resource_upvote_counts TO authenticated;

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON resource_upvotes TO authenticated;

