import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useResources } from '../../src/hooks/useResources';
import { supabase } from '../../src/lib/supabase';
import { storage } from '../../src/lib/storage';

// Mock Supabase
jest.mock('../../src/lib/supabase');

// Mock storage
jest.mock('../../src/lib/storage', () => ({
  storage: {
    upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
    delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
    getDownloadUrl: jest.fn().mockResolvedValue({ url: 'https://example.com/file.pdf', error: null }),
  },
  RESOURCES_BUCKET: 'resources',
  generateFilePath: jest.fn((groupId, filename) => `${groupId}/${filename}`),
}));

// Mock data
const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
};

const mockGroup = {
  id: 'group-id',
  name: 'Test Group',
};

const mockFolder = {
  id: 'folder-1',
  name: 'Documents',
  group_id: 'group-id',
  parent_id: null,
  created_by: 'user-id',
  created_at: new Date().toISOString(),
};

const mockResource = {
  id: 'resource-1',
  title: 'Study Guide',
  type: 'document',
  group_id: 'group-id',
  folder_id: null,
  file_path: 'group-id/study-guide.pdf',
  url: null,
  created_at: new Date().toISOString(),
};

// Mock auth context
let mockAuthContext = { user: mockUser };
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock group context
let mockGroupContext: any = { currentGroup: mockGroup };
jest.mock('../../src/contexts/GroupContext', () => ({
  useGroup: () => mockGroupContext,
}));

// Helper to create mock chain for a single query
const createMockChain = (data: any, error: any = null) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data: [], error: null }),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
    insert: jest.fn().mockResolvedValue({ data, error }),
    upsert: jest.fn().mockResolvedValue({ data, error }),
  };
  // delete() returns a new chain where eq() resolves (for delete().eq(id) pattern)
  chain.delete = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
  });
  return chain;
};

// Default mock implementation that handles all tables fetchContents() needs
const getDefaultMock = (overrides: Record<string, any> = {}) => {
  return (table: string) => {
    // Check for test-specific overrides first
    if (overrides[table]) {
      return overrides[table];
    }
    // Default implementations for all tables
    if (table === 'resource_folders') {
      return createMockChain([mockFolder]);
    }
    if (table === 'resources') {
      return createMockChain([mockResource]);
    }
    if (table === 'resource_group_shares' || table === 'resource_folder_group_shares') {
      return createMockChain([]);
    }
    if (table === 'groups') {
      return createMockChain([]);
    }
    return createMockChain([]);
  };
};

describe('useResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext = { user: mockUser };
    mockGroupContext = { currentGroup: mockGroup };

    // Default mock that handles all tables fetchContents() queries
    (supabase.from as jest.Mock).mockImplementation(getDefaultMock());
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => useResources());
    expect(result.current.loading).toBe(true);
    expect(result.current.folders).toEqual([]);
    expect(result.current.resources).toEqual([]);
  });

  it('should fetch folders and resources on mount', async () => {
    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify no error occurred
    expect(result.current.error).toBeNull();

    // Verify data was fetched correctly
    expect(result.current.folders).toHaveLength(1);
    expect(result.current.folders[0].name).toBe('Documents');
    expect(result.current.resources).toHaveLength(1);
    expect(result.current.resources[0].title).toBe('Study Guide');
  });

  it('should return empty when no group selected', async () => {
    mockGroupContext.currentGroup = null;

    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.folders).toEqual([]);
    expect(result.current.resources).toEqual([]);
  });

  it('should navigate into folder', async () => {
    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.openFolder(mockFolder);
    });

    expect(result.current.currentFolderId).toBe('folder-1');
    expect(result.current.folderPath).toHaveLength(1);
    expect(result.current.folderPath[0].name).toBe('Documents');
  });

  it('should go back to parent folder', async () => {
    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.openFolder(mockFolder);
    });

    expect(result.current.currentFolderId).toBe('folder-1');

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentFolderId).toBeNull();
    expect(result.current.folderPath).toHaveLength(0);
  });

  it('should go to root folder', async () => {
    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.openFolder(mockFolder);
    });

    act(() => {
      result.current.goToRoot();
    });

    expect(result.current.currentFolderId).toBeNull();
    expect(result.current.folderPath).toHaveLength(0);
  });

  it('should create folder successfully', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
      resource_folders: { ...createMockChain([mockFolder]), insert: mockInsert },
    }));

    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.createFolder('New Folder');
    });

    expect(success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('should delete folder successfully', async () => {
    // Use default mock - delete operation is tested by verifying success
    // The delete chain is: from().delete().eq() which the default mock handles
    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify folder exists before delete
    expect(result.current.folders).toHaveLength(1);

    let success;
    await act(async () => {
      success = await result.current.deleteFolder('folder-1');
    });

    expect(success).toBe(true);
    // Folder should be removed from local state
    expect(result.current.folders).toHaveLength(0);
  });

  it('should create link resource successfully', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
      resources: { ...createMockChain([mockResource]), insert: mockInsert },
    }));

    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.createLinkResource('Google', 'https://google.com');
    });

    expect(success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('should get download URL for file', async () => {
    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let url;
    await act(async () => {
      url = await result.current.getResourceUrl('group-id/file.pdf');
    });

    expect(url).toBe('https://example.com/file.pdf');
    expect(storage.getDownloadUrl).toHaveBeenCalled();
  });

  it('should set error on fetch failure', async () => {
    (supabase.from as jest.Mock).mockImplementation(() =>
      createMockChain(null, new Error('Network error'))
    );

    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unable to connect. Please check your internet connection.');
  });

  describe('Resource Sharing', () => {
    const mockOtherGroups = [
      { id: 'other-group-1', name: 'Other Group 1' },
      { id: 'other-group-2', name: 'Other Group 2' },
    ];

    const mockShareData = [
      {
        shared_with_group_id: 'other-group-1',
        shared_at: '2024-01-01T00:00:00Z',
        group: { id: 'other-group-1', name: 'Other Group 1' }
      },
    ];

    beforeEach(() => {
      // Add groups to mock context for sharing
      mockGroupContext = {
        currentGroup: mockGroup,
        groups: [
          { ...mockGroup, role: 'leader' },
          { id: 'other-group-1', name: 'Other Group 1', role: 'leader' },
          { id: 'other-group-2', name: 'Other Group 2', role: 'member' },
        ],
      };
    });

    it('should share resource with groups', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        resource_group_shares: { ...createMockChain([]), upsert: mockUpsert },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.shareResource('resource-1', ['other-group-1']);
      });

      expect(success).toBe(true);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should unshare resource from groups', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ data: {}, error: null });

      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        resource_group_shares: {
          ...createMockChain([]),
          delete: mockDelete,
          eq: jest.fn().mockReturnValue({ eq: mockEq2 }),
        },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.unshareResource('resource-1', ['other-group-1']);
      });

      expect(success).toBe(true);
    });

    it('should share folder with groups', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        resource_folder_group_shares: { ...createMockChain([]), upsert: mockUpsert },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.shareFolder('folder-1', ['other-group-1', 'other-group-2']);
      });

      expect(success).toBe(true);
    });

    it('should unshare folder from groups', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ data: {}, error: null });

      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        resource_folder_group_shares: {
          ...createMockChain([]),
          delete: mockDelete,
          eq: jest.fn().mockReturnValue({ eq: mockEq2 }),
        },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.unshareFolder('folder-1', ['other-group-1']);
      });

      expect(success).toBe(true);
    });

    it('should get resource shares', async () => {
      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        resource_group_shares: {
          ...createMockChain([]),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockShareData, error: null }),
        },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let shares;
      await act(async () => {
        shares = await result.current.getResourceShares('resource-1');
      });

      expect(shares).toHaveLength(1);
      expect(shares[0].groupId).toBe('other-group-1');
      expect(shares[0].groupName).toBe('Other Group 1');
    });

    it('should get folder shares', async () => {
      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        resource_folder_group_shares: {
          ...createMockChain([]),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockShareData, error: null }),
        },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let shares;
      await act(async () => {
        shares = await result.current.getFolderShares('folder-1');
      });

      expect(shares).toHaveLength(1);
      expect(shares[0].groupId).toBe('other-group-1');
    });

    it('should get shareable groups (all groups except current)', async () => {
      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        groups: {
          select: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockOtherGroups,
            error: null
          }),
        },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let groups;
      await act(async () => {
        groups = await result.current.getShareableGroups();
      });

      expect(groups).toHaveLength(2);
      expect(groups[0].name).toBe('Other Group 1');
    });

    it('should return empty shareable groups when no current group', async () => {
      mockGroupContext.currentGroup = null;

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let groups;
      await act(async () => {
        groups = await result.current.getShareableGroups();
      });

      expect(groups).toEqual([]);
    });

    it('should handle share error gracefully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Share failed')
      });

      (supabase.from as jest.Mock).mockImplementation(getDefaultMock({
        resource_group_shares: { ...createMockChain([]), upsert: mockUpsert },
      }));

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.shareResource('resource-1', ['other-group-1']);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Something went wrong. Please try again.');
    });

    it('should return false when sharing without authentication', async () => {
      mockAuthContext = { user: null };

      const { result } = renderHook(() => useResources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success;
      await act(async () => {
        success = await result.current.shareResource('resource-1', ['other-group-1']);
      });

      expect(success).toBe(false);
    });
  });
});

