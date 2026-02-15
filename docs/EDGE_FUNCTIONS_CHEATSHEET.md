# Edge Functions Cheat Sheet

## Prerequisites

Replace these placeholders in commands below:
- `<SUPABASE_URL>` - Your Supabase project URL (e.g. `https://xyz.supabase.co`)
- `<SERVICE_ROLE_KEY>` - Your service_role key (Project Settings > API)
- `<ANON_KEY>` - Your anon/public key
- `<USER_JWT>` - A logged-in user's JWT token (from browser dev tools, `supabase.auth.getSession()`)

---

## Deploy Functions

```bash
# Deploy all three edge functions
supabase functions deploy generate-meeting-reminders --no-verify-jwt
supabase functions deploy meeting-confirmation-page --no-verify-jwt
supabase functions deploy send-meeting-email --no-verify-jwt

# Set the APP_URL secret (used by reminder emails to link to the app)
supabase secrets set APP_URL=https://leader-app.netlify.app

# Verify they're deployed
supabase functions list
```

---

## Manually Trigger: Generate Meeting Reminders (Leader Cron)

This is the function that finds meetings in the next 48 hours and emails leaders a confirmation link.

```bash
curl -X POST '<SUPABASE_URL>/functions/v1/generate-meeting-reminders' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -d '{}'
```

**What it does:**
1. Finds meetings within the next 48 hours
2. Creates a secure token for each meeting's leader
3. Sends the leader an email with a "Review & Send Reminder" link
4. The link goes to `https://leader-app.netlify.app/confirm-reminder?token=...`

**Expected response:**
```json
{
  "success": true,
  "message": "Processed 2 meetings, skipped 1",
  "processed": 2,
  "skipped": 1
}
```

**Troubleshooting:**
- `"No meetings found in target window"` - No meetings exist in the next 48 hours
- `"skipped"` count means reminders were already sent for those meetings
- To re-send: delete the row from `meeting_reminder_tokens` for that meeting, then re-trigger

---

## Manually Trigger: Meeting Confirmation Page (JSON API)

This is called by the app's ConfirmReminderScreen. You can also test it directly.

**Fetch meeting data:**
```bash
curl '<SUPABASE_URL>/functions/v1/meeting-confirmation-page?token=<TOKEN>' \
  -H 'Accept: application/json'
```

**Confirm and send reminder emails to attendees:**
```bash
curl -X POST '<SUPABASE_URL>/functions/v1/meeting-confirmation-page?token=<TOKEN>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "We will be discussing chapter 5.",
    "message": "Looking forward to seeing everyone!"
  }'
```

---

## Manually Trigger: Send Meeting Email (Direct Invite)

This sends a meeting invite/notification email from a leader to attendees. Requires a user JWT.

```bash
curl -X POST '<SUPABASE_URL>/functions/v1/send-meeting-email' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <USER_JWT>' \
  -d '{
    "meetingId": "<MEETING_UUID>",
    "customMessage": "See you there!",
    "customDescription": "Optional override for the description"
  }'
```

---

## SQL: Run Migration for Timezone Support

Run in the Supabase SQL Editor:
```sql
ALTER TABLE groups ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS timezone TEXT;
```

## SQL: Check/Reset Reminder Tokens

```sql
-- See all reminder tokens
SELECT mrt.*, m.title, m.date
FROM meeting_reminder_tokens mrt
JOIN meetings m ON m.id = mrt.meeting_id
ORDER BY mrt.created_at DESC;

-- Delete a token to allow re-sending a reminder
DELETE FROM meeting_reminder_tokens WHERE meeting_id = '<MEETING_UUID>';

-- See cron job status
SELECT * FROM cron.job;

-- See recent cron runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## SQL: Manually Trigger Cron (from SQL Editor)

Instead of waiting for the 8-hour cron cycle, run this in the SQL Editor:
```sql
SELECT net.http_post(
  url := '<SUPABASE_URL>/functions/v1/generate-meeting-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
  ),
  body := '{}'::jsonb
);
```

---

## Local Development

```bash
# Serve all functions locally
supabase functions serve

# Then test against localhost
curl -X POST 'http://localhost:54321/functions/v1/generate-meeting-reminders' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -d '{}'
```
