// Supabase client mock for testing

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  role: 'user' as const,
  notification_preferences: {
    messages: true,
    meetings: true,
    resources: true,
    push_enabled: true,
  },
  hubspot_contact_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Create a chainable mock for Supabase queries
const createChainableMock = (finalValue: any = { data: null, error: null }) => {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'is', 'gte', 'lte', 'order', 'limit', 'single', 'maybeSingle'];
  
  methods.forEach(method => {
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

export const createMockSupabase = (overrides: any = {}) => {
  const mockFrom = jest.fn(() => createChainableMock());
  
  return {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { session: mockSession, user: mockUser }, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: { session: mockSession, user: mockUser }, error: null })),
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
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        download: jest.fn(() => Promise.resolve({ data: new Blob(), error: null })),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
        createSignedUrl: jest.fn(() => Promise.resolve({ data: { signedUrl: 'https://example.com/signed-url' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/public-url' } })),
      })),
      ...overrides.storage,
    },
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
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

// Default mock instance
export const mockSupabase = createMockSupabase();

