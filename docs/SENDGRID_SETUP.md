# SendGrid Email Setup Guide

This guide covers how to configure SendGrid for sending meeting notification emails.

## Prerequisites

- A SendGrid account (free tier: 100 emails/day)
- Supabase CLI installed
- Access to your Supabase project

## Step 0: Initialize and Link Supabase Project

If you haven't already set up the Supabase CLI for this project:

```bash
# Initialize Supabase in your project (creates config.toml)
supabase init

# Login to Supabase CLI (opens browser for authentication)
supabase login

# Link to your Supabase project
# Get your project reference ID from your dashboard URL: 
# https://supabase.com/dashboard/project/<project-ref>
supabase link --project-ref <your-project-ref>
```

## Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/) and sign up for a free account
2. Complete email verification

## Step 2: Create API Key

1. In SendGrid dashboard, go to **Settings > API Keys**
2. Click **Create API Key**
3. Name it something like "Leader App Production"
4. Select **Restricted Access** and enable:
   - Mail Send: Full Access
5. Click **Create & View**
6. **Copy the API key immediately** (it won't be shown again)

## Step 3: Verify Sender Identity

SendGrid requires sender verification before you can send emails.

### Option A: Single Sender Verification (Quick Start)
1. Go to **Settings > Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your details (use an email you have access to)
4. Check your email and click the verification link

### Option B: Domain Authentication (Recommended for Production)
1. Go to **Settings > Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions for your domain
4. This improves deliverability and allows sending from any address @yourdomain.com

## Step 4: Set Supabase Secrets

Run these commands to add your SendGrid credentials to Supabase:

```bash
# Set the API key
supabase secrets set SENDGRID_API_KEY=SG.your_api_key_here

# Set the verified sender email
supabase secrets set SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Set the sender display name
supabase secrets set SENDGRID_FROM_NAME="Leader App"
```

To verify secrets were set:
```bash
supabase secrets list
```

## Step 5: Deploy the Edge Function

```bash
# Deploy the send-meeting-email function
supabase functions deploy send-meeting-email

# Verify deployment
supabase functions list
```

## Step 6: Test the Integration

1. Open the app as a group leader
2. Create a meeting with at least one attendee (other than yourself)
3. Tap the ✉️ button on the meeting card
4. Check that attendees receive the email

## Troubleshooting

### "Entrypoint path does not exist" or "failed to read file" error

This error occurs when the Supabase CLI can't find your function files. Make sure you've:

1. **Initialized Supabase in your project:**
   ```bash
   supabase init
   ```

2. **Linked to your Supabase project:**
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

3. **Verified the function file exists:**
   ```bash
   ls supabase/functions/send-meeting-email/index.ts
   ```

4. **Run the deploy command from the project root:**
   ```bash
   cd /path/to/leader_app
   supabase functions deploy send-meeting-email
   ```

### Emails not sending

1. **Check Edge Function logs:**
   ```bash
   supabase functions logs send-meeting-email
   ```

2. **Verify secrets are set:**
   ```bash
   supabase secrets list
   ```

3. **Check SendGrid Activity Feed:**
   - Go to SendGrid dashboard > Activity
   - Look for blocked or bounced emails

### "Sender not verified" error

- Ensure the `SENDGRID_FROM_EMAIL` matches a verified sender in SendGrid
- Complete sender verification in SendGrid dashboard

### Rate limiting

- Free tier: 100 emails/day
- Check SendGrid dashboard for usage
- Consider upgrading if needed

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | Your SendGrid API key | `SG.xxxx...` |
| `SENDGRID_FROM_EMAIL` | Verified sender email | `noreply@example.com` |
| `SENDGRID_FROM_NAME` | Display name for sender | `Leader App` |

## Email Template

The email includes:
- Group name in header
- Meeting title
- Date and time (formatted for readability)
- Location (if provided)
- Description (if provided)
- Footer with sender info

The template is responsive and works across email clients.

## Security Notes

- API keys are stored as Supabase secrets (encrypted)
- Edge Function runs server-side (keys never exposed to client)
- Emails are sent individually (recipients don't see each other)
