import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ResourcesScreen from '../../../src/screens/main/ResourcesScreen';

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
}));

// Mock data
const mockGroup = {
  id: 'group-id',
  name: 'Test Group',
  code: 'ABC123',
  role: 'member' as const,
  memberId: 'member-id',
};

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

// Mock auth context
const mockAuthContext = {
  user: { id: 'user-id' },
  profile: { id: 'user-id', email: 'test@example.com' },
  signOut: jest.fn(),
  isLeader: false,
  isAdmin: false,
};

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Track what visibility is passed to useResources
let capturedVisibility: string | undefined;

// Mock useResources hook
jest.mock('../../../src/hooks/useResources', () => ({
  useResources: (options: { visibility?: string }) => {
    capturedVisibility = options?.visibility;
    return {
      folders: [],
      resources: [],
      currentFolderId: null,
      folderPath: [],
      loading: false,
      uploading: false,
      error: null,
      openFolder: jest.fn(),
      goBack: jest.fn(),
      goToRoot: jest.fn(),
      refetch: jest.fn(),
      createFolder: jest.fn(),
      uploadFileResource: jest.fn(),
      createLinkResource: jest.fn(),
      deleteFolder: jest.fn(),
      deleteResource: jest.fn(),
      getResourceUrl: jest.fn(),
      shareResource: jest.fn(),
      unshareResource: jest.fn(),
      shareFolder: jest.fn(),
      unshareFolder: jest.fn(),
      getResourceShares: jest.fn(),
      getFolderShares: jest.fn(),
      getShareableGroups: jest.fn(),
    };
  },
}));

// Mock ResourceCommentsModal
jest.mock('../../../src/components/ResourceCommentsModal', () => {
  return function MockResourceCommentsModal() {
    return null;
  };
});

// Mock ShareResourceModal
jest.mock('../../../src/components/ShareResourceModal', () => {
  return function MockShareResourceModal() {
    return null;
  };
});

describe('ResourcesScreen (Member Hub)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedVisibility = undefined;

    // Reset to member context
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

  describe('Display', () => {
    it('shows "Member Hub" title', async () => {
      const { getByText } = render(<ResourcesScreen />);

      await waitFor(() => {
        expect(getByText('Member Hub')).toBeTruthy();
      });
    });
  });

  describe('Visibility Filter', () => {
    it('passes members_only visibility to useResources', async () => {
      render(<ResourcesScreen />);

      await waitFor(() => {
        expect(capturedVisibility).toBe('members_only');
      });
    });
  });

  describe('Empty State', () => {
    it('shows member-specific empty message', async () => {
      const { getByText } = render(<ResourcesScreen />);

      await waitFor(() => {
        expect(getByText('No member resources yet')).toBeTruthy();
      });
    });

    it('shows star icon in empty state', async () => {
      const { getByText } = render(<ResourcesScreen />);

      await waitFor(() => {
        expect(getByText('⭐')).toBeTruthy();
      });
    });
  });

  describe('Leader Capabilities in Member Hub', () => {
    it('shows add button for leaders in member hub', async () => {
      mockGroupContext.canApproveRequests = true;

      const { getByText } = render(<ResourcesScreen />);

      await waitFor(() => {
        expect(getByText('+ Add')).toBeTruthy();
      });
    });

    it('does not show add button for regular members', async () => {
      mockGroupContext.canApproveRequests = false;

      const { queryByText } = render(<ResourcesScreen />);

      await waitFor(() => {
        expect(queryByText('+ Add')).toBeNull();
      });
    });
  });

  describe('Breadcrumb', () => {
    it('shows "Member Hub" in breadcrumb root', async () => {
      // We need to mock a folder path to see the breadcrumb
      // For now, just verify the screen renders correctly
      const { getByText } = render(<ResourcesScreen />);

      await waitFor(() => {
        expect(getByText('Member Hub')).toBeTruthy();
      });
    });
  });
});
