-- Meeting Co-Leaders
-- Allows group leaders/leader-helpers/admins to be designated as co-leaders for meetings.
-- Co-leaders have full parity with the creator: receive reminders, send emails, edit series, skip meetings.

-- 1. Create the meeting_co_leaders junction table
CREATE TABLE IF NOT EXISTS meeting_co_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- 2. Indexes
CREATE INDEX idx_meeting_co_leaders_meeting_id ON meeting_co_leaders(meeting_id);
CREATE INDEX idx_meeting_co_leaders_user_id ON meeting_co_leaders(user_id);

-- 3. RLS
ALTER TABLE meeting_co_leaders ENABLE ROW LEVEL SECURITY;

-- Group members can read co-leaders for meetings in their groups
CREATE POLICY "Group members can view meeting co-leaders"
  ON meeting_co_leaders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = meeting_co_leaders.meeting_id
        AND gm.user_id = auth.uid()
    )
  );

-- Group leaders/admins can insert co-leaders
CREATE POLICY "Group leaders can add meeting co-leaders"
  ON meeting_co_leaders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = meeting_co_leaders.meeting_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('leader', 'admin')
    )
  );

-- Group leaders/admins can delete co-leaders
CREATE POLICY "Group leaders can remove meeting co-leaders"
  ON meeting_co_leaders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = meeting_co_leaders.meeting_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('leader', 'admin')
    )
  );

-- 4. Alter meeting_reminder_tokens: drop old UNIQUE(meeting_id) if it exists,
--    add UNIQUE(meeting_id, leader_id) so each co-leader gets their own token.
--    NOTE: The old constraint name may vary. Check with:
--    SELECT constraint_name FROM information_schema.table_constraints
--    WHERE table_name = 'meeting_reminder_tokens' AND constraint_type = 'UNIQUE';

-- Drop existing unique constraint on meeting_id (if it exists)
-- You may need to adjust the constraint name based on your schema
DO $$
BEGIN
  -- Try to drop the unique constraint on meeting_id alone
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'meeting_reminder_tokens'
      AND tc.constraint_type = 'UNIQUE'
      AND ccu.column_name = 'meeting_id'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage ccu2
        WHERE ccu2.constraint_name = tc.constraint_name
          AND ccu2.column_name = 'leader_id'
      )
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE meeting_reminder_tokens DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'meeting_reminder_tokens'
        AND tc.constraint_type = 'UNIQUE'
        AND ccu.column_name = 'meeting_id'
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage ccu2
          WHERE ccu2.constraint_name = tc.constraint_name
            AND ccu2.column_name = 'leader_id'
        )
      LIMIT 1
    );
  END IF;
END $$;

-- Add new unique constraint on (meeting_id, leader_id)
ALTER TABLE meeting_reminder_tokens
  ADD CONSTRAINT meeting_reminder_tokens_meeting_leader_unique
  UNIQUE (meeting_id, leader_id);
