/**
 * Meeting Reminder Token mock factories
 */
import type { MeetingReminderToken } from '../../src/types/database';
import { createMockMeeting } from './meetings';
import { createMockProfile } from './users';

/**
 * Create a mock MeetingReminderToken
 */
export function createMockMeetingReminderToken(
  overrides: Partial<MeetingReminderToken> = {}
): MeetingReminderToken {
  return {
    id: 'test-reminder-token-id',
    meeting_id: 'test-meeting-id',
    leader_id: 'test-leader-id',
    token: 'a'.repeat(64), // 64-character hex token
    reminder_sent_at: null,
    confirmed_at: null,
    attendee_email_sent_at: null,
    custom_description: null,
    custom_message: null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock token that has been sent to the leader
 */
export function createMockSentReminderToken(
  overrides: Partial<MeetingReminderToken> = {}
): MeetingReminderToken {
  return createMockMeetingReminderToken({
    reminder_sent_at: new Date().toISOString(),
    ...overrides,
  });
}

/**
 * Create a mock token that has been confirmed by the leader
 */
export function createMockConfirmedReminderToken(
  overrides: Partial<MeetingReminderToken> = {}
): MeetingReminderToken {
  return createMockMeetingReminderToken({
    reminder_sent_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    confirmed_at: new Date().toISOString(),
    attendee_email_sent_at: new Date().toISOString(),
    custom_description: 'Updated meeting description',
    custom_message: 'Looking forward to seeing everyone!',
    ...overrides,
  });
}

/**
 * Create a mock expired token
 */
export function createMockExpiredReminderToken(
  overrides: Partial<MeetingReminderToken> = {}
): MeetingReminderToken {
  return createMockMeetingReminderToken({
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    ...overrides,
  });
}

/**
 * Generate a realistic 64-character hex token
 */
export function generateMockToken(): string {
  const chars = '0123456789abcdef';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Meeting data structure as returned by the database query
 */
export interface MeetingWithGroupAndLeader {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  group_id: string;
  created_by: string;
  groups: { name: string };
  profiles: { email: string; full_name: string | null };
}

/**
 * Create a mock meeting with group and leader data (as returned by Edge Function queries)
 */
export function createMockMeetingWithGroupAndLeader(
  overrides: Partial<MeetingWithGroupAndLeader> = {}
): MeetingWithGroupAndLeader {
  return {
    id: 'test-meeting-id',
    title: 'Team Meeting',
    description: 'Weekly team sync',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    location: 'Conference Room A',
    group_id: 'test-group-id',
    created_by: 'test-leader-id',
    groups: { name: 'Test Group' },
    profiles: { email: 'leader@example.com', full_name: 'Test Leader' },
    ...overrides,
  };
}

/**
 * Attendee data structure as returned by the database query
 */
export interface AttendeeWithProfile {
  user_id: string;
  profiles: { email: string; full_name: string | null };
}

/**
 * Create a mock attendee with profile
 */
export function createMockAttendeeWithProfile(
  overrides: Partial<AttendeeWithProfile> = {}
): AttendeeWithProfile {
  return {
    user_id: 'test-attendee-id',
    profiles: { email: 'attendee@example.com', full_name: 'Test Attendee' },
    ...overrides,
  };
}

/**
 * Create multiple mock attendees
 */
export function createMockAttendeeList(count: number = 5): AttendeeWithProfile[] {
  return Array.from({ length: count }, (_, i) => ({
    user_id: `attendee-${i + 1}`,
    profiles: {
      email: `attendee${i + 1}@example.com`,
      full_name: `Attendee ${i + 1}`,
    },
  }));
}
