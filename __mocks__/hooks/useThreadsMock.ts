/**
 * useThreads Hook Mock
 *
 * Complete mock implementation for useThreads
 */
import type { Thread } from '../../src/types/database';
import type { UseThreadsResult, ThreadWithDetails } from '../../src/hooks/useThreads';
import { createMockThread, createMockThreadList } from '../factories/threads';

/**
 * Create a mock useThreads return value
 */
export function createMockUseThreads(
  overrides: Partial<UseThreadsResult> = {}
): UseThreadsResult {
  return {
    threads: [],
    loading: false,
    error: null,
    refetch: jest.fn().mockResolvedValue(undefined),
    createThread: jest.fn().mockResolvedValue(createMockThread()),
    archiveThread: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/**
 * Preset: Loading state
 */
export function createMockUseThreadsLoading(): UseThreadsResult {
  return createMockUseThreads({
    loading: true,
    threads: [],
  });
}

/**
 * Preset: Error state
 */
export function createMockUseThreadsError(errorMessage: string = 'Failed to load threads'): UseThreadsResult {
  return createMockUseThreads({
    error: errorMessage,
    loading: false,
    threads: [],
  });
}

/**
 * Preset: With threads
 */
export function createMockUseThreadsWithData(
  threads: ThreadWithDetails[] = createMockThreadList()
): UseThreadsResult {
  return createMockUseThreads({
    threads,
  });
}

/**
 * Preset: Empty state
 */
export function createMockUseThreadsEmpty(): UseThreadsResult {
  return createMockUseThreads({
    threads: [],
    loading: false,
    error: null,
  });
}

/**
 * Preset: Create thread fails
 */
export function createMockUseThreadsCreateFails(): UseThreadsResult {
  return createMockUseThreads({
    createThread: jest.fn().mockResolvedValue(null),
  });
}

/**
 * Create mocks with spy functions for verification
 */
export function createMockUseThreadsWithSpies() {
  const spies = {
    refetch: jest.fn().mockResolvedValue(undefined),
    createThread: jest.fn().mockResolvedValue(createMockThread()),
    archiveThread: jest.fn().mockResolvedValue(true),
  };

  const mock = createMockUseThreads(spies);

  return { mock, spies };
}

/**
 * Reset all mock functions in a useThreads mock
 */
export function resetUseThreadsMock(mock: UseThreadsResult): void {
  if (jest.isMockFunction(mock.refetch)) mock.refetch.mockClear();
  if (jest.isMockFunction(mock.createThread)) mock.createThread.mockClear();
  if (jest.isMockFunction(mock.archiveThread)) mock.archiveThread.mockClear();
}
