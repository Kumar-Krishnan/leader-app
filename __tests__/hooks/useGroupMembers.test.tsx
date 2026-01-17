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
  group_id: 'group-id',
  role: 'member' as const,
  joined_at: new Date().toISOString(),
  user: {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'John Doe',
    role: 'user',
  },
};

const mockLeader = {
  id: 'member-2',
  user_id: 'user-2',
  group_id: 'group-id',
  role: 'leader' as const,
  joined_at: new Date().toISOString(),
  user: {
    id: 'user-2',
    email: 'leader@example.com',
    full_name: 'Jane Leader',
    role: 'leader',
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
    mockGroupContext = { currentGroup: mockGroup };
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMember, mockLeader]));
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
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockEq2 = jest.fn().mockResolvedValue({ data: {}, error: null });
    
    (supabase.from as jest.Mock).mockReturnValue({
      ...createMockChain([mockMember, mockLeader]),
      update: mockUpdate,
      eq: jest.fn().mockReturnValue({ eq: mockEq2 }),
    });

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
    const mockUpdate = jest.fn().mockReturnThis();
    let resolveUpdate: Function;
    const updatePromise = new Promise((resolve) => { resolveUpdate = resolve; });
    
    (supabase.from as jest.Mock).mockReturnValue({
      ...createMockChain([mockMember]),
      update: mockUpdate,
      eq: jest.fn().mockReturnValue({ 
        eq: jest.fn().mockReturnValue(updatePromise) 
      }),
    });

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
    const mockDelete = jest.fn().mockReturnThis();
    const mockEq2 = jest.fn().mockResolvedValue({ data: {}, error: null });
    
    (supabase.from as jest.Mock).mockReturnValue({
      ...createMockChain([mockMember, mockLeader]),
      delete: mockDelete,
      eq: jest.fn().mockReturnValue({ eq: mockEq2 }),
    });

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

    expect(result.current.error).toBe('Network error');
    consoleSpy.mockRestore();
  });

  it('should set error on role update failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (supabase.from as jest.Mock).mockReturnValue({
      ...createMockChain([mockMember]),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({ 
        eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Update failed') })
      }),
    });

    const { result } = renderHook(() => useGroupMembers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.updateRole('member-1', 'leader');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Update failed');
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
});

