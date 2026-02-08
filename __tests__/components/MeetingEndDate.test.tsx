import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MeetingsScreen from '../../src/screens/main/MeetingsScreen';
import SendMeetingEmailModal from '../../src/components/SendMeetingEmailModal';

import {
  createMockUser,
  createMockMeetingWithAttendees,
  createMockGroupWithMembership,
  createMockAuthContext,
  createMockGroupContext,
  createMockUseMeetings,
} from '../../__mocks__';

// Create mutable mock values
let mockAuthContext = createMockAuthContext();
let mockGroupContext = createMockGroupContext();
let mockUseMeetingsResult = createMockUseMeetings();

// Mock auth context
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Mock useMeetings hook
jest.mock('../../src/hooks/useMeetings', () => ({
  useMeetings: () => mockUseMeetingsResult,
  RSVPStatus: {},
}));

describe('Meeting end_date display', () => {
  const mockUser = createMockUser({ id: 'user-id', email: 'test@example.com' });
  const mockGroup = createMockGroupWithMembership({
    id: 'group-id',
    name: 'Test Group',
    role: 'member',
  });

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe('MeetingsScreen - meeting card', () => {
    it('should display end time when end_date is set', () => {
      const meeting = createMockMeetingWithAttendees({
        id: 'meeting-1',
        group_id: 'group-id',
        title: 'Morning Meeting',
        date: '2025-03-15T09:00:00Z',
        end_date: '2025-03-15T10:30:00Z',
        location: null,
        created_by: 'user-id',
        attendees: [],
      });

      mockUseMeetingsResult = createMockUseMeetings({ meetings: [meeting] });

      const { getByText } = render(<MeetingsScreen />);
      // The time display should contain an en-dash separator for the end time
      expect(getByText(/–/)).toBeTruthy();
    });

    it('should not display en-dash when end_date is null', () => {
      const meeting = createMockMeetingWithAttendees({
        id: 'meeting-1',
        group_id: 'group-id',
        title: 'Open-ended Meeting',
        date: '2025-03-15T09:00:00Z',
        end_date: null,
        location: null,
        created_by: 'user-id',
        attendees: [],
      });

      mockUseMeetingsResult = createMockUseMeetings({ meetings: [meeting] });

      const { queryByText } = render(<MeetingsScreen />);
      // Should NOT contain the en-dash time separator
      expect(queryByText(/–/)).toBeNull();
    });
  });

  describe('MeetingsScreen - series view modal', () => {
    it('should display end time in series view when end_date is set', async () => {
      const seriesMeeting = createMockMeetingWithAttendees({
        id: 'series-meeting-1',
        group_id: 'group-id',
        title: 'Series Meeting',
        date: '2025-03-15T14:00:00Z',
        end_date: '2025-03-15T15:30:00Z',
        series_id: 'series-1',
        series_index: 1,
        series_total: 2,
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

      const { getByText, queryAllByText } = render(<MeetingsScreen />);

      // Open series view modal
      fireEvent.press(getByText('Tap to view all meetings'));

      await waitFor(() => {
        // In the series view, the date+time line should contain the en-dash
        const dashes = queryAllByText(/–/);
        expect(dashes.length).toBeGreaterThan(0);
      });
    });

    it('should not display en-dash in series view when end_date is null', async () => {
      const seriesMeeting = createMockMeetingWithAttendees({
        id: 'series-meeting-1',
        group_id: 'group-id',
        title: 'Series No End',
        date: '2025-03-15T14:00:00Z',
        end_date: null,
        series_id: 'series-1',
        series_index: 1,
        series_total: 2,
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

      const { getByText, queryAllByText } = render(<MeetingsScreen />);

      fireEvent.press(getByText('Tap to view all meetings'));

      await waitFor(() => {
        expect(getByText('Done')).toBeTruthy();
      });

      // Should NOT contain the en-dash time separator
      const dashes = queryAllByText(/–/);
      expect(dashes.length).toBe(0);
    });
  });

  describe('SendMeetingEmailModal', () => {
    it('should display end time in email modal when end_date is set', () => {
      const meeting = createMockMeetingWithAttendees({
        id: 'meeting-1',
        group_id: 'group-id',
        title: 'Team Sync',
        date: '2025-03-15T09:00:00Z',
        end_date: '2025-03-15T10:00:00Z',
        location: 'Room A',
        created_by: 'user-id',
        attendees: [
          {
            id: 'attendee-1',
            user_id: 'other-user',
            status: 'invited',
            is_series_rsvp: false,
            user: {
              id: 'other-user',
              full_name: 'Jane Doe',
              email: 'jane@example.com',
            },
          },
        ],
      });

      const { getByText } = render(
        <SendMeetingEmailModal
          visible={true}
          onClose={jest.fn()}
          meeting={meeting}
          onSend={jest.fn()}
          sending={false}
        />
      );

      // Should contain the en-dash separator showing the time range
      expect(getByText(/–/)).toBeTruthy();
    });

    it('should not display en-dash in email modal when end_date is null', () => {
      const meeting = createMockMeetingWithAttendees({
        id: 'meeting-1',
        group_id: 'group-id',
        title: 'Quick Chat',
        date: '2025-03-15T09:00:00Z',
        end_date: null,
        location: 'Room A',
        created_by: 'user-id',
        attendees: [
          {
            id: 'attendee-1',
            user_id: 'other-user',
            status: 'invited',
            is_series_rsvp: false,
            user: {
              id: 'other-user',
              full_name: 'Jane Doe',
              email: 'jane@example.com',
            },
          },
        ],
      });

      const { queryByText } = render(
        <SendMeetingEmailModal
          visible={true}
          onClose={jest.fn()}
          meeting={meeting}
          onSend={jest.fn()}
          sending={false}
        />
      );

      // Should NOT contain the en-dash time separator
      expect(queryByText(/–/)).toBeNull();
    });
  });
});
