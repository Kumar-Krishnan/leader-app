-- Meeting Reminder Cron Setup
-- Run this in the Supabase SQL Editor to schedule the meeting reminder function every 8 hours.
--
-- Prerequisites:
--   1. supabase-meeting-reminders.sql has been run (creates meeting_reminder_tokens table)
--   2. generate-meeting-reminders edge function has been deployed
--   3. meeting-confirmation-page edge function has been deployed (with --no-verify-jwt)
--
-- IMPORTANT: Replace the two placeholders below with your actual values before running:
--   <SUPABASE_URL>      - Your Supabase project URL (e.g. https://xyz.supabase.co)
--   <SERVICE_ROLE_KEY>   - Your Supabase service_role key (from Project Settings > API)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the meeting reminders check every 8 hours (midnight, 8am, 4pm UTC)
SELECT cron.schedule(
  'meeting-reminders-check',
  '0 */8 * * *',
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/generate-meeting-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
