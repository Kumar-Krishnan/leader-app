import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateThreadModal from '../../src/components/CreateThreadModal';

// Mock data
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
const mockGroup = { id: 'test-group-id', name: 'Test Group' };

// Create mock Supabase
const mockFrom = jest.fn();
const mockSupabaseInstance = {
  from: mockFrom,
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    }),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock('../../src/lib/supabase', () => ({
  get supabase() { return mockSupabaseInstance; },
  isSupabaseConfigured: true,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock contexts
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => ({ currentGroup: mockGroup, loading: false }),
}));

describe('CreateThreadModal', () => {
  const mockOnClose = jest.fn();
  const mockOnCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    expect(getByText('New Thread')).toBeTruthy();
    expect(getByText('Thread Name')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <CreateThreadModal
        visible={false}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    expect(queryByText('New Thread')).toBeNull();
  });

  it('should show error when submitting with empty name', async () => {
    const { getByText } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    const createButton = getByText('Create Thread');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Please enter a thread name')).toBeTruthy();
    });
  });

  it('should call supabase to create thread with valid input', async () => {
    const mockInsert = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: { id: 'new-thread-id', name: 'Test Thread' },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'threads') {
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        };
      }
      if (table === 'thread_members') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { insert: jest.fn(), select: jest.fn() };
    });

    const { getByText, getByPlaceholderText } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    const input = getByPlaceholderText('e.g., Bible Study Group');
    fireEvent.changeText(input, 'Test Thread');

    const createButton = getByText('Create Thread');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Test Thread',
        group_id: 'test-group-id',
        created_by: 'test-user-id',
        is_archived: false,
      });
    });

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should add creator as thread member', async () => {
    const mockThreadInsert = jest.fn().mockResolvedValue({
      data: { id: 'new-thread-id', name: 'Test Thread' },
      error: null,
    });

    const mockMemberInsert = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'threads') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: mockThreadInsert,
        };
      }
      if (table === 'thread_members') {
        return {
          insert: mockMemberInsert,
        };
      }
      return {};
    });

    const { getByText, getByPlaceholderText } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    const input = getByPlaceholderText('e.g., Bible Study Group');
    fireEvent.changeText(input, 'Test Thread');

    const createButton = getByText('Create Thread');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockMemberInsert).toHaveBeenCalledWith({
        thread_id: 'new-thread-id',
        user_id: 'test-user-id',
      });
    });
  });

  it('should show error message on creation failure', async () => {
    mockFrom.mockImplementation(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    }));

    const { getByText, getByPlaceholderText } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    const input = getByPlaceholderText('e.g., Bible Study Group');
    fireEvent.changeText(input, 'Test Thread');

    const createButton = getByText('Create Thread');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Database error')).toBeTruthy();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
  });

  it('should call onClose when close button pressed', () => {
    const { getByText } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    const closeButton = getByText('✕');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should reset form on close', async () => {
    const { getByText, getByPlaceholderText, rerender } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    const input = getByPlaceholderText('e.g., Bible Study Group');
    fireEvent.changeText(input, 'Test Thread');

    const closeButton = getByText('✕');
    fireEvent.press(closeButton);

    // Reopen modal
    rerender(
      <CreateThreadModal
        visible={false}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    rerender(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    const reopenedInput = getByPlaceholderText('e.g., Bible Study Group');
    expect(reopenedInput.props.value).toBe('');
  });

  it('should display current group name in hint', () => {
    const { getByText } = render(
      <CreateThreadModal
        visible={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );

    expect(getByText(/This thread will be created in Test Group/)).toBeTruthy();
  });
});

