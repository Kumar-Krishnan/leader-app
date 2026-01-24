/**
 * Test Mocking Framework - Main Entry Point
 *
 * Provides centralized, extensible mocks for testing the Leader App.
 *
 * ## Quick Start
 *
 * ```tsx
 * import {
 *   // Factories - create mock data
 *   createMockUser,
 *   createMockMeetingWithAttendees,
 *   createMockGroupAsLeader,
 *
 *   // Context mocks
 *   createMockAuthContext,
 *   createMockGroupContextAsLeader,
 *
 *   // Hook mocks
 *   createMockUseMeetings,
 *
 *   // Utilities
 *   renderWithProviders,
 *   waitForAsync,
 * } from '@/__mocks__';
 * ```
 *
 * ## Example Test
 *
 * ```tsx
 * import { renderWithProviders } from '@/__mocks__/utils';
 * import { createMockMeetingWithAttendees } from '@/__mocks__/factories';
 * import { createMockUseMeetings } from '@/__mocks__/hooks';
 *
 * // Setup mocks
 * let mockAuthContext = createMockAuthContext();
 * let mockGroupContext = createMockGroupContextAsLeader();
 * let mockUseMeetings = createMockUseMeetings();
 *
 * jest.mock('../contexts/AuthContext', () => ({
 *   useAuth: () => mockAuthContext,
 * }));
 *
 * jest.mock('../contexts/GroupContext', () => ({
 *   useGroup: () => mockGroupContext,
 * }));
 *
 * jest.mock('../hooks/useMeetings', () => ({
 *   useMeetings: () => mockUseMeetings,
 * }));
 *
 * describe('MeetingsScreen', () => {
 *   it('displays meetings', () => {
 *     mockUseMeetings = createMockUseMeetings({
 *       meetings: [createMockMeetingWithAttendees({ title: 'Team Meeting' })],
 *     });
 *
 *     const { getByText } = renderWithProviders(<MeetingsScreen />);
 *     expect(getByText('Team Meeting')).toBeTruthy();
 *   });
 * });
 * ```
 */

// ============================================================================
// Factories - Mock Data Generation
// ============================================================================
export * from './factories';

// ============================================================================
// Context Mocks
// ============================================================================
export * from './contexts';

// ============================================================================
// Hook Mocks
// ============================================================================
export * from './hooks';

// ============================================================================
// Supabase Mocks
// ============================================================================
export * from './supabase';

// ============================================================================
// Test Utilities
// ============================================================================
export * from './utils';
