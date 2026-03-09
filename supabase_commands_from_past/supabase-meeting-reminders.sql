-- Meeting Reminder Tokens Table
-- Stores tokens for leader email confirmation flow

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the meeting_reminder_tokens table
CREATE TABLE meeting_reminder_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,

  -- State tracking
  reminder_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  attendee_email_sent_at TIMESTAMPTZ,

  -- Customized content (filled on confirmation)
  custom_description TEXT,
  custom_message TEXT,

  -- Security
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One token per meeting
  UNIQUE(meeting_id)
);

-- Index for fast token lookups
CREATE INDEX idx_reminder_tokens_token ON meeting_reminder_tokens(token);

-- Index for finding expired tokens (cleanup)
CREATE INDEX idx_reminder_tokens_expires ON meeting_reminder_tokens(expires_at);

-- Index for finding unprocessed tokens by meeting date
CREATE INDEX idx_reminder_tokens_meeting ON meeting_reminder_tokens(meeting_id);

-- RLS policies
ALTER TABLE meeting_reminder_tokens ENABLE ROW LEVEL SECURITY;

-- Leaders can view their own tokens
CREATE POLICY "Leaders can view their own reminder tokens"
  ON meeting_reminder_tokens
  FOR SELECT
  USING (auth.uid() = leader_id);

-- Only service role can insert/update (edge functions)
-- No user-facing insert/update policies needed

-- Comment for documentation
COMMENT ON TABLE meeting_reminder_tokens IS 'Stores secure tokens for meeting reminder email confirmation flow';
COMMENT ON COLUMN meeting_reminder_tokens.token IS 'Secure 64-character hex token for email confirmation links';
COMMENT ON COLUMN meeting_reminder_tokens.reminder_sent_at IS 'When the reminder email was sent to the leader';
COMMENT ON COLUMN meeting_reminder_tokens.confirmed_at IS 'When the leader confirmed and triggered attendee emails';
COMMENT ON COLUMN meeting_reminder_tokens.attendee_email_sent_at IS 'When emails were sent to attendees';
COMMENT ON COLUMN meeting_reminder_tokens.custom_description IS 'Leader-customized description for the reminder';
COMMENT ON COLUMN meeting_reminder_tokens.custom_message IS 'Personal message from leader to attendees';
COMMENT ON COLUMN meeting_reminder_tokens.expires_at IS 'Token expiration time (7 days from creation)';
