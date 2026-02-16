-- Migration: Update create_placeholder_member to handle existing users
-- Run this in the Supabase SQL Editor
--
-- Changes:
-- - Return type changed from UUID to JSONB
-- - When email matches an existing user, adds them to the group directly
-- - Returns metadata: { id, is_existing_user, already_member, full_name }

-- Must drop first because return type is changing from UUID to JSONB
DROP FUNCTION IF EXISTS create_placeholder_member(uuid, text, text, text);

CREATE OR REPLACE FUNCTION create_placeholder_member(
  p_group_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
  v_placeholder_id UUID;
  v_existing_user_id UUID;
  v_existing_user_name TEXT;
  v_already_member BOOLEAN := FALSE;
  v_inserted_count INTEGER;
BEGIN
  -- Check if real user with this email already exists
  SELECT id, full_name INTO v_existing_user_id, v_existing_user_name
  FROM profiles
  WHERE LOWER(email) = LOWER(p_email);

  IF v_existing_user_id IS NOT NULL THEN
    -- Try to add the existing user to the group
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (p_group_id, v_existing_user_id, p_role)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    v_already_member := (v_inserted_count = 0);

    RETURN jsonb_build_object(
      'id', v_existing_user_id,
      'is_existing_user', TRUE,
      'already_member', v_already_member,
      'full_name', v_existing_user_name
    );
  END IF;

  -- Find or create placeholder_profile record
  INSERT INTO placeholder_profiles (email, full_name, created_by)
  VALUES (LOWER(p_email), p_full_name, auth.uid())
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, placeholder_profiles.full_name)
  RETURNING id INTO v_placeholder_id;

  -- Add placeholder to group_members with specified role
  INSERT INTO group_members (group_id, placeholder_id, role)
  VALUES (p_group_id, v_placeholder_id, p_role)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_placeholder_id,
    'is_existing_user', FALSE,
    'already_member', FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
