/**
 * User-related mock factories
 */
import type { Profile, NotificationPreferences, UserRole } from '../../src/types/database';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Create a mock Supabase auth User object
 */
export function createMockUser(overrides: Partial<{
  id: string;
  email: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
}> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock Profile
 */
export function createMockProfile(overrides: DeepPartial<Profile> = {}): Profile {
  const defaultNotificationPrefs: NotificationPreferences = {
    messages: true,
    meetings: true,
    resources: true,
    push_enabled: true,
    ...overrides.notification_preferences,
  };

  return {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
    role: 'user' as UserRole,
    notification_preferences: defaultNotificationPrefs,
    hubspot_contact_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
    notification_preferences: defaultNotificationPrefs,
  };
}

/**
 * Create a mock Supabase session
 */
export function createMockSession(overrides: Partial<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: ReturnType<typeof createMockUser>;
}> = {}) {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: createMockUser(overrides.user),
    ...overrides,
  };
}

/**
 * Preset: Authenticated user with profile
 */
export function createMockAuthenticatedUser() {
  const user = createMockUser();
  const profile = createMockProfile({ id: user.id, email: user.email });
  const session = createMockSession({ user });
  return { user, profile, session };
}

/**
 * Preset: Leader user
 */
export function createMockLeaderUser() {
  const user = createMockUser({ id: 'leader-user-id', email: 'leader@example.com' });
  const profile = createMockProfile({
    id: user.id,
    email: user.email,
    full_name: 'Leader User',
    role: 'leader',
  });
  const session = createMockSession({ user });
  return { user, profile, session };
}

/**
 * Preset: Admin user
 */
export function createMockAdminUser() {
  const user = createMockUser({ id: 'admin-user-id', email: 'admin@example.com' });
  const profile = createMockProfile({
    id: user.id,
    email: user.email,
    full_name: 'Admin User',
    role: 'admin',
  });
  const session = createMockSession({ user });
  return { user, profile, session };
}
