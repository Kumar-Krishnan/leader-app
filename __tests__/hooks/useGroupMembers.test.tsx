import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useGroupMembers } from '../../src/hooks/useGroupMembers';
import { supabase } from '../../src/lib/supabase';

// Mock Supabase
jest.mock('../../src/lib/supabase');

// Mock data
const mockGroup = {
  id: 'group-id',
  name: 'Test Group',
};

const mockMember = {
  id: 'member-1',
  user_id: 'user-1',
  placeholder_id: null,
  group_id: 'group-id',
  role: 'member' as const,
  joined_at: new Date().toISOString(),
  user: {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'John Doe',
    role: 'user',
  },
  placeholder: null,
};

const mockLeader = {
  id: 'member-2',
  user_id: 'user-2',
  placeholder_id: null,
  group_id: 'group-id',
  role: 'leader' as const,
  joined_at: new Date().toISOString(),
  user: {
    id: 'user-2',
    email: 'leader@example.com',
    full_name: 'Jane Leader',
    role: 'leader',
  },
  placeholder: null,
};

const mockPlaceholderMember = {
  id: 'member-3',
  user_id: null,
  placeholder_id: 'placeholder-1',
  group_id: 'group-id',
  role: 'member' as const,
  joined_at: new Date().toISOString(),
  user: null,
  placeholder: {
    id: 'placeholder-1',
    email: 'placeholder@example.com',
    full_name: 'Placeholder User',
    created_by: 'user-2',
    created_at: new Date().toISOString(),
  },
};

// Mock group context
let mockGroupContext: any = { currentGroup: mockGroup };
jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Helper to create mock chain
const createMockChain = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
});

describe('useGroupMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGroupContext = { currentGroup: mockGroup };
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMember, mockLeader]));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => useGroupMembers());
    expect(result.current.loading).toBe(true);
    expect(result.current.members).toEqual([]);
  });

  it('should fetch members on mount', async () => {
    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.members).toHaveLength(2);
    expect(result.current.members[0].user.full_name).toBe('John Doe');
  });

  it('should return empty when no group selected', async () => {
    mockGroupContext.currentGroup = null;

    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.members).toEqual([]);
  });

  it('should update member role successfully', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ data: {}, error: null });
    const baseChain = createMockChain([mockMember, mockLeader]);

    // Create a mock that handles both fetch (select.eq.order) and update (update.eq.eq) chains
    const mockChain = {
      ...baseChain,
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ eq: mockEq2 }),
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.updateRole('member-1', 'leader-helper');
    });

    expect(success).toBe(true);
    expect(result.current.processingId).toBeNull();
  });

  it('should set processingId during role update', async () => {
    let resolveUpdate: Function;
    const updatePromise = new Promise((resolve) => { resolveUpdate = resolve; });
    const baseChain = createMockChain([mockMember]);

    // Create a mock that handles both fetch (select.eq.order) and update (update.eq.eq) chains
    const mockChain = {
      ...baseChain,
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(updatePromise),
        }),
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Start update but don't await
    act(() => {
      result.current.updateRole('member-1', 'leader');
    });

    expect(result.current.processingId).toBe('member-1');

    // Resolve the update
    await act(async () => {
      resolveUpdate!({ data: {}, error: null });
    });

    await waitFor(() => {
      expect(result.current.processingId).toBeNull();
    });
  });

  it('should remove member successfully', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({ data: {}, error: null });
    const baseChain = createMockChain([mockMember, mockLeader]);

    // Create a mock that handles both fetch (select.eq.order) and delete (delete.eq.eq) chains
    const mockChain = {
      ...baseChain,
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ eq: mockEq2 }),
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.removeMember('member-1');
    });

    expect(success).toBe(true);
    expect(result.current.members).not.toContainEqual(
      expect.objectContaining({ id: 'member-1' })
    );
  });

  it('should set error on fetch failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain(null, new Error('Network error'))
    );

    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unable to connect. Please check your internet connection.');
    consoleSpy.mockRestore();
  });

  it('should set error on role update failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const baseChain = createMockChain([mockMember]);

    // Create a mock that handles both fetch (select.eq.order) and update (update.eq.eq) chains
    const mockChain = {
      ...baseChain,
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
        }),
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.updateRole('member-1', 'leader');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Something went wrong. Please try again.');
    consoleSpy.mockRestore();
  });

  it('should call supabase.from with group_members table', async () => {
    renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('group_members');
    });
  });

  it('should filter by group_id', async () => {
    const mockChain = createMockChain([mockMember]);
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(mockChain.eq).toHaveBeenCalledWith('group_id', 'group-id');
    });
  });

  describe('Placeholder Members', () => {
    it('should fetch and transform placeholder members correctly', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockChain([mockMember, mockPlaceholderMember])
      );

      const { result } = renderHook(() => useGroupMembers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.members).toHaveLength(2);

      // Check regular member
      const regularMember = result.current.members.find(m => m.id === 'member-1');
      expect(regularMember?.isPlaceholder).toBe(false);
      expect(regularMember?.displayName).toBe('John Doe');
      expect(regularMember?.displayEmail).toBe('user@example.com');

      // Check placeholder member
      const placeholderMember = result.current.members.find(m => m.id === 'member-3');
      expect(placeholderMember?.isPlaceholder).toBe(true);
      expect(placeholderMember?.displayName).toBe('Placeholder User');
      expect(placeholderMember?.displayEmail).toBe('placeholder@example.com');
    });

    it('should call createPlaceholder RPC function successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: 'new-placeholder-id',
        error: null,
      });
      (supabase.rpc as jest.Mock) = mockRpc;
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMember]));

      const { result } = renderHook(() => useGroupMembers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.createPlaceholder(
          'newuser@example.com',
          'New User',
          'member'
        );
      });

      expect(mockRpc).toHaveBeenCalledWith('create_placeholder_member', expect.objectContaining({
        p_group_id: 'group-id',
        p_email: 'newuser@example.com',
        p_full_name: 'New User',
      }));
      expect(success).toBe(true);
    });

    it('should set error when createPlaceholder fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('User already exists'),
      });
      (supabase.rpc as jest.Mock) = mockRpc;
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMember]));

      const { result } = renderHook(() => useGroupMembers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.createPlaceholder(
          'existing@example.com',
          'Existing User',
          'member'
        );
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
      consoleSpy.mockRestore();
    });

    it('should return false when no group selected for createPlaceholder', async () => {
      mockGroupContext.currentGroup = null;

      const { result } = renderHook(() => useGroupMembers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.createPlaceholder(
          'test@example.com',
          'Test User',
          'member'
        );
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('No group selected');
    });
  });
});

