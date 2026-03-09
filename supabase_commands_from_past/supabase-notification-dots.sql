-- Migration: Notification dots for GroupSidebar
-- 1. Add last_read_at to thread_members
-- 2. RPC: get_unread_thread_groups
-- 3. RPC: get_pending_reminder_groups

-- Step 1: Add last_read_at column
ALTER TABLE thread_members ADD COLUMN IF NOT EXISTS last_read_at timestamptz DEFAULT now();

-- Step 2: RPC to get groups with unread thread messages for a user
CREATE OR REPLACE FUNCTION get_unread_thread_groups(p_user_id uuid)
RETURNS TABLE(group_id uuid, unread_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT t.group_id, COUNT(m.id) AS unread_count
  FROM thread_members tm
  JOIN threads t ON t.id = tm.thread_id
  JOIN messages m ON m.thread_id = t.id
  WHERE tm.user_id = p_user_id
    AND m.created_at > tm.last_read_at
    AND m.sender_id != p_user_id
    AND t.is_archived = false
  GROUP BY t.group_id
  HAVING COUNT(m.id) > 0;
$$;

-- Step 3: RPC to get groups with pending (unsent) meeting reminders
-- Only returns groups where the user is a leader, admin, or leader-helper
CREATE OR REPLACE FUNCTION get_pending_reminder_groups(p_user_id uuid)
RETURNS TABLE(group_id uuid, pending_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT mg.group_id, COUNT(DISTINCT mg.id) AS pending_count
  FROM meetings mg
  JOIN group_members gm ON gm.group_id = mg.group_id
  WHERE gm.user_id = p_user_id
    AND gm.role IN ('leader', 'admin', 'leader-helper')
    AND mg.date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM meeting_reminder_tokens mrt
      WHERE mrt.meeting_id = mg.id
        AND mrt.attendee_email_sent_at IS NOT NULL
    )
  GROUP BY mg.group_id
  HAVING COUNT(DISTINCT mg.id) > 0;
$$;
