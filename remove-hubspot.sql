-- ============================================
-- REMOVE HUBSPOT INTEGRATION
-- Run this manually in the Supabase SQL Editor
-- ============================================

BEGIN;

-- 1. Drop RLS policies on hubspot tables
DROP POLICY IF EXISTS "View hubspot sync state" ON hubspot_sync_state;
DROP POLICY IF EXISTS "Insert hubspot sync state" ON hubspot_sync_state;
DROP POLICY IF EXISTS "Update hubspot sync state" ON hubspot_sync_state;
DROP POLICY IF EXISTS "View hubspot files" ON hubspot_files;
DROP POLICY IF EXISTS "Insert hubspot files" ON hubspot_files;
DROP POLICY IF EXISTS "Update hubspot files" ON hubspot_files;
-- Catch any other policy names
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename IN ('hubspot_sync_state', 'hubspot_files')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON hubspot_sync_state', pol.policyname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hubspot_files', pol.policyname);
  END LOOP;
END $$;

-- 2. Drop hubspot-only triggers (must come before dropping the functions they call)
DROP TRIGGER IF EXISTS on_profile_becomes_leader ON profiles;
DROP TRIGGER IF EXISTS on_resource_deleted_mark_hubspot ON resources;

-- 3. Drop hubspot-related functions
DROP FUNCTION IF EXISTS get_hubspot_group_id();
DROP FUNCTION IF EXISTS add_leader_to_hubspot_group();
DROP FUNCTION IF EXISTS get_latest_hubspot_sync_state();
DROP FUNCTION IF EXISTS mark_hubspot_file_deleted();
DROP FUNCTION IF EXISTS mark_hubspot_file_deleted(UUID);

-- 4. Drop hubspot tables
DROP TABLE IF EXISTS hubspot_files;
DROP TABLE IF EXISTS hubspot_sync_state;

-- 5. Delete the "HubSpot Resources" system group and its members
DELETE FROM group_members WHERE group_id IN (
  SELECT id FROM groups WHERE is_system = true AND system_type = 'hubspot'
);
DELETE FROM groups WHERE is_system = true AND system_type = 'hubspot';

-- 6. Drop system group columns from groups table
ALTER TABLE groups DROP COLUMN IF EXISTS is_system;
ALTER TABLE groups DROP COLUMN IF EXISTS system_type;

-- 7. Drop hubspot_contact_id from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS hubspot_contact_id;

COMMIT;
