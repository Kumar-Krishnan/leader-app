# Security Audit: send-meeting-email Edge Function

**Date:** 2026-02-08
**File:** `supabase/functions/send-meeting-email/index.ts`

## Current Auth Flow

1. Extract JWT from `Authorization: Bearer <token>` header
2. Verify JWT server-side via `supabaseAdmin.auth.getUser(jwt)` (cryptographic verification)
3. Fetch meeting from DB by `meetingId` to get `group_id`
4. Check caller has `leader-helper`, `leader`, or `admin` role in that specific group
5. Fetch attendees and meeting details server-side
6. HTML-escape all user content before inserting into email template
7. Send email via SendGrid

Deployed with `--no-verify-jwt` (gateway-level check disabled; function handles all auth internally).

## Findings

### 1. Role check not scoped to meeting's group — MEDIUM — FIXED 2026-02-08

~~The query checks if the user is a leader in *any* group, not the group that owns the meeting.~~

**Fix applied:** Function now fetches the meeting by `meetingId`, gets `group_id`, and checks the caller's role in that specific group.

### 2. Attendee list is entirely client-supplied — MEDIUM — FIXED 2026-02-08

~~The function sends emails to whatever `attendees` array the client provides.~~

**Fix applied:** Function now fetches attendees from `meeting_attendees` joined with `profiles` and `placeholder_profiles` server-side. The client no longer sends attendees, title, date, location, groupName, or senderName — only `meetingId`, `customMessage`, `customDescription`, and `descriptionFirst`.

### 3. HTML injection in email body — LOW-MEDIUM — FIXED 2026-02-08

~~`description` and `customMessage` use `.replace(/\n/g, '<br>')` but are not HTML-escaped.~~

**Fix applied:** Added `escapeHtml()` function that escapes `&`, `<`, `>`, `"` before inserting into the template. Applied to all user-supplied content: title, groupName, senderName, location, description, and customMessage.

### 4. Content spoofing via client-supplied fields — LOW — FIXED 2026-02-08

~~`title`, `senderName`, `groupName` are all taken from the request body.~~

**Fix applied:** All meeting data (title, description, date, location) fetched from `meetings` table. Group name fetched from `groups` table. Sender name fetched from `profiles` table. Client only provides `meetingId` and optional message fields.

### 5. No rate limiting — LOW — OPEN

No limit on email volume per user or per time window. A compromised leader account could spam emails up to SendGrid's plan limit.

**Fix:** Track send count per user in a table or in-memory store; reject after threshold (e.g., 50 emails/day per user).

## What's Solid

- JWT verification via `auth.getUser(jwt)` is cryptographically sound — tokens cannot be forged
- Service role key stays server-side, never exposed to the client
- Role check scoped to the meeting's group
- Attendees, meeting details, group name, and sender name all fetched server-side
- All user content HTML-escaped before email rendering
- Client-side UI also restricts access (belt-and-suspenders)

## Recommended Priority

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Scope role check to meeting's group | Medium | FIXED |
| 2 | Fetch attendees server-side | Medium | FIXED |
| 3 | HTML-escape user content in email | Low-Medium | FIXED |
| 4 | Fetch meeting/group data server-side | Low | FIXED |
| 5 | Add per-user rate limiting | Low | OPEN |
