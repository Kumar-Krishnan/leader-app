# Meeting Reminder System

## What It Does

Automated email reminders sent to meeting leaders 2 days before their meetings. Leaders can customize the message before it's sent to all attendees.

**Flow:**
1. Daily scheduler finds meetings ~48 hours away
2. Leader receives email with "Review & Send Reminder" button
3. Leader clicks link → opens web confirmation page
4. Leader customizes description and adds personal message
5. Leader clicks confirm → emails sent to all attendees

---

## Setup Steps

### 1. Run Database Migration

Apply the migration to create the `meeting_reminder_tokens` table:

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Run SQL directly in Supabase Dashboard → SQL Editor
# Paste contents of: supabase-meeting-reminders.sql
```

The migration creates:
- `meeting_reminder_tokens` table
- Indexes for token lookups and expiration
- RLS policies (leaders can view their own tokens)

### 2. Deploy Edge Functions

Deploy both new Edge Functions:

```bash
supabase functions deploy generate-meeting-reminders
supabase functions deploy meeting-confirmation-page
```

### 3. Verify SendGrid Configuration

The Edge Functions use existing SendGrid secrets. Verify they're set:

```bash
supabase secrets list
```

Required secrets (should already exist from `send-meeting-email`):
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`

If not set:
```bash
supabase secrets set SENDGRID_API_KEY=SG.your-api-key
supabase secrets set SENDGRID_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set SENDGRID_FROM_NAME="Leader App"
```

### 4. Add GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret | Value | Notes |
|--------|-------|-------|
| `SUPABASE_URL` | `https://yourproject.supabase.co` | May already exist from HubSpot sync |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Found in Supabase Dashboard → Settings → API |

**Important:** Use the **service role key**, not the anon key. The function needs elevated permissions to query meetings and send emails.

### 5. Enable GitHub Actions Workflow

The workflow file is already created at `.github/workflows/meeting-reminders.yml`. It will run automatically at 9 AM UTC daily.

To verify it's enabled:
1. Go to GitHub repo → Actions tab
2. Find "Meeting Reminder Scheduler" workflow
3. Enable it if prompted

---

## Testing

### Manual Trigger

1. Create a test meeting with date **exactly 2 days from now** (within a 2-hour window: 47-49 hours)
2. Ensure the meeting has a `created_by` user with a valid email
3. Add some attendees with status `invited` or `accepted`
4. Trigger the workflow manually:
   - GitHub → Actions → "Meeting Reminder Scheduler" → "Run workflow"
   - Or via curl:
     ```bash
     curl -X POST "https://PROJECT.supabase.co/functions/v1/generate-meeting-reminders" \
       -H "Authorization: Bearer SERVICE_ROLE_KEY" \
       -H "Content-Type: application/json"
     ```

### Verify End-to-End

1. **Check leader email** — Should receive "[Action Required] Confirm reminder for..." email
2. **Click confirmation link** — Opens web page with meeting details and form
3. **Fill in form** — Edit description, add personal message
4. **Click confirm** — Should see success page
5. **Check attendee emails** — All invited/accepted attendees should receive reminder
6. **Check database** — `meeting_reminder_tokens` table should show:
   - `reminder_sent_at` — When leader email was sent
   - `confirmed_at` — When leader clicked confirm
   - `attendee_email_sent_at` — When attendee emails were sent
   - `custom_description` / `custom_message` — Leader's customizations

---

## Files

| File | Purpose |
|------|---------|
| `supabase/functions/generate-meeting-reminders/index.ts` | Finds meetings 2 days out, sends leader emails |
| `supabase/functions/meeting-confirmation-page/index.ts` | Web page for leader to review and confirm |
| `supabase/functions/_shared/html-utils.ts` | HTML escaping, date formatting, token generation |
| `.github/workflows/meeting-reminders.yml` | Daily scheduler (9 AM UTC) |
| `supabase-meeting-reminders.sql` | Database migration |
| `src/types/database.ts` | TypeScript types for `MeetingReminderToken` |

---

## How It Works

### Scheduler (generate-meeting-reminders)

Runs daily at 9 AM UTC. For each meeting where:
- Date is 47-49 hours from now (approximately 2 days)
- Has a `created_by` user
- No reminder has been sent yet

It:
1. Generates a secure 64-character hex token
2. Creates a `meeting_reminder_tokens` record (expires in 7 days)
3. Sends email to the leader with confirmation link
4. Updates `reminder_sent_at` timestamp

### Confirmation Page (meeting-confirmation-page)

**GET request** — Renders HTML form showing:
- Meeting title, date, time, location
- Attendee count
- Editable description (pre-filled with meeting description)
- Empty message field for personal note
- "Confirm & Send" button

**POST request** — Processes confirmation:
1. Validates token (not expired, not used, meeting still in future)
2. Saves custom description and message to token record
3. Fetches attendees with status `invited` or `accepted`
4. Sends reminder email to all attendees via SendGrid
5. Updates `confirmed_at` and `attendee_email_sent_at` timestamps
6. Returns success page

### Token Security

- 64-character cryptographically random hex string
- 7-day expiration
- Single-use (checking `confirmed_at` prevents reuse)
- One token per meeting (unique constraint on `meeting_id`)

---

## Email Templates

### Leader Reminder Email

**Subject:** `[Action Required] Confirm reminder for "Meeting Title" - March 15`

**Content:**
- "Your meeting is coming up in 2 days"
- Meeting details (date, time, location, attendee count)
- CTA button: "Review & Send Reminder"
- Note: "This link expires in 7 days"

### Attendee Reminder Email

**Subject:** `Reminder: "Meeting Title" - March 15`

**Content:**
- Meeting details (date, time, location)
- Custom description (or original if not edited)
- Personal message from leader (highlighted box, if provided)
- Footer: "Sent by Leader Name via Group Name"

---

## Database Schema

### meeting_reminder_tokens

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `meeting_id` | uuid (FK) | References meetings(id), unique |
| `leader_id` | uuid (FK) | References profiles(id) |
| `token` | text | 64-char hex, unique |
| `reminder_sent_at` | timestamptz | When leader email sent |
| `confirmed_at` | timestamptz | When leader confirmed |
| `attendee_email_sent_at` | timestamptz | When attendee emails sent |
| `custom_description` | text | Leader's edited description |
| `custom_message` | text | Leader's personal note |
| `expires_at` | timestamptz | Token expiration (7 days) |
| `created_at` | timestamptz | Record creation |

---

## Troubleshooting

### No emails being sent

1. Check SendGrid secrets are set: `supabase secrets list`
2. Check SendGrid dashboard for blocked/bounced emails
3. Check Edge Function logs: `supabase functions logs generate-meeting-reminders`

### Token link not working

1. Check token hasn't expired (7-day limit)
2. Check token hasn't already been used (`confirmed_at` should be null)
3. Check meeting is still in the future

### Meetings not being found

The scheduler uses a 2-hour window (47-49 hours from "now"). If your meeting falls outside this window when the scheduler runs at 9 AM UTC, it won't be picked up.

**Example:** Scheduler runs at 9 AM UTC. It looks for meetings between:
- 47 hours later = day after tomorrow at 8 AM UTC
- 49 hours later = day after tomorrow at 10 AM UTC

### Workflow not running

1. Check GitHub Actions is enabled for the repo
2. Check the workflow file exists at `.github/workflows/meeting-reminders.yml`
3. Check GitHub secrets are set (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

---

## Content Limits

- Description: max 5,000 characters
- Personal message: max 2,000 characters

Content is truncated if it exceeds these limits. All user input is HTML-escaped to prevent XSS.
