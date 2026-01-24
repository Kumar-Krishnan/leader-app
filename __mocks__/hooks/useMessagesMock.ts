/**
 * useMessages Hook Mock
 *
 * Complete mock implementation for useMessages
 */
import type { UseMessagesResult, MessageWithSender } from '../../src/hooks/useMessages';
import { createMockMessageWithSender } from '../factories/threads';

/**
 * Create a mock useMessages return value
 */
export function createMockUseMessages(
  overrides: Partial<UseMessagesResult> = {}
): UseMessagesResult {
  return {
    messages: [],
    loading: false,
    error: null,
    sending: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn().mockResolvedValue(true),
    editMessage: jest.fn().mockResolvedValue(true),
    deleteMessage: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/**
 * Preset: Loading state
 */
export function createMockUseMessagesLoading(): UseMessagesResult {
  return createMockUseMessages({
    loading: true,
    messages: [],
  });
}

/**
 * Preset: Sending state
 */
export function createMockUseMessagesSending(): UseMessagesResult {
  return createMockUseMessages({
    sending: true,
  });
}

/**
 * Preset: Error state
 */
export function createMockUseMessagesError(errorMessage: string = 'Failed to load messages'): UseMessagesResult {
  return createMockUseMessages({
    error: errorMessage,
    loading: false,
    messages: [],
  });
}

/**
 * Preset: With messages
 */
export function createMockUseMessagesWithData(
  messages: MessageWithSender[] = [createMockMessageWithSender()]
): UseMessagesResult {
  return createMockUseMessages({
    messages,
  });
}

/**
 * Preset: Empty state
 */
export function createMockUseMessagesEmpty(): UseMessagesResult {
  return createMockUseMessages({
    messages: [],
    loading: false,
    error: null,
  });
}

/**
 * Preset: Send message fails
 */
export function createMockUseMessagesSendFails(): UseMessagesResult {
  return createMockUseMessages({
    sendMessage: jest.fn().mockResolvedValue(false),
  });
}

/**
 * Create mocks with spy functions for verification
 */
export function createMockUseMessagesWithSpies() {
  const spies = {
    refetch: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn().mockResolvedValue(true),
    editMessage: jest.fn().mockResolvedValue(true),
    deleteMessage: jest.fn().mockResolvedValue(true),
  };

  const mock = createMockUseMessages(spies);

  return { mock, spies };
}

/**
 * Reset all mock functions in a useMessages mock
 */
export function resetUseMessagesMock(mock: UseMessagesResult): void {
  if (jest.isMockFunction(mock.refetch)) mock.refetch.mockClear();
  if (jest.isMockFunction(mock.sendMessage)) mock.sendMessage.mockClear();
  if (jest.isMockFunction(mock.editMessage)) mock.editMessage.mockClear();
  if (jest.isMockFunction(mock.deleteMessage)) mock.deleteMessage.mockClear();
}
