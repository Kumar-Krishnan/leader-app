# Testing Plan

This document outlines the unit testing strategy for the Leader App.

## ✅ Current Status (Phase 1, 2 & 3 Complete!)

**Last Updated:** January 12, 2026

### Completed ✅
- **Setup**: Jest + React Native Testing Library configured
- **Mock Files**: Supabase, AsyncStorage, Navigation, DocumentPicker mocks created
- **AuthContext Tests**: 9/9 passing ✅
- **GroupContext Tests**: 9/9 passing ✅
- **Supabase Config Tests**: 5/5 passing ✅
- **CreateThreadModal Tests**: 9/9 passing ✅
- **AddResourceModal Tests**: 5/5 passing ✅
- **SignInScreen Tests**: 17/17 passing ✅
- **SignUpScreen Tests**: 17/17 passing ✅
- **ProfileScreen Tests**: 22/22 passing ✅
- **MeetingsScreen Tests**: 9/9 passing ✅
- **ThreadsScreen Tests**: 21/21 passing ✅

- **ThreadDetailScreen Tests**: 19/19 passing ✅

- **useThreads Hook Tests**: 11/11 passing ✅

- **useMeetings Hook Tests**: 9/9 passing ✅
- **useMessages Hook Tests**: 10/10 passing ✅

- **MeetingsScreen Tests (refactored)**: 17 tests passing ✅
- **ThreadDetailScreen Tests (refactored)**: 18 tests passing ✅

- **useResources Hook Tests**: 12/12 passing ✅
- **useGroupMembers Hook Tests**: 9/9 passing ✅

**Total: 199 tests passing | 0 failures** 🎉

### Test Commands
```bash
npm test              # Run all tests
npm test:watch        # Watch mode
npm test:coverage     # With coverage report
```

### Next Steps
- Phase 2: Component tests (CreateMeetingModal, CreateThreadModal, AddResourceModal)
- Phase 3: Screen tests (Auth, Main, Group screens)
- Phase 4: Storage abstraction tests

---

## Testing Framework Setup

### Required Dependencies
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo
npm install --save-dev @types/jest ts-jest
```

### Configuration Files Needed
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test setup (mocks for Supabase, AsyncStorage, etc.)

---

## Files to Test

### Priority 1: Core Logic & Contexts

| File | Description | Test Focus |
|------|-------------|------------|
| `src/contexts/AuthContext.tsx` | Authentication state management | Session handling, sign in/out, profile fetching |
| `src/contexts/GroupContext.tsx` | Group membership management | Group fetching, join requests, role permissions |
| `src/lib/supabase.ts` | Supabase client configuration | Client initialization, platform detection |
| `src/types/database.ts` | TypeScript type definitions | Type exports (compile-time only) |

### Priority 2: Storage Abstraction Layer

| File | Description | Test Focus |
|------|-------------|------------|
| `src/lib/storage/types.ts` | Storage interface definitions | Interface contracts |
| `src/lib/storage/supabaseStorage.ts` | Supabase storage implementation | Upload, download, delete, getUrl |
| `src/lib/storage/awsS3Storage.ts` | AWS S3 storage implementation | Upload, download, delete, getUrl |
| `src/lib/storage/index.ts` | Storage factory | Provider switching |

### Priority 3: Components (Modals)

| File | Description | Test Focus |
|------|-------------|------------|
| `src/components/CreateMeetingModal.tsx` | Event creation form | Form validation, date handling, recurrence, attendee selection |
| `src/components/CreateThreadModal.tsx` | Thread creation form | Form validation, submission |
| `src/components/AddResourceModal.tsx` | Resource upload form | File type detection, form validation |

### Priority 4: Screens

| File | Description | Test Focus |
|------|-------------|------------|
| `src/screens/auth/SignInScreen.tsx` | Login form | Input validation, error handling |
| `src/screens/auth/SignUpScreen.tsx` | Registration form | Input validation, error handling |
| `src/screens/main/MeetingsScreen.tsx` | Events list & RSVP | RSVP logic, series handling, delete logic |
| `src/screens/main/ThreadsScreen.tsx` | Threads list | Thread loading, navigation |
| `src/screens/main/ThreadDetailScreen.tsx` | Thread messages | Message sending, editing, deleting, realtime |
| `src/screens/main/ResourcesScreen.tsx` | Resources & folders | Folder navigation, file operations |
| `src/screens/main/ProfileScreen.tsx` | User profile & settings | Group switching, settings display |
| `src/screens/group/GroupSelectScreen.tsx` | Group selection/creation | Join flow, create flow |
| `src/screens/group/ManageMembersScreen.tsx` | Member management | Approve/reject requests, role changes |
| `src/screens/leader/LeaderResourcesScreen.tsx` | Leader-only resources | Visibility filtering |

### Priority 5: Navigation

| File | Description | Test Focus |
|------|-------------|------------|
| `src/navigation/RootNavigator.tsx` | Root navigation logic | Auth state routing |
| `src/navigation/MainNavigator.tsx` | Tab navigation | Tab configuration, nested stacks |
| `src/navigation/AuthNavigator.tsx` | Auth flow navigation | Screen configuration |

---

## Detailed Test Plans

### AuthContext Tests
```typescript
describe('AuthContext', () => {
  describe('initialization', () => {
    it('should start in loading state');
    it('should handle missing Supabase config gracefully');
    it('should restore session from storage');
    it('should timeout on hanging getSession');
  });
  
  describe('signIn', () => {
    it('should sign in with valid credentials');
    it('should return error for invalid credentials');
    it('should fetch profile after successful sign in');
  });
  
  describe('signUp', () => {
    it('should create account with valid data');
    it('should return error for non-whitelisted email');
    it('should return error for weak password');
  });
  
  describe('signOut', () => {
    it('should clear session');
    it('should reset user state');
  });
  
  describe('onAuthStateChange', () => {
    it('should ignore TOKEN_REFRESHED events');
    it('should update state on SIGNED_IN');
    it('should clear state on SIGNED_OUT');
  });
});
```

### GroupContext Tests
```typescript
describe('GroupContext', () => {
  describe('initialization', () => {
    it('should wait for auth to load');
    it('should fetch groups on user login');
    it('should restore selected group from storage');
  });
  
  describe('permissions', () => {
    it('should set isGroupLeader for leader role');
    it('should set isGroupLeader for admin role');
    it('should set canApproveRequests for leader-helper');
    it('should not set canApproveRequests for member');
  });
  
  describe('createGroup', () => {
    it('should create group with unique code');
    it('should add creator as admin');
    it('should reject non-leaders');
  });
  
  describe('requestToJoin', () => {
    it('should create pending request');
    it('should error on invalid code');
  });
  
  describe('approveRequest', () => {
    it('should add user to group');
    it('should update request status');
  });
});
```

### CreateMeetingModal Tests
```typescript
describe('CreateMeetingModal', () => {
  describe('form validation', () => {
    it('should require title');
    it('should require date');
    it('should validate recurrence count (1-52)');
  });
  
  describe('recurrence', () => {
    it('should generate correct weekly dates');
    it('should generate correct monthly dates');
    it('should create series_id for recurring events');
    it('should set series_index and series_total');
  });
  
  describe('attendee selection', () => {
    it('should select all members by default');
    it('should toggle individual members');
    it('should allow select all/none');
  });
});
```

### MeetingsScreen Tests
```typescript
describe('MeetingsScreen', () => {
  describe('RSVP', () => {
    it('should update single event RSVP');
    it('should show series modal for recurring events');
    it('should update all events in series when selected');
    it('should only update single event when selected');
  });
  
  describe('delete', () => {
    it('should delete single non-series event');
    it('should show series modal for recurring events');
    it('should delete all events in series when selected');
    it('should delete only single event when selected');
  });
  
  describe('display', () => {
    it('should show series badge for recurring events');
    it('should show attendee count');
    it('should show RSVP buttons for invited users');
  });
});
```

### Storage Tests
```typescript
describe('Storage Abstraction', () => {
  describe('SupabaseStorage', () => {
    it('should upload file');
    it('should download file');
    it('should delete file');
    it('should generate signed URL');
  });
  
  describe('AWSS3Storage', () => {
    it('should throw not implemented for all methods');
  });
  
  describe('getStorage', () => {
    it('should return Supabase storage by default');
    it('should return AWS storage when configured');
  });
});
```

---

## Mock Requirements

### Supabase Mock
```typescript
// __mocks__/supabase.ts
export const supabase = {
  auth: {
    getSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      createSignedUrl: jest.fn(),
    })),
  },
  rpc: jest.fn(),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  })),
  removeChannel: jest.fn(),
};
```

### AsyncStorage Mock
```typescript
// __mocks__/@react-native-async-storage/async-storage.ts
export default {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
```

### Navigation Mock
```typescript
// __mocks__/@react-navigation/native.ts
export const useNavigation = jest.fn(() => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
}));

export const useFocusEffect = jest.fn();
export const useRoute = jest.fn(() => ({ params: {} }));
```

---

## Test Execution Plan

### Phase 1: Setup (Day 1)
1. Install testing dependencies
2. Configure Jest for React Native/Expo
3. Create mock files for external dependencies
4. Write first passing test

### Phase 2: Core Logic (Days 2-3)
1. AuthContext tests
2. GroupContext tests
3. Storage abstraction tests

### Phase 3: Components (Days 4-5)
1. CreateMeetingModal tests (recurrence logic is complex)
2. CreateThreadModal tests
3. AddResourceModal tests

### Phase 4: Screens (Days 6-8)
1. Auth screens (SignIn, SignUp)
2. Main screens (Meetings, Threads, Resources)
3. Group management screens

### Phase 5: Integration (Day 9-10)
1. Navigation flow tests
2. End-to-end user journey tests

---

## Coverage Goals

| Category | Target Coverage |
|----------|-----------------|
| Contexts | 90% |
| Utilities/Lib | 85% |
| Components | 75% |
| Screens | 70% |
| Navigation | 60% |

---

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- AuthContext.test.tsx
```

---

## CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

