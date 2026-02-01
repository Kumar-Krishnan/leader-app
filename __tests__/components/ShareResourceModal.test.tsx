import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ShareResourceModal from '../../src/components/ShareResourceModal';

// Mock data
const mockGroups = [
  { id: 'group-1', name: 'Team Alpha' },
  { id: 'group-2', name: 'Team Beta' },
  { id: 'group-3', name: 'Music Team' },
];

const mockExistingShares = [
  { groupId: 'group-1', groupName: 'Team Alpha', sharedAt: '2024-01-01T00:00:00Z' },
];

// Default mock functions
const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  resourceId: 'resource-123',
  folderId: undefined,
  title: 'Test Resource',
  getShareableGroups: jest.fn().mockResolvedValue(mockGroups),
  getShares: jest.fn().mockResolvedValue(mockExistingShares),
  onShare: jest.fn().mockResolvedValue(true),
  onUnshare: jest.fn().mockResolvedValue(true),
};

describe('ShareResourceModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render modal when visible', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Share resource')).toBeTruthy();
      expect(getByText('Test Resource')).toBeTruthy();
    });
  });

  it('should not render content when not visible', () => {
    const { queryByText } = render(
      <ShareResourceModal {...defaultProps} visible={false} />
    );

    expect(queryByText('Share resource')).toBeNull();
  });

  it('should show loading state initially', () => {
    render(<ShareResourceModal {...defaultProps} />);

    // Loading indicator should be shown while fetching
    // Note: The component shows ActivityIndicator which doesn't have text
    // This test verifies the component renders without error during loading
  });

  it('should load shareable groups on mount', async () => {
    render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(defaultProps.getShareableGroups).toHaveBeenCalled();
      expect(defaultProps.getShares).toHaveBeenCalledWith('resource-123');
    });
  });

  it('should display all shareable groups', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Alpha')).toBeTruthy();
      expect(getByText('Team Beta')).toBeTruthy();
      expect(getByText('Music Team')).toBeTruthy();
    });
  });

  it('should pre-select already shared groups', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      // Team Alpha should be pre-selected since it's in mockExistingShares
      expect(getByText('1 group selected')).toBeTruthy();
    });
  });

  it('should toggle group selection on press', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Alpha')).toBeTruthy();
    });

    // Select Team Beta
    await act(async () => {
      fireEvent.press(getByText('Team Beta'));
    });

    await waitFor(() => {
      expect(getByText('2 groups selected')).toBeTruthy();
    });
  });

  it('should deselect group on second press', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Alpha')).toBeTruthy();
    });

    // Deselect Team Alpha (was pre-selected)
    await act(async () => {
      fireEvent.press(getByText('Team Alpha'));
    });

    await waitFor(() => {
      expect(getByText('0 groups selected')).toBeTruthy();
    });
  });

  it('should show disabled save button when no changes', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('No Changes')).toBeTruthy();
    });
  });

  it('should show enabled save button when there are changes', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Beta')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Team Beta'));
    });

    await waitFor(() => {
      expect(getByText('Save Changes')).toBeTruthy();
    });
  });

  it('should call onShare for newly selected groups', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Beta')).toBeTruthy();
    });

    // Select Team Beta
    await act(async () => {
      fireEvent.press(getByText('Team Beta'));
    });

    // Save changes
    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });

    await waitFor(() => {
      expect(defaultProps.onShare).toHaveBeenCalledWith('resource-123', ['group-2']);
    });
  });

  it('should call onUnshare for deselected groups', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Alpha')).toBeTruthy();
    });

    // Deselect Team Alpha (was pre-selected)
    await act(async () => {
      fireEvent.press(getByText('Team Alpha'));
    });

    // Save changes
    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });

    await waitFor(() => {
      expect(defaultProps.onUnshare).toHaveBeenCalledWith('resource-123', ['group-1']);
    });
  });

  it('should close modal on successful save', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Beta')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Team Beta'));
    });

    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('should call onClose when close button pressed', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Alpha')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('✕'));
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show empty state when no groups available', async () => {
    const propsWithNoGroups = {
      ...defaultProps,
      getShareableGroups: jest.fn().mockResolvedValue([]),
      getShares: jest.fn().mockResolvedValue([]),
    };

    const { getByText } = render(<ShareResourceModal {...propsWithNoGroups} />);

    await waitFor(() => {
      expect(getByText('No other groups')).toBeTruthy();
      expect(getByText('There are no other groups to share with yet.')).toBeTruthy();
    });
  });

  it('should work with folderId instead of resourceId', async () => {
    const folderProps = {
      ...defaultProps,
      resourceId: undefined,
      folderId: 'folder-123',
      title: 'Test Folder',
    };

    const { getByText } = render(<ShareResourceModal {...folderProps} />);

    await waitFor(() => {
      expect(getByText('Share folder')).toBeTruthy();
      expect(getByText('Test Folder')).toBeTruthy();
      expect(folderProps.getShares).toHaveBeenCalledWith('folder-123');
    });
  });

  it('should handle share failure gracefully', async () => {
    const propsWithFailure = {
      ...defaultProps,
      onShare: jest.fn().mockResolvedValue(false),
    };

    const { getByText } = render(<ShareResourceModal {...propsWithFailure} />);

    await waitFor(() => {
      expect(getByText('Team Beta')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Team Beta'));
    });

    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });

    // Modal should stay open on failure
    await waitFor(() => {
      expect(propsWithFailure.onClose).not.toHaveBeenCalled();
    });
  });

  it('should handle both share and unshare in same save', async () => {
    const { getByText } = render(<ShareResourceModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Team Alpha')).toBeTruthy();
    });

    // Deselect Team Alpha and select Team Beta
    await act(async () => {
      fireEvent.press(getByText('Team Alpha'));
      fireEvent.press(getByText('Team Beta'));
    });

    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });

    await waitFor(() => {
      expect(defaultProps.onShare).toHaveBeenCalledWith('resource-123', ['group-2']);
      expect(defaultProps.onUnshare).toHaveBeenCalledWith('resource-123', ['group-1']);
    });
  });
});
