import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useMessages } from '../../src/hooks/useMessages';
import { supabase } from '../../src/lib/supabase';

// Mock Supabase
jest.mock('../../src/lib/supabase');

// Mock data
const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
};

const mockMessage = {
  id: 'message-1',
  thread_id: 'thread-1',
  sender_id: 'user-id',
  content: 'Hello everyone!',
  created_at: new Date().toISOString(),
  attachments: [],
  sender: {
    id: 'user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'user',
  },
};

// Mock auth context
let mockAuthContext = {
  user: mockUser,
};

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock realtime channel
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};

// Helper to create mock chain
const createMockChain = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
  insert: jest.fn().mockResolvedValue({ data, error }),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data, error }),
});

describe('useMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext = { user: mockUser };
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMessage]));
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
    (supabase.removeChannel as jest.Mock).mockReturnValue(undefined);
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => useMessages('thread-1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(result.current.sending).toBe(false);
  });

  it('should fetch messages on mount', async () => {
    const { result } = renderHook(() => useMessages('thread-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello everyone!');
  });

  it('should return empty when no threadId', async () => {
    // When no threadId, loading stays true briefly then resolves
    const { result } = renderHook(() => useMessages(''));

    // Should have empty messages regardless of loading state
    expect(result.current.messages).toEqual([]);
  });

  it('should set error on fetch failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain(null, new Error('Network error'))
    );

    const { result } = renderHook(() => useMessages('thread-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unable to connect. Please check your internet connection.');
    consoleSpy.mockRestore();
  });

  it('should send message successfully', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      ...createMockChain([mockMessage]),
      insert: mockInsert,
    });

    const { result } = renderHook(() => useMessages('thread-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.sendMessage('New message');
    });

    expect(success).toBe(true);
    expect(result.current.sending).toBe(false);
  });

  it('should not send empty message', async () => {
    const { result } = renderHook(() => useMessages('thread-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.sendMessage('   ');
    });

    expect(success).toBe(false);
  });

  it('should edit message successfully', async () => {
    const mockChain = {
      ...createMockChain([mockMessage]),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useMessages('thread-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.editMessage('message-1', 'Updated content');
    });

    expect(success).toBe(true);
  });

  it('should delete message and remove from list', async () => {
    const mockChain = {
      ...createMockChain([mockMessage]),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useMessages('thread-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteMessage('message-1');
    });

    expect(success).toBe(true);
    expect(result.current.messages).not.toContainEqual(
      expect.objectContaining({ id: 'message-1' })
    );
  });

  it('should setup realtime subscription', () => {
    renderHook(() => useMessages('thread-1'));

    expect(supabase.channel).toHaveBeenCalledWith('messages:thread-1');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() => useMessages('thread-1'));

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it('should return false on edit error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockChain = {
      ...createMockChain([mockMessage]),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Edit failed') }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useMessages('thread-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.editMessage('message-1', 'Updated');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Something went wrong. Please try again.');
    consoleSpy.mockRestore();
  });
});

