import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../../src/screens/main/ProfileScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as any;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useFocusEffect: jest.fn((callback) => callback()),
}));

// Mock data
const mockProfile = {
  id: 'user-id',
  email: 'test@example.com',
  full_name: 'John Doe',
  role: 'user' as const,
  notification_preferences: {
    push_enabled: true,
    messages: true,
    meetings: true,
    resources: true,
  },
};

const mockGroup = {
  id: 'group-id',
  name: 'Test Group',
  code: 'ABC123',
  role: 'member' as const,
};

const mockLeaderGroup = {
  ...mockGroup,
  role: 'leader' as const,
};

const mockAdminGroup = {
  ...mockGroup,
  role: 'admin' as const,
};

// Mock auth context
let mockAuthContext = {
  profile: mockProfile,
  signOut: jest.fn(),
  isLeader: false,
  isAdmin: false,
};

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
let mockGroupContext = {
  currentGroup: mockGroup,
  groups: [mockGroup],
  setCurrentGroup: jest.fn(),
  isGroupAdmin: false,
  canApproveRequests: false,
  pendingRequests: [],
  refreshPendingRequests: jest.fn(),
};

jest.mock('../../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default mock data
    mockAuthContext = {
      profile: mockProfile,
      signOut: jest.fn(),
      isLeader: false,
      isAdmin: false,
    };
    
    mockGroupContext = {
      currentGroup: mockGroup,
      groups: [mockGroup],
      setCurrentGroup: jest.fn(),
      isGroupAdmin: false,
      canApproveRequests: false,
      pendingRequests: [],
      refreshPendingRequests: jest.fn(),
    };
  });

  it('should render profile information', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('should display avatar initials', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('JD')).toBeTruthy(); // Initials of "John Doe"
  });

  it('should show Member badge for regular users', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Member')).toBeTruthy();
  });

  it('should show Leader badge for leaders', () => {
    mockAuthContext.isLeader = true;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Leader')).toBeTruthy();
  });

  it('should show Admin badge for admins', () => {
    mockAuthContext.isAdmin = true;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Admin')).toBeTruthy();
  });

  it('should display current group information', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Current Group')).toBeTruthy();
    expect(getByText('Test Group')).toBeTruthy();
    expect(getByText('member')).toBeTruthy();
  });

  it('should show Switch button for group selection', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Switch')).toBeTruthy();
  });

  it('should open group picker when Switch is pressed', () => {
    const { getByText, queryByText } = render(<ProfileScreen />);

    // Modal should not be visible initially
    expect(queryByText('Switch Group')).toBeNull();

    const switchButton = getByText('Switch');
    fireEvent.press(switchButton);

    // Modal should be visible after pressing Switch
    expect(getByText('Switch Group')).toBeTruthy();
  });

  it('should show group join code for admins', () => {
    mockGroupContext.currentGroup = mockAdminGroup;
    mockGroupContext.isGroupAdmin = true;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Group Join Code:')).toBeTruthy();
    expect(getByText('ABC123')).toBeTruthy();
  });

  it('should not show group join code for non-admins', () => {
    const { queryByText } = render(<ProfileScreen />);

    expect(queryByText('Group Join Code:')).toBeNull();
    expect(queryByText('ABC123')).toBeNull();
  });

  it('should show Manage Members button when user can approve requests', () => {
    mockGroupContext.canApproveRequests = true;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Manage Members')).toBeTruthy();
  });

  it('should not show Manage Members button when user cannot approve requests', () => {
    mockGroupContext.canApproveRequests = false;

    const { queryByText } = render(<ProfileScreen />);

    expect(queryByText('Manage Members')).toBeNull();
  });

  it('should navigate to ManageMembers when button is pressed', () => {
    mockGroupContext.canApproveRequests = true;

    const { getByText } = render(<ProfileScreen />);

    const manageButton = getByText('Manage Members');
    fireEvent.press(manageButton);

    expect(mockNavigate).toHaveBeenCalledWith('ManageMembers');
  });

  it('should show pending requests badge', () => {
    mockGroupContext.canApproveRequests = true;
    mockGroupContext.pendingRequests = [
      { id: '1', user_id: 'user1' },
      { id: '2', user_id: 'user2' },
      { id: '3', user_id: 'user3' },
    ] as any;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('3')).toBeTruthy(); // Badge count
  });

  it('should display notifications section', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Push Notifications')).toBeTruthy();
  });

  it('should show enabled notification toggle', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Push Notifications')).toBeTruthy();
    expect(getByText('Message Alerts')).toBeTruthy();
    expect(getByText('Meeting Reminders')).toBeTruthy();
  });

  it('should toggle notifications when switch is pressed', () => {
    const { UNSAFE_getAllByType } = render(<ProfileScreen />);

    // Find the Switch component
    const switches = UNSAFE_getAllByType('RCTSwitch' as any);
    expect(switches.length).toBeGreaterThan(0);

    const notificationSwitch = switches[0];
    fireEvent(notificationSwitch, 'valueChange', false);

    // Value should be updated
    expect(notificationSwitch.props.value).toBe(false);
  });

  it('should show sign out button', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('should call signOut when button is pressed', async () => {
    mockAuthContext.signOut.mockResolvedValue({});

    const { getByText } = render(<ProfileScreen />);

    const signOutButton = getByText('Sign Out');
    fireEvent.press(signOutButton);

    await waitFor(() => {
      expect(mockAuthContext.signOut).toHaveBeenCalled();
    });
  });

  it('should handle user without full name', () => {
    mockAuthContext.profile = {
      ...mockProfile,
      full_name: '',
    };

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Unknown User')).toBeTruthy();
    expect(getByText('?')).toBeTruthy(); // Avatar fallback
  });

  it('should close group picker modal', () => {
    const { getByText, queryByText } = render(<ProfileScreen />);

    // Open modal
    const switchButton = getByText('Switch');
    fireEvent.press(switchButton);
    expect(getByText('Switch Group')).toBeTruthy();

    // Close modal
    const closeButton = getByText('✕');
    fireEvent.press(closeButton);

    // Modal should be closed
    expect(queryByText('Switch Group')).toBeNull();
  });

  it('should display multiple groups in picker', () => {
    mockGroupContext.groups = [
      mockGroup,
      { ...mockGroup, id: 'group-2', name: 'Second Group', role: 'admin' as const },
    ];

    const { getByText, getAllByText } = render(<ProfileScreen />);

    // Open modal
    const switchButton = getByText('Switch');
    fireEvent.press(switchButton);

    // Both groups should be visible (Test Group appears multiple times)
    expect(getAllByText('Test Group').length).toBeGreaterThan(0);
    expect(getByText('Second Group')).toBeTruthy();
  });

  it('should display groups in modal for selection', () => {
    const secondGroup = { 
      ...mockGroup, 
      id: 'group-2', 
      name: 'Second Group', 
      role: 'admin' as const 
    };

    mockGroupContext.groups = [mockGroup, secondGroup];

    const { getByText } = render(<ProfileScreen />);

    // Open modal
    const switchButton = getByText('Switch');
    fireEvent.press(switchButton);

    // Both groups should be visible in the modal
    expect(getByText('Switch Group')).toBeTruthy();
    expect(getByText('Second Group')).toBeTruthy();
  });

  it('should refresh pending requests on focus', () => {
    mockGroupContext.canApproveRequests = true;

    render(<ProfileScreen />);

    // useFocusEffect callback should have been called
    expect(mockGroupContext.refreshPendingRequests).toHaveBeenCalled();
  });
});

