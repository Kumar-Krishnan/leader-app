/**
 * GroupContext Mock
 *
 * Provides mock implementations for useGroup hook testing
 */
import {
  createMockGroupWithMembership,
  createMockGroupAsLeader,
  createMockGroupAsAdmin,
  type GroupWithMembership,
} from '../factories/groups';
import type { GroupJoinRequest, GroupJoinRequestWithDetails } from '../../src/types/database';

/**
 * GroupContext type (mirrors the real GroupContextType)
 */
export interface MockGroupContextType {
  groups: GroupWithMembership[];
  currentGroup: GroupWithMembership | null;
  setCurrentGroup: jest.Mock;
  loading: boolean;
  isGroupLeader: boolean;
  isGroupAdmin: boolean;
  canApproveRequests: boolean;
  pendingRequests: GroupJoinRequestWithDetails[];
  myPendingRequests: GroupJoinRequest[];
  refreshGroups: jest.Mock;
  refreshPendingRequests: jest.Mock;
  createGroup: jest.Mock;
  requestToJoin: jest.Mock;
  approveRequest: jest.Mock;
  rejectRequest: jest.Mock;
  updateMemberRole: jest.Mock;
}

/**
 * Create a mock GroupContext value
 */
export function createMockGroupContext(
  overrides: Partial<MockGroupContextType> = {}
): MockGroupContextType {
  const currentGroup = overrides.currentGroup ?? createMockGroupWithMembership();
  const isGroupLeader =
    overrides.isGroupLeader ??
    (currentGroup?.role === 'leader' || currentGroup?.role === 'admin');
  const isGroupAdmin = overrides.isGroupAdmin ?? currentGroup?.role === 'admin';
  const canApproveRequests =
    overrides.canApproveRequests ??
    (currentGroup?.role === 'leader-helper' ||
      currentGroup?.role === 'leader' ||
      currentGroup?.role === 'admin');

  return {
    groups: overrides.groups ?? (currentGroup ? [currentGroup] : []),
    currentGroup,
    setCurrentGroup: jest.fn(),
    loading: false,
    isGroupLeader,
    isGroupAdmin,
    canApproveRequests,
    pendingRequests: [],
    myPendingRequests: [],
    refreshGroups: jest.fn().mockResolvedValue(undefined),
    refreshPendingRequests: jest.fn().mockResolvedValue(undefined),
    createGroup: jest.fn().mockResolvedValue({ group: null, error: null }),
    requestToJoin: jest.fn().mockResolvedValue({ error: null }),
    approveRequest: jest.fn().mockResolvedValue({ error: null }),
    rejectRequest: jest.fn().mockResolvedValue({ error: null }),
    updateMemberRole: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

/**
 * Preset: No group selected
 */
export function createMockGroupContextNoGroup(): MockGroupContextType {
  return createMockGroupContext({
    groups: [],
    currentGroup: null,
    isGroupLeader: false,
    isGroupAdmin: false,
    canApproveRequests: false,
  });
}

/**
 * Preset: Loading state
 */
export function createMockGroupContextLoading(): MockGroupContextType {
  return createMockGroupContext({
    loading: true,
    currentGroup: null,
  });
}

/**
 * Preset: Current user is group leader
 */
export function createMockGroupContextAsLeader(): MockGroupContextType {
  const group = createMockGroupAsLeader();
  return createMockGroupContext({
    currentGroup: group,
    groups: [group],
    isGroupLeader: true,
    isGroupAdmin: false,
    canApproveRequests: true,
  });
}

/**
 * Preset: Current user is group admin
 */
export function createMockGroupContextAsAdmin(): MockGroupContextType {
  const group = createMockGroupAsAdmin();
  return createMockGroupContext({
    currentGroup: group,
    groups: [group],
    isGroupLeader: true,
    isGroupAdmin: true,
    canApproveRequests: true,
  });
}

/**
 * Preset: Member of multiple groups
 */
export function createMockGroupContextMultipleGroups(): MockGroupContextType {
  const group1 = createMockGroupWithMembership({ id: 'group-1', name: 'Group One' });
  const group2 = createMockGroupWithMembership({
    id: 'group-2',
    name: 'Group Two',
    role: 'leader',
    memberId: 'member-2',
  });
  const group3 = createMockGroupAsAdmin({ id: 'group-3', name: 'Group Three' });

  return createMockGroupContext({
    groups: [group1, group2, group3],
    currentGroup: group1,
  });
}

/**
 * Preset: With pending join requests
 */
export function createMockGroupContextWithPendingRequests(
  requestCount: number = 2
): MockGroupContextType {
  const group = createMockGroupAsLeader();
  const pendingRequests: GroupJoinRequestWithDetails[] = Array.from(
    { length: requestCount },
    (_, i) => ({
      id: `request-${i + 1}`,
      group_id: group.id,
      user_id: `user-${i + 1}`,
      status: 'pending' as const,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      user: {
        id: `user-${i + 1}`,
        email: `user${i + 1}@example.com`,
        full_name: `User ${i + 1}`,
        avatar_url: null,
        role: 'user' as const,
        notification_preferences: {
          messages: true,
          meetings: true,
          resources: true,
          push_enabled: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    })
  );

  return createMockGroupContext({
    currentGroup: group,
    groups: [group],
    isGroupLeader: true,
    canApproveRequests: true,
    pendingRequests,
  });
}

/**
 * Create a mutable mock that can be modified during tests
 */
export function createMutableGroupMock() {
  let currentValue = createMockGroupContext();

  const setGroup = (overrides: Partial<MockGroupContextType>) => {
    currentValue = { ...currentValue, ...overrides };
  };

  const getMock = () => currentValue;

  return { mockGroup: getMock, setGroup };
}
