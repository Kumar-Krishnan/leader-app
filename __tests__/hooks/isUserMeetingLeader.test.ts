import { isUserMeetingLeader } from '../../src/hooks/useMeetings';
import { MeetingWithAttendees } from '../../src/types/database';

// We only need the function, not the hook. Mock the dependencies it doesn't use.
jest.mock('../../src/lib/supabase', () => ({
  supabase: {},
}));
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => ({ currentGroup: null }),
}));
jest.mock('../../src/services/email', () => ({
  emailService: { sendMeetingEmail: jest.fn() },
}));

const baseMeeting: MeetingWithAttendees = {
  id: 'meeting-1',
  title: 'Test Meeting',
  description: null,
  date: '2026-03-15T19:00:00Z',
  end_date: null,
  location: null,
  passages: [],
  group_id: 'group-1',
  thread_id: null,
  attachments: [],
  created_by: 'creator-id',
  series_id: null,
  series_index: null,
  series_total: null,
  timezone: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  attendees: [],
  co_leaders: [],
};

describe('isUserMeetingLeader', () => {
  it('returns true for the meeting creator', () => {
    expect(isUserMeetingLeader(baseMeeting, 'creator-id')).toBe(true);
  });

  it('returns true for a co-leader', () => {
    const meeting = {
      ...baseMeeting,
      co_leaders: [
        { id: 'cl-1', meeting_id: 'meeting-1', user_id: 'co-leader-id', created_at: '2026-01-01T00:00:00Z' },
      ],
    };
    expect(isUserMeetingLeader(meeting, 'co-leader-id')).toBe(true);
  });

  it('returns false for a non-leader', () => {
    expect(isUserMeetingLeader(baseMeeting, 'random-user-id')).toBe(false);
  });

  it('returns false for a non-leader even when co-leaders exist', () => {
    const meeting = {
      ...baseMeeting,
      co_leaders: [
        { id: 'cl-1', meeting_id: 'meeting-1', user_id: 'co-leader-id', created_at: '2026-01-01T00:00:00Z' },
      ],
    };
    expect(isUserMeetingLeader(meeting, 'random-user-id')).toBe(false);
  });

  it('handles missing co_leaders array', () => {
    const meeting = { ...baseMeeting, co_leaders: undefined };
    expect(isUserMeetingLeader(meeting, 'creator-id')).toBe(true);
    expect(isUserMeetingLeader(meeting, 'random-user-id')).toBe(false);
  });
});
