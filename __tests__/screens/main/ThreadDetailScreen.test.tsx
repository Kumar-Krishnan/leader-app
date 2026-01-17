import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ThreadDetailScreen from '../../../src/screens/main/ThreadDetailScreen';

// Mock navigation
const mockSetOptions = jest.fn();
const mockRoute = {
  params: {
    threadId: 'thread-1',
    threadName: 'General Discussion',
  },
};

const mockNavigation = {
  setOptions: mockSetOptions,
  goBack: jest.fn(),
} as any;

// Mock data
const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
};

const mockSender = {
  id: 'sender-id',
  email: 'sender@example.com',
  full_name: 'John Doe',
  role: 'user' as const,
};

const mockMessage = {
  id: 'message-1',
  thread_id: 'thread-1',
  sender_id: 'sender-id',
  content: 'Hello everyone!',
  created_at: new Date().toISOString(),
  attachments: [],
  sender: mockSender,
};

const mockMyMessage = {
  id: 'message-2',
  thread_id: 'thread-1',
  sender_id: 'user-id',
  content: 'Hi there!',
  created_at: new Date().toISOString(),
  attachments: [],
  sender: {
    id: 'user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'user' as const,
  },
};

// Mock auth context
let mockAuthContext = {
  user: mockUser,
  profile: null,
  isLeader: false,
  isAdmin: false,
};

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock useMessages hook
let mockUseMessagesResult: any = {
  messages: [],
  loading: false,
  sending: false,
  error: null,
  refetch: jest.fn(),
  sendMessage: jest.fn().mockResolvedValue(true),
  editMessage: jest.fn().mockResolvedValue(true),
  deleteMessage: jest.fn().mockResolvedValue(true),
};

jest.mock('../../../src/hooks/useMessages', () => ({
  useMessages: () => mockUseMessagesResult,
}));

describe('ThreadDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default mock data
    mockAuthContext = {
      user: mockUser,
      profile: null,
      isLeader: false,
      isAdmin: false,
    };

    mockUseMessagesResult = {
      messages: [],
      loading: false,
      sending: false,
      error: null,
      refetch: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue(true),
      editMessage: jest.fn().mockResolvedValue(true),
      deleteMessage: jest.fn().mockResolvedValue(true),
    };
  });

  it('should render loading state when loading', () => {
    mockUseMessagesResult.loading = true;

    const { getByTestId } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );
    
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should set navigation title from route params', () => {
    render(<ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />);
    
    expect(mockSetOptions).toHaveBeenCalledWith({ title: 'General Discussion' });
  });

  it('should display messages after loading', () => {
    mockUseMessagesResult.messages = [mockMessage, mockMyMessage];

    const { getByText } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Hello everyone!')).toBeTruthy();
    expect(getByText('Hi there!')).toBeTruthy();
  });

  it('should display sender name for other users messages', () => {
    mockUseMessagesResult.messages = [mockMessage];

    const { getByText } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('John Doe')).toBeTruthy();
  });

  it('should display sender avatar with initials', () => {
    mockUseMessagesResult.messages = [mockMessage];

    const { getByText } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('JD')).toBeTruthy(); // Initials of "John Doe"
  });

  it('should show message input field', () => {
    const { getByPlaceholderText } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('Type a message...')).toBeTruthy();
  });

  it('should show send button when message is typed', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'New message');

    expect(getByTestId('send-button-text')).toBeTruthy();
  });

  it('should call sendMessage when send button is pressed', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'New message');

    const sendButton = getByTestId('send-button-text');
    fireEvent.press(sendButton.parent!);

    await waitFor(() => {
      expect(mockUseMessagesResult.sendMessage).toHaveBeenCalledWith('New message');
    });
  });

  it('should clear input after sending message', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'New message');

    const sendButton = getByTestId('send-button-text');
    fireEvent.press(sendButton.parent!);

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('should not send empty message', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, '   '); // Only whitespace

    // The send button should be disabled, but let's test the handler
    const sendButton = getByTestId('send-button-text');
    fireEvent.press(sendButton.parent!);

    expect(mockUseMessagesResult.sendMessage).not.toHaveBeenCalled();
  });

  it('should show edit and delete buttons for own messages', () => {
    mockUseMessagesResult.messages = [mockMyMessage];

    const { getByText } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });

  it('should not show edit and delete buttons for other users messages', () => {
    mockUseMessagesResult.messages = [mockMessage];

    const { queryByText, getByText } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Hello everyone!')).toBeTruthy();
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Delete')).toBeNull();
  });

  it('should display empty state when no messages', () => {
    mockUseMessagesResult.messages = [];

    const { getByText } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('No messages yet')).toBeTruthy();
    expect(getByText('Send the first message to start the conversation!')).toBeTruthy();
  });

  it('should show edit input when Edit is pressed', async () => {
    mockUseMessagesResult.messages = [mockMyMessage];

    const { getByText, getByDisplayValue } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Edit'));

    await waitFor(() => {
      expect(getByDisplayValue('Hi there!')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save')).toBeTruthy();
    });
  });

  it('should call editMessage when Save is pressed', async () => {
    mockUseMessagesResult.messages = [mockMyMessage];

    const { getByText, getByDisplayValue } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Edit'));

    await waitFor(() => {
      expect(getByDisplayValue('Hi there!')).toBeTruthy();
    });

    const editInput = getByDisplayValue('Hi there!');
    fireEvent.changeText(editInput, 'Updated message');
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockUseMessagesResult.editMessage).toHaveBeenCalledWith(
        'message-2',
        'Updated message'
      );
    });
  });

  it('should cancel edit when Cancel is pressed', async () => {
    mockUseMessagesResult.messages = [mockMyMessage];

    const { getByText, getByDisplayValue, queryByDisplayValue } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Edit'));

    await waitFor(() => {
      expect(getByDisplayValue('Hi there!')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancel'));

    await waitFor(() => {
      // Edit input should be gone
      expect(queryByDisplayValue('Hi there!')).toBeNull();
      // Original message should be visible
      expect(getByText('Hi there!')).toBeTruthy();
    });
  });

  it('should restore message if send fails', async () => {
    mockUseMessagesResult.sendMessage = jest.fn().mockResolvedValue(false);

    const { getByPlaceholderText, getByTestId } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Failed message');

    const sendButton = getByTestId('send-button-text');
    fireEvent.press(sendButton.parent!);

    await waitFor(() => {
      expect(input.props.value).toBe('Failed message');
    });
  });

  it('should show sending indicator when sending', () => {
    mockUseMessagesResult.sending = true;

    const { getByPlaceholderText, queryByTestId } = render(
      <ThreadDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Test');

    // When sending, send button text should not be visible (replaced by ActivityIndicator)
    expect(queryByTestId('send-button-text')).toBeNull();
  });
});
