import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

const mockProfile = {
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
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Create mock implementation
const createMockSupabase = () => {
  const getSession = jest.fn().mockResolvedValue({ data: { session: null }, error: null });
  const signInWithPassword = jest.fn();
  const signUp = jest.fn();
  const signOut = jest.fn().mockResolvedValue({ error: null });
  const onAuthStateChange = jest.fn().mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } }
  });
  
  const from = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  return {
    auth: { getSession, signInWithPassword, signUp, signOut, onAuthStateChange },
    from,
    // Expose individual mocks for test assertions
    _mocks: { getSession, signInWithPassword, signUp, signOut, onAuthStateChange, from }
  };
};

const mockSupabaseInstance = createMockSupabase();

// Mock the module
jest.mock('../../src/lib/supabase', () => ({
  get supabase() { return mockSupabaseInstance; },
  isSupabaseConfigured: true,
}));

// Import after mock
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

// Test component
const TestComponent: React.FC = () => {
  const { user, loading, isLeader, isAdmin } = useAuth();
  
  if (loading) return <Text testID="loading">Loading...</Text>;
  if (user) {
    return (
      <>
        <Text testID="user-email">{user.email}</Text>
        <Text testID="is-leader">{isLeader ? 'yes' : 'no'}</Text>
        <Text testID="is-admin">{isAdmin ? 'yes' : 'no'}</Text>
      </>
    );
  }
  return <Text testID="no-user">No user</Text>;
};

const renderWithAuth = () => render(
  <AuthProvider>
    <TestComponent />
  </AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default behavior
    mockSupabaseInstance._mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabaseInstance._mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
  });

  describe('initialization', () => {
    it('should start in loading state', () => {
      const { getByTestId } = renderWithAuth();
      expect(getByTestId('loading')).toBeTruthy();
    });

    it('should show no user when no session exists', async () => {
      const { getByTestId } = renderWithAuth();
      await waitFor(() => {
        expect(getByTestId('no-user')).toBeTruthy();
      });
    });

    it('should restore session from storage and show user', async () => {
      mockSupabaseInstance._mocks.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockSupabaseInstance._mocks.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      });

      const { getByTestId } = renderWithAuth();
      
      await waitFor(() => {
        expect(getByTestId('user-email')).toBeTruthy();
      });
      
      expect(mockSupabaseInstance._mocks.getSession).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('should call supabase signInWithPassword', async () => {
      mockSupabaseInstance._mocks.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      
      mockSupabaseInstance._mocks.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      });

      let authContext: ReturnType<typeof useAuth>;
      const CaptureContext = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureContext />
        </AuthProvider>
      );

      await waitFor(() => expect(authContext!.loading).toBe(false));

      await act(async () => {
        const result = await authContext!.signIn('test@example.com', 'password123');
        expect(result.error).toBeNull();
      });

      expect(mockSupabaseInstance._mocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error for invalid credentials', async () => {
      const authError = { message: 'Invalid login credentials' };
      mockSupabaseInstance._mocks.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: authError,
      });

      let authContext: ReturnType<typeof useAuth>;
      const CaptureContext = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureContext />
        </AuthProvider>
      );

      await waitFor(() => expect(authContext!.loading).toBe(false));

      await act(async () => {
        const result = await authContext!.signIn('wrong@example.com', 'wrongpassword');
        expect(result.error).toEqual(authError);
      });
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp with user data', async () => {
      mockSupabaseInstance._mocks.signUp.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      let authContext: ReturnType<typeof useAuth>;
      const CaptureContext = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureContext />
        </AuthProvider>
      );

      await waitFor(() => expect(authContext!.loading).toBe(false));

      await act(async () => {
        const result = await authContext!.signUp('new@example.com', 'password123', 'New User');
        expect(result.error).toBeNull();
      });

      expect(mockSupabaseInstance._mocks.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: { full_name: 'New User' },
        },
      });
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut', async () => {
      mockSupabaseInstance._mocks.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockSupabaseInstance._mocks.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      });

      let authContext: ReturnType<typeof useAuth>;
      const CaptureContext = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureContext />
        </AuthProvider>
      );

      await waitFor(() => expect(authContext!.user).toBeTruthy());

      await act(async () => {
        await authContext!.signOut();
      });

      expect(mockSupabaseInstance._mocks.signOut).toHaveBeenCalled();
    });
  });

  describe('role checks', () => {
    it('should set isLeader for leader role', async () => {
      mockSupabaseInstance._mocks.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockSupabaseInstance._mocks.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { ...mockProfile, role: 'leader' }, 
          error: null 
        }),
      });

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('is-leader').props.children).toBe('yes');
      });
    });

    it('should set isAdmin for admin role', async () => {
      mockSupabaseInstance._mocks.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockSupabaseInstance._mocks.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { ...mockProfile, role: 'admin' }, 
          error: null 
        }),
      });

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('is-admin').props.children).toBe('yes');
        expect(getByTestId('is-leader').props.children).toBe('yes');
      });
    });
  });
});
