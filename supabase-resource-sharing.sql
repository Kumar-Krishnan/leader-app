-- Resource Sharing Feature Migration
-- Allows sharing resources and folders with other groups

-- Table for sharing individual resources with other groups
CREATE TABLE resource_group_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  shared_with_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_id, shared_with_group_id)
);

-- Table for sharing folders with other groups
CREATE TABLE resource_folder_group_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES resource_folders(id) ON DELETE CASCADE,
  shared_with_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(folder_id, shared_with_group_id)
);

-- Indexes for performance
CREATE INDEX idx_resource_group_shares_resource ON resource_group_shares(resource_id);
CREATE INDEX idx_resource_group_shares_group ON resource_group_shares(shared_with_group_id);
CREATE INDEX idx_folder_group_shares_folder ON resource_folder_group_shares(folder_id);
CREATE INDEX idx_folder_group_shares_group ON resource_folder_group_shares(shared_with_group_id);

-- RLS Policies
ALTER TABLE resource_group_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_folder_group_shares ENABLE ROW LEVEL SECURITY;

-- View shares: Members of either the source or target group can see shares
CREATE POLICY "View resource shares" ON resource_group_shares FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM resources r
    JOIN group_members gm ON gm.group_id = r.group_id OR gm.group_id = resource_group_shares.shared_with_group_id
    WHERE r.id = resource_group_shares.resource_id AND gm.user_id = auth.uid()
  )
);

-- Create shares: Only leaders/admins of the source group can share
CREATE POLICY "Create resource shares" ON resource_group_shares FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM resources r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = resource_group_shares.resource_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('leader', 'admin')
  )
);

-- Delete shares: Only leaders/admins of the source group can unshare
CREATE POLICY "Delete resource shares" ON resource_group_shares FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM resources r
    JOIN group_members gm ON gm.group_id = r.group_id
    WHERE r.id = resource_group_shares.resource_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('leader', 'admin')
  )
);

-- Similar policies for folder shares
CREATE POLICY "View folder shares" ON resource_folder_group_shares FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM resource_folders rf
    JOIN group_members gm ON gm.group_id = rf.group_id OR gm.group_id = resource_folder_group_shares.shared_with_group_id
    WHERE rf.id = resource_folder_group_shares.folder_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Create folder shares" ON resource_folder_group_shares FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM resource_folders rf
    JOIN group_members gm ON gm.group_id = rf.group_id
    WHERE rf.id = resource_folder_group_shares.folder_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('leader', 'admin')
  )
);

CREATE POLICY "Delete folder shares" ON resource_folder_group_shares FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM resource_folders rf
    JOIN group_members gm ON gm.group_id = rf.group_id
    WHERE rf.id = resource_folder_group_shares.folder_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('leader', 'admin')
  )
);

-- Helper function to check if a folder is a descendant of a shared folder
CREATE OR REPLACE FUNCTION is_folder_shared_to_user(check_folder_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
WITH RECURSIVE folder_ancestors AS (
  -- Start with the folder itself
  SELECT id, parent_id FROM resource_folders WHERE id = check_folder_id
  UNION ALL
  -- Recursively get parent folders
  SELECT rf.id, rf.parent_id
  FROM resource_folders rf
  JOIN folder_ancestors fa ON rf.id = fa.parent_id
)
SELECT EXISTS (
  SELECT 1 FROM folder_ancestors fa
  JOIN resource_folder_group_shares rfgs ON rfgs.folder_id = fa.id
  JOIN group_members gm ON gm.group_id = rfgs.shared_with_group_id
  WHERE gm.user_id = check_user_id
);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function for folder sharing (checks if folder or any ancestor is shared)
CREATE OR REPLACE FUNCTION is_folder_or_ancestor_shared_to_user(check_folder_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
WITH RECURSIVE folder_chain AS (
  SELECT id, parent_id FROM resource_folders WHERE id = check_folder_id
  UNION ALL
  SELECT rf.id, rf.parent_id
  FROM resource_folders rf
  JOIN folder_chain fc ON rf.id = fc.parent_id
)
SELECT EXISTS (
  SELECT 1 FROM folder_chain fc
  JOIN resource_folder_group_shares rfgs ON rfgs.folder_id = fc.id
  JOIN group_members gm ON gm.group_id = rfgs.shared_with_group_id
  WHERE gm.user_id = check_user_id
);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update resources RLS to allow viewing shared resources
DROP POLICY IF EXISTS "View resources in group" ON resources;
CREATE POLICY "View resources in group or shared" ON resources FOR SELECT
USING (
  -- Original group access (with visibility check)
  (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    AND (
      visibility = 'all'
      OR (visibility = 'leaders_only' AND group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
      ))
    )
  )
  OR
  -- Shared resource access (directly shared)
  EXISTS (
    SELECT 1 FROM resource_group_shares rgs
    JOIN group_members gm ON gm.group_id = rgs.shared_with_group_id
    WHERE rgs.resource_id = resources.id AND gm.user_id = auth.uid()
  )
  OR
  -- Access via shared folder (including nested folders)
  (resources.folder_id IS NOT NULL AND is_folder_shared_to_user(resources.folder_id, auth.uid()))
);

-- Update folders RLS - can view if member of group OR folder/ancestor is shared
DROP POLICY IF EXISTS "View resource folders in group" ON resource_folders;
CREATE POLICY "View resource folders in group or shared" ON resource_folders FOR SELECT
USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  OR
  is_folder_or_ancestor_shared_to_user(resource_folders.id, auth.uid())
);

-- Enable realtime for shares
ALTER PUBLICATION supabase_realtime ADD TABLE resource_group_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE resource_folder_group_shares;
