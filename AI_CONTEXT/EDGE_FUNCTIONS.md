# Edge Functions Architecture

## Overview

The Leader App uses Supabase Edge Functions (Deno runtime) for server-side operations that require:
- Third-party API integrations (SendGrid)
- Operations that shouldn't expose API keys to clients
- Scheduled/cron jobs

## Deployed Functions

| Function | Purpose | Auth | Deployment Flag |
|----------|---------|------|-----------------|
| `send-meeting-email` | Send meeting invitations via SendGrid | Server-side (JWT + role check) | `--no-verify-jwt` |
| `generate-meeting-reminders` | Cron job for meeting reminders | N/A (scheduled) | Default |

## Function: send-meeting-email

### Purpose
Sends meeting invitation/notification emails to attendees via SendGrid.

### Endpoint
```
POST https://<project-ref>.supabase.co/functions/v1/send-meeting-email
```

### Request Format
```typescript
interface MeetingEmailRequest {
  meetingId: string;           // Meeting ID (for tracking)
  title: string;               // Meeting title
  description: string | null;  // Meeting description
  customMessage?: string;      // Personal message from leader
  descriptionFirst?: boolean;  // Order of description vs message (default: true)
  date: string;                // ISO date string
  location: string | null;     // Meeting location
  attendees: Array<{           // Recipients
    email: string;
    name: string | null;
  }>;
  senderName: string;          // Leader's name
  senderEmail?: string;        // Custom from address (e.g., "Name@manatee.link")
  groupName: string;           // Group name for email header
}
```

### Response Format
```typescript
// Success (200)
{
  success: true,
  message: "Email sent to X recipient(s)",
  recipientCount: number
}

// Error (4xx/5xx)
{
  error: string,
  details?: string  // Stack trace in development
}
```

### Authorization Model

**Current Implementation**: Server-side authentication and authorization
- The function verifies the caller's JWT server-side via `supabase.auth.getUser()`
- Role-based access control is enforced server-side:
  - Uses the `service_role` key to query `group_members` for the caller's role
  - Only `leader`, `leader-helper`, or `admin` roles are authorized
  - Returns 401 for invalid/expired tokens, 403 for insufficient permissions
- Client-side UI also restricts visibility (belt-and-suspenders):
  - Only users with leader roles see the "Send Email" button
  - The `useMeetings` hook checks `isGroupLeader` before showing email functionality
- The `--no-verify-jwt` deployment flag disables redundant gateway-level JWT check

### Required Secrets
```bash
SENDGRID_API_KEY      # SendGrid API key (starts with SG.)
SENDGRID_FROM_EMAIL   # Verified sender email address
SENDGRID_FROM_NAME    # Display name (default: "Leader App")
```

### Deployment
```bash
# Deploy with JWT verification disabled (we handle auth in the function)
supabase functions deploy send-meeting-email --no-verify-jwt
```

### Email Template Features
- Responsive HTML email template
- Plain text fallback
- Meeting details: date, time, location
- Custom message from leader (highlighted box)
- Description section
- Configurable order of description vs custom message
- Group branding in header

## Shared Code

### `_shared/cors.ts`
CORS configuration shared across all functions:

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-language, content-language, range',
  'Access-Control-Max-Age': '86400',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  return null;
}
```

## Local Development

Edge Functions can be tested locally:

```bash
# Start local Supabase (requires Docker)
supabase start

# Serve functions locally
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/send-meeting-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"meetingId":"test",...}'
```

## Troubleshooting

### 401 Unauthorized
- Check that `--no-verify-jwt` was used during deployment
- Verify the Authorization header is being sent
- Check token format (must be `Bearer <token>`)

### 404 Not Found
- Verify function is deployed: `supabase functions list`
- Check function name matches exactly
- Ensure project is linked: `supabase link --project-ref <ref>`

### 500 Internal Server Error
- Check SendGrid secrets are set: `supabase secrets list`
- Verify SendGrid sender is verified
- Check function logs in Supabase dashboard

### CORS Errors
- Verify `handleCors()` is called at the start of the function
- Check that `corsHeaders` are included in all responses
- Ensure OPTIONS requests return 200

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  React Native   │────▶│  Supabase Edge Fn    │────▶│  SendGrid   │
│  App (Client)   │     │  send-meeting-email  │     │  API        │
└─────────────────┘     └──────────────────────┘     └─────────────┘
        │                   │            │
        │ UI guard          │ Auth       │ Secrets
        │ (isGroupLeader)   │ (JWT +     │ (SENDGRID_*)
        ▼                   │  role)     ▼
┌─────────────────┐         │    ┌──────────────────────┐
│  Supabase Auth  │◀────────┘    │  Supabase Secrets    │
│  (JWT tokens)   │              │  (encrypted)         │
└─────────────────┘              └──────────────────────┘
```

## Related Files

- `supabase/functions/send-meeting-email/index.ts` - Main function code
- `supabase/functions/_shared/cors.ts` - Shared CORS configuration
- `src/hooks/useMeetings.ts` - Client-side integration (sendMeetingEmail)
- `src/components/SendMeetingEmailModal.tsx` - UI for composing emails
- `docs/SENDGRID_SETUP.md` - SendGrid setup guide
