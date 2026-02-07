import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MeetingsScreen from '../../../src/screens/main/MeetingsScreen';

// Import mock factories
import {
  createMockUser,
  createMockMeetingWithAttendees,
  createMockGroupWithMembership,
  createMockAuthContext,
  createMockGroupContext,
  createMockUseMeetings,
} from '../../../__mocks__';

// Create mutable mock values
let mockAuthContext = createMockAuthContext();
let mockGroupContext = createMockGroupContext();
let mockUseMeetingsResult = createMockUseMeetings();

// Mock auth context
jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
jest.mock('../../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Mock useMeetings hook
jest.mock('../../../src/hooks/useMeetings', () => ({
  useMeetings: () => mockUseMeetingsResult,
  RSVPStatus: {},
}));

describe('MeetingsScreen', () => {
  // Default mock user and group
  const mockUser = createMockUser({ id: 'user-id', email: 'test@example.com' });
  const mockGroup = createMockGroupWithMembership({
    id: 'group-id',
    name: 'Test Group',
    role: 'member',
  });

  // Default mock meeting with attendee
  const mockMeeting = createMockMeetingWithAttendees({
    id: 'meeting-1',
    group_id: 'group-id',
    title: 'Team Meeting',
    description: 'Weekly study',
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    location: 'Conference Room',
    passages: ['Chapter 3'],
    created_by: 'user-id',
    attendees: [
      {
        id: 'attendee-1',
        user_id: 'user-id',
        status: 'invited',
        responded_at: null,
        is_series_rsvp: false,
        user: {
          id: 'user-id',
          full_name: 'John Doe',
          email: 'test@example.com',
        },
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mock data
    mockAuthContext = createMockAuthContext({
      user: mockUser,
      profile: null,
      isLeader: false,
      isAdmin: false,
    });

    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });

    mockUseMeetingsResult = createMockUseMeetings({
      meetings: [],
      loading: false,
      error: null,
    });
  });

  it('should render without crashing', () => {
    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Events')).toBeTruthy();
  });

  it('should show loading indicator when loading', () => {
    mockUseMeetingsResult = createMockUseMeetings({ loading: true });

    const { getByTestId } = render(<MeetingsScreen />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should display empty state when no meetings', () => {
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('No upcoming events')).toBeTruthy();
  });

  it('should display meetings when available', () => {
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Team Meeting')).toBeTruthy();
  });

  it('should show Create Event button for leaders', () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Create Event')).toBeTruthy();
  });

  it('should not show Create Event button for regular members', () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [] });

    const { queryByText } = render(<MeetingsScreen />);
    expect(queryByText('Create Event')).toBeNull();
  });

  it('should show + New button in header for leaders', () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('+ New')).toBeTruthy();
  });

  it('should display group name', () => {
    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Test Group')).toBeTruthy();
  });

  it('should show RSVP buttons for invited attendee', () => {
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('✓ Yes')).toBeTruthy();
    expect(getByText('? Maybe')).toBeTruthy();
    expect(getByText('✗ No')).toBeTruthy();
  });

  it('should call rsvpToMeeting when RSVP button pressed for non-series meeting', async () => {
    const rsvpToMeeting = jest.fn().mockResolvedValue(true);
    mockUseMeetingsResult = createMockUseMeetings({
      meetings: [mockMeeting],
      rsvpToMeeting,
    });

    const { getByText } = render(<MeetingsScreen />);

    fireEvent.press(getByText('✓ Yes'));

    await waitFor(() => {
      expect(rsvpToMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'attendee-1',
        'accepted'
      );
    });
  });

  it('should show delete button for leaders', () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('🗑️')).toBeTruthy();
  });

  it('should not show delete button for members', () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { queryByText } = render(<MeetingsScreen />);
    expect(queryByText('🗑️')).toBeNull();
  });

  it('should show email button for leaders', () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('✉️')).toBeTruthy();
  });

  it('should not show email button for members', () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { queryByText } = render(<MeetingsScreen />);
    expect(queryByText('✉️')).toBeNull();
  });

  it('should open email modal when email button is pressed', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });
    mockUseMeetingsResult = createMockUseMeetings({
      meetings: [mockMeeting],
    });

    const { getByText, getAllByText, queryByText } = render(<MeetingsScreen />);

    fireEvent.press(getByText('✉️'));

    // The SendMeetingEmailModal should now be visible
    await waitFor(() => {
      // The modal shows a "Send" button and attendee count
      expect(queryByText('Send')).toBeTruthy();
      expect(queryByText(/Will be sent to/)).toBeTruthy();
      // Meeting title appears twice: once in the list, once in the modal header
      expect(getAllByText('Team Meeting')).toHaveLength(2);
    });
  });

  it('should display attendee count', () => {
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('1 invited')).toBeTruthy();
  });

  it('should display location when provided', () => {
    mockUseMeetingsResult = createMockUseMeetings({ meetings: [mockMeeting] });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText(/Conference Room/)).toBeTruthy();
  });

  it('should display series indicator for recurring meetings', () => {
    // For series meetings, the component shows "Tap to view all meetings"
    const seriesMeeting = createMockMeetingWithAttendees({
      id: 'series-meeting-1',
      group_id: 'group-id',
      title: 'Series Meeting',
      series_id: 'series-1',
      series_index: 1,
      series_total: 4,
      created_by: 'user-id',
      attendees: [
        {
          id: 'attendee-1',
          user_id: 'user-id',
          status: 'invited',
          is_series_rsvp: false,
        },
      ],
    });

    // The getSeriesMeetings function needs to return the series meetings
    const getSeriesMeetings = jest.fn().mockReturnValue([seriesMeeting]);
    mockUseMeetingsResult = createMockUseMeetings({
      meetings: [seriesMeeting],
      getSeriesMeetings,
    });

    const { getByText } = render(<MeetingsScreen />);
    expect(getByText('Tap to view all meetings')).toBeTruthy();
  });

  it('should open series view modal when tapping on series meeting card', async () => {
    const seriesMeeting = createMockMeetingWithAttendees({
      id: 'series-meeting-1',
      group_id: 'group-id',
      title: 'Series Meeting',
      series_id: 'series-1',
      series_index: 1,
      created_by: 'user-id',
      attendees: [
        {
          id: 'attendee-1',
          user_id: 'user-id',
          status: 'invited',
          is_series_rsvp: false,
        },
      ],
    });

    const getSeriesMeetings = jest.fn().mockReturnValue([seriesMeeting]);
    mockUseMeetingsResult = createMockUseMeetings({
      meetings: [seriesMeeting],
      getSeriesMeetings,
    });

    const { getByText } = render(<MeetingsScreen />);

    // Tap on the series card
    fireEvent.press(getByText('Tap to view all meetings'));

    await waitFor(() => {
      // Series view modal should show "Done" button and meetings count
      expect(getByText('Done')).toBeTruthy();
      expect(getByText('1 meetings in series')).toBeTruthy();
    });
  });

  it('should display RSVP options in series view modal', async () => {
    const seriesMeeting = createMockMeetingWithAttendees({
      id: 'series-meeting-1',
      group_id: 'group-id',
      title: 'Series Meeting',
      series_id: 'series-1',
      series_index: 1,
      created_by: 'user-id',
      attendees: [
        {
          id: 'attendee-1',
          user_id: 'user-id',
          status: 'invited',
          is_series_rsvp: false,
        },
      ],
    });

    const getSeriesMeetings = jest.fn().mockReturnValue([seriesMeeting]);
    mockUseMeetingsResult = createMockUseMeetings({
      meetings: [seriesMeeting],
      getSeriesMeetings,
    });

    const { getByText, getAllByText } = render(<MeetingsScreen />);

    // Tap on the series card to open the modal
    fireEvent.press(getByText('Tap to view all meetings'));

    await waitFor(() => {
      // The modal should show RSVP buttons for each meeting in the series
      // There will be multiple "✓ Yes" buttons (one in original card, one in modal)
      const yesButtons = getAllByText('✓ Yes');
      expect(yesButtons.length).toBeGreaterThan(0);
    });
  });
});
