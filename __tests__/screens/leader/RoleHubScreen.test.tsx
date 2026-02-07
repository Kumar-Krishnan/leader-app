import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import LeaderResourcesScreen from '../../../src/screens/leader/LeaderResourcesScreen';

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
  role: 'leader' as const,
  memberId: 'member-id',
};

// Mock group context - leaders can approve requests
let mockGroupContext = {
  currentGroup: mockGroup,
  groups: [mockGroup],
  setCurrentGroup: jest.fn(),
  isGroupAdmin: false,
  canApproveRequests: true,
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
  isLeader: true,
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

describe('LeaderResourcesScreen (Leader Hub)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedVisibility = undefined;

    // Reset to leader context
    mockGroupContext = {
      currentGroup: mockGroup,
      groups: [mockGroup],
      setCurrentGroup: jest.fn(),
      isGroupAdmin: false,
      canApproveRequests: true,
      pendingRequests: [],
      refreshPendingRequests: jest.fn(),
    };
  });

  describe('Display', () => {
    it('shows "Leader Hub" title', async () => {
      const { getByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(getByText('Leader Hub')).toBeTruthy();
      });
    });

    it('shows "Resources for leaders only" subtitle', async () => {
      const { getByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(getByText('Resources for leaders only')).toBeTruthy();
      });
    });
  });

  describe('Leader Capabilities', () => {
    it('shows add button for leaders', async () => {
      const { getByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(getByText('+ Add')).toBeTruthy();
      });
    });

    it('shows folder button for leaders', async () => {
      const { getAllByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        const folderIcons = getAllByText('📁');
        expect(folderIcons.length).toBeGreaterThan(0);
      });
    });

    it('does not show add button when user cannot approve requests', async () => {
      mockGroupContext.canApproveRequests = false;

      const { queryByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(queryByText('+ Add')).toBeNull();
      });
    });
  });

  describe('Visibility Filter', () => {
    it('passes leaders_only visibility to useResources', async () => {
      render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(capturedVisibility).toBe('leaders_only');
      });
    });
  });

  describe('Empty State', () => {
    it('shows leader-specific empty message', async () => {
      const { getByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(getByText('No leader resources yet')).toBeTruthy();
      });
    });

    it('shows star icon in empty state', async () => {
      const { getByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(getByText('⭐')).toBeTruthy();
      });
    });

    it('shows "Add Resource" button in empty state for leaders', async () => {
      const { getByText } = render(<LeaderResourcesScreen />);

      await waitFor(() => {
        expect(getByText('Add Resource')).toBeTruthy();
      });
    });
  });
});
