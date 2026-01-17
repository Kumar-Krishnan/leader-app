# Code Review: Leader App

**Date**: January 2026 (Updated)
**Reviewer**: Claude (AI Code Review)
**Scope**: Full application architecture, code quality, and feature completeness

---

## Executive Summary

Leader App is a well-architected React Native/Expo application for community leadership. The codebase demonstrates strong fundamentals: clean separation of concerns, comprehensive TypeScript typing, solid test coverage (227 tests), and now includes robust error handling infrastructure. The main remaining issue before production deployment is enabling Row Level Security.

**Overall Assessment**: 7.5/10 - Strong foundation with good error handling, needs RLS enabled

---

## What's Working Well

### 1. Architecture & Patterns

The Context + Custom Hooks pattern is excellent for this scale of application:

```
AuthContext (global auth state)
    └── GroupContext (group membership)
        └── Custom Hooks (useThreads, useMessages, etc.)
            └── Screens (thin UI layer)
```

**Why this works**:
- Hooks encapsulate data fetching and business logic
- Screens stay focused on presentation
- Easy to test by mocking hooks rather than Supabase directly
- Clear data flow without prop drilling

### 2. Storage Abstraction

The `StorageProvider` interface in `src/lib/storage/` is forward-thinking:

```typescript
interface StorageProvider {
  upload(bucket, path, file, options): Promise<UploadResult>;
  getDownloadUrl(bucket, path, expiresIn): Promise<DownloadResult>;
  delete(bucket, path): Promise<DeleteResult>;
  list(bucket, prefix): Promise<ListResult>;
}
```

This allows swapping Supabase Storage for S3 without changing application code.

### 3. Real-time Implementation

Messages use proper Supabase real-time subscriptions with cleanup:

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`messages:${threadId}`)
    .on('postgres_changes', { event: 'INSERT', ... }, handleNewMessage)
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [threadId]);
```

### 4. Resource Sharing Design

The group-to-group sharing model is well-designed:
- Share by reference (no data duplication)
- Folder sharing includes all nested contents
- Original owner retains edit/delete control
- Clear visual indicators for shared items

### 5. Documentation

The `AI_CONTEXT/` folder is exceptional. New developers can understand the system quickly.

### 6. Test Coverage

227 tests across 17 suites covering contexts, hooks, screens, and components.

### 7. Error Handling Infrastructure (NEW)

The app now has a comprehensive error handling system:

**ErrorBoundary Component** (`src/components/ErrorBoundary.tsx`):
- Catches runtime errors in the component tree
- Displays user-friendly fallback UI with retry option
- Shows debug info in development mode
- Supports custom error callbacks for monitoring integration

**Centralized Logger** (`src/lib/logger.ts`):
```typescript
logger.error('useThreads', 'Error fetching threads', { error: err });
logger.info('ProfileScreen', 'Avatar uploaded successfully', { url });
```
- Configurable log levels (debug in dev, warn in prod)
- Colored console output for easy scanning
- Hook for external monitoring (Sentry, DataDog)

**Standardized Error Codes** (`src/lib/errors.ts`):
- `ErrorCode` enum with standard codes (NETWORK_ERROR, NOT_AUTHENTICATED, etc.)
- `getUserErrorMessage()` maps any error to user-friendly text
- `AppError` class for structured application errors

**Platform-Agnostic UI Utilities**:
```typescript
await showDestructiveConfirm('Delete?', 'This cannot be undone', 'Delete');
showAlert('Error', 'Something went wrong');
```
- Works identically on web (window.confirm) and native (Alert.alert)
- No more scattered `Platform.OS === 'web'` checks

---

## Critical Issues

### 1. Row Level Security Disabled

**Location**: Database (Supabase)
**Risk**: HIGH - Any authenticated user can read/write all data

```sql
-- Current state: RLS disabled on all tables
-- Any user can: read other groups' messages, delete others' resources, etc.
```

**Questions**:
- What's the timeline for enabling RLS?
- Have the policies in `supabase-resource-sharing.sql` been tested?
- Is there a migration plan that won't break existing data?

**Recommendation**: Enable RLS immediately on a staging environment and test thoroughly before production.

### ~~2. No Error Boundaries~~ RESOLVED

**Status**: Fixed in January 2026

The app now has a comprehensive `ErrorBoundary` component wrapping the entire application:
- Located at `src/components/ErrorBoundary.tsx`
- Catches runtime errors and displays fallback UI
- Logs errors via centralized logger
- Supports integration with monitoring services (Sentry, etc.)

See "What's Working Well > 7. Error Handling Infrastructure" for details.

### 2. Email Restriction Blocks Public Launch

**Location**: Database trigger `check_email_before_signup`

Only 3 hardcoded emails can sign up. This must be removed before any public testing.

---

## High Priority Issues

### 4. Meetings CRUD Incomplete

The `useMeetings` hook exists with full functionality, but the UI is incomplete:

| Operation | Hook | UI |
|-----------|------|-----|
| List | Yes | Yes |
| Create | Yes | No |
| Edit | Yes | No |
| Delete | Yes | Partial |

**Questions**:
- Is there a design spec for the create/edit meeting form?
- Should meeting creation be leader-only?
- How should recurring meetings be created (UI for series)?

### 5. Push Notifications Not Implemented

`expo-notifications` is installed but not wired up.

**Missing pieces**:
- Token registration on app launch
- Token storage in `profiles` table (column exists)
- Backend trigger/Edge Function for sending notifications
- Notification preferences UI (exists but non-functional)

**Questions**:
- What events should trigger notifications? (new message, meeting reminder, join request)
- Should notifications be immediate or batched?
- Is there a budget for push notification services?

### ~~6. Inconsistent Error Handling~~ RESOLVED

**Status**: Fixed in January 2026

Error handling is now standardized across the entire codebase:

**All hooks use**:
```typescript
import { logger } from '../lib/logger';
import { getUserErrorMessage } from '../lib/errors';

// In catch blocks:
logger.error('useThreads', 'Error fetching threads', { error: err });
setError(getUserErrorMessage(err));
```

**All components use platform-agnostic alerts**:
```typescript
import { showAlert, showDestructiveConfirm } from '../lib/errors';

// Instead of Platform.OS checks:
const confirmed = await showDestructiveConfirm('Delete?', message, 'Delete');
showAlert('Error', 'Something went wrong');
```

**User-friendly error messages**:
- "Network error" → "Unable to connect. Please check your internet connection."
- "Not authenticated" → "Please sign in to continue."
- Unknown errors → "Something went wrong. Please try again."

See "What's Working Well > 7. Error Handling Infrastructure" for details.

---

## Medium Priority Issues

### 7. No Offline Support

The app requires network connectivity. Failed operations are not queued.

**Questions**:
- Is offline support a requirement for the target users?
- Should messages queue when offline and sync later?
- What's the expected connectivity environment (always connected, sometimes offline)?

### 8. Performance Concerns

No pagination or virtualization for lists:

```typescript
// Current: Loads all resources at once
const { data } = await supabase
  .from('resources')
  .select('*')
  .eq('group_id', currentGroup.id);
```

**Questions**:
- What's the expected data volume per group?
- How many resources/messages/meetings are typical?
- At what point does performance become a concern?

### ~~9. Platform-Specific Code Scattered~~ RESOLVED

**Status**: Fixed in January 2026

Platform-agnostic UI utilities have been created in `src/lib/errors.ts`:

```typescript
// Before (scattered throughout codebase):
if (Platform.OS === 'web') {
  window.confirm('Delete?');
} else {
  Alert.alert('Confirm', 'Delete?', [...]);
}

// After (unified API):
const confirmed = await showDestructiveConfirm('Delete?', message, 'Delete');
```

All screens and components have been updated to use these utilities:
- `showAlert(title, message, buttons?)` - Simple alert
- `showConfirm(title, message)` - Returns Promise<boolean>
- `showDestructiveConfirm(title, message, destructiveText)` - Red delete button
- `showErrorAlert(error)` - Displays user-friendly error message

### 10. Type Safety Gaps

Some areas use `any` where stronger types would help:

```typescript
// In useResources.ts
((sharedFolderData || []) as any[]).map(...)

// Better:
interface SharedFolderResponse {
  folder_id: string;
  shared_at: string;
  folder: ResourceFolder & { group: { id: string; name: string } };
}
```

**Questions**:
- Is there a plan to generate types from Supabase schema?
- Would `supabase-js` type generation help?

---

## Architecture Questions

### 11. Role Hierarchy Clarity

The app has two role systems:

1. **Global roles** (`profiles.role`): user, leader, admin
2. **Group roles** (`group_members.role`): member, leader-helper, leader, admin

**Questions**:
- When does global `leader` role matter vs. group `leader` role?
- Can a global `user` be a group `admin`?
- Is there documentation on the permission matrix?

### 12. Group Isolation

Most queries filter by `group_id`, but:

**Questions**:
- Can users be in multiple groups simultaneously?
- How does group switching affect real-time subscriptions?
- Should there be cross-group features beyond resource sharing?

### 13. Message Threading

Messages belong to threads, but:

**Questions**:
- Is there a need for nested replies (threads within threads)?
- Should messages support rich content (markdown, mentions)?
- Are message attachments planned?

### 14. Meeting Series Implementation

Meetings support series via `series_id`, `series_index`, `series_total`:

**Questions**:
- How are series created (single form or recurring event UI)?
- Can individual instances be modified after creation?
- What happens when you delete one instance of a series?

---

## Code Quality Observations

### ~~15. Console Logging~~ RESOLVED

**Status**: Fixed in January 2026

A centralized logger has been implemented at `src/lib/logger.ts`:

```typescript
import { logger } from '../lib/logger';

// All hooks and components now use:
logger.error('useResources', 'Error fetching contents', { error: err });
logger.info('ProfileScreen', 'Avatar uploaded', { url });
logger.debug('useMessages', 'Subscription connected');
```

Features:
- Configurable log levels (debug in dev, warn+ in prod)
- Colored console output for easy scanning
- `setLogHandler()` hook for external services (Sentry, DataDog)
- Structured context objects for better debugging

### 16. Hook Dependencies

Some hooks have large dependency arrays:

```typescript
const fetchContents = useCallback(async () => {
  // ...
}, [currentGroup, currentFolderId, folderPath]); // folderPath changes often
```

**Question**: Is `folderPath` necessary in dependencies, or is this causing extra re-fetches?

### 17. Optimistic Updates Inconsistency

Some operations use optimistic updates (thread creation), others don't (resource upload).

**Questions**:
- What's the strategy for optimistic updates?
- How should failed optimistic updates be rolled back?

---

## Feature Questions

### 18. HubSpot Integration

`profiles` table has `hubspot_contact_id` but no integration exists.

**Questions**:
- What data should sync to HubSpot?
- Is this for tracking leader activities?
- What triggers a sync?

### 19. Location Events

`location_events` table exists but seems unused in the UI.

**Questions**:
- What is this for? Analytics? Check-ins?
- Is this feature active or deprecated?

### 20. Notification Preferences

`notification_preferences` JSON field exists with structure:

```typescript
interface NotificationPreferences {
  messages: boolean;
  meetings: boolean;
  resources: boolean;
  push_enabled: boolean;
}
```

**Questions**:
- Are these enforced anywhere currently?
- Will the backend Edge Function respect these?

---

## Security Questions

### 21. Join Code Security

Groups use a `code` field for joining.

**Questions**:
- How are codes generated? Are they guessable?
- Do codes expire?
- Can codes be regenerated?
- Is there rate limiting on join attempts?

### 22. File Upload Security

Resources support file uploads via storage.

**Questions**:
- Are file types validated?
- Is there a file size limit?
- Are files scanned for malware?
- Who can access uploaded files (any authenticated user, or group members only)?

### 23. Input Sanitization

**Questions**:
- Is user input sanitized before display?
- Are there XSS concerns with message content?
- Is SQL injection possible through any user input?

---

## Deployment Questions

### 24. Environment Configuration

Uses `EXPO_PUBLIC_` prefixed env vars.

**Questions**:
- Are there separate staging/production Supabase projects?
- How are environment variables managed for different builds?
- Is there a CI/CD pipeline?

### 25. Mobile Deployment

iOS/Android builds not configured.

**Questions**:
- What's the timeline for native app store deployment?
- Is EAS Build set up?
- Are there TestFlight/Play Store beta tracks planned?

---

## Recommendations Summary

### Immediate (Before Any Production Use)

1. Enable RLS with tested policies
2. ~~Add Error Boundary component~~ **DONE**
3. Remove email restriction
4. ~~Add basic error monitoring (Sentry free tier)~~ **READY** - Logger has `setLogHandler()` hook

### Short-term (Next 2-4 Weeks)

5. Complete Meetings CRUD UI
6. Implement push notifications
7. ~~Standardize error handling with user-friendly messages~~ **DONE**
8. ~~Create platform abstraction for dialogs/alerts~~ **DONE**

### Medium-term (1-2 Months)

9. Add pagination for large lists
10. Implement offline queue for critical operations
11. Generate TypeScript types from Supabase schema
12. Add E2E tests for critical flows

### Long-term (Ongoing)

13. Service layer for complex business logic
14. Repository pattern for data access
15. Feature flags system
16. Performance monitoring

---

## Questions for Product Owner

1. **Target Scale**: How many users/groups/messages do you expect in year one?
2. **Offline Requirements**: Will users need the app in low-connectivity environments?
3. **Native App Priority**: Is web-first acceptable, or are native apps critical for launch?
4. **Integration Roadmap**: Beyond HubSpot, what other integrations are planned?
5. **Moderation**: How will inappropriate content be handled?
6. **Data Retention**: How long should messages/meetings be kept?
7. **Compliance**: Are there any regulatory requirements (GDPR, CCPA)?

---

## Conclusion

Leader App has a solid technical foundation that will serve well as the product grows. The architecture choices are appropriate for the current scale, and the codebase is well-organized and testable.

**Recent improvements** (January 2026):
- Error boundaries now catch and gracefully handle runtime errors
- Centralized logging ready for production monitoring integration
- Standardized user-friendly error messages across all hooks
- Platform-agnostic UI utilities eliminate web/native code branching

**Remaining priorities**:
1. **Security (Critical)**: Enable Row Level Security - this is the main blocker for production
2. **Feature**: Complete Meetings CRUD UI
3. **Feature**: Wire up push notifications

The error handling infrastructure is now production-ready. Once RLS is enabled and tested, the app will be ready for production use.

The existing documentation in `AI_CONTEXT/` is a significant asset - continue maintaining it as the codebase evolves.
