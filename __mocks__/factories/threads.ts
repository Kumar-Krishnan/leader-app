/**
 * Thread and Message mock factories
 */
import type { Thread, ThreadMember, Message } from '../../src/types/database';
import { createMockProfile } from './users';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Create a mock Thread
 */
export function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-thread-id',
    name: 'Test Thread',
    group_id: 'test-group-id',
    created_by: 'test-user-id',
    is_archived: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Thread with additional display fields (used in list views)
 */
export interface ThreadWithDisplayInfo extends Thread {
  lastMessage?: string;
  unreadCount?: number;
}

/**
 * Create a mock Thread with display info
 */
export function createMockThreadWithDisplayInfo(
  overrides: Partial<ThreadWithDisplayInfo> = {}
): ThreadWithDisplayInfo {
  return {
    ...createMockThread(overrides),
    lastMessage: overrides.lastMessage,
    unreadCount: overrides.unreadCount ?? 0,
  };
}

/**
 * Create a mock ThreadMember
 */
export function createMockThreadMember(overrides: Partial<ThreadMember> = {}): ThreadMember {
  return {
    id: 'test-thread-member-id',
    thread_id: 'test-thread-id',
    user_id: 'test-user-id',
    joined_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock Message
 */
export function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'test-message-id',
    thread_id: 'test-thread-id',
    sender_id: 'test-user-id',
    content: 'Test message content',
    attachments: [],
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Message with sender profile (used in message lists)
 */
export interface MessageWithSender extends Message {
  sender?: ReturnType<typeof createMockProfile>;
}

/**
 * Create a mock Message with sender
 */
export function createMockMessageWithSender(
  overrides: DeepPartial<MessageWithSender> = {}
): MessageWithSender {
  const { sender, ...messageOverrides } = overrides;
  return {
    ...createMockMessage(messageOverrides as Partial<Message>),
    sender: sender ? createMockProfile(sender) : createMockProfile(),
  };
}

/**
 * Preset: Thread with messages
 */
export function createMockThreadWithMessages(messageCount: number = 5): {
  thread: Thread;
  messages: MessageWithSender[];
} {
  const thread = createMockThread();

  const messages: MessageWithSender[] = Array.from({ length: messageCount }, (_, i) => ({
    id: `message-${i + 1}`,
    thread_id: thread.id,
    sender_id: i % 2 === 0 ? 'test-user-id' : 'other-user-id',
    content: `Message ${i + 1}`,
    attachments: [],
    created_at: new Date(Date.now() - (messageCount - i) * 60000).toISOString(),
    sender: createMockProfile({
      id: i % 2 === 0 ? 'test-user-id' : 'other-user-id',
      full_name: i % 2 === 0 ? 'Test User' : 'Other User',
    }),
  }));

  return { thread, messages };
}

/**
 * Preset: Archived thread
 */
export function createMockArchivedThread(overrides: Partial<Thread> = {}): Thread {
  return createMockThread({
    is_archived: true,
    ...overrides,
  });
}

/**
 * Preset: Multiple threads for list view
 */
export function createMockThreadList(count: number = 3): ThreadWithDisplayInfo[] {
  const names = ['General Discussion', 'Support Requests', 'Announcements', 'Q&A', 'Off Topic'];
  return Array.from({ length: count }, (_, i) =>
    createMockThreadWithDisplayInfo({
      id: `thread-${i + 1}`,
      name: names[i % names.length],
      lastMessage: i === 0 ? 'Hello everyone!' : undefined,
      unreadCount: i === 0 ? 3 : 0,
    })
  );
}
