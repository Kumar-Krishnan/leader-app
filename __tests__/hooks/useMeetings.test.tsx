import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useMeetings } from '../../src/hooks/useMeetings';
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

const mockMeeting = {
  id: 'meeting-1',
  group_id: 'group-id',
  title: 'Bible Study',
  description: 'Weekly study',
  date: new Date(Date.now() + 86400000).toISOString(),
  time: '19:00',
  location: 'Church Hall',
  series_id: null,
  attendees: [
    {
      id: 'attendee-1',
      user_id: 'user-id',
      status: 'invited',
      is_series_rsvp: false,
      user: { id: 'user-id', full_name: 'Test User', email: 'test@example.com' },
    },
  ],
};

const mockSeriesMeeting = {
  ...mockMeeting,
  id: 'meeting-2',
  series_id: 'series-1',
};

// Mock auth context
let mockAuthContext = {
  user: mockUser,
};

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
let mockGroupContext: any = {
  currentGroup: mockGroup,
};

jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Helper to create mock chain
const createMockChain = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
});

describe('useMeetings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext = { user: mockUser };
    mockGroupContext = { currentGroup: mockGroup };
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeeting]));
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => useMeetings());
    expect(result.current.loading).toBe(true);
    expect(result.current.meetings).toEqual([]);
  });

  it('should fetch meetings on mount', async () => {
    const { result } = renderHook(() => useMeetings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.meetings).toHaveLength(1);
    expect(result.current.meetings[0].title).toBe('Bible Study');
  });

  it('should return empty array when no group selected', async () => {
    mockGroupContext.currentGroup = null;

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.meetings).toEqual([]);
  });

  it('should set error on fetch failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain(null, new Error('Network error'))
    );

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unable to connect. Please check your internet connection.');
    consoleSpy.mockRestore();
  });

  it('should RSVP to single meeting', async () => {
    const mockChain = {
      ...createMockChain([mockMeeting]),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.rsvpToMeeting('meeting-1', 'attendee-1', 'accepted');
    });

    expect(success).toBe(true);
  });

  it('should delete meeting and remove from list', async () => {
    const mockChain = {
      ...createMockChain([mockMeeting]),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteMeeting('meeting-1');
    });

    expect(success).toBe(true);
    expect(result.current.meetings).not.toContainEqual(
      expect.objectContaining({ id: 'meeting-1' })
    );
  });

  it('should delete series and remove all from list', async () => {
    const mockChain = {
      ...createMockChain([mockSeriesMeeting]),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteSeries('series-1');
    });

    expect(success).toBe(true);
  });

  it('should return false on delete error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockChain = {
      ...createMockChain([mockMeeting]),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Delete failed') }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteMeeting('meeting-1');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Something went wrong. Please try again.');
    consoleSpy.mockRestore();
  });
});

