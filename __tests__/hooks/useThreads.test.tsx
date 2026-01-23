import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useThreads } from '../../src/hooks/useThreads';
import { supabase } from '../../src/lib/supabase';

// Mock Supabase
jest.mock('../../src/lib/supabase');

// Mock data
const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
};

const mockGroup = {
  id: 'group-id',
  name: 'Test Group',
  role: 'leader' as const,
};

const mockThread = {
  id: 'thread-1',
  group_id: 'group-id',
  name: 'General Discussion',
  description: 'Main chat',
  created_by: 'user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_archived: false,
};

const mockThread2 = {
  id: 'thread-2',
  group_id: 'group-id',
  name: 'Support Requests',
  description: null,
  created_by: 'user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_archived: false,
};

// Mock auth context
let mockAuthContext = {
  user: mockUser,
  profile: null,
  isLeader: false,
  isAdmin: false,
};

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
let mockGroupContext: any = {
  currentGroup: mockGroup,
  isGroupLeader: true,
};

jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Helper to create mock chain
const createMockChain = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data, error }),
});

describe('useThreads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default mock data
    mockAuthContext = {
      user: mockUser,
      profile: null,
      isLeader: false,
      isAdmin: false,
    };
    
    mockGroupContext = {
      currentGroup: mockGroup,
      isGroupLeader: true,
    };

    // Default Supabase mock
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockThread, mockThread2]));
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => useThreads());

    expect(result.current.loading).toBe(true);
    expect(result.current.threads).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch threads on mount', async () => {
    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.threads).toHaveLength(2);
    expect(result.current.threads[0].name).toBe('General Discussion');
    expect(result.current.threads[1].name).toBe('Support Requests');
  });

  it('should return empty array when no group selected', async () => {
    mockGroupContext.currentGroup = null;

    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.threads).toEqual([]);
  });

  it('should return empty array when no user', async () => {
    mockAuthContext.user = null as any;

    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.threads).toEqual([]);
  });

  it('should set error on fetch failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain(null, new Error('Network error'))
    );

    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unable to connect. Please check your internet connection.');
    expect(result.current.threads).toEqual([]);

    consoleSpy.mockRestore();
  });

  it('should refetch threads when refetch is called', async () => {
    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous calls
    (supabase.from as jest.Mock).mockClear();
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockThread]));

    await act(async () => {
      await result.current.refetch();
    });

    expect(supabase.from).toHaveBeenCalledWith('threads');
    expect(result.current.threads).toHaveLength(1);
  });

  it('should create thread and add to list', async () => {
    const newThread = {
      ...mockThread,
      id: 'new-thread',
      name: 'New Thread',
    };

    const mockChain = {
      ...createMockChain([mockThread]),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: newThread, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdThread;
    await act(async () => {
      createdThread = await result.current.createThread('New Thread', 'Description');
    });

    expect(createdThread).toEqual(newThread);
    expect(result.current.threads).toContainEqual(newThread);
  });

  it('should return null on create error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockChain = {
      ...createMockChain([mockThread]),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdThread;
    await act(async () => {
      createdThread = await result.current.createThread('New Thread');
    });

    expect(createdThread).toBeNull();
    // getUserErrorMessage returns user-friendly message for unknown errors
    expect(result.current.error).toBe('Something went wrong. Please try again.');

    consoleSpy.mockRestore();
  });

  it('should archive thread and remove from list', async () => {
    const mockChain = {
      ...createMockChain([mockThread, mockThread2]),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.archiveThread('thread-1');
    });

    expect(success).toBe(true);
    expect(result.current.threads).not.toContainEqual(
      expect.objectContaining({ id: 'thread-1' })
    );
  });

  it('should return false on archive error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockChain = {
      ...createMockChain([mockThread]),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Archive failed') }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useThreads());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.archiveThread('thread-1');
    });

    expect(success).toBe(false);
    // getUserErrorMessage returns user-friendly message for unknown errors
    expect(result.current.error).toBe('Something went wrong. Please try again.');

    consoleSpy.mockRestore();
  });

  it('should query with correct filters', async () => {
    const mockChain = createMockChain([mockThread]);
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    renderHook(() => useThreads());

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('threads');
      expect(mockChain.eq).toHaveBeenCalledWith('group_id', 'group-id');
      expect(mockChain.eq).toHaveBeenCalledWith('is_archived', false);
      expect(mockChain.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });
  });
});

