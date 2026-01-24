/**
 * useResources Hook Mock
 *
 * Complete mock implementation for useResources
 */
import type { ResourceFolder } from '../../src/types/database';
import type {
  UseResourcesResult,
  ResourceWithSharing,
  ResourceFolderWithSharing,
  ShareInfo,
} from '../../src/hooks/useResources';
import { createMockResource, createMockResourceFolder } from '../factories/resources';

/**
 * Create a mock useResources return value
 */
export function createMockUseResources(
  overrides: Partial<UseResourcesResult> = {}
): UseResourcesResult {
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
    refetch: jest.fn().mockResolvedValue(undefined),
    createFolder: jest.fn().mockResolvedValue(true),
    uploadFileResource: jest.fn().mockResolvedValue(true),
    createLinkResource: jest.fn().mockResolvedValue(true),
    deleteFolder: jest.fn().mockResolvedValue(true),
    deleteResource: jest.fn().mockResolvedValue(true),
    getResourceUrl: jest.fn().mockResolvedValue('https://example.com/file.pdf'),
    shareResource: jest.fn().mockResolvedValue(true),
    unshareResource: jest.fn().mockResolvedValue(true),
    shareFolder: jest.fn().mockResolvedValue(true),
    unshareFolder: jest.fn().mockResolvedValue(true),
    getResourceShares: jest.fn().mockResolvedValue([]),
    getFolderShares: jest.fn().mockResolvedValue([]),
    getShareableGroups: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

/**
 * Preset: Loading state
 */
export function createMockUseResourcesLoading(): UseResourcesResult {
  return createMockUseResources({
    loading: true,
    folders: [],
    resources: [],
  });
}

/**
 * Preset: Uploading state
 */
export function createMockUseResourcesUploading(): UseResourcesResult {
  return createMockUseResources({
    uploading: true,
  });
}

/**
 * Preset: Error state
 */
export function createMockUseResourcesError(errorMessage: string = 'Failed to load resources'): UseResourcesResult {
  return createMockUseResources({
    error: errorMessage,
    loading: false,
    folders: [],
    resources: [],
  });
}

/**
 * Preset: With resources and folders
 */
export function createMockUseResourcesWithData(
  resources: ResourceWithSharing[] = [createMockResource() as ResourceWithSharing],
  folders: ResourceFolderWithSharing[] = [createMockResourceFolder() as ResourceFolderWithSharing]
): UseResourcesResult {
  return createMockUseResources({
    resources,
    folders,
  });
}

/**
 * Preset: Empty state
 */
export function createMockUseResourcesEmpty(): UseResourcesResult {
  return createMockUseResources({
    folders: [],
    resources: [],
    loading: false,
    error: null,
  });
}

/**
 * Preset: Inside a folder
 */
export function createMockUseResourcesInFolder(
  folderId: string = 'folder-1',
  folderName: string = 'Documents'
): UseResourcesResult {
  const folder = createMockResourceFolder({ id: folderId, name: folderName });
  return createMockUseResources({
    currentFolderId: folderId,
    folderPath: [folder],
  });
}

/**
 * Preset: With shareable groups
 */
export function createMockUseResourcesWithShareableGroups(): UseResourcesResult {
  return createMockUseResources({
    getShareableGroups: jest.fn().mockResolvedValue([
      { id: 'group-1', name: 'Group One' },
      { id: 'group-2', name: 'Group Two' },
      { id: 'group-3', name: 'Group Three' },
    ]),
  });
}

/**
 * Create mocks with spy functions for verification
 */
export function createMockUseResourcesWithSpies() {
  const spies = {
    openFolder: jest.fn(),
    goBack: jest.fn(),
    goToRoot: jest.fn(),
    refetch: jest.fn().mockResolvedValue(undefined),
    createFolder: jest.fn().mockResolvedValue(true),
    uploadFileResource: jest.fn().mockResolvedValue(true),
    createLinkResource: jest.fn().mockResolvedValue(true),
    deleteFolder: jest.fn().mockResolvedValue(true),
    deleteResource: jest.fn().mockResolvedValue(true),
    getResourceUrl: jest.fn().mockResolvedValue('https://example.com/file.pdf'),
    shareResource: jest.fn().mockResolvedValue(true),
    unshareResource: jest.fn().mockResolvedValue(true),
    shareFolder: jest.fn().mockResolvedValue(true),
    unshareFolder: jest.fn().mockResolvedValue(true),
    getResourceShares: jest.fn().mockResolvedValue([]),
    getFolderShares: jest.fn().mockResolvedValue([]),
    getShareableGroups: jest.fn().mockResolvedValue([]),
  };

  const mock = createMockUseResources(spies);

  return { mock, spies };
}

/**
 * Reset all mock functions in a useResources mock
 */
export function resetUseResourcesMock(mock: UseResourcesResult): void {
  const mockFunctions = [
    'openFolder', 'goBack', 'goToRoot', 'refetch', 'createFolder',
    'uploadFileResource', 'createLinkResource', 'deleteFolder', 'deleteResource',
    'getResourceUrl', 'shareResource', 'unshareResource', 'shareFolder',
    'unshareFolder', 'getResourceShares', 'getFolderShares', 'getShareableGroups',
  ] as const;

  mockFunctions.forEach(fn => {
    if (jest.isMockFunction(mock[fn])) {
      (mock[fn] as jest.Mock).mockClear();
    }
  });
}
