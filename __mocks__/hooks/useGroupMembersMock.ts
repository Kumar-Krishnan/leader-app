/**
 * useGroupMembers Hook Mock
 *
 * Complete mock implementation for useGroupMembers
 */
import type { GroupRole } from '../../src/types/database';
import type { UseGroupMembersResult, MemberWithProfile } from '../../src/hooks/useGroupMembers';
import { createMockGroupMember } from '../factories/groups';
import { createMockProfile } from '../factories/users';

/**
 * Create a mock MemberWithProfile
 */
export function createMockMemberWithProfile(
  overrides: Partial<MemberWithProfile> = {}
): MemberWithProfile {
  const member = createMockGroupMember(overrides);
  const user = overrides.user || createMockProfile({ id: member.user_id || 'test-user-id' });
  return {
    ...member,
    user: member.user_id ? user : null,
    placeholder: overrides.placeholder || null,
    isPlaceholder: member.placeholder_id !== null,
    displayName: user?.full_name || overrides.placeholder?.full_name || 'Unknown',
    displayEmail: user?.email || overrides.placeholder?.email || '',
  };
}

/**
 * Create a mock useGroupMembers return value
 */
export function createMockUseGroupMembers(
  overrides: Partial<UseGroupMembersResult> = {}
): UseGroupMembersResult {
  return {
    members: [],
    loading: false,
    error: null,
    processingId: null,
    refetch: jest.fn().mockResolvedValue(undefined),
    updateRole: jest.fn().mockResolvedValue(true),
    removeMember: jest.fn().mockResolvedValue(true),
    createPlaceholder: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/**
 * Preset: Loading state
 */
export function createMockUseGroupMembersLoading(): UseGroupMembersResult {
  return createMockUseGroupMembers({
    loading: true,
    members: [],
  });
}

/**
 * Preset: Error state
 */
export function createMockUseGroupMembersError(errorMessage: string = 'Failed to load members'): UseGroupMembersResult {
  return createMockUseGroupMembers({
    error: errorMessage,
    loading: false,
    members: [],
  });
}

/**
 * Preset: With members
 */
export function createMockUseGroupMembersWithData(
  memberCount: number = 5
): UseGroupMembersResult {
  const roles: GroupRole[] = ['admin', 'leader', 'leader-helper', 'member', 'member'];

  const members = Array.from({ length: memberCount }, (_, i) =>
    createMockMemberWithProfile({
      id: `member-${i + 1}`,
      user_id: `user-${i + 1}`,
      role: roles[i % roles.length],
      user: createMockProfile({
        id: `user-${i + 1}`,
        email: `user${i + 1}@example.com`,
        full_name: `User ${i + 1}`,
      }),
    })
  );

  return createMockUseGroupMembers({
    members,
  });
}

/**
 * Preset: Empty state
 */
export function createMockUseGroupMembersEmpty(): UseGroupMembersResult {
  return createMockUseGroupMembers({
    members: [],
    loading: false,
    error: null,
  });
}

/**
 * Preset: Processing a member
 */
export function createMockUseGroupMembersProcessing(memberId: string = 'member-1'): UseGroupMembersResult {
  return createMockUseGroupMembers({
    processingId: memberId,
  });
}

/**
 * Preset: Update role fails
 */
export function createMockUseGroupMembersUpdateFails(): UseGroupMembersResult {
  return createMockUseGroupMembers({
    updateRole: jest.fn().mockResolvedValue(false),
    removeMember: jest.fn().mockResolvedValue(false),
    createPlaceholder: jest.fn().mockResolvedValue(false),
  });
}

/**
 * Create mocks with spy functions for verification
 */
export function createMockUseGroupMembersWithSpies() {
  const spies = {
    refetch: jest.fn().mockResolvedValue(undefined),
    updateRole: jest.fn().mockResolvedValue(true),
    removeMember: jest.fn().mockResolvedValue(true),
    createPlaceholder: jest.fn().mockResolvedValue(true),
  };

  const mock = createMockUseGroupMembers(spies);

  return { mock, spies };
}

/**
 * Reset all mock functions in a useGroupMembers mock
 */
export function resetUseGroupMembersMock(mock: UseGroupMembersResult): void {
  if (jest.isMockFunction(mock.refetch)) mock.refetch.mockClear();
  if (jest.isMockFunction(mock.updateRole)) mock.updateRole.mockClear();
  if (jest.isMockFunction(mock.removeMember)) mock.removeMember.mockClear();
  if (jest.isMockFunction(mock.createPlaceholder)) mock.createPlaceholder.mockClear();
}
