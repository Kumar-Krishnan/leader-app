/**
 * Context Mocks - Centralized context mock generation
 *
 * Usage:
 * import { createMockAuthContext, createMockGroupContextAsLeader } from '@/__mocks__/contexts';
 */

// Auth Context
export {
  createMockAuthContext,
  createMockAuthContextUnauthenticated,
  createMockAuthContextLoading,
  createMockAuthContextAsLeader,
  createMockAuthContextAsAdmin,
  createMutableAuthMock,
} from './AuthContextMock';
export type { MockAuthContextType } from './AuthContextMock';

// Group Context
export {
  createMockGroupContext,
  createMockGroupContextNoGroup,
  createMockGroupContextLoading,
  createMockGroupContextAsLeader,
  createMockGroupContextAsAdmin,
  createMockGroupContextMultipleGroups,
  createMockGroupContextWithPendingRequests,
  createMutableGroupMock,
} from './GroupContextMock';
export type { MockGroupContextType } from './GroupContextMock';
