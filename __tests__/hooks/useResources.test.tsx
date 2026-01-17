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

// Helper to create mock chain
const createMockChain = (data: any, error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data, error }),
  insert: jest.fn().mockResolvedValue({ data, error }),
  delete: jest.fn().mockReturnThis(),
});

describe('useResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext = { user: mockUser };
    mockGroupContext = { currentGroup: mockGroup };
    
    // Default: return folders and resources
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'resource_folders') {
        return createMockChain([mockFolder]);
      }
      return createMockChain([mockResource]);
    });
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
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'resource_folders') {
        return { ...createMockChain([mockFolder]), insert: mockInsert };
      }
      return createMockChain([mockResource]);
    });

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
    const mockDelete = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'resource_folders') {
        return { 
          ...createMockChain([mockFolder]), 
          delete: mockDelete,
          eq: mockEq,
        };
      }
      return createMockChain([mockResource]);
    });

    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteFolder('folder-1');
    });

    expect(success).toBe(true);
  });

  it('should create link resource successfully', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'resources') {
        return { ...createMockChain([mockResource]), insert: mockInsert };
      }
      return createMockChain([mockFolder]);
    });

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
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (supabase.from as jest.Mock).mockImplementation(() => 
      createMockChain(null, new Error('Network error'))
    );

    const { result } = renderHook(() => useResources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    consoleSpy.mockRestore();
  });
});

