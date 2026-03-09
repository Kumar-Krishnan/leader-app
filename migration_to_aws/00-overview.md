# Leader App: Supabase/Netlify → AWS Migration

## Current Stack
- **Frontend hosting**: Netlify (static SPA)
- **Auth**: Supabase Auth (email/password only)
- **Database**: Supabase PostgreSQL (18 tables, 9 RPC functions, RLS policies)
- **Storage**: Supabase Storage (2 buckets: `resources`, `avatars`)
- **Realtime**: Supabase Realtime (messages table only)
- **Serverless functions**: 5 Supabase Edge Functions (Deno)
- **Cron**: pg_cron (meeting reminders every 8 hours)
- **Email**: SendGrid (used by all edge functions)

## Target Stack
| Current | AWS Replacement |
|---|---|
| Netlify | S3 + CloudFront |
| Supabase Auth | Cognito User Pools |
| Supabase PostgreSQL | DynamoDB (or Aurora if we want to stay relational) |
| Supabase Storage | S3 |
| Supabase Realtime | API Gateway WebSockets |
| Supabase Edge Functions | Lambda + API Gateway |
| pg_cron | EventBridge Scheduler |
| Supabase PostgREST API | API Gateway + Lambda |
| RLS policies | Lambda authorizers + application-level checks |
| SendGrid | SES (or keep SendGrid) |

## Migration Phases (Recommended Order)

| Phase | Section | Effort | Risk |
|---|---|---|---|
| 1 | [Static hosting (Netlify → S3/CloudFront)](./01-hosting.md) | Low | Low |
| 2 | [Storage (Supabase Storage → S3)](./02-storage.md) | Low | Low |
| 3 | [Auth (Supabase Auth → Cognito)](./03-auth.md) | High | High |
| 4 | [Database (PostgreSQL → DynamoDB)](./04-database.md) | High | High |
| 5 | [API Layer (PostgREST → API Gateway + Lambda)](./05-api-layer.md) | High | Medium |
| 6 | [Email functions (Edge Functions → Lambda)](./06-email-functions.md) | Medium | Low |
| 7 | [Realtime (Supabase Realtime → WebSockets)](./07-realtime.md) | Medium | Medium |
| 8 | [Cron (pg_cron → EventBridge)](./08-cron.md) | Low | Low |
| 9 | [Client-side refactor](./09-client-refactor.md) | Medium | Medium |
| 10 | [Infrastructure as Code](./10-infrastructure.md) | Medium | Low |

## Key Advantages of Current Codebase

The app was built with a **repository + service pattern** that makes this migration much more tractable:

- `src/services/auth/` — interface + Supabase implementation → swap in Cognito implementation
- `src/services/realtime/` — interface + Supabase implementation → swap in WebSocket implementation
- `src/services/email/` — interface + Supabase implementation → swap in Lambda/API Gateway calls
- `src/lib/storage/` — interface + Supabase implementation; **an S3 stub already exists** (`awsS3Storage.ts`)
- `src/repositories/` — these are the main refactor target; they call Supabase PostgREST directly

## Data Migration Considerations

- ~18 tables worth of production data need to be exported and transformed
- User passwords are managed by Supabase Auth (not directly accessible) — users will likely need password resets or a Cognito migration Lambda
- Storage files (resources, avatars) need to be copied bucket-to-bucket
- Meeting reminder tokens and pending join requests are ephemeral and can be dropped
