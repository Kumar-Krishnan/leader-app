import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MeetingsScreen from '../../../src/screens/main/MeetingsScreen';

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
  title: 'Team Meeting',
  description: 'Weekly study',
  date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  time: '19:00',
  location: 'Conference Room',
  passages: ['Chapter 3'],
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

// Mock useMeetings hook
let mockUseMeetingsResult: any = {
  meetings: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
  rsvpToMeeting: jest.fn().mockResolvedValue(true),
  rsvpToSeries: jest.fn().mockResolvedValue(true),
  deleteMeeting: jest.fn().mockResolvedValue(true),
  deleteSeries: jest.fn().mockResolvedValue(true),
};

jest.mock('../../../src/hooks/useMeetings', () => ({
  useMeetings: () => mockUseMeetingsResult,
  RSVPStatus: {},
}));

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

    mockUseMeetingsResult = {
      meetings: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
      rsvpToMeeting: jest.fn().mockResolvedValue(true),
      rsvpToSeries: jest.fn().mockResolvedValue(true),
      deleteMeeting: jest.fn().mockResolvedValue(true),
      deleteSeries: jest.fn().mockResolvedValue(true),
    };
  });

  it('should render without crashing', () => {
    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Events')).toBeTruthy();
  });

  it('should show loading indicator when loading', () => {
    mockUseMeetingsResult.loading = true;

    const { getByTestId } = render(<MeetingsScreen />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should display empty state when no meetings', () => {
    mockUseMeetingsResult.meetings = [];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('No upcoming events')).toBeTruthy();
  });

  it('should display meetings when available', () => {
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Team Meeting')).toBeTruthy();
  });

  it('should show Create Event button for leaders', () => {
    mockGroupContext.isGroupLeader = true;
    mockUseMeetingsResult.meetings = [];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Create Event')).toBeTruthy();
  });

  it('should not show Create Event button for regular members', () => {
    mockGroupContext.isGroupLeader = false;
    mockUseMeetingsResult.meetings = [];

    const { queryByText } = render(<MeetingsScreen />);
    expect(queryByText('Create Event')).toBeNull();
  });

  it('should show + New button in header for leaders', () => {
    mockGroupContext.isGroupLeader = true;
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('+ New')).toBeTruthy();
  });

  it('should display group name', () => {
    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Test Group')).toBeTruthy();
  });

  it('should show RSVP buttons for invited attendee', () => {
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('✓ Yes')).toBeTruthy();
    expect(getByText('? Maybe')).toBeTruthy();
    expect(getByText('✗ No')).toBeTruthy();
  });

  it('should call rsvpToMeeting when RSVP button pressed for non-series meeting', async () => {
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { getByText } = render(<MeetingsScreen />);
    
    fireEvent.press(getByText('✓ Yes'));

    await waitFor(() => {
      expect(mockUseMeetingsResult.rsvpToMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'attendee-1',
        'accepted'
      );
    });
  });

  it('should show delete button for leaders', () => {
    mockGroupContext.isGroupLeader = true;
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('🗑️')).toBeTruthy();
  });

  it('should not show delete button for members', () => {
    mockGroupContext.isGroupLeader = false;
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { queryByText } = render(<MeetingsScreen />);
    expect(queryByText('🗑️')).toBeNull();
  });

  it('should display attendee count', () => {
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('1 invited')).toBeTruthy();
  });

  it('should display location when provided', () => {
    mockUseMeetingsResult.meetings = [mockMeeting];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText(/Conference Room/)).toBeTruthy();
  });

  it('should display series badge for recurring meetings', () => {
    const seriesMeeting = {
      ...mockMeeting,
      series_id: 'series-1',
      series_index: 1,
      series_total: 4,
    };
    mockUseMeetingsResult.meetings = [seriesMeeting];

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('1/4')).toBeTruthy();
  });

  it('should show series RSVP modal for recurring meetings', async () => {
    const seriesMeeting = {
      ...mockMeeting,
      series_id: 'series-1',
    };
    mockUseMeetingsResult.meetings = [seriesMeeting];

    const { getByText } = render(<MeetingsScreen />);
    
    fireEvent.press(getByText('✓ Yes'));

    await waitFor(() => {
      expect(getByText('Apply to all events?')).toBeTruthy();
    });
  });

  it('should call rsvpToSeries when "All in series" is pressed', async () => {
    const seriesMeeting = {
      ...mockMeeting,
      series_id: 'series-1',
    };
    mockUseMeetingsResult.meetings = [seriesMeeting];

    const { getByText } = render(<MeetingsScreen />);
    
    fireEvent.press(getByText('✓ Yes'));

    await waitFor(() => {
      expect(getByText('All in series')).toBeTruthy();
    });

    fireEvent.press(getByText('All in series'));

    await waitFor(() => {
      expect(mockUseMeetingsResult.rsvpToSeries).toHaveBeenCalledWith(
        'series-1',
        'accepted'
      );
    });
  });
});
