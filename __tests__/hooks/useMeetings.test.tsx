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
  title: 'Team Meeting',
  description: 'Weekly study',
  date: new Date(Date.now() + 86400000).toISOString(),
  time: '19:00',
  location: 'Conference Room',
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

// Mock email service
const mockSendMeetingEmail = jest.fn().mockResolvedValue({ success: true });

jest.mock('../../src/services/email', () => ({
  emailService: {
    sendMeetingEmail: (...args: any[]) => mockSendMeetingEmail(...args),
  },
}));

// Helper to create mock chain
const createMockChain = (data: any, error: any = null) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  // Ensure chaining works correctly
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  return chain;
};

describe('useMeetings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAuthContext = { user: mockUser };
    mockGroupContext = { currentGroup: mockGroup };
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeeting]));
    // Mock functions.invoke for email sending
    (supabase as any).functions = {
      invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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
    expect(result.current.meetings[0].title).toBe('Team Meeting');
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

  describe('updateMeeting', () => {
    it('should update meeting description successfully', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeeting]));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Reset mock for the update call
      const updateChain = createMockChain([mockMeeting]);
      updateChain.eq.mockResolvedValue({ data: {}, error: null });
      (supabase.from as jest.Mock).mockReturnValue(updateChain);

      let success;
      await act(async () => {
        success = await result.current.updateMeeting('meeting-1', { description: 'Updated description' });
      });

      expect(success).toBe(true);
      expect(result.current.meetings[0].description).toBe('Updated description');
    });

    it('should return false on update error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeeting]));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Reset mock for the update call with error
      const updateChain = createMockChain([mockMeeting]);
      updateChain.eq.mockResolvedValue({ data: null, error: new Error('Update failed') });
      (supabase.from as jest.Mock).mockReturnValue(updateChain);

      let success;
      await act(async () => {
        success = await result.current.updateMeeting('meeting-1', { description: 'Test' });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Something went wrong. Please try again.');
      consoleSpy.mockRestore();
    });
  });

  describe('getSeriesMeetings', () => {
    const mockSeriesMeetings = [
      { ...mockMeeting, id: 'meeting-3', series_id: 'series-1', series_index: 3 },
      { ...mockMeeting, id: 'meeting-1', series_id: 'series-1', series_index: 1 },
      { ...mockMeeting, id: 'meeting-2', series_id: 'series-1', series_index: 2 },
      { ...mockMeeting, id: 'meeting-4', series_id: 'series-2', series_index: 1 }, // different series
    ];

    it('should return meetings for a series sorted by index', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain(mockSeriesMeetings));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const seriesMeetings = result.current.getSeriesMeetings('series-1');

      expect(seriesMeetings).toHaveLength(3);
      expect(seriesMeetings[0].series_index).toBe(1);
      expect(seriesMeetings[1].series_index).toBe(2);
      expect(seriesMeetings[2].series_index).toBe(3);
    });

    it('should return empty array for non-existent series', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain(mockSeriesMeetings));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const seriesMeetings = result.current.getSeriesMeetings('non-existent-series');

      expect(seriesMeetings).toHaveLength(0);
    });
  });

  describe('skipMeeting', () => {
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    const baseDate = new Date('2024-01-15T19:00:00Z').getTime();

    // Mock meetings with attendees that have different RSVP types
    const mockWeeklySeriesMeetings = [
      {
        ...mockMeeting,
        id: 'meeting-1',
        series_id: 'series-1',
        series_index: 1,
        date: new Date(baseDate).toISOString(),
        attendees: [
          {
            id: 'attendee-1',
            user_id: 'user-id',
            status: 'accepted',
            is_series_rsvp: false, // Individual RSVP - should be reset
            user: { id: 'user-id', full_name: 'Test User', email: 'test@example.com' },
          },
          {
            id: 'attendee-2',
            user_id: 'user-2',
            status: 'accepted',
            is_series_rsvp: true, // Series RSVP - should be preserved
            user: { id: 'user-2', full_name: 'Series User', email: 'series@example.com' },
          },
        ],
      },
      {
        ...mockMeeting,
        id: 'meeting-2',
        series_id: 'series-1',
        series_index: 2,
        date: new Date(baseDate + weekInMs).toISOString(),
        attendees: [
          {
            id: 'attendee-3',
            user_id: 'user-id',
            status: 'declined',
            is_series_rsvp: false,
            user: { id: 'user-id', full_name: 'Test User', email: 'test@example.com' },
          },
          {
            id: 'attendee-4',
            user_id: 'user-2',
            status: 'accepted',
            is_series_rsvp: true,
            user: { id: 'user-2', full_name: 'Series User', email: 'series@example.com' },
          },
        ],
      },
      {
        ...mockMeeting,
        id: 'meeting-3',
        series_id: 'series-1',
        series_index: 3,
        date: new Date(baseDate + 2 * weekInMs).toISOString(),
        attendees: [
          {
            id: 'attendee-5',
            user_id: 'user-id',
            status: 'maybe',
            is_series_rsvp: false,
            user: { id: 'user-id', full_name: 'Test User', email: 'test@example.com' },
          },
          {
            id: 'attendee-6',
            user_id: 'user-2',
            status: 'accepted',
            is_series_rsvp: true,
            user: { id: 'user-2', full_name: 'Series User', email: 'series@example.com' },
          },
        ],
      },
    ];

    it('should skip a meeting and move subsequent meetings forward', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain(mockWeeklySeriesMeetings));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock for the update calls - needs to handle chained .eq() calls
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      };
      (supabase.from as jest.Mock).mockReturnValue(updateChain);

      let success;
      await act(async () => {
        success = await result.current.skipMeeting('meeting-1');
      });

      expect(success).toBe(true);

      // All meetings should have moved forward by one week
      const meeting1 = result.current.meetings.find(m => m.id === 'meeting-1');
      const meeting2 = result.current.meetings.find(m => m.id === 'meeting-2');
      const meeting3 = result.current.meetings.find(m => m.id === 'meeting-3');

      expect(new Date(meeting1!.date).getTime()).toBe(baseDate + weekInMs);
      expect(new Date(meeting2!.date).getTime()).toBe(baseDate + 2 * weekInMs);
      expect(new Date(meeting3!.date).getTime()).toBe(baseDate + 3 * weekInMs);
    });

    it('should preserve series RSVPs and revert individual RSVPs to series preference', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain(mockWeeklySeriesMeetings));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock for the update calls - needs to handle chained .eq() calls
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      };
      (supabase.from as jest.Mock).mockReturnValue(updateChain);

      await act(async () => {
        await result.current.skipMeeting('meeting-1');
      });

      // Check RSVPs for meeting-1
      const meeting1 = result.current.meetings.find(m => m.id === 'meeting-1');
      const individualRsvp = meeting1?.attendees?.find(a => a.id === 'attendee-1');
      const seriesRsvp = meeting1?.attendees?.find(a => a.id === 'attendee-2');

      // Individual RSVP (user-id has no series preference) should be reset to 'invited'
      expect(individualRsvp?.status).toBe('invited');
      // Series RSVP should be preserved as 'accepted'
      expect(seriesRsvp?.status).toBe('accepted');
    });

    it('should revert declined individual RSVP to series preference when user has one', async () => {
      // User-2 has series RSVP 'accepted' on meetings 2 & 3, but declined meeting-1 individually
      const meetingsWithDecline = [
        {
          ...mockWeeklySeriesMeetings[0],
          attendees: [
            {
              id: 'attendee-1',
              user_id: 'user-2',
              status: 'declined', // Specifically declined this date
              is_series_rsvp: false,
              user: { id: 'user-2', full_name: 'Series User', email: 'series@example.com' },
            },
          ],
        },
        {
          ...mockWeeklySeriesMeetings[1],
          attendees: [
            {
              id: 'attendee-2',
              user_id: 'user-2',
              status: 'accepted', // Series RSVP
              is_series_rsvp: true,
              user: { id: 'user-2', full_name: 'Series User', email: 'series@example.com' },
            },
          ],
        },
        {
          ...mockWeeklySeriesMeetings[2],
          attendees: [
            {
              id: 'attendee-3',
              user_id: 'user-2',
              status: 'accepted', // Series RSVP
              is_series_rsvp: true,
              user: { id: 'user-2', full_name: 'Series User', email: 'series@example.com' },
            },
          ],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue(createMockChain(meetingsWithDecline));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock for the update calls
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      };
      (supabase.from as jest.Mock).mockReturnValue(updateChain);

      await act(async () => {
        await result.current.skipMeeting('meeting-1');
      });

      // Check that the declined RSVP was reverted to the series preference
      const meeting1 = result.current.meetings.find(m => m.id === 'meeting-1');
      const revertedRsvp = meeting1?.attendees?.find(a => a.id === 'attendee-1');

      // Should be reverted to 'accepted' (user's series preference)
      expect(revertedRsvp?.status).toBe('accepted');
      // Should now be marked as series RSVP
      expect(revertedRsvp?.is_series_rsvp).toBe(true);
    });

    it('should return false for non-series meeting', async () => {
      const nonSeriesMeeting = { ...mockMeeting, series_id: null };
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([nonSeriesMeeting]));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.skipMeeting('meeting-1');
      });

      expect(success).toBe(false);
    });

    it('should return false for series with only one meeting', async () => {
      const singleMeetingSeries = [mockWeeklySeriesMeetings[0]];
      (supabase.from as jest.Mock).mockReturnValue(createMockChain(singleMeetingSeries));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.skipMeeting('meeting-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('sendMeetingEmail', () => {
    const mockMeetingWithAttendees = {
      ...mockMeeting,
      attendees: [
        {
          id: 'attendee-1',
          user_id: 'other-user',
          status: 'invited',
          is_series_rsvp: false,
          user: { id: 'other-user', full_name: 'Other User', email: 'other@example.com' },
        },
        {
          id: 'attendee-2',
          user_id: 'user-id', // Current user - should be excluded
          status: 'accepted',
          is_series_rsvp: false,
          user: { id: 'user-id', full_name: 'Test User', email: 'test@example.com' },
        },
      ],
    };

    it('should send email successfully', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeetingWithAttendees]));
      mockSendMeetingEmail.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.sendMeetingEmail('meeting-1');
      });

      expect(success).toBe(true);
      expect(mockSendMeetingEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingId: 'meeting-1',
        }),
      );
    });

    it('should set sendingEmail state while sending', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeetingWithAttendees]));

      let resolveEmail: Function;
      const emailPromise = new Promise((resolve) => { resolveEmail = resolve; });
      mockSendMeetingEmail.mockReturnValue(emailPromise);

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Start sending but don't await
      act(() => {
        result.current.sendMeetingEmail('meeting-1');
      });

      expect(result.current.sendingEmail).toBe(true);

      // Resolve the email service call
      await act(async () => {
        resolveEmail!({ success: true });
      });

      await waitFor(() => {
        expect(result.current.sendingEmail).toBe(false);
      });
    });

    it('should return false when email service fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeetingWithAttendees]));
      mockSendMeetingEmail.mockResolvedValue({ success: false, error: 'Meeting not found' });

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.sendMeetingEmail('non-existent');
      });

      expect(success).toBe(false);
    });

    it('should return false when email service throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeetingWithAttendees]));
      mockSendMeetingEmail.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.sendMeetingEmail('meeting-1');
      });

      expect(success).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should return false when not authenticated', async () => {
      mockAuthContext = { user: null as any };
      (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

      const { result } = renderHook(() => useMeetings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.sendMeetingEmail('meeting-1');
      });

      expect(success).toBe(false);
    });
  });
});

