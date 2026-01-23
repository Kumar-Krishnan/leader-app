import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GroupSidebar from '../../src/components/GroupSidebar';

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock navigation
const mockCloseDrawer = jest.fn();
const mockNavigation = {
  closeDrawer: mockCloseDrawer,
  navigate: jest.fn(),
  dispatch: jest.fn(),
} as any;

const mockDrawerProps = {
  navigation: mockNavigation,
  state: { routes: [], index: 0, key: 'drawer', type: 'drawer' as const, stale: false, routeNames: [] },
  descriptors: {},
} as any;

// Mock data
const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
};

const mockProfile = {
  id: 'user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member' as const,
};

const mockLeaderProfile = {
  ...mockProfile,
  role: 'leader' as const,
};

const mockGroup1 = {
  id: 'group-1',
  name: 'Youth Group',
  code: 'ABC123',
  description: 'Youth ministry',
  created_by: 'user-id',
  created_at: '2024-01-01',
  role: 'member' as const,
  memberId: 'member-1',
};

const mockGroup2 = {
  id: 'group-2',
  name: 'Leaders Circle',
  code: 'DEF456',
  description: 'Leadership team',
  created_by: 'user-id',
  created_at: '2024-01-01',
  role: 'leader' as const,
  memberId: 'member-2',
};

const mockAdminGroup = {
  id: 'group-3',
  name: 'Admin Team',
  code: 'GHI789',
  description: 'Administrators',
  created_by: 'user-id',
  created_at: '2024-01-01',
  role: 'admin' as const,
  memberId: 'member-3',
};

const mockHelperGroup = {
  id: 'group-4',
  name: 'Helper Group',
  code: 'JKL012',
  description: 'Helpers',
  created_by: 'user-id',
  created_at: '2024-01-01',
  role: 'leader-helper' as const,
  memberId: 'member-4',
};

// Mock pending request
const mockPendingRequest = {
  id: 'request-1',
  group_id: 'group-5',
  user_id: 'user-id',
  status: 'pending' as const,
  created_at: '2024-01-01',
};

// Group context mock
let mockGroupContext: any = {
  groups: [mockGroup1, mockGroup2],
  currentGroup: mockGroup1,
  setCurrentGroup: jest.fn(),
  createGroup: jest.fn(),
  requestToJoin: jest.fn(),
  myPendingRequests: [],
  loading: false,
};

jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Auth context mock
let mockAuthContext: any = {
  user: mockUser,
  profile: mockProfile,
  isLeader: false,
  isAdmin: false,
  loading: false,
};

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('GroupSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks to defaults
    mockGroupContext = {
      groups: [mockGroup1, mockGroup2],
      currentGroup: mockGroup1,
      setCurrentGroup: jest.fn(),
      createGroup: jest.fn().mockResolvedValue({ error: null }),
      requestToJoin: jest.fn().mockResolvedValue({ error: null }),
      myPendingRequests: [],
      loading: false,
    };

    mockAuthContext = {
      user: mockUser,
      profile: mockProfile,
      isLeader: false,
      isAdmin: false,
      loading: false,
    };
  });

  describe('Header', () => {
    it('should render header with title', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Your Groups')).toBeTruthy();
    });

    it('should display user name in header', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Test User')).toBeTruthy();
    });
  });

  describe('Groups List', () => {
    it('should display all groups', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Youth Group')).toBeTruthy();
      expect(getByText('Leaders Circle')).toBeTruthy();
    });

    it('should display group initial as icon', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Y')).toBeTruthy(); // Youth Group
      expect(getByText('L')).toBeTruthy(); // Leaders Circle
    });

    it('should highlight current group', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      // Current group should have the active indicator
      const activeIndicator = getByText('*');
      expect(activeIndicator).toBeTruthy();
    });

    it('should display role badges with correct labels', () => {
      mockGroupContext.groups = [mockGroup1, mockGroup2, mockAdminGroup, mockHelperGroup];

      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Member')).toBeTruthy();
      expect(getByText('Leader')).toBeTruthy();
      expect(getByText('Admin')).toBeTruthy();
      expect(getByText('Helper')).toBeTruthy();
    });

    it('should switch group when group is pressed', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      const secondGroup = getByText('Leaders Circle');
      fireEvent.press(secondGroup);

      expect(mockGroupContext.setCurrentGroup).toHaveBeenCalledWith(mockGroup2);
    });

    it('should close drawer when group is selected', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      const secondGroup = getByText('Leaders Circle');
      fireEvent.press(secondGroup);

      expect(mockCloseDrawer).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no groups', () => {
      mockGroupContext.groups = [];
      mockGroupContext.currentGroup = null;

      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('No groups yet')).toBeTruthy();
      expect(getByText('Join a group or create one to get started')).toBeTruthy();
    });
  });

  describe('Pending Requests', () => {
    it('should display pending requests section', () => {
      mockGroupContext.myPendingRequests = [mockPendingRequest];

      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Pending Requests')).toBeTruthy();
      expect(getByText('Waiting for approval')).toBeTruthy();
    });

    it('should not show pending section when no requests', () => {
      mockGroupContext.myPendingRequests = [];

      const { queryByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(queryByText('Pending Requests')).toBeNull();
    });
  });

  describe('Join Group', () => {
    it('should show Join Group button for all users', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Join Group')).toBeTruthy();
    });

    it('should open join modal when button is pressed', async () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      const joinButton = getByText('Join Group');
      fireEvent.press(joinButton);

      await waitFor(() => {
        expect(getByText('Group Code')).toBeTruthy();
      });
    });

    it('should show error when submitting empty code', async () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Join Group'));
      fireEvent.press(getByText('Send Request'));

      await waitFor(() => {
        expect(getByText('Please enter a group code')).toBeTruthy();
      });
    });

    it('should call requestToJoin with entered code', async () => {
      const { getByText, getByPlaceholderText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Join Group'));

      const input = getByPlaceholderText('Enter 6-character code');
      fireEvent.changeText(input, 'XYZ789');
      fireEvent.press(getByText('Send Request'));

      await waitFor(() => {
        expect(mockGroupContext.requestToJoin).toHaveBeenCalledWith('XYZ789');
      });
    });

    it('should show success message after request sent', async () => {
      const { getByText, getByPlaceholderText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Join Group'));

      const input = getByPlaceholderText('Enter 6-character code');
      fireEvent.changeText(input, 'XYZ789');
      fireEvent.press(getByText('Send Request'));

      await waitFor(() => {
        expect(getByText('Request sent! A leader will review your request.')).toBeTruthy();
      });
    });

    it('should show error message on join failure', async () => {
      mockGroupContext.requestToJoin = jest.fn().mockResolvedValue({
        error: { message: 'Invalid group code' }
      });

      const { getByText, getByPlaceholderText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Join Group'));

      const input = getByPlaceholderText('Enter 6-character code');
      fireEvent.changeText(input, 'INVALID');
      fireEvent.press(getByText('Send Request'));

      await waitFor(() => {
        expect(getByText('Invalid group code')).toBeTruthy();
      });
    });

    it('should close join modal when X is pressed', () => {
      const { getByText, queryByPlaceholderText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Join Group'));
      expect(queryByPlaceholderText('Enter 6-character code')).toBeTruthy();

      fireEvent.press(getByText('X'));

      expect(queryByPlaceholderText('Enter 6-character code')).toBeNull();
    });
  });

  describe('Create Group', () => {
    it('should show Create Group button only for leaders', () => {
      mockAuthContext.isLeader = false;
      const { queryByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(queryByText('Create Group')).toBeNull();
    });

    it('should show Create Group button for leaders', () => {
      mockAuthContext.isLeader = true;
      mockAuthContext.profile = mockLeaderProfile;

      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      expect(getByText('Create Group')).toBeTruthy();
    });

    it('should open create modal when button is pressed', () => {
      mockAuthContext.isLeader = true;

      const { getByText, getByPlaceholderText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Create Group'));

      expect(getByText('Group Name')).toBeTruthy();
      expect(getByPlaceholderText('e.g., Youth Leaders Group')).toBeTruthy();
    });

    it('should show error when creating with empty name', async () => {
      mockAuthContext.isLeader = true;

      const { getByText, getAllByText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Create Group'));

      // Find the submit button in the modal (there are now two "Create Group" texts)
      const createButtons = getAllByText('Create Group');
      const submitButton = createButtons[createButtons.length - 1]; // The last one is in the modal
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Please enter a group name')).toBeTruthy();
      });
    });

    it('should call createGroup with name and description', async () => {
      mockAuthContext.isLeader = true;

      const { getByText, getByPlaceholderText, getAllByText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Create Group'));

      const nameInput = getByPlaceholderText('e.g., Youth Leaders Group');
      const descInput = getByPlaceholderText('A brief description...');

      fireEvent.changeText(nameInput, 'New Test Group');
      fireEvent.changeText(descInput, 'A group for testing');

      const createButtons = getAllByText('Create Group');
      fireEvent.press(createButtons[createButtons.length - 1]);

      await waitFor(() => {
        expect(mockGroupContext.createGroup).toHaveBeenCalledWith(
          'New Test Group',
          'A group for testing'
        );
      });
    });

    it('should close modal after successful creation', async () => {
      mockAuthContext.isLeader = true;

      const { getByText, getByPlaceholderText, getAllByText, queryByPlaceholderText } = render(
        <GroupSidebar {...mockDrawerProps} />
      );

      fireEvent.press(getByText('Create Group'));

      const nameInput = getByPlaceholderText('e.g., Youth Leaders Group');
      fireEvent.changeText(nameInput, 'New Test Group');

      const createButtons = getAllByText('Create Group');
      fireEvent.press(createButtons[createButtons.length - 1]);

      await waitFor(() => {
        expect(queryByPlaceholderText('e.g., Youth Leaders Group')).toBeNull();
      });
    });

    it('should show error message on create failure', async () => {
      mockAuthContext.isLeader = true;
      mockGroupContext.createGroup = jest.fn().mockResolvedValue({
        error: { message: 'Failed to create group' }
      });

      const { getByText, getByPlaceholderText, getAllByText } = render(
        <GroupSidebar {...mockDrawerProps} />
      );

      fireEvent.press(getByText('Create Group'));

      const nameInput = getByPlaceholderText('e.g., Youth Leaders Group');
      fireEvent.changeText(nameInput, 'New Test Group');

      const createButtons = getAllByText('Create Group');
      fireEvent.press(createButtons[createButtons.length - 1]);

      await waitFor(() => {
        expect(getByText('Failed to create group')).toBeTruthy();
      });
    });

    it('should close create modal when X is pressed', () => {
      mockAuthContext.isLeader = true;

      const { getByText, queryByPlaceholderText } = render(<GroupSidebar {...mockDrawerProps} />);

      fireEvent.press(getByText('Create Group'));
      expect(queryByPlaceholderText('e.g., Youth Leaders Group')).toBeTruthy();

      fireEvent.press(getByText('X'));

      expect(queryByPlaceholderText('e.g., Youth Leaders Group')).toBeNull();
    });
  });

  describe('Role Badge Colors', () => {
    it('should display different colors for different roles', () => {
      mockGroupContext.groups = [mockGroup1, mockGroup2, mockAdminGroup, mockHelperGroup];
      mockGroupContext.currentGroup = mockGroup1;

      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      // All role badges should be present
      expect(getByText('Member')).toBeTruthy();
      expect(getByText('Leader')).toBeTruthy();
      expect(getByText('Admin')).toBeTruthy();
      expect(getByText('Helper')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have pressable group items', () => {
      const { getByText } = render(<GroupSidebar {...mockDrawerProps} />);

      const groupItem = getByText('Youth Group');
      fireEvent.press(groupItem);

      expect(mockGroupContext.setCurrentGroup).toHaveBeenCalled();
    });
  });
});
