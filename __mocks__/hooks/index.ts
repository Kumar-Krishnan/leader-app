/**
 * Hook Mocks - Centralized hook mock generation
 *
 * Usage:
 * import { createMockUseMeetings, createMockUseThreadsWithData } from '@/__mocks__/hooks';
 */

// useMeetings
export {
  createMockUseMeetings,
  createMockUseMeetingsLoading,
  createMockUseMeetingsError,
  createMockUseMeetingsWithData,
  createMockUseMeetingsEmpty,
  createMockUseMeetingsRSVPFails,
  createMockUseMeetingsWithSpies,
  resetUseMeetingsMock,
} from './useMeetingsMock';

// useThreads
export {
  createMockUseThreads,
  createMockUseThreadsLoading,
  createMockUseThreadsError,
  createMockUseThreadsWithData,
  createMockUseThreadsEmpty,
  createMockUseThreadsCreateFails,
  createMockUseThreadsWithSpies,
  resetUseThreadsMock,
} from './useThreadsMock';

// useMessages
export {
  createMockUseMessages,
  createMockUseMessagesLoading,
  createMockUseMessagesSending,
  createMockUseMessagesError,
  createMockUseMessagesWithData,
  createMockUseMessagesEmpty,
  createMockUseMessagesSendFails,
  createMockUseMessagesWithSpies,
  resetUseMessagesMock,
} from './useMessagesMock';

// useResources
export {
  createMockUseResources,
  createMockUseResourcesLoading,
  createMockUseResourcesUploading,
  createMockUseResourcesError,
  createMockUseResourcesWithData,
  createMockUseResourcesEmpty,
  createMockUseResourcesInFolder,
  createMockUseResourcesWithShareableGroups,
  createMockUseResourcesWithSpies,
  resetUseResourcesMock,
} from './useResourcesMock';

// useGroupMembers
export {
  createMockMemberWithProfile,
  createMockUseGroupMembers,
  createMockUseGroupMembersLoading,
  createMockUseGroupMembersError,
  createMockUseGroupMembersWithData,
  createMockUseGroupMembersEmpty,
  createMockUseGroupMembersProcessing,
  createMockUseGroupMembersUpdateFails,
  createMockUseGroupMembersWithSpies,
  resetUseGroupMembersMock,
} from './useGroupMembersMock';
