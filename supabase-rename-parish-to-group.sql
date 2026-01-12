-- ============================================
-- RENAME PARISH TO GROUP
-- Complete rebrand from religious to generic language
-- ============================================

-- Rename tables
ALTER TABLE parishes RENAME TO groups;
ALTER TABLE parish_members RENAME TO group_members;
ALTER TABLE parish_join_requests RENAME TO group_join_requests;

-- Rename columns in threads
ALTER TABLE threads RENAME COLUMN parish_id TO group_id;

-- Rename columns in meetings
ALTER TABLE meetings RENAME COLUMN parish_id TO group_id;

-- Rename columns in resources
ALTER TABLE resources RENAME COLUMN parish_id TO group_id;

-- Rename columns in resource_folders
ALTER TABLE resource_folders RENAME COLUMN parish_id TO group_id;

-- Rename columns in group_members
ALTER TABLE group_members RENAME COLUMN parish_id TO group_id;

-- Rename columns in group_join_requests
ALTER TABLE group_join_requests RENAME COLUMN parish_id TO group_id;

-- Rename foreign key constraints on threads
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_parish_id_fkey;
ALTER TABLE threads ADD CONSTRAINT threads_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Rename foreign key constraints on meetings
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_parish_id_fkey;
ALTER TABLE meetings ADD CONSTRAINT meetings_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Rename foreign key constraints on resources
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_parish_id_fkey;
ALTER TABLE resources ADD CONSTRAINT resources_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Rename foreign key constraints on resource_folders
ALTER TABLE resource_folders DROP CONSTRAINT IF EXISTS resource_folders_parish_id_fkey;
ALTER TABLE resource_folders ADD CONSTRAINT resource_folders_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Rename foreign key constraints on group_members
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS parish_members_parish_id_fkey;
ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Rename foreign key constraints on group_join_requests
ALTER TABLE group_join_requests DROP CONSTRAINT IF EXISTS parish_join_requests_parish_id_fkey;
ALTER TABLE group_join_requests ADD CONSTRAINT group_join_requests_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_threads_parish_id;
CREATE INDEX idx_threads_group_id ON threads(group_id);

DROP INDEX IF EXISTS idx_meetings_parish_id;
CREATE INDEX idx_meetings_group_id ON meetings(group_id);

DROP INDEX IF EXISTS idx_resources_parish_id;
CREATE INDEX idx_resources_group_id ON resources(group_id);

DROP INDEX IF EXISTS idx_resource_folders_parish_id;
CREATE INDEX idx_resource_folders_group_id ON resource_folders(group_id);

DROP INDEX IF EXISTS idx_parish_members_parish_id;
CREATE INDEX idx_group_members_group_id ON group_members(group_id);

DROP INDEX IF EXISTS idx_parish_members_user_id;
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Note: RLS policies will need to be recreated with new table names
-- This will be done in a separate step to avoid breaking changes

