# Phase 8: Cron — pg_cron → EventBridge Scheduler

## What We Have Now
- One cron job: `meeting-reminders-check`
- Schedule: every 8 hours (`0 */8 * * *`)
- pg_cron + pg_net calls the `generate-meeting-reminders` edge function via HTTP POST
- The function finds meetings in the next 48 hours, creates reminder tokens, emails leaders

## AWS Setup

### EventBridge Scheduler Rule
```json
{
  "Name": "meeting-reminders-check",
  "ScheduleExpression": "rate(8 hours)",
  "Target": {
    "Arn": "arn:aws:lambda:us-east-1:ACCOUNT:function:generate-meeting-reminders",
    "RoleArn": "arn:aws:iam::ACCOUNT:role/EventBridgeInvokeLambdaRole"
  }
}
```

Or using cron syntax: `cron(0 */8 * * ? *)`

### Lambda: `generate-meeting-reminders`
Direct port from the existing edge function. Key changes:
- Deno → Node.js runtime
- `supabaseAdmin` calls → DynamoDB queries
- Same SendGrid/SES email logic

```typescript
export const handler = async () => {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Query meetings starting in next 48 hours (GSI on group_id + start_time)
  // For each: check if reminder already sent (reminder_sent_at)
  // Create/update reminder tokens in meeting_reminder_tokens table
  // Send email to creator + co-leaders with confirmation link
  // Update meeting.reminder_sent_at

  return { statusCode: 200, body: "Reminders processed" };
};
```

### IAM Role for EventBridge
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "lambda:InvokeFunction",
    "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:generate-meeting-reminders"
  }]
}
```

## CloudWatch Monitoring
- The Lambda automatically logs to CloudWatch
- Set up a CloudWatch Alarm on errors to get notified if reminders fail
- Add a metric filter for `"Reminders processed"` to track successful runs

## That's it
This is the simplest phase — one EventBridge rule pointing to one Lambda.
