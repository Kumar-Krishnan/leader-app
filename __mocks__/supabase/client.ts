/**
 * Supabase Client Mock
 *
 * Provides mock implementations for Supabase client testing
 */
import { createMockUser, createMockSession } from '../factories/users';

/**
 * Create a chainable mock for Supabase queries
 * Supports all common query methods with proper chaining
 */
export const createChainableMock = (finalValue: any = { data: null, error: null }) => {
  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'is', 'gte', 'lte', 'gt', 'lt',
    'like', 'ilike', 'contains', 'containedBy',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'match', 'not', 'or', 'and',
  ];

  methods.forEach((method) => {
    chain[method] = jest.fn(() => {
      if (method === 'single' || method === 'maybeSingle') {
        return Promise.resolve(finalValue);
      }
      return chain;
    });
  });

  // Make the chain thenable
  chain.then = (resolve: any) => Promise.resolve(finalValue).then(resolve);

  return chain;
};

/**
 * Create a mock Supabase client with configurable behavior
 */
export const createMockSupabase = (overrides: any = {}) => {
  const mockUser = createMockUser();
  const mockSession = createMockSession({ user: mockUser });

  const mockFrom = jest.fn(() => createChainableMock());

  return {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signInWithPassword: jest.fn(() =>
        Promise.resolve({
          data: { session: mockSession, user: mockUser },
          error: null,
        })
      ),
      signUp: jest.fn(() =>
        Promise.resolve({
          data: { session: mockSession, user: mockUser },
          error: null,
        })
      ),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn((callback) => {
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      }),
      ...overrides.auth,
    },
    from: mockFrom,
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() =>
          Promise.resolve({ data: { path: 'test-path' }, error: null })
        ),
        download: jest.fn(() =>
          Promise.resolve({ data: new Blob(), error: null })
        ),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
        createSignedUrl: jest.fn(() =>
          Promise.resolve({
            data: { signedUrl: 'https://example.com/signed-url' },
            error: null,
          })
        ),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/public-url' },
        })),
        list: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      ...overrides.storage,
    },
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
      ...overrides.functions,
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        if (callback) callback('SUBSCRIBED');
        return { unsubscribe: jest.fn() };
      }),
    })),
    removeChannel: jest.fn(),
    ...overrides,
  };
};

/**
 * Default mock instance
 */
export const mockSupabase = createMockSupabase();

/**
 * Configure mock to return specific data for a table
 *
 * @example
 * ```tsx
 * const supabase = createMockSupabase();
 * configureMockTable(supabase, 'meetings', [mockMeeting1, mockMeeting2]);
 * ```
 */
export function configureMockTable(
  supabase: ReturnType<typeof createMockSupabase>,
  tableName: string,
  data: any[],
  error: any = null
): void {
  supabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return createChainableMock({ data, error });
    }
    return createChainableMock();
  });
}

/**
 * Create a mock that fails for a specific table
 */
export function configureMockTableError(
  supabase: ReturnType<typeof createMockSupabase>,
  tableName: string,
  errorMessage: string = 'Database error'
): void {
  supabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return createChainableMock({ data: null, error: new Error(errorMessage) });
    }
    return createChainableMock();
  });
}

/**
 * Reset all Supabase mock functions
 */
export function resetSupabaseMock(supabase: ReturnType<typeof createMockSupabase>): void {
  supabase.from.mockClear();
  supabase.rpc.mockClear();
  supabase.channel.mockClear();
  supabase.removeChannel.mockClear();
  supabase.auth.getSession.mockClear();
  supabase.auth.getUser.mockClear();
  supabase.auth.signInWithPassword.mockClear();
  supabase.auth.signUp.mockClear();
  supabase.auth.signOut.mockClear();
  supabase.auth.onAuthStateChange.mockClear();
}
