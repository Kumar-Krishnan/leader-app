/**
 * Mock Factories - Centralized mock data generation
 *
 * Usage:
 * import { createMockUser, createMockMeetingWithAttendees } from '@/__mocks__/factories';
 */

// Users
export {
  createMockUser,
  createMockProfile,
  createMockSession,
  createMockAuthenticatedUser,
  createMockLeaderUser,
  createMockAdminUser,
} from './users';

// Groups
export {
  createMockGroup,
  createMockGroupMember,
  createMockGroupMemberWithDetails,
  createMockGroupWithMembership,
  createMockGroupAsAdmin,
  createMockGroupAsLeader,
  createMockSystemGroup,
} from './groups';
export type { GroupWithMembership } from './groups';

// Meetings
export {
  createMockMeeting,
  createMockMeetingAttendee,
  createMockMeetingAttendeeWithProfile,
  createMockMeetingWithAttendees,
  createMockMeetingWithMultipleAttendees,
  createMockSeriesMeeting,
  createMockMeetingSeries,
  createMockPastMeeting,
} from './meetings';

// Threads and Messages
export {
  createMockThread,
  createMockThreadWithDisplayInfo,
  createMockThreadMember,
  createMockMessage,
  createMockMessageWithSender,
  createMockThreadWithMessages,
  createMockArchivedThread,
  createMockThreadList,
} from './threads';
export type { ThreadWithDisplayInfo, MessageWithSender } from './threads';

// Resources
export {
  createMockResource,
  createMockResourceFolder,
  createMockResourceComment,
  createMockResourceCommentWithUser,
  createMockLinkResource,
  createMockVideoResource,
  createMockUploadedResource,
  createMockLeadersOnlyResource,
  createMockFolderStructure,
  createMockResourceList,
} from './resources';

// Meeting Reminders
export {
  createMockMeetingReminderToken,
  createMockSentReminderToken,
  createMockConfirmedReminderToken,
  createMockExpiredReminderToken,
  generateMockToken,
  createMockMeetingWithGroupAndLeader,
  createMockAttendeeWithProfile,
  createMockAttendeeList,
} from './meetingReminders';
export type {
  MeetingWithGroupAndLeader,
  AttendeeWithProfile,
} from './meetingReminders';
