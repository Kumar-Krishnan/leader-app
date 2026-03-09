# Architecture Improvements — Pending Roadmap

Items marked ✅ are done. Only pending items remain for implementation.

## Pending Improvements

### 1. Centralize Error Handling (High Priority)
Error handling is inconsistent — some hooks use `showAlert()`, others set error state, some log to console. Create a unified `AppError` class and `handleError` function in `src/lib/errors.ts`.

### 2. Extract Magic Strings to Constants (Medium Priority)
Role names and status values are hardcoded. Create `src/constants/roles.ts` with `ROLES`, `LEADER_ROLES` constants and a `Role` type.

### 3. Request Deduplication in Hooks (Medium Priority)
Multiple components can trigger the same fetch simultaneously. Add a `deduplicatedFetch` utility in `src/lib/queryCache.ts`.

### 4. Form Validation Library (Medium Priority)
Validation logic is duplicated across modals. Create `src/lib/validation.ts` with reusable validators.

### 5. Base Modal Component (Medium Priority)
Multiple modals share the same structure. Extract `BaseModal` with standard header, scroll, footer.

### 6. Integration Tests (Medium Priority)
Unit tests exist but no E2E tests for critical flows (signup → join → view meetings, leader creates meeting → sends email).

### 7. Service Interfaces for All Domains (Lower Priority)
Auth, Email, Realtime have interfaces. Could extend to Message, Meeting, Thread services.

### 8. DI Container (Lower Priority)
Currently services are manually passed. Could use a simple React Context factory for `ServicesProvider`.

### 9. Feature Flags (Lower Priority)
No ability to gradually roll out features.

### 10. Offline Support (Lower Priority)
App requires network connection. Would need offline queue + sync.

## Completed
- ✅ Custom Hooks Layer (all screens use hooks)
- ✅ Repository Pattern (plain async functions in `src/repositories/`)
- ✅ Service Interfaces (auth, email, realtime)
- ✅ Storage Abstraction (Supabase + S3 interface)
- ✅ ErrorBoundary component + useErrorHandler hook
- ✅ Test suite (321 tests)
