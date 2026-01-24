/**
 * AuthContext Mock
 *
 * Provides mock implementations for useAuth hook testing
 */
import { createMockUser, createMockProfile, createMockSession } from '../factories/users';
import type { Profile } from '../../src/types/database';

/**
 * AuthContext type (mirrors the real AuthContextType)
 */
export interface MockAuthContextType {
  session: ReturnType<typeof createMockSession> | null;
  user: ReturnType<typeof createMockUser> | null;
  profile: Profile | null;
  loading: boolean;
  signUp: jest.Mock;
  signIn: jest.Mock;
  signOut: jest.Mock;
  refreshProfile: jest.Mock;
  isLeader: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
}

/**
 * Create a mock AuthContext value
 */
export function createMockAuthContext(
  overrides: Partial<MockAuthContextType> = {}
): MockAuthContextType {
  const user = overrides.user ?? createMockUser();
  const profile = overrides.profile ?? (user ? createMockProfile({ id: user.id, email: user.email }) : null);
  const session = overrides.session ?? (user ? createMockSession({ user }) : null);

  return {
    session,
    user,
    profile,
    loading: false,
    signUp: jest.fn().mockResolvedValue({ error: null }),
    signIn: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue(undefined),
    refreshProfile: jest.fn().mockResolvedValue(undefined),
    isLeader: profile?.role === 'leader' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
    isConfigured: true,
    ...overrides,
  };
}

/**
 * Preset: Unauthenticated user
 */
export function createMockAuthContextUnauthenticated(): MockAuthContextType {
  return createMockAuthContext({
    session: null,
    user: null,
    profile: null,
    isLeader: false,
    isAdmin: false,
  });
}

/**
 * Preset: Loading state
 */
export function createMockAuthContextLoading(): MockAuthContextType {
  return createMockAuthContext({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });
}

/**
 * Preset: Leader user
 */
export function createMockAuthContextAsLeader(): MockAuthContextType {
  const user = createMockUser({ id: 'leader-user-id', email: 'leader@example.com' });
  const profile = createMockProfile({
    id: user.id,
    email: user.email,
    full_name: 'Leader User',
    role: 'leader',
  });
  return createMockAuthContext({
    user,
    profile,
    isLeader: true,
    isAdmin: false,
  });
}

/**
 * Preset: Admin user
 */
export function createMockAuthContextAsAdmin(): MockAuthContextType {
  const user = createMockUser({ id: 'admin-user-id', email: 'admin@example.com' });
  const profile = createMockProfile({
    id: user.id,
    email: user.email,
    full_name: 'Admin User',
    role: 'admin',
  });
  return createMockAuthContext({
    user,
    profile,
    isLeader: true,
    isAdmin: true,
  });
}

/**
 * Create a mutable mock that can be modified during tests
 *
 * Usage:
 * const { mockAuth, setAuth } = createMutableAuthMock();
 * setAuth({ loading: true }); // Update mock value
 */
export function createMutableAuthMock() {
  let currentValue = createMockAuthContext();

  const setAuth = (overrides: Partial<MockAuthContextType>) => {
    currentValue = { ...currentValue, ...overrides };
  };

  const getMock = () => currentValue;

  return { mockAuth: getMock, setAuth };
}
