/**
 * Meeting-related mock factories
 */
import type {
  Meeting,
  MeetingAttendee,
  MeetingAttendeeWithProfile,
  MeetingWithAttendees,
  AttendeeStatus,
} from '../../src/types/database';
import { createMockProfile } from './users';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Create a mock Meeting
 */
export function createMockMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'test-meeting-id',
    title: 'Test Meeting',
    description: 'A test meeting',
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    location: 'Test Location',
    passages: [],
    group_id: 'test-group-id',
    thread_id: null,
    attachments: [],
    created_by: 'test-user-id',
    series_id: null,
    series_index: null,
    series_total: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock MeetingAttendee
 */
export function createMockMeetingAttendee(
  overrides: Partial<MeetingAttendee> = {}
): MeetingAttendee {
  return {
    id: 'test-attendee-id',
    meeting_id: 'test-meeting-id',
    user_id: 'test-user-id',
    status: 'invited' as AttendeeStatus,
    invited_at: '2024-01-01T00:00:00Z',
    responded_at: null,
    is_series_rsvp: false,
    ...overrides,
  };
}

/**
 * Create a mock MeetingAttendeeWithProfile
 */
export function createMockMeetingAttendeeWithProfile(
  overrides: DeepPartial<MeetingAttendeeWithProfile> = {}
): MeetingAttendeeWithProfile {
  return {
    id: overrides.id || 'test-attendee-id',
    meeting_id: overrides.meeting_id || 'test-meeting-id',
    user_id: overrides.user_id || 'test-user-id',
    status: (overrides.status || 'invited') as AttendeeStatus,
    invited_at: overrides.invited_at || '2024-01-01T00:00:00Z',
    responded_at: overrides.responded_at || null,
    is_series_rsvp: overrides.is_series_rsvp || false,
    user: overrides.user ? createMockProfile(overrides.user) : createMockProfile(),
  };
}

/**
 * Create a mock MeetingWithAttendees
 */
export function createMockMeetingWithAttendees(
  overrides: DeepPartial<MeetingWithAttendees> & { attendees?: DeepPartial<MeetingAttendeeWithProfile>[] } = {}
): MeetingWithAttendees {
  const { attendees, ...meetingOverrides } = overrides;
  const meeting = createMockMeeting(meetingOverrides as Partial<Meeting>);

  return {
    ...meeting,
    attendees: attendees
      ? attendees.map((a) => createMockMeetingAttendeeWithProfile({ ...a, meeting_id: meeting.id }))
      : [createMockMeetingAttendeeWithProfile({ meeting_id: meeting.id })],
  };
}

/**
 * Preset: Meeting with multiple attendees
 */
export function createMockMeetingWithMultipleAttendees(
  count: number = 3,
  meetingOverrides: Partial<Meeting> = {}
): MeetingWithAttendees {
  const meeting = createMockMeeting(meetingOverrides);
  const statuses: AttendeeStatus[] = ['accepted', 'maybe', 'declined', 'invited'];

  const attendees: MeetingAttendeeWithProfile[] = Array.from({ length: count }, (_, i) => ({
    id: `attendee-${i + 1}`,
    meeting_id: meeting.id,
    user_id: `user-${i + 1}`,
    status: statuses[i % statuses.length],
    invited_at: '2024-01-01T00:00:00Z',
    responded_at: i < 3 ? '2024-01-02T00:00:00Z' : null,
    is_series_rsvp: false,
    user: createMockProfile({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      full_name: `User ${i + 1}`,
    }),
  }));

  return { ...meeting, attendees };
}

/**
 * Preset: Series meeting (recurring)
 */
export function createMockSeriesMeeting(
  seriesIndex: number = 1,
  seriesTotal: number = 4,
  overrides: Partial<Meeting> = {}
): MeetingWithAttendees {
  const seriesId = overrides.series_id || 'test-series-id';
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + (seriesIndex * 7)); // Weekly

  return createMockMeetingWithAttendees({
    id: `meeting-series-${seriesIndex}`,
    title: 'Weekly Meeting',
    series_id: seriesId,
    series_index: seriesIndex,
    series_total: seriesTotal,
    date: baseDate.toISOString(),
    ...overrides,
  });
}

/**
 * Preset: Create an entire meeting series
 */
export function createMockMeetingSeries(
  count: number = 4,
  overrides: Partial<Meeting> = {}
): MeetingWithAttendees[] {
  const seriesId = overrides.series_id || 'test-series-id';
  return Array.from({ length: count }, (_, i) =>
    createMockSeriesMeeting(i + 1, count, { ...overrides, series_id: seriesId })
  );
}

/**
 * Preset: Past meeting
 */
export function createMockPastMeeting(overrides: Partial<Meeting> = {}): MeetingWithAttendees {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);

  return createMockMeetingWithAttendees({
    id: 'past-meeting-id',
    title: 'Past Meeting',
    date: pastDate.toISOString(),
    ...overrides,
  });
}
