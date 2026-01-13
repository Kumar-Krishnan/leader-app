import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockSession = {
  access_token: 'test-access-token',
  user: mockUser,
};

const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'leader',
};

const mockGroup = {
  id: 'test-group-id',
  name: 'Test Group',
  description: 'A test group',
  code: 'ABC123',
  created_by: 'test-user-id',
};

// Create shared mock instance
const createMockSupabase = () => {
  const getSession = jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null });
  const onAuthStateChange = jest.fn().mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } }
  });
  
  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };
    }
    if (table === 'group_members') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({
          data: [{
            id: 'test-member-id',
            role: 'admin',
            group: mockGroup,
          }],
          error: null,
        }),
      };
    }
    if (table === 'group_join_requests') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null }),
      };
    }
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
  
  const rpc = jest.fn().mockResolvedValue({ data: null, error: null });

  return {
    auth: { getSession, onAuthStateChange, signInWithPassword: jest.fn(), signUp: jest.fn(), signOut: jest.fn() },
    from,
    rpc,
    _mocks: { getSession, onAuthStateChange, from, rpc }
  };
};

const mockSupabaseInstance = createMockSupabase();

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock supabase module
jest.mock('../../src/lib/supabase', () => ({
  get supabase() { return mockSupabaseInstance; },
  isSupabaseConfigured: true,
}));

// Import after mocks
import { AuthProvider } from '../../src/contexts/AuthContext';
import { GroupProvider, useGroup } from '../../src/contexts/GroupContext';

// Test component
const TestComponent: React.FC = () => {
  const { currentGroup, loading, isGroupLeader, isGroupAdmin, canApproveRequests } = useGroup();
  
  if (loading) return <Text testID="loading">Loading...</Text>;
  if (currentGroup) {
    return (
      <>
        <Text testID="group-name">{currentGroup.name}</Text>
        <Text testID="group-role">{currentGroup.role}</Text>
        <Text testID="is-leader">{isGroupLeader ? 'yes' : 'no'}</Text>
        <Text testID="is-admin">{isGroupAdmin ? 'yes' : 'no'}</Text>
        <Text testID="can-approve">{canApproveRequests ? 'yes' : 'no'}</Text>
      </>
    );
  }
  return <Text testID="no-group">No group</Text>;
};

const renderWithProviders = () => render(
  <AuthProvider>
    <GroupProvider>
      <TestComponent />
    </GroupProvider>
  </AuthProvider>
);

describe('GroupContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset default mocks
    mockSupabaseInstance._mocks.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });
    mockSupabaseInstance._mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
  });

  describe('initialization', () => {
    it('should start in loading state', () => {
      const { getByTestId } = renderWithProviders();
      expect(getByTestId('loading')).toBeTruthy();
    });

    it('should load groups for authenticated user', async () => {
      const { getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByTestId('group-name')).toBeTruthy();
      });
      
      expect(getByTestId('group-name').props.children).toBe('Test Group');
    });
  });

  describe('permissions', () => {
    it('should set isGroupAdmin for admin role', async () => {
      const { getByTestId } = renderWithProviders();

      await waitFor(() => {
        expect(getByTestId('is-admin').props.children).toBe('yes');
      });
    });

    it('should set canApproveRequests for admin role', async () => {
      const { getByTestId } = renderWithProviders();

      await waitFor(() => {
        expect(getByTestId('can-approve').props.children).toBe('yes');
      });
    });
  });

  describe('requestToJoin', () => {
    it('should call rpc with group code', async () => {
      let groupContext: ReturnType<typeof useGroup>;
      const CaptureContext = () => {
        groupContext = useGroup();
        return null;
      };

      render(
        <AuthProvider>
          <GroupProvider>
            <CaptureContext />
          </GroupProvider>
        </AuthProvider>
      );

      await waitFor(() => expect(groupContext!.loading).toBe(false));

      await act(async () => {
        await groupContext!.requestToJoin('TESTCODE');
      });

      expect(mockSupabaseInstance._mocks.rpc).toHaveBeenCalledWith(
        'request_to_join_group',
        { group_code: 'TESTCODE' }
      );
    });
  });

  describe('approveRequest', () => {
    it('should call rpc to approve request', async () => {
      let groupContext: ReturnType<typeof useGroup>;
      const CaptureContext = () => {
        groupContext = useGroup();
        return null;
      };

      render(
        <AuthProvider>
          <GroupProvider>
            <CaptureContext />
          </GroupProvider>
        </AuthProvider>
      );

      await waitFor(() => expect(groupContext!.loading).toBe(false));

      await act(async () => {
        await groupContext!.approveRequest('request-123');
      });

      expect(mockSupabaseInstance._mocks.rpc).toHaveBeenCalledWith(
        'approve_join_request',
        { request_id: 'request-123' }
      );
    });
  });

  describe('rejectRequest', () => {
    it('should call rpc to reject request', async () => {
      let groupContext: ReturnType<typeof useGroup>;
      const CaptureContext = () => {
        groupContext = useGroup();
        return null;
      };

      render(
        <AuthProvider>
          <GroupProvider>
            <CaptureContext />
          </GroupProvider>
        </AuthProvider>
      );

      await waitFor(() => expect(groupContext!.loading).toBe(false));

      await act(async () => {
        await groupContext!.rejectRequest('request-456');
      });

      expect(mockSupabaseInstance._mocks.rpc).toHaveBeenCalledWith(
        'reject_join_request',
        { request_id: 'request-456' }
      );
    });
  });
});
