-- ============================================
-- HUBSPOT FILE SYNC SCHEMA
-- Sync files from HubSpot File Manager to app
-- ============================================

-- ============================================
-- HUBSPOT SYNC STATE TABLE
-- Track sync run history and statistics
-- ============================================
CREATE TABLE hubspot_sync_state (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  files_synced INTEGER DEFAULT 0,
  files_skipped INTEGER DEFAULT 0,
  files_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying latest sync state
CREATE INDEX idx_hubspot_sync_state_created_at ON hubspot_sync_state(created_at DESC);

-- ============================================
-- HUBSPOT FILES TABLE
-- Track HubSpot files for deduplication
-- ============================================
CREATE TABLE hubspot_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hubspot_file_id TEXT NOT NULL UNIQUE,
  hubspot_file_name TEXT NOT NULL,
  hubspot_file_size INTEGER,
  hubspot_file_url TEXT,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'failed', 'deleted')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for deduplication lookups
CREATE INDEX idx_hubspot_files_hubspot_file_id ON hubspot_files(hubspot_file_id);
CREATE INDEX idx_hubspot_files_resource_id ON hubspot_files(resource_id);

-- ============================================
-- GROUPS TABLE MODIFICATIONS
-- Add system group support
-- ============================================
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS system_type TEXT;

-- Index for system group lookups
CREATE INDEX idx_groups_system_type ON groups(system_type) WHERE system_type IS NOT NULL;

-- ============================================
-- CREATE HUBSPOT SYSTEM GROUP
-- ============================================
INSERT INTO groups (name, description, is_system, system_type, code)
VALUES (
  'HubSpot Resources',
  'Automatically synced resources from HubSpot File Manager',
  true,
  'hubspot',
  'HUBSPOT-SYSTEM'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- TRIGGER: Auto-add leaders to HubSpot group
-- ============================================
CREATE OR REPLACE FUNCTION add_leader_to_hubspot_group()
RETURNS TRIGGER AS $$
DECLARE
  hubspot_group_id UUID;
BEGIN
  -- Only process if user is becoming a leader or admin
  IF NEW.role IN ('leader', 'admin') THEN
    -- Get the HubSpot system group ID
    SELECT id INTO hubspot_group_id
    FROM groups
    WHERE system_type = 'hubspot'
    LIMIT 1;

    IF hubspot_group_id IS NOT NULL THEN
      -- Add user to HubSpot group as member
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (hubspot_group_id, NEW.id, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_becomes_leader ON profiles;

-- Create trigger for new leaders (insert or role update)
CREATE TRIGGER on_profile_becomes_leader
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION add_leader_to_hubspot_group();

-- ============================================
-- BACKFILL: Add existing leaders to HubSpot group
-- ============================================
INSERT INTO group_members (group_id, user_id, role)
SELECT g.id, p.id, 'member'
FROM profiles p
CROSS JOIN groups g
WHERE p.role IN ('leader', 'admin')
  AND g.system_type = 'hubspot'
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

-- HubSpot sync state: only service role can access
ALTER TABLE hubspot_sync_state ENABLE ROW LEVEL SECURITY;

-- Allow admins to view sync state for monitoring
CREATE POLICY "Admins can view sync state" ON hubspot_sync_state
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- HubSpot files: read-only for admins, service role handles writes
ALTER TABLE hubspot_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view hubspot files" ON hubspot_files
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- RPC: Get latest sync state
-- ============================================
CREATE OR REPLACE FUNCTION get_latest_hubspot_sync_state()
RETURNS hubspot_sync_state AS $$
BEGIN
  RETURN (
    SELECT * FROM hubspot_sync_state
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Get HubSpot group ID
-- ============================================
CREATE OR REPLACE FUNCTION get_hubspot_group_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM groups
    WHERE system_type = 'hubspot'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME: Enable for sync state (optional)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE hubspot_sync_state;
