-- ============================================
-- RESOURCE COMMENTS
-- Comments on resources and folders
-- ============================================

-- Create resource_comments table
CREATE TABLE IF NOT EXISTS resource_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES resource_folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Either resource_id or folder_id must be set, but not both
  CONSTRAINT comment_target CHECK (
    (resource_id IS NOT NULL AND folder_id IS NULL) OR
    (resource_id IS NULL AND folder_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE resource_comments ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_comments_resource ON resource_comments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_comments_folder ON resource_comments(folder_id);
CREATE INDEX IF NOT EXISTS idx_resource_comments_user ON resource_comments(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view comments on accessible resources" ON resource_comments;
DROP POLICY IF EXISTS "Users can create comments" ON resource_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON resource_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON resource_comments;

-- Users can view comments on resources they have access to
-- (same group membership check as resources)
CREATE POLICY "Users can view comments on accessible resources"
ON resource_comments FOR SELECT
TO authenticated
USING (
  -- Comment on a resource
  (resource_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM resources r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = resource_comments.resource_id
    AND gm.user_id = auth.uid()
  ))
  OR
  -- Comment on a folder
  (folder_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM resource_folders rf
    JOIN group_members gm ON gm.group_id = rf.group_id
    WHERE rf.id = resource_comments.folder_id
    AND gm.user_id = auth.uid()
  ))
);

-- Authenticated users can create comments on resources they can access
CREATE POLICY "Users can create comments"
ON resource_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- On a resource they can access
    (resource_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM resources r
      JOIN group_members gm ON gm.group_id = r.group_id
      WHERE r.id = resource_comments.resource_id
      AND gm.user_id = auth.uid()
    ))
    OR
    -- On a folder they can access
    (folder_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM resource_folders rf
      JOIN group_members gm ON gm.group_id = rf.group_id
      WHERE rf.id = resource_comments.folder_id
      AND gm.user_id = auth.uid()
    ))
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON resource_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments (leaders can delete any)
CREATE POLICY "Users can delete own comments"
ON resource_comments FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('leader', 'admin')
  )
);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE resource_comments;

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON resource_comments TO authenticated;

