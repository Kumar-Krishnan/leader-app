# Testing Guide

**321 tests passing across 21 suites** (February 2026)

## Commands
```bash
npm test                                    # Run all
npm test -- --watch                         # Watch mode
npm test -- --coverage                      # Coverage report
npm test -- --testPathPattern="MyTest"      # Specific file
npm test -- --testPathPattern="MyTest" -t "test name"  # Specific test
```

## Architecture
- **Screen tests** mock hooks (not Supabase) — decoupled from data layer
- **Hook tests** mock repositories
- **Context tests** mock Supabase directly
- Jest with `jest-expo` preset, Testing Library for React Native

## Coverage
| Area | Tests | Key Files |
|------|-------|-----------|
| Hooks | 59 | useMeetings, useThreads, useMessages, useResources, useGroupMembers |
| Screens | 130+ | Auth, Profile, Meetings, Threads |
| Components | 68 | Modals, GroupSidebar, DrawerNavigator |
| Contexts | 18 | AuthContext, GroupContext |

## Mock Patterns

### Mutable mock objects (required for per-test overrides)
```js
let mockAuthContext = { user: mockUser, isLeader: false };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Override in specific test:
it('shows leader features', () => {
  mockAuthContext.isLeader = true;
  // ...
});
```

### Supabase chainable queries
```js
const createMockChain = (data, error = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data, error }),
});
```

### Screen tests (mock hooks, not Supabase)
```js
jest.mock('../../../src/hooks/useMeetings', () => ({
  useMeetings: () => mockUseMeetingsResult,
}));

mockUseMeetingsResult = {
  meetings: [mockMeeting],
  loading: false,
  error: null,
  rsvpToMeeting: jest.fn().mockResolvedValue(true),
};
```

## Common Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| "Unable to find node on unmounted component" | Async state updates after unmount | Use `waitFor` with explicit timeout |
| "Cannot read properties of undefined (reading 'auth')" | Supabase mock missing nested props | Ensure mock includes all nested properties |
| "Found multiple elements with text: X" | Duplicate text in component tree | Use `getAllByText()[index]` or `getByTestId` |
| Tests pass alone, fail together | Mock state bleeding | Reset in `beforeEach`: `jest.clearAllMocks()` + reset mutable mocks |

## Checklist Before Writing Tests
- Supabase mocked for this component's queries?
- All contexts mocked with mutable objects?
- Navigation mocked if component uses it?
- `beforeEach` resets mocks?
- Loading states awaited before asserting?
- Async assertions wrapped in `waitFor`?

## Setup
- `jest.config.js` — config with jest-expo preset and module aliases
- `jest.setup.js` — mocks for AsyncStorage, SecureStore, expo-location, navigation, Platform
- `__mocks__/` — Supabase client mocks, hook mocks, context mocks, test factories
