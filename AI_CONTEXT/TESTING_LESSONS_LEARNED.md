# Testing Lessons Learned

This document captures hard-won insights from setting up and writing tests for the Leader App. Future developers and AI agents should read this before writing new tests.

---

## 🔧 Setup & Configuration

### Jest + Expo Configuration

1. **Use `jest-expo` preset** - It provides proper React Native mocks out of the box
2. **Clear Jest cache when mocks change** - Run `npx jest --clearCache` if you modify `jest.setup.js` or mocks
3. **transformIgnorePatterns must include all RN packages** - The regex pattern needs to include `@supabase`, `expo`, `react-navigation`, etc.

```js
// jest.config.js - working pattern
transformIgnorePatterns: [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*)',
],
```

### Platform Mocking

**Problem**: `Platform.OS` is undefined when modules import before mocks are set up.

**Solution**: Add Platform mock in `jest.setup.js`:

```js
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const Platform = jest.requireActual('react-native/Libraries/Utilities/Platform');
  Platform.OS = 'ios';
  Platform.Version = 14;
  Platform.select = jest.fn((obj) => obj.ios || obj.native || obj.default);
  return Platform;
});
```

---

## 🎭 Mocking Strategies

### Supabase Client Mocking

**Don't mock the entire module in test files** - Mock it once in `jest.setup.js` or a dedicated mock file.

**Pattern for chainable queries**:

```js
const createMockChain = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data, error }),
});

// Usage in test
(supabase.from as jest.Mock).mockReturnValue(createMockChain([mockData]));
```

### Context Mocking

**Always use mutable mock objects** so you can change values per test:

```js
// ❌ Bad - can't change per test
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isLeader: false }),
}));

// ✅ Good - mutable reference
let mockAuthContext = { user: mockUser, isLeader: false };

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// In test
it('shows leader features', () => {
  mockAuthContext.isLeader = true;
  // ...
});
```

### Navigation Mocking

```js
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: jest.fn((callback) => callback()),
}));
```

**Warning**: Using `jest.requireActual` for `@react-navigation/native` can cause issues if Platform isn't mocked. Mock Platform first.

---

## ⚠️ Common Pitfalls

### 1. "Unable to find node on an unmounted component"

**Cause**: Async state updates happening after component unmounts during test.

**Solutions**:
- Use `waitFor` with explicit timeout
- Ensure mock data returns immediately (use `mockResolvedValue` not actual promises)
- For FlatList/complex components, test behavior not rendered content

### 2. "Cannot read properties of undefined (reading 'auth')"

**Cause**: Supabase mock not returning expected structure.

**Solution**: Ensure your mock includes all nested properties:

```js
const supabaseMock = {
  auth: {
    getSession: jest.fn(),
    signInWithPassword: jest.fn(),
    // etc.
  },
  from: jest.fn(),
};
```

### 3. "Found multiple elements with text: X"

**Cause**: Same text appears multiple times in component tree.

**Solutions**:
- Use `getAllByText` and access specific index
- Use `getByTestId` with unique testID
- Use more specific queries like `getByRole` with name

### 4. Tests pass individually but fail together

**Cause**: Mock state bleeding between tests.

**Solution**: Reset mocks in `beforeEach`:

```js
beforeEach(() => {
  jest.clearAllMocks();
  // Reset mutable mock objects to defaults
  mockAuthContext = { ...defaultAuthContext };
});
```

---

## 📋 Testing Patterns

### Loading States

Always add `testID` to loading indicators:

```tsx
<ActivityIndicator testID="activity-indicator" />
```

Then test:

```js
await waitFor(() => {
  expect(queryByTestId('activity-indicator')).toBeNull();
}, { timeout: 3000 });
```

### Empty States

```js
it('should display empty state when no data', async () => {
  (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));
  
  const { getByText } = render(<MyScreen />);
  
  await waitFor(() => {
    expect(getByText('No items found')).toBeTruthy();
  });
});
```

### Conditional UI (Leader vs Member)

```js
it('should show button for leaders only', async () => {
  mockGroupContext.isGroupLeader = true;
  (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));
  
  const { getByText, queryByTestId } = render(<MyScreen />);
  
  // Wait for loading to complete first
  await waitFor(() => {
    expect(queryByTestId('activity-indicator')).toBeNull();
  });
  
  expect(getByText('Create Item')).toBeTruthy();
});
```

### Testing Supabase Queries

Instead of testing rendered content (fragile), test the query was made correctly:

```js
it('should filter by group_id', async () => {
  const mockChain = createMockChain([]);
  (supabase.from as jest.Mock).mockReturnValue(mockChain);
  
  render(<MyScreen />);
  
  await waitFor(() => {
    expect(mockChain.eq).toHaveBeenCalledWith('group_id', 'expected-id');
  });
});
```

---

## 🚀 Performance Tips

1. **Don't over-test** - Focus on behavior, not implementation details
2. **Parallel tests** - Jest runs test files in parallel by default
3. **Mock at the right level** - Mock Supabase, not fetch
4. **Skip integration tests in unit test suite** - Save those for CI

---

## 📁 File Organization

```
__tests__/
├── contexts/
│   ├── AuthContext.test.tsx
│   └── GroupContext.test.tsx
├── components/
│   ├── CreateThreadModal.test.tsx
│   └── AddResourceModal.test.tsx
├── screens/
│   ├── auth/
│   │   ├── SignInScreen.test.tsx
│   │   └── SignUpScreen.test.tsx
│   └── main/
│       ├── ProfileScreen.test.tsx
│       └── MeetingsScreen.test.tsx
└── lib/
    └── supabase.test.ts

__mocks__/
├── supabaseMock.ts
├── navigationMock.ts
└── testUtils.tsx
```

---

## 🔍 Debugging Failed Tests

1. **Read the full error** - React Native errors often have the real cause buried
2. **Check mock setup** - 90% of failures are mock issues
3. **Add console.logs in test** - Use `console.log(screen.debug())` to see rendered tree
4. **Run single test** - `npm test -- --testPathPattern="MyTest" -t "test name"`
5. **Clear cache** - `npx jest --clearCache`

---

## ✅ Quick Checklist Before Writing Tests

- [ ] Is Supabase mocked properly for this component's queries?
- [ ] Are all contexts (Auth, Group) mocked with mutable objects?
- [ ] Is navigation mocked if the component uses it?
- [ ] Do I have `beforeEach` to reset mocks?
- [ ] Am I waiting for loading states before asserting?
- [ ] Do async assertions use `waitFor`?

---

*Last updated: February 2026*

