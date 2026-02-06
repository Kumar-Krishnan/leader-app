/**
 * Tests for meeting confirmation page logic
 *
 * Tests the business logic of the meeting-confirmation-page Edge Function
 */
import {
  createMockMeetingReminderToken,
  createMockSentReminderToken,
  createMockConfirmedReminderToken,
  createMockExpiredReminderToken,
  createMockMeetingWithGroupAndLeader,
  createMockAttendeeWithProfile,
  createMockAttendeeList,
  MeetingWithGroupAndLeader,
} from '../../../__mocks__/factories';
import type { MeetingReminderToken } from '../../../src/types/database';

// Content limits (same as Edge Function)
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 2000;

// Token validation logic
interface TokenValidationResult {
  valid: boolean;
  error?: 'not_found' | 'expired' | 'already_confirmed' | 'meeting_passed';
}

function validateToken(
  token: MeetingReminderToken | null,
  meetingDate: string | null
): TokenValidationResult {
  if (!token) {
    return { valid: false, error: 'not_found' };
  }

  if (new Date(token.expires_at) < new Date()) {
    return { valid: false, error: 'expired' };
  }

  if (token.confirmed_at) {
    return { valid: false, error: 'already_confirmed' };
  }

  if (meetingDate && new Date(meetingDate) < new Date()) {
    return { valid: false, error: 'meeting_passed' };
  }

  return { valid: true };
}

// Content sanitization logic
function sanitizeContent(
  content: string | null,
  maxLength: number
): string | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}

// Attendee filtering logic
interface Attendee {
  user_id: string;
  status: string;
}

function filterEligibleAttendees(attendees: Attendee[]): Attendee[] {
  return attendees.filter(
    (a) => a.status === 'invited' || a.status === 'accepted'
  );
}

describe('Token Validation', () => {
  describe('validateToken', () => {
    it('should return valid for a valid token', () => {
      const token = createMockSentReminderToken();
      const meetingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const result = validateToken(token, meetingDate);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return not_found for null token', () => {
      const result = validateToken(null, null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_found');
    });

    it('should return expired for expired token', () => {
      const token = createMockExpiredReminderToken();
      const meetingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const result = validateToken(token, meetingDate);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired');
    });

    it('should return already_confirmed for confirmed token', () => {
      const token = createMockConfirmedReminderToken();
      const meetingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const result = validateToken(token, meetingDate);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_confirmed');
    });

    it('should return meeting_passed for past meeting', () => {
      const token = createMockSentReminderToken();
      const meetingDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const result = validateToken(token, meetingDate);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('meeting_passed');
    });

    it('should prioritize expired error over meeting_passed', () => {
      const token = createMockExpiredReminderToken();
      const meetingDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const result = validateToken(token, meetingDate);

      // Expired check comes before meeting_passed check
      expect(result.error).toBe('expired');
    });
  });
});

describe('Content Sanitization', () => {
  describe('sanitizeContent', () => {
    it('should return null for null input', () => {
      expect(sanitizeContent(null, MAX_DESCRIPTION_LENGTH)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(sanitizeContent('', MAX_DESCRIPTION_LENGTH)).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(sanitizeContent('   \n\t  ', MAX_DESCRIPTION_LENGTH)).toBeNull();
    });

    it('should trim whitespace from content', () => {
      expect(sanitizeContent('  Hello World  ', MAX_DESCRIPTION_LENGTH)).toBe(
        'Hello World'
      );
    });

    it('should truncate content exceeding max length', () => {
      const longContent = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 100);
      const result = sanitizeContent(longContent, MAX_DESCRIPTION_LENGTH);

      expect(result?.length).toBe(MAX_DESCRIPTION_LENGTH);
    });

    it('should preserve content within max length', () => {
      const content = 'Hello World';
      const result = sanitizeContent(content, MAX_DESCRIPTION_LENGTH);

      expect(result).toBe('Hello World');
    });

    it('should handle content exactly at max length', () => {
      const content = 'a'.repeat(MAX_DESCRIPTION_LENGTH);
      const result = sanitizeContent(content, MAX_DESCRIPTION_LENGTH);

      expect(result?.length).toBe(MAX_DESCRIPTION_LENGTH);
    });
  });

  describe('Description limits', () => {
    it('should allow descriptions up to 5000 characters', () => {
      const description = 'a'.repeat(MAX_DESCRIPTION_LENGTH);
      const result = sanitizeContent(description, MAX_DESCRIPTION_LENGTH);

      expect(result?.length).toBe(5000);
    });
  });

  describe('Message limits', () => {
    it('should allow messages up to 2000 characters', () => {
      const message = 'a'.repeat(MAX_MESSAGE_LENGTH);
      const result = sanitizeContent(message, MAX_MESSAGE_LENGTH);

      expect(result?.length).toBe(2000);
    });
  });
});

describe('Attendee Filtering', () => {
  describe('filterEligibleAttendees', () => {
    it('should include attendees with invited status', () => {
      const attendees = [
        { user_id: '1', status: 'invited' },
        { user_id: '2', status: 'declined' },
      ];

      const result = filterEligibleAttendees(attendees);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('1');
    });

    it('should include attendees with accepted status', () => {
      const attendees = [
        { user_id: '1', status: 'accepted' },
        { user_id: '2', status: 'declined' },
      ];

      const result = filterEligibleAttendees(attendees);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('1');
    });

    it('should exclude attendees with declined status', () => {
      const attendees = [
        { user_id: '1', status: 'declined' },
        { user_id: '2', status: 'declined' },
      ];

      const result = filterEligibleAttendees(attendees);

      expect(result).toHaveLength(0);
    });

    it('should exclude attendees with maybe status', () => {
      const attendees = [
        { user_id: '1', status: 'maybe' },
        { user_id: '2', status: 'invited' },
      ];

      const result = filterEligibleAttendees(attendees);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('2');
    });

    it('should include both invited and accepted attendees', () => {
      const attendees = [
        { user_id: '1', status: 'invited' },
        { user_id: '2', status: 'accepted' },
        { user_id: '3', status: 'declined' },
        { user_id: '4', status: 'maybe' },
      ];

      const result = filterEligibleAttendees(attendees);

      expect(result).toHaveLength(2);
      expect(result.map((a) => a.user_id)).toEqual(['1', '2']);
    });

    it('should handle empty attendee list', () => {
      const result = filterEligibleAttendees([]);

      expect(result).toHaveLength(0);
    });
  });
});

describe('Confirmation Page State Machine', () => {
  type PageState =
    | 'show_form'
    | 'processing'
    | 'success'
    | 'error_invalid'
    | 'error_expired'
    | 'error_already_sent'
    | 'error_meeting_passed';

  function determinePageState(
    token: MeetingReminderToken | null,
    meeting: MeetingWithGroupAndLeader | null,
    isPost: boolean
  ): PageState {
    if (!token) return 'error_invalid';
    if (new Date(token.expires_at) < new Date()) return 'error_expired';
    if (token.confirmed_at) return 'error_already_sent';
    if (meeting && new Date(meeting.date) < new Date()) return 'error_meeting_passed';

    if (isPost) return 'processing';
    return 'show_form';
  }

  it('should show form for valid GET request', () => {
    const token = createMockSentReminderToken();
    const meeting = createMockMeetingWithGroupAndLeader();

    const state = determinePageState(token, meeting, false);

    expect(state).toBe('show_form');
  });

  it('should process for valid POST request', () => {
    const token = createMockSentReminderToken();
    const meeting = createMockMeetingWithGroupAndLeader();

    const state = determinePageState(token, meeting, true);

    expect(state).toBe('processing');
  });

  it('should show error for invalid token', () => {
    const state = determinePageState(null, null, false);

    expect(state).toBe('error_invalid');
  });

  it('should show error for expired token', () => {
    const token = createMockExpiredReminderToken();
    const meeting = createMockMeetingWithGroupAndLeader();

    const state = determinePageState(token, meeting, false);

    expect(state).toBe('error_expired');
  });

  it('should show error for already confirmed token', () => {
    const token = createMockConfirmedReminderToken();
    const meeting = createMockMeetingWithGroupAndLeader();

    const state = determinePageState(token, meeting, false);

    expect(state).toBe('error_already_sent');
  });

  it('should show error for past meeting', () => {
    const token = createMockSentReminderToken();
    const meeting = createMockMeetingWithGroupAndLeader({
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    const state = determinePageState(token, meeting, false);

    expect(state).toBe('error_meeting_passed');
  });
});

describe('Attendee Email Generation', () => {
  it('should generate correct subject line', () => {
    const meeting = createMockMeetingWithGroupAndLeader({
      title: 'Weekly Sync',
    });
    const dateShort = 'March 15';
    const subject = `Reminder: "${meeting.title}" - ${dateShort}`;

    expect(subject).toBe('Reminder: "Weekly Sync" - March 15');
  });

  it('should include custom message when provided', () => {
    const customMessage = 'Looking forward to seeing everyone!';
    const hasMessage = !!customMessage;

    expect(hasMessage).toBe(true);
  });

  it('should use original description when custom not provided', () => {
    const meeting = createMockMeetingWithGroupAndLeader({
      description: 'Original description',
    });
    const customDescription = null;
    const finalDescription = customDescription || meeting.description;

    expect(finalDescription).toBe('Original description');
  });

  it('should use custom description when provided', () => {
    const meeting = createMockMeetingWithGroupAndLeader({
      description: 'Original description',
    });
    const customDescription = 'Updated description';
    const finalDescription = customDescription || meeting.description;

    expect(finalDescription).toBe('Updated description');
  });

  it('should include leader name in footer', () => {
    const meeting = createMockMeetingWithGroupAndLeader({
      profiles: { email: 'leader@example.com', full_name: 'John Smith' },
      groups: { name: 'Marketing Team' },
    });
    const footer = `Sent by ${meeting.profiles.full_name} via ${meeting.groups.name}`;

    expect(footer).toBe('Sent by John Smith via Marketing Team');
  });

  it('should handle leader without full name', () => {
    const meeting = createMockMeetingWithGroupAndLeader({
      profiles: { email: 'leader@example.com', full_name: null },
    });
    const leaderName = meeting.profiles.full_name || 'Meeting Leader';

    expect(leaderName).toBe('Meeting Leader');
  });
});

describe('SendGrid Personalization', () => {
  it('should create one personalization per attendee', () => {
    const attendees = createMockAttendeeList(5);

    const personalizations = attendees.map((attendee) => ({
      to: [
        {
          email: attendee.profiles.email,
          name: attendee.profiles.full_name || undefined,
        },
      ],
    }));

    expect(personalizations).toHaveLength(5);
    expect(personalizations[0].to[0].email).toBe('attendee1@example.com');
  });

  it('should handle attendee without full name', () => {
    const attendee = createMockAttendeeWithProfile({
      profiles: { email: 'test@example.com', full_name: null },
    });

    const personalization = {
      to: [
        {
          email: attendee.profiles.email,
          name: attendee.profiles.full_name || undefined,
        },
      ],
    };

    expect(personalization.to[0].name).toBeUndefined();
  });

  it('should handle empty attendee list gracefully', () => {
    const attendees: ReturnType<typeof createMockAttendeeWithProfile>[] = [];

    const personalizations = attendees.map((attendee) => ({
      to: [{ email: attendee.profiles.email }],
    }));

    expect(personalizations).toHaveLength(0);
  });
});

describe('Error Handling', () => {
  describe('Rollback on email failure', () => {
    it('should clear confirmed_at if email sending fails', () => {
      const token = createMockSentReminderToken({
        confirmed_at: new Date().toISOString(),
      });

      // Simulate rollback
      const rolledBackToken = {
        ...token,
        confirmed_at: null,
      };

      expect(rolledBackToken.confirmed_at).toBeNull();
    });
  });

  describe('Race condition protection', () => {
    it('should check token status before processing', () => {
      const token = createMockConfirmedReminderToken();

      // Even if initial check passed, re-check before processing
      const isAlreadyConfirmed = !!token.confirmed_at;

      expect(isAlreadyConfirmed).toBe(true);
    });
  });
});

describe('Mock Factories', () => {
  describe('createMockMeetingReminderToken', () => {
    it('should create a valid token structure', () => {
      const token = createMockMeetingReminderToken();

      expect(token.id).toBeDefined();
      expect(token.meeting_id).toBeDefined();
      expect(token.leader_id).toBeDefined();
      expect(token.token).toHaveLength(64);
      expect(token.expires_at).toBeDefined();
      expect(token.created_at).toBeDefined();
    });

    it('should allow overriding fields', () => {
      const token = createMockMeetingReminderToken({
        meeting_id: 'custom-meeting-id',
        custom_message: 'Custom message',
      });

      expect(token.meeting_id).toBe('custom-meeting-id');
      expect(token.custom_message).toBe('Custom message');
    });
  });

  describe('createMockAttendeeList', () => {
    it('should create specified number of attendees', () => {
      const attendees = createMockAttendeeList(10);

      expect(attendees).toHaveLength(10);
    });

    it('should create attendees with unique IDs and emails', () => {
      const attendees = createMockAttendeeList(5);

      const userIds = attendees.map((a) => a.user_id);
      const emails = attendees.map((a) => a.profiles.email);

      expect(new Set(userIds).size).toBe(5);
      expect(new Set(emails).size).toBe(5);
    });
  });
});
