-- Migration: Add 'members_only' visibility option for Member Hub resources
-- Run this in your Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_visibility_check;

-- Add the new constraint with 'members_only' option
ALTER TABLE resources ADD CONSTRAINT resources_visibility_check
  CHECK (visibility IN ('all', 'leaders_only', 'members_only'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'resources'::regclass AND contype = 'c';
