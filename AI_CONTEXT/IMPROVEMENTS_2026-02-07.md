# Top Improvements for Maintainability & Extensibility

**Date:** 2026-02-07
**Status:** Recommendations
**Priority:** Ordered by impact and effort

---

## Executive Summary

After reviewing the codebase, here are the top improvements to implement now. These focus on reducing technical debt, improving developer experience, and setting up patterns that scale.

---

## 🔴 High Priority (Implement This Week)

### 1. Centralize Error Handling

**Current State:** Error handling is inconsistent across hooks - some use `showAlert()`, others set error state, some log to console.

**Files Affected:**
- `src/hooks/useMeetings.ts`
- `src/hooks/useGroupMembers.ts`
- `src/hooks/useResources.ts`
- `src/hooks/useThreads.ts`

**Recommendation:** Create a unified error handler:

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public recoverable: boolean = true
  ) {
    super(message);
  }
}

export function handleError(error: unknown, context: string): AppError {
  logger.error(context, 'Error occurred', { error });

  if (error instanceof AppError) return error;

  // Map Supabase errors to user-friendly messages
  if (error instanceof PostgrestError) {
    return new AppError(error.message, error.code, 'Something went wrong. Please try again.');
  }

  return new AppError(
    error instanceof Error ? error.message : 'Unknown error',
    'UNKNOWN',
    'An unexpected error occurred.'
  );
}
```

**Effort:** 2-3 hours
**Impact:** High - Consistent UX, easier debugging

---

### 2. Add TypeScript Strict Mode

**Current State:** TypeScript is used but not in strict mode, allowing implicit `any` and potential null issues.

**Files Affected:** `tsconfig.json`

**Recommendation:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Then fix the resulting type errors (expect 50-100 issues, mostly adding null checks).

**Effort:** 4-6 hours
**Impact:** High - Catches bugs at compile time

---

### 3. Extract Magic Strings to Constants

**Current State:** Role names, status values, and other constants are hardcoded throughout:
```typescript
if (role === 'leader' || role === 'admin' || role === 'leader-helper')
```

**Recommendation:**
```typescript
// src/constants/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  LEADER: 'leader',
  LEADER_HELPER: 'leader-helper',
  MEMBER: 'member',
} as const;

export const LEADER_ROLES = [ROLES.ADMIN, ROLES.LEADER, ROLES.LEADER_HELPER] as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Usage
if (LEADER_ROLES.includes(role))
```

**Effort:** 1-2 hours
**Impact:** Medium - Prevents typos, enables autocomplete

---

### 4. Implement Request Deduplication in Hooks

**Current State:** Multiple components can trigger the same fetch simultaneously, causing redundant API calls.

**Files Affected:** All data-fetching hooks

**Recommendation:** Add a simple deduplication layer:
```typescript
// src/lib/queryCache.ts
const inflightRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  const promise = fetcher().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}
```

**Effort:** 2-3 hours
**Impact:** Medium - Better performance, fewer race conditions

---

## 🟡 Medium Priority (Implement This Month)

### 5. Add Integration Tests for Critical Paths

**Current State:** Unit tests exist but no integration tests for full user flows.

**Recommendation:** Add tests for:
1. Sign up → Join group → View meetings flow
2. Leader creates meeting → Sends email flow
3. Placeholder creation → User signs up → Migration flow

Use Detox or Maestro for E2E testing.

**Effort:** 1-2 days
**Impact:** High - Prevents regressions in critical paths

---

### 6. Create a Form Validation Library

**Current State:** Form validation is duplicated in each modal:
```typescript
if (!email.trim()) {
  setError('Please enter an email');
  return;
}
if (!email.includes('@')) {
  setError('Please enter a valid email');
  return;
}
```

**Recommendation:** Create reusable validators:
```typescript
// src/lib/validation.ts
export const validators = {
  required: (value: string) =>
    value.trim() ? null : 'This field is required',

  email: (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email address',

  minLength: (min: number) => (value: string) =>
    value.length >= min ? null : `Must be at least ${min} characters`,
};

export function validate(value: string, ...rules: Validator[]): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}
```

**Effort:** 3-4 hours
**Impact:** Medium - DRY code, consistent validation

---

### 7. Add Optimistic Updates

**Current State:** UI waits for server response before updating, causing perceived lag.

**Files Affected:** `useMeetings.ts`, `useThreads.ts`, `useResources.ts`

**Recommendation:** Implement optimistic updates for common actions:
```typescript
const rsvpToMeeting = async (meetingId: string, status: RsvpStatus) => {
  // Optimistically update UI
  setMeetings(prev => prev.map(m =>
    m.id === meetingId
      ? { ...m, userRsvp: status }
      : m
  ));

  try {
    await supabase.from('meeting_attendees')...
  } catch (error) {
    // Revert on failure
    setMeetings(prev => prev.map(m =>
      m.id === meetingId
        ? { ...m, userRsvp: previousStatus }
        : m
    ));
    throw error;
  }
};
```

**Effort:** 4-6 hours
**Impact:** High - Much snappier UX

---

### 8. Consolidate Modal Components

**Current State:** Multiple similar modals with duplicated structure:
- `AddPlaceholderModal.tsx`
- `CreateMeetingModal.tsx`
- `SendMeetingEmailModal.tsx`
- `AddResourceModal.tsx`

**Recommendation:** Create a base modal component:
```typescript
// src/components/BaseModal.tsx
interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  submitLabel?: string;
  onSubmit?: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function BaseModal({ ... }: BaseModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <ModalHeader title={title} onClose={onClose} />
        <ScrollView>{children}</ScrollView>
        {onSubmit && (
          <ModalFooter
            submitLabel={submitLabel}
            onSubmit={onSubmit}
            loading={loading}
          />
        )}
      </View>
    </Modal>
  );
}
```

**Effort:** 3-4 hours
**Impact:** Medium - Less code duplication, consistent UX

---

## 🟢 Lower Priority (Backlog)

### 9. Add Offline Support

Cache critical data locally and sync when online. Use `@tanstack/react-query` or similar.

**Effort:** 2-3 days
**Impact:** High for mobile users with poor connectivity

---

### 10. Implement Feature Flags

Add ability to enable/disable features without deploying:
```typescript
const { isEnabled } = useFeatureFlag('new-meeting-ui');
```

**Effort:** 1 day
**Impact:** Medium - Safer rollouts, A/B testing

---

### 11. Add Performance Monitoring

Integrate Sentry or similar for:
- Error tracking
- Performance monitoring
- User session replay

**Effort:** 2-3 hours
**Impact:** Medium - Proactive issue detection

---

### 12. Server-Side Authorization for Edge Functions

When Supabase's newer key patterns are better documented, revisit server-side role checking for `send-meeting-email`. Options:
1. Custom RPC that returns a signed authorization token
2. Use custom JWT claims
3. Implement a middleware pattern

**Effort:** 4-6 hours
**Impact:** Medium - Defense in depth

---

## Quick Wins (< 1 hour each)

| Task | File | Impact |
|------|------|--------|
| Add `displayName` getter to User type | `types/database.ts` | Cleaner code |
| Extract email regex to constant | `lib/validation.ts` | Reusability |
| Add loading skeletons | `components/` | Better UX |
| Memoize expensive list renders | `*Screen.tsx` | Performance |
| Add `key` prop warnings cleanup | Various | Clean console |

---

## Implementation Order

```
Week 1:
├── #1 Centralize Error Handling
├── #3 Extract Magic Strings
└── Quick Wins

Week 2:
├── #2 TypeScript Strict Mode
└── #4 Request Deduplication

Week 3-4:
├── #6 Form Validation Library
├── #7 Optimistic Updates
└── #8 Consolidate Modals

Ongoing:
├── #5 Integration Tests
└── Backlog items as needed
```

---

## Metrics to Track

After implementing these improvements, track:
- **Build time** (should stay stable or decrease)
- **Bundle size** (monitor for bloat)
- **Type coverage** (aim for 95%+)
- **Test coverage** (aim for 80%+ on critical paths)
- **Error rate** (should decrease with better handling)

---

## Notes

- These recommendations are based on the current codebase state as of 2026-02-07
- Priorities may shift based on upcoming feature requirements
- Consider pairing improvements with related feature work to reduce context switching
