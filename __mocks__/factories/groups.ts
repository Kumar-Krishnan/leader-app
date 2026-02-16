/**
 * Group-related mock factories
 */
import type { Group, GroupMember, GroupRole, GroupMemberWithDetails } from '../../src/types/database';
import { createMockProfile } from './users';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Create a mock Group
 */
export function createMockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'test-group-id',
    name: 'Test Group',
    description: 'A test group',
    code: 'ABC123',
    created_by: 'test-user-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock GroupMember
 */
export function createMockGroupMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'test-member-id',
    group_id: 'test-group-id',
    user_id: overrides.placeholder_id ? null : 'test-user-id',
    placeholder_id: null,
    role: 'member' as GroupRole,
    joined_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock GroupMemberWithDetails
 */
export function createMockGroupMemberWithDetails(
  overrides: DeepPartial<GroupMemberWithDetails> = {}
): GroupMemberWithDetails {
  return {
    id: overrides.id || 'test-member-id',
    group_id: overrides.group_id || 'test-group-id',
    user_id: overrides.placeholder_id ? null : (overrides.user_id || 'test-user-id'),
    placeholder_id: overrides.placeholder_id || null,
    role: (overrides.role || 'member') as GroupRole,
    joined_at: overrides.joined_at || '2024-01-01T00:00:00Z',
    group: overrides.group ? createMockGroup(overrides.group as Partial<Group>) : undefined,
    user: overrides.user ? createMockProfile(overrides.user) : undefined,
    placeholder: overrides.placeholder || undefined,
  };
}

/**
 * GroupWithMembership - Extended Group with current user's role (used in context)
 */
export interface GroupWithMembership extends Group {
  role: GroupRole;
  memberId: string;
}

/**
 * Create a mock GroupWithMembership (used by GroupContext)
 */
export function createMockGroupWithMembership(
  overrides: Partial<GroupWithMembership> = {}
): GroupWithMembership {
  const group = createMockGroup(overrides);
  return {
    ...group,
    role: 'member' as GroupRole,
    memberId: 'test-member-id',
    ...overrides,
  };
}

/**
 * Preset: Group where current user is admin
 */
export function createMockGroupAsAdmin(overrides: Partial<Group> = {}): GroupWithMembership {
  return createMockGroupWithMembership({
    ...overrides,
    role: 'admin',
    memberId: 'admin-member-id',
  });
}

/**
 * Preset: Group where current user is leader
 */
export function createMockGroupAsLeader(overrides: Partial<Group> = {}): GroupWithMembership {
  return createMockGroupWithMembership({
    ...overrides,
    role: 'leader',
    memberId: 'leader-member-id',
  });
}

