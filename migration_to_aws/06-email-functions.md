# Phase 6: Email Functions — Supabase Edge Functions → Lambda

## What We Have Now
5 Supabase Edge Functions (Deno/TypeScript) that send emails via SendGrid:

| Function | Trigger | Purpose |
|---|---|---|
| `send-meeting-email` | HTTP POST (user-initiated) | Email all meeting attendees |
| `send-invite-email` | HTTP POST (user-initiated) | Email a single invitee |
| `send-group-email` | HTTP POST (user-initiated) | Email all group members |
| `generate-meeting-reminders` | pg_cron (every 8h) | Find upcoming meetings, email leaders |
| `meeting-confirmation-page` | HTTP GET/POST (email link) | HTML confirmation page + send reminders |

## AWS Setup

### Option A: Keep SendGrid
- Simplest migration — just change the runtime from Deno to Node.js Lambda
- Same SendGrid API calls, same templates

### Option B: Switch to SES
- No third-party dependency
- Cheaper at scale ($0.10 per 1,000 emails)
- Need to verify domain in SES
- Need to request production access (out of sandbox)

**This guide shows both options. The Lambda structure is the same either way.**

### Lambda Functions

#### `send-meeting-email`
```typescript
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
// OR: import sgMail from "@sendgrid/mail";

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.jwt.claims.sub;
  const { meetingId } = JSON.parse(event.body);

  // 1. Fetch meeting + attendees from DynamoDB
  // 2. Verify caller is leader/co-leader of the meeting's group
  // 3. Build HTML email (same templates as current edge functions)
  // 4. Send to all attendees except caller

  // SES example:
  const ses = new SESv2Client({});
  await ses.send(new SendEmailCommand({
    FromEmailAddress: "Leader App <notifications@yourapp.com>",
    Destination: { ToAddresses: attendeeEmails },
    Content: {
      Simple: {
        Subject: { Data: `Meeting: ${meeting.title}` },
        Body: {
          Html: { Data: htmlBody },
          Text: { Data: textBody },
        },
      },
    },
  }));
};
```

#### `send-invite-email`
- Same pattern: verify leader role, send single email

#### `send-group-email`
- Same pattern: verify leader role, fetch all group members, send batch email

#### `generate-meeting-reminders`
- Triggered by EventBridge (see `08-cron.md`), not by HTTP request
- No auth needed (internal trigger)
- Query DynamoDB for meetings in next 48 hours
- Create reminder tokens
- Send emails to meeting leaders/co-leaders

#### `meeting-confirmation-page`
- This one serves HTML — use Lambda Function URLs or API Gateway
- GET: render the confirmation page (meeting details, confirm button)
- POST: mark token as used, send reminder emails to attendees
- Keep the race-condition protection (check if already sent)

### API Gateway Routes

```
POST /email/meeting          → send-meeting-email Lambda
POST /email/invite           → send-invite-email Lambda
POST /email/group            → send-group-email Lambda
GET  /reminders/{token}      → meeting-confirmation-page Lambda
POST /reminders/{token}      → meeting-confirmation-page Lambda
```

The reminder routes don't need Cognito auth (they use token-based auth from the email link).

## Client-Side Changes

Update `src/services/email/supabaseEmailService.ts` (or create a new implementation):

```typescript
// src/services/email/awsEmailService.ts
import { apiRequest } from "../../lib/apiClient";

export class AwsEmailService implements EmailService {
  async sendMeetingEmail(meetingId: string): Promise<void> {
    await apiRequest("/email/meeting", {
      method: "POST",
      body: JSON.stringify({ meetingId }),
    });
  }

  async sendInviteEmail(groupId: string, email: string, inviterName: string): Promise<void> {
    await apiRequest("/email/invite", {
      method: "POST",
      body: JSON.stringify({ groupId, email, inviterName }),
    });
  }

  async sendGroupEmail(groupId: string, subject: string, body: string): Promise<void> {
    await apiRequest("/email/group", {
      method: "POST",
      body: JSON.stringify({ groupId, subject, body }),
    });
  }
}
```

## SES Setup (if using SES)
1. Verify your sending domain in SES
2. Add DKIM, SPF, DMARC DNS records
3. Request production access (move out of sandbox)
4. Set up a configuration set for tracking bounces/complaints
5. Create an SNS topic for bounce/complaint notifications

## Environment Variables
- Remove: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- Keep (if using SendGrid): `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- Add (if using SES): `SES_FROM_EMAIL`, `SES_REGION`
- Update: `APP_URL` to new CloudFront domain
