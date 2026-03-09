-- Rename profile-level roles to avoid confusion with group-level roles
-- 'user' → 'standard', 'leader' → 'organizer', 'admin' stays 'admin'
--
-- This ONLY affects profiles.role (global app role).
-- group_members.role ('member', 'leader-helper', 'leader', 'admin') is NOT changed.

BEGIN;

-- 1. Drop the existing CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Update existing data
UPDATE profiles SET role = 'standard' WHERE role = 'user';
UPDATE profiles SET role = 'organizer' WHERE role = 'leader';

-- 3. Update the default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'standard';

-- 4. Add the new CHECK constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('standard', 'organizer', 'admin'));

COMMIT;
