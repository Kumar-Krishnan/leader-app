import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MeetingsScreen from '../../../src/screens/main/MeetingsScreen';
import { supabase } from '../../../src/lib/supabase';

// Mock Supabase
jest.mock('../../../src/lib/supabase');

// Mock data
const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
};

const mockGroup = {
  id: 'group-id',
  name: 'Test Group',
  role: 'member' as const,
};

const mockMeeting = {
  id: 'meeting-1',
  group_id: 'group-id',
  title: 'Bible Study',
  description: 'Weekly study',
  date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  time: '19:00',
  location: 'Church Hall',
  passages: 'John 3:16',
  series_id: null,
  series_index: null,
  series_total: null,
  created_by: 'user-id',
  created_at: new Date().toISOString(),
  attendees: [
    {
      id: 'attendee-1',
      user_id: 'user-id',
      status: 'invited' as const,
      responded_at: null,
      is_series_rsvp: false,
      user: {
        id: 'user-id',
        full_name: 'John Doe',
        email: 'test@example.com',
      },
    },
  ],
};

// Mock auth context
let mockAuthContext = {
  user: mockUser,
  profile: null,
  isLeader: false,
  isAdmin: false,
};

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
let mockGroupContext: any = {
  currentGroup: mockGroup,
  isGroupLeader: false,
};

jest.mock('../../../src/contexts/GroupContext', () => ({
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
  insert: jest.fn().mockResolvedValue({ data, error }),
});

describe('MeetingsScreen', () => {
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
      isGroupLeader: false,
    };

    // Default Supabase mock
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([mockMeeting]));
  });

  it('should render without crashing', async () => {
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));
    
    const { getByText, queryByTestId } = render(<MeetingsScreen />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    }, { timeout: 3000 });

    expect(getByText('Events')).toBeTruthy();
  });

  it('should display empty state when no meetings', async () => {
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { getByText } = render(<MeetingsScreen />);

    await waitFor(() => {
      expect(getByText('No upcoming events')).toBeTruthy();
    });
  });

  it('should show Create Event button for leaders after loading', async () => {
    mockGroupContext.isGroupLeader = true;
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { getByText, queryByTestId } = render(<MeetingsScreen />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    }, { timeout: 3000 });

    expect(getByText('Create Event')).toBeTruthy();
  });

  it('should not show Create Event button for regular members after loading', async () => {
    mockGroupContext.isGroupLeader = false;
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { queryByText, queryByTestId } = render(<MeetingsScreen />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    }, { timeout: 3000 });

    expect(queryByText('Create Event')).toBeNull();
  });

  it('should handle no current group gracefully', async () => {
    mockGroupContext.currentGroup = null;

    const { queryByText } = render(<MeetingsScreen />);

    await waitFor(() => {
      expect(queryByText('Bible Study')).toBeNull();
    });
  });

  it('should handle fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain(null, new Error('Network error'))
    );

    render(<MeetingsScreen />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching meetings:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should call supabase.from with meetings table', async () => {
    render(<MeetingsScreen />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('meetings');
    });
  });

  it('should filter meetings by group_id', async () => {
    const mockChain = createMockChain([mockMeeting]);
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    render(<MeetingsScreen />);

    await waitFor(() => {
      expect(mockChain.eq).toHaveBeenCalledWith('group_id', 'group-id');
    });
  });

  it('should order meetings by date ascending', async () => {
    const mockChain = createMockChain([mockMeeting]);
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    render(<MeetingsScreen />);

    await waitFor(() => {
      expect(mockChain.order).toHaveBeenCalledWith('date', { ascending: true });
    });
  });
});
