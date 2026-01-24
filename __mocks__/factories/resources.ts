/**
 * Resource-related mock factories
 */
import type { Resource, ResourceFolder, ResourceComment, ResourceCommentWithUser } from '../../src/types/database';
import { createMockProfile } from './users';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Create a mock Resource
 */
export function createMockResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'test-resource-id',
    title: 'Test Resource',
    type: 'document',
    content: null,
    url: null,
    tags: [],
    visibility: 'all',
    group_id: 'test-group-id',
    folder_id: null,
    file_path: null,
    file_size: null,
    mime_type: null,
    shared_by: 'test-user-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock ResourceFolder
 */
export function createMockResourceFolder(overrides: Partial<ResourceFolder> = {}): ResourceFolder {
  return {
    id: 'test-folder-id',
    name: 'Test Folder',
    group_id: 'test-group-id',
    parent_id: null,
    created_by: 'test-user-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock ResourceComment
 */
export function createMockResourceComment(overrides: Partial<ResourceComment> = {}): ResourceComment {
  return {
    id: 'test-comment-id',
    resource_id: 'test-resource-id',
    folder_id: null,
    user_id: 'test-user-id',
    content: 'Test comment',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock ResourceCommentWithUser
 */
export function createMockResourceCommentWithUser(
  overrides: DeepPartial<ResourceCommentWithUser> = {}
): ResourceCommentWithUser {
  const { user, ...commentOverrides } = overrides;
  return {
    ...createMockResourceComment(commentOverrides as Partial<ResourceComment>),
    user: user ? createMockProfile(user) : createMockProfile(),
  };
}

/**
 * Preset: Link resource
 */
export function createMockLinkResource(overrides: Partial<Resource> = {}): Resource {
  return createMockResource({
    type: 'link',
    url: 'https://example.com/article',
    ...overrides,
  });
}

/**
 * Preset: Video resource
 */
export function createMockVideoResource(overrides: Partial<Resource> = {}): Resource {
  return createMockResource({
    type: 'video',
    url: 'https://youtube.com/watch?v=example',
    ...overrides,
  });
}

/**
 * Preset: Uploaded document resource
 */
export function createMockUploadedResource(overrides: Partial<Resource> = {}): Resource {
  return createMockResource({
    type: 'document',
    file_path: 'resources/test-group-id/document.pdf',
    file_size: 1024 * 500, // 500KB
    mime_type: 'application/pdf',
    ...overrides,
  });
}

/**
 * Preset: Leaders-only resource
 */
export function createMockLeadersOnlyResource(overrides: Partial<Resource> = {}): Resource {
  return createMockResource({
    visibility: 'leaders_only',
    title: 'Leaders Only Document',
    ...overrides,
  });
}

/**
 * Preset: Nested folder structure
 */
export function createMockFolderStructure(): {
  rootFolder: ResourceFolder;
  childFolder: ResourceFolder;
  resources: Resource[];
} {
  const rootFolder = createMockResourceFolder({
    id: 'root-folder-id',
    name: 'Documents',
  });

  const childFolder = createMockResourceFolder({
    id: 'child-folder-id',
    name: 'Archived',
    parent_id: rootFolder.id,
  });

  const resources = [
    createMockResource({ id: 'resource-1', title: 'Document 1', folder_id: rootFolder.id }),
    createMockResource({ id: 'resource-2', title: 'Document 2', folder_id: childFolder.id }),
    createMockResource({ id: 'resource-3', title: 'Root Document' }), // No folder
  ];

  return { rootFolder, childFolder, resources };
}

/**
 * Preset: Resource list for testing
 */
export function createMockResourceList(count: number = 5): Resource[] {
  const types: Resource['type'][] = ['document', 'link', 'video', 'other'];
  return Array.from({ length: count }, (_, i) =>
    createMockResource({
      id: `resource-${i + 1}`,
      title: `Resource ${i + 1}`,
      type: types[i % types.length],
    })
  );
}
