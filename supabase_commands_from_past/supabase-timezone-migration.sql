-- Timezone support for meetings & groups
-- Run this in the Supabase SQL Editor

-- Add timezone to groups (default Eastern for existing groups)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add timezone to meetings (NULL = inherit from group)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS timezone TEXT;
