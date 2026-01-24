/**
 * useMeetings Hook Mock
 *
 * Complete mock implementation for all 10 methods in useMeetings
 */
import type { MeetingWithAttendees } from '../../src/types/database';
import type { UseMeetingsResult, RSVPStatus } from '../../src/hooks/useMeetings';
import { createMockMeetingWithAttendees } from '../factories/meetings';

/**
 * Create a mock useMeetings return value
 */
export function createMockUseMeetings(
  overrides: Partial<UseMeetingsResult> = {}
): UseMeetingsResult {
  return {
    meetings: [],
    loading: false,
    error: null,
    refetch: jest.fn().mockResolvedValue(undefined),
    rsvpToMeeting: jest.fn().mockResolvedValue(true),
    rsvpToSeries: jest.fn().mockResolvedValue(true),
    deleteMeeting: jest.fn().mockResolvedValue(true),
    deleteSeries: jest.fn().mockResolvedValue(true),
    updateMeeting: jest.fn().mockResolvedValue(true),
    getSeriesMeetings: jest.fn().mockReturnValue([]),
    skipMeeting: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/**
 * Preset: Loading state
 */
export function createMockUseMeetingsLoading(): UseMeetingsResult {
  return createMockUseMeetings({
    loading: true,
    meetings: [],
  });
}

/**
 * Preset: Error state
 */
export function createMockUseMeetingsError(errorMessage: string = 'Failed to load meetings'): UseMeetingsResult {
  return createMockUseMeetings({
    error: errorMessage,
    loading: false,
    meetings: [],
  });
}

/**
 * Preset: With meetings
 */
export function createMockUseMeetingsWithData(
  meetings: MeetingWithAttendees[] = [createMockMeetingWithAttendees()]
): UseMeetingsResult {
  const getSeriesMeetings = jest.fn((seriesId: string) => {
    return meetings
      .filter(m => m.series_id === seriesId)
      .sort((a, b) => (a.series_index || 0) - (b.series_index || 0));
  });

  return createMockUseMeetings({
    meetings,
    getSeriesMeetings,
  });
}

/**
 * Preset: Empty state
 */
export function createMockUseMeetingsEmpty(): UseMeetingsResult {
  return createMockUseMeetings({
    meetings: [],
    loading: false,
    error: null,
  });
}

/**
 * Preset: With RSVP that fails
 */
export function createMockUseMeetingsRSVPFails(): UseMeetingsResult {
  return createMockUseMeetings({
    rsvpToMeeting: jest.fn().mockResolvedValue(false),
    rsvpToSeries: jest.fn().mockResolvedValue(false),
  });
}

/**
 * Create mocks with spy functions for verification
 * Returns both the mock and individual spy functions
 */
export function createMockUseMeetingsWithSpies() {
  const spies = {
    refetch: jest.fn().mockResolvedValue(undefined),
    rsvpToMeeting: jest.fn().mockResolvedValue(true),
    rsvpToSeries: jest.fn().mockResolvedValue(true),
    deleteMeeting: jest.fn().mockResolvedValue(true),
    deleteSeries: jest.fn().mockResolvedValue(true),
    updateMeeting: jest.fn().mockResolvedValue(true),
    getSeriesMeetings: jest.fn().mockReturnValue([]),
    skipMeeting: jest.fn().mockResolvedValue(true),
  };

  const mock = createMockUseMeetings(spies);

  return { mock, spies };
}

/**
 * Reset all mock functions in a useMeetings mock
 */
export function resetUseMeetingsMock(mock: UseMeetingsResult): void {
  if (jest.isMockFunction(mock.refetch)) mock.refetch.mockClear();
  if (jest.isMockFunction(mock.rsvpToMeeting)) mock.rsvpToMeeting.mockClear();
  if (jest.isMockFunction(mock.rsvpToSeries)) mock.rsvpToSeries.mockClear();
  if (jest.isMockFunction(mock.deleteMeeting)) mock.deleteMeeting.mockClear();
  if (jest.isMockFunction(mock.deleteSeries)) mock.deleteSeries.mockClear();
  if (jest.isMockFunction(mock.updateMeeting)) mock.updateMeeting.mockClear();
  if (jest.isMockFunction(mock.getSeriesMeetings)) mock.getSeriesMeetings.mockClear();
  if (jest.isMockFunction(mock.skipMeeting)) mock.skipMeeting.mockClear();
}
