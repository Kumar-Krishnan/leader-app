# Phase 9: Client-Side Refactor Summary

## Overview
Thanks to the repository + service pattern, the client refactor is contained to specific layers. No screen or component code should need to change.

## Files That Change

### Service Implementations (swap Supabase → AWS)

| File | Change |
|---|---|
| `src/services/auth/index.ts` | Export `cognitoAuthService` instead of `supabaseAuthService` |
| `src/services/auth/cognitoAuthService.ts` | **NEW** — implements `AuthService` with Cognito |
| `src/services/email/index.ts` | Export `awsEmailService` instead of `supabaseEmailService` |
| `src/services/email/awsEmailService.ts` | **NEW** — calls API Gateway endpoints |
| `src/services/realtime/index.ts` | Export `websocketRealtimeService` instead of `supabaseRealtimeService` |
| `src/services/realtime/websocketRealtimeService.ts` | **NEW** — WebSocket client |
| `src/lib/storage/index.ts` | Switch from `SupabaseStorageProvider` to `AwsS3StorageProvider` |
| `src/lib/storage/awsS3Storage.ts` | Complete the existing stub |

### Repositories (all 8 files rewritten)

Every file in `src/repositories/` changes from `supabase.from()` calls to `apiRequest()` calls:

| File | Key Changes |
|---|---|
| `profilesRepo.ts` | `GET /profiles/{id}`, `PUT /profiles/{id}` |
| `groupsRepo.ts` | `GET /groups`, `POST /groups`, join request endpoints |
| `membersRepo.ts` | `GET /groups/{id}/members`, role updates, placeholders |
| `meetingsRepo.ts` | `GET /groups/{id}/meetings`, CRUD, attendees, co-leaders, series RSVP |
| `threadsRepo.ts` | `GET /groups/{id}/threads`, CRUD, thread members |
| `messagesRepo.ts` | `GET /threads/{id}/messages`, CRUD |
| `resourcesRepo.ts` | `GET /groups/{id}/resources`, folders, shares, CRUD |
| `commentsRepo.ts` | `GET /resources/{id}/comments`, CRUD |
| `analyticsRepo.ts` | `POST /analytics/location-event` |

### Shared Client

| File | Change |
|---|---|
| `src/lib/apiClient.ts` | **NEW** — shared `fetch` wrapper with Cognito JWT auth |
| `src/lib/supabase.ts` | **DELETE** — no longer needed |

### Config / Environment

| File | Change |
|---|---|
| `app.config.ts` or `.env` | Replace `EXPO_PUBLIC_SUPABASE_*` with `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_COGNITO_*`, `EXPO_PUBLIC_WS_URL` |

### Context Changes

| File | Change |
|---|---|
| `src/contexts/AuthContext.tsx` | Minimal — swap service import; remove `isSupabaseConfigured` check |
| `src/contexts/GroupContext.tsx` | No change (doesn't import Supabase directly) |

## Files That Do NOT Change
- All screens (`src/screens/**`)
- All components (`src/components/**`)
- All hooks (`src/hooks/**`) — they consume repos/services, not Supabase
- Navigation (`src/navigation/**`)
- Types (`src/types/**`) — mostly; may need minor updates to match API response shapes

## New Dependencies

### Add
- `@aws-sdk/client-cognito-identity-provider` (or `aws-amplify`)
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`

### Remove
- `@supabase/supabase-js`

## Testing Strategy
1. Update `__mocks__/supabaseMock.ts` → mock the new `apiClient` instead
2. Repo tests: mock `apiRequest` calls instead of `supabase.from()`
3. Service tests: mock AWS SDK calls
4. All hook/component/screen tests should pass unchanged (they mock the repos/services)

## Migration Order Within Client
1. Create `apiClient.ts`
2. Implement `cognitoAuthService.ts` + swap in `AuthContext`
3. Rewrite repositories one at a time (test each)
4. Complete `awsS3Storage.ts` + swap
5. Implement `websocketRealtimeService.ts` + swap
6. Implement `awsEmailService.ts` + swap
7. Delete `src/lib/supabase.ts` and all Supabase-specific service files
8. Remove `@supabase/supabase-js` from package.json
