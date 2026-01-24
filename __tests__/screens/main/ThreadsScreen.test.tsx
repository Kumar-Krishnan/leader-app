import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ThreadsScreen from '../../../src/screens/main/ThreadsScreen';
import { supabase } from '../../../src/lib/supabase';

// Import mock factories
import {
  createMockUser,
  createMockGroupWithMembership,
  createMockAuthContext,
  createMockGroupContext,
  createChainableMock,
} from '../../../__mocks__';

// Mock Supabase
jest.mock('../../../src/lib/supabase');

// Access global navigation mocks from jest.setup.js
const mockNavigate = (global as any).__navigationMocks__?.mockNavigate || jest.fn();

// Create mutable mock values
let mockAuthContext = createMockAuthContext();
let mockGroupContext = createMockGroupContext();

// Mock auth context
jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
jest.mock('../../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Mock thread data
const mockThread = {
  id: 'thread-1',
  group_id: 'group-id',
  name: 'General Discussion',
  description: 'Main chat',
  created_by: 'user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_archived: false,
  lastMessage: 'Hello everyone!',
  unreadCount: 3,
};

const mockThread2 = {
  id: 'thread-2',
  group_id: 'group-id',
  name: 'Support Requests',
  description: 'Share prayer needs',
  created_by: 'user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_archived: false,
};

// Helper to create mock chain
const createMockChain = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
});

describe('ThreadsScreen', () => {
  // Default mock data
  const mockUser = createMockUser({ id: 'user-id', email: 'test@example.com' });
  const mockGroup = createMockGroupWithMembership({
    id: 'group-id',
    name: 'Test Group',
    role: 'member',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mock data
    mockAuthContext = createMockAuthContext({
      user: mockUser,
      profile: null,
      isLeader: false,
      isAdmin: false,
    });

    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });

    // Default Supabase mock
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain([mockThread, mockThread2])
    );
  });

  it('should render loading state initially', () => {
    const { getByTestId } = render(<ThreadsScreen />);

    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should display threads after loading', async () => {
    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('General Discussion')).toBeTruthy();
    expect(getByText('Support Requests')).toBeTruthy();
  });

  it('should display group name in header', async () => {
    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('Test Group')).toBeTruthy();
  });

  it('should display last message when available', async () => {
    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('Hello everyone!')).toBeTruthy();
  });

  it('should display "No messages yet" when no last message', async () => {
    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('No messages yet')).toBeTruthy();
  });

  it('should display unread badge when unread count > 0', async () => {
    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('3')).toBeTruthy(); // unreadCount badge
  });

  it('should navigate to thread detail when thread is pressed', async () => {
    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    const threadCard = getByText('General Discussion');
    fireEvent.press(threadCard);

    expect(mockNavigate).toHaveBeenCalledWith('ThreadDetail', {
      threadId: 'thread-1',
      threadName: 'General Discussion',
    });
  });

  it('should show "+ New" button for leaders', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });

    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('+ New')).toBeTruthy();
  });

  it('should not show "+ New" button for regular members', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });

    const { queryByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(queryByText('+ New')).toBeNull();
  });

  it('should open create modal when "+ New" is pressed', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });

    const { getByText, getAllByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    const newButton = getByText('+ New');
    fireEvent.press(newButton);

    // Modal should be visible after pressing + New (button text appears in modal)
    await waitFor(() => {
      const createButtons = getAllByText('Create Thread');
      // Should have at least one "Create Thread" button (from modal)
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  it('should display empty state when no threads', async () => {
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('No threads yet')).toBeTruthy();
  });

  it('should show leader-specific empty state message', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(
      getByText('Create a new thread to start a conversation with your group.')
    ).toBeTruthy();
  });

  it('should show member-specific empty state message', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(
      getByText("You'll see threads here once you're added to one.")
    ).toBeTruthy();
  });

  it('should show "Create Thread" button in empty state for leaders', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: true,
    });
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('Create Thread')).toBeTruthy();
  });

  it('should not show "Create Thread" button in empty state for members', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: mockGroup,
      isGroupLeader: false,
    });
    (supabase.from as jest.Mock).mockReturnValue(createMockChain([]));

    const { queryByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(queryByText('Create Thread')).toBeNull();
  });

  it('should handle no current group gracefully', async () => {
    mockGroupContext = createMockGroupContext({
      currentGroup: null,
      isGroupLeader: false,
    });

    const { queryByText } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByText('General Discussion')).toBeNull();
    });
  });

  it('should handle fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain(null, new Error('Network error'))
    );

    render(<ThreadsScreen />);

    await waitFor(() => {
      // Logger formats output as: '[color][ERROR][reset] [tag] message'
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[useThreads] Error fetching threads'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    consoleSpy.mockRestore();
  });

  it('should filter threads by group_id', async () => {
    const mockChain = createMockChain([mockThread]);
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    render(<ThreadsScreen />);

    await waitFor(() => {
      expect(mockChain.eq).toHaveBeenCalledWith('group_id', 'group-id');
    });
  });

  it('should filter out archived threads', async () => {
    const mockChain = createMockChain([mockThread]);
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    render(<ThreadsScreen />);

    await waitFor(() => {
      expect(mockChain.eq).toHaveBeenCalledWith('is_archived', false);
    });
  });

  it('should order threads by updated_at descending', async () => {
    const mockChain = createMockChain([mockThread]);
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    render(<ThreadsScreen />);

    await waitFor(() => {
      expect(mockChain.order).toHaveBeenCalledWith('updated_at', {
        ascending: false,
      });
    });
  });

  it('should display thread avatar with first letter', async () => {
    const { getByText, queryByTestId } = render(<ThreadsScreen />);

    await waitFor(() => {
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    expect(getByText('G')).toBeTruthy(); // First letter of "General Discussion"
    expect(getByText('S')).toBeTruthy(); // First letter of "Support Requests"
  });
});
