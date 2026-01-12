-- ============================================
-- MESSAGES UPDATE/DELETE POLICY
-- Allow users to edit/delete their own messages
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Allow users to update their own messages
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  USING (sender_id = auth.uid());

