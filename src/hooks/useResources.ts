import { useState, useEffect, useCallback } from 'react';
import * as resourcesRepo from '../repositories/resourcesRepo';
import { storage, RESOURCES_BUCKET, generateFilePath } from '../lib/storage';
import { Resource, ResourceFolder } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { useErrorHandler } from './useErrorHandler';
import { logger } from '../lib/logger';

/**
 * File to upload
 */
export interface FileToUpload {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

/**
 * Extended resource with sharing metadata
 */
export interface ResourceWithSharing extends Resource {
  isShared?: boolean;
  sourceGroupId?: string;
  sourceGroupName?: string;
  shareCount?: number;
}

/**
 * Extended folder with sharing metadata
 */
export interface ResourceFolderWithSharing extends ResourceFolder {
  isShared?: boolean;
  sourceGroupId?: string;
  sourceGroupName?: string;
  shareCount?: number;
}

/**
 * Share info for a resource or folder
 */
export interface ShareInfo {
  groupId: string;
  groupName: string;
  sharedAt: string;
}

/**
 * Options for the useResources hook
 */
export interface UseResourcesOptions {
  /** Filter resources by visibility.
   * - 'all': excludes leaders_only and members_only (general resources)
   * - 'leaders_only': only shows leaders_only resources (Leader Hub)
   * - 'members_only': only shows members_only resources (Member Hub)
   */
  visibility?: 'all' | 'leaders_only' | 'members_only';
}

/**
 * Return type for the useResources hook
 */
export interface UseResourcesResult {
  /** List of folders in the current folder */
  folders: ResourceFolderWithSharing[];
  /** List of resources in the current folder */
  resources: ResourceWithSharing[];
  /** Current folder ID (null for root) */
  currentFolderId: string | null;
  /** Navigation path of folders */
  folderPath: ResourceFolder[];
  /** Whether data is loading */
  loading: boolean;
  /** Whether an upload is in progress */
  uploading: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Navigate into a folder */
  openFolder: (folder: ResourceFolder) => void;
  /** Go back one level */
  goBack: () => void;
  /** Go to root folder */
  goToRoot: () => void;
  /** Refresh the current folder */
  refetch: () => Promise<void>;
  /** Create a new folder */
  createFolder: (name: string) => Promise<boolean>;
  /** Upload a file resource */
  uploadFileResource: (file: FileToUpload, title: string) => Promise<boolean>;
  /** Create a link resource */
  createLinkResource: (title: string, url: string) => Promise<boolean>;
  /** Delete a folder */
  deleteFolder: (folderId: string) => Promise<boolean>;
  /** Delete a resource */
  deleteResource: (resourceId: string, filePath?: string | null) => Promise<boolean>;
  /** Get download URL for a resource file */
  getResourceUrl: (filePath: string) => Promise<string | null>;
  /** Share a resource with groups */
  shareResource: (resourceId: string, groupIds: string[]) => Promise<boolean>;
  /** Unshare a resource from groups */
  unshareResource: (resourceId: string, groupIds: string[]) => Promise<boolean>;
  /** Share a folder with groups */
  shareFolder: (folderId: string, groupIds: string[]) => Promise<boolean>;
  /** Unshare a folder from groups */
  unshareFolder: (folderId: string, groupIds: string[]) => Promise<boolean>;
  /** Get current shares for a resource */
  getResourceShares: (resourceId: string) => Promise<ShareInfo[]>;
  /** Get current shares for a folder */
  getFolderShares: (folderId: string) => Promise<ShareInfo[]>;
  /** Get groups user can share to (where they are leader/admin, excluding current group) */
  getShareableGroups: () => Promise<{ id: string; name: string }[]>;
}

/**
 * Hook for managing resources in the current group
 *
 * Encapsulates all resource-related state and operations:
 * - Fetching folders and resources
 * - Folder navigation
 * - Creating folders and resources (file upload, links)
 * - Deleting resources and folders
 * - File download URLs
 * - Sharing resources and folders with other groups
 *
 * @example
 * ```tsx
 * function ResourcesScreen() {
 *   const {
 *     folders,
 *     resources,
 *     loading,
 *     openFolder,
 *     goBack,
 *     createFolder,
 *     uploadFileResource,
 *     shareResource
 *   } = useResources();
 *
 *   if (loading) return <LoadingSpinner />;
 *
 *   return <ResourceList folders={folders} resources={resources} />;
 * }
 * ```
 */
export function useResources(options: UseResourcesOptions = {}): UseResourcesResult {
  const { visibility = 'all' } = options;
  const { user } = useAuth();
  const { currentGroup, groups } = useGroup();
  const { error, setError, handleError, clearError } = useErrorHandler({
    context: 'useResources'
  });

  const [folders, setFolders] = useState<ResourceFolderWithSharing[]>([]);
  const [resources, setResources] = useState<ResourceWithSharing[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  /**
   * Fetch folders and resources for the current folder, including shared items
   */
  const fetchContents = useCallback(async () => {
    if (!currentGroup) {
      setFolders([]);
      setResources([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    clearError();

    try {
      // Fetch own folders
      const { data: folderData, error: folderError } = await resourcesRepo.fetchFolders(
        currentGroup.id, currentFolderId
      );
      if (folderError) throw folderError;

      // Fetch own resources filtered by visibility
      const { data: resourceData, error: resourceError } = await resourcesRepo.fetchResources(
        currentGroup.id, currentFolderId, visibility
      );
      if (resourceError) throw resourceError;

      // Type assertions for data arrays
      const typedFolderData = (folderData || []) as ResourceFolder[];
      const typedResourceData = (resourceData || []) as Resource[];

      // Get resource IDs for share count lookup
      const resourceIds = typedResourceData.map(r => r.id);
      const folderIds = typedFolderData.map(f => f.id);

      // Get share counts for own resources
      const resourceShareCountMap = new Map<string, number>();
      if (resourceIds.length > 0) {
        const { data: resourceShareCounts } = await resourcesRepo.fetchResourceShareCounts(resourceIds);

        ((resourceShareCounts || []) as { resource_id: string }[]).forEach(share => {
          resourceShareCountMap.set(
            share.resource_id,
            (resourceShareCountMap.get(share.resource_id) || 0) + 1
          );
        });
      }

      // Get share counts for own folders
      const folderShareCountMap = new Map<string, number>();
      if (folderIds.length > 0) {
        const { data: folderShareCounts } = await resourcesRepo.fetchFolderShareCounts(folderIds);

        ((folderShareCounts || []) as { folder_id: string }[]).forEach(share => {
          folderShareCountMap.set(
            share.folder_id,
            (folderShareCountMap.get(share.folder_id) || 0) + 1
          );
        });
      }

      // Add share counts to own items
      const ownFolders: ResourceFolderWithSharing[] = typedFolderData.map(f => ({
        ...f,
        shareCount: folderShareCountMap.get(f.id) || 0,
      }));

      const ownResources: ResourceWithSharing[] = typedResourceData.map(r => ({
        ...r,
        shareCount: resourceShareCountMap.get(r.id) || 0,
      }));

      // Fetch shared folders (only at root level for shared items)
      let sharedFolders: ResourceFolderWithSharing[] = [];
      let sharedResources: ResourceWithSharing[] = [];

      if (currentFolderId === null) {
        // At root level, fetch directly shared folders
        const { data: sharedFolderData } = await resourcesRepo.fetchSharedFolders(currentGroup.id);

        sharedFolders = ((sharedFolderData || []) as any[])
          .filter((item) => item.folder)
          .map((item) => ({
            ...item.folder,
            isShared: true,
            sourceGroupId: item.folder.group?.id,
            sourceGroupName: item.folder.group?.name,
          }));

        // Fetch directly shared resources (at root level)
        const { data: sharedResourceData } = await resourcesRepo.fetchSharedResources(currentGroup.id);

        sharedResources = ((sharedResourceData || []) as any[])
          .filter((item) => {
            if (!item.resource || item.resource.folder_id !== null) return false;
            // Apply visibility filter to shared resources too
            if (visibility === 'leaders_only') {
              return item.resource.visibility === 'leaders_only';
            } else if (visibility === 'members_only') {
              return item.resource.visibility === 'members_only';
            }
            return item.resource.visibility === 'all';
          })
          .map((item) => ({
            ...item.resource,
            isShared: true,
            sourceGroupId: item.resource.group?.id,
            sourceGroupName: item.resource.group?.name,
          }));
      } else {
        // Inside a shared folder - check if we're in a shared context
        // If the current folder is shared to us, load its contents
        const isInSharedFolder = folderPath.some((f: any) => f.isShared);

        if (isInSharedFolder) {
          // We're inside a shared folder, fetch contents from the source group
          const sharedFolder = folderPath.find((f: any) => f.isShared) as ResourceFolderWithSharing;
          const sourceGroupId = sharedFolder?.sourceGroupId;

          if (sourceGroupId) {
            // Fetch subfolders of the current shared folder
            const { data: subFolderData } = await resourcesRepo.fetchSharedSubfolders(currentFolderId);

            sharedFolders = ((subFolderData || []) as any[]).map((f) => ({
              ...f,
              isShared: true,
              sourceGroupId: f.group?.id,
              sourceGroupName: f.group?.name,
            }));

            // Fetch resources in the current shared folder with visibility filter
            const { data: subResourceData } = await resourcesRepo.fetchSharedSubResources(
              currentFolderId, visibility
            );

            sharedResources = ((subResourceData || []) as any[]).map((r) => ({
              ...r,
              isShared: true,
              sourceGroupId: r.group?.id,
              sourceGroupName: r.group?.name,
            }));
          }
        }
      }

      // Combine own and shared items
      setFolders([...ownFolders, ...sharedFolders]);
      setResources([...ownResources, ...sharedResources]);
    } catch (err) {
      handleError(err, 'fetchContents');
    } finally {
      setLoading(false);
    }
  }, [currentGroup, currentFolderId, folderPath, visibility, clearError, handleError]);

  /**
   * Navigate into a folder
   */
  const openFolder = useCallback((folder: ResourceFolder | ResourceFolderWithSharing) => {
    setFolderPath(prev => [...prev, folder]);
    setCurrentFolderId(folder.id);
  }, []);

  /**
   * Go back one level
   */
  const goBack = useCallback(() => {
    setFolderPath(prev => {
      const newPath = [...prev];
      newPath.pop();
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
      return newPath;
    });
  }, []);

  /**
   * Go to root folder
   */
  const goToRoot = useCallback(() => {
    setFolderPath([]);
    setCurrentFolderId(null);
  }, []);

  /**
   * Create a new folder
   */
  const createFolder = useCallback(async (name: string): Promise<boolean> => {
    if (!name.trim() || !currentGroup || !user) {
      setError('Folder name is required');
      return false;
    }

    try {
      const { error: insertError } = await resourcesRepo.createFolder({
        name: name.trim(),
        group_id: currentGroup.id,
        parent_id: currentFolderId,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      await fetchContents();
      return true;
    } catch (err) {
      handleError(err, 'createFolder');
      return false;
    }
  }, [currentGroup, currentFolderId, user, fetchContents, handleError, setError]);

  /**
   * Upload a file resource
   */
  const uploadFileResource = useCallback(async (
    file: FileToUpload,
    title: string
  ): Promise<boolean> => {
    if (!currentGroup || !user) {
      setError('Not authenticated');
      return false;
    }

    if (!title.trim()) {
      setError('Title is required');
      return false;
    }

    setUploading(true);
    clearError();

    try {
      const storagePath = generateFilePath(currentGroup.id, file.name);

      const uploadResult = await storage.upload(
        RESOURCES_BUCKET,
        storagePath,
        {
          uri: file.uri,
          name: file.name,
          type: file.type || 'application/octet-stream',
        },
        { contentType: file.type || 'application/octet-stream' }
      );

      if (uploadResult.error) throw uploadResult.error;

      const { error: insertError } = await resourcesRepo.createResource({
        title: title.trim(),
        type: 'document',
        group_id: currentGroup.id,
        folder_id: currentFolderId,
        file_path: storagePath,
        file_size: file.size || null,
        mime_type: file.type || null,
        visibility: visibility === 'leaders_only' ? 'leaders_only' : (visibility === 'members_only' ? 'members_only' : 'all'),
        shared_by: user.id,
        tags: [],
      });

      if (insertError) throw insertError;

      await fetchContents();
      return true;
    } catch (err) {
      handleError(err, 'uploadFileResource');
      return false;
    } finally {
      setUploading(false);
    }
  }, [currentGroup, currentFolderId, user, fetchContents, visibility, clearError, handleError, setError]);

  /**
   * Create a link resource
   */
  const createLinkResource = useCallback(async (
    title: string,
    url: string
  ): Promise<boolean> => {
    if (!currentGroup || !user) {
      setError('Not authenticated');
      return false;
    }

    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required');
      return false;
    }

    try {
      const { error: insertError } = await resourcesRepo.createResource({
        title: title.trim(),
        type: 'link',
        url: url.trim(),
        group_id: currentGroup.id,
        folder_id: currentFolderId,
        visibility: visibility === 'leaders_only' ? 'leaders_only' : (visibility === 'members_only' ? 'members_only' : 'all'),
        shared_by: user.id,
        tags: [],
      });

      if (insertError) throw insertError;

      await fetchContents();
      return true;
    } catch (err) {
      handleError(err, 'createLinkResource');
      return false;
    }
  }, [currentGroup, currentFolderId, user, fetchContents, visibility, handleError, setError]);

  /**
   * Delete a folder
   */
  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await resourcesRepo.deleteFolder(folderId);

      if (deleteError) throw deleteError;

      setFolders(prev => prev.filter(f => f.id !== folderId));
      return true;
    } catch (err) {
      handleError(err, 'deleteFolder');
      return false;
    }
  }, [handleError]);

  /**
   * Delete a resource
   */
  const deleteResource = useCallback(async (
    resourceId: string,
    filePath?: string | null
  ): Promise<boolean> => {
    try {
      // Delete file from storage if exists
      if (filePath) {
        await storage.delete(RESOURCES_BUCKET, filePath);
      }

      const { error: deleteError } = await resourcesRepo.deleteResource(resourceId);

      if (deleteError) throw deleteError;

      setResources(prev => prev.filter(r => r.id !== resourceId));
      return true;
    } catch (err) {
      handleError(err, 'deleteResource');
      return false;
    }
  }, [handleError]);

  /**
   * Get download URL for a resource file
   */
  const getResourceUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const result = await storage.getDownloadUrl(RESOURCES_BUCKET, filePath, 3600);
      return result.url || null;
    } catch (err) {
      // Log but don't set error state - this is a silent failure
      logger.error('useResources', 'Error getting download URL', { error: err });
      return null;
    }
  }, []);

  /**
   * Share a resource with specified groups
   */
  const shareResource = useCallback(async (
    resourceId: string,
    groupIds: string[]
  ): Promise<boolean> => {
    if (!user) {
      setError('Not authenticated');
      return false;
    }

    try {
      // Insert shares one by one to handle conflicts
      for (const groupId of groupIds) {
        const { error: insertError } = await resourcesRepo.upsertResourceShare(
          resourceId, groupId, user.id
        );

        if (insertError) throw insertError;
      }

      await fetchContents();
      return true;
    } catch (err) {
      handleError(err, 'shareResource');
      return false;
    }
  }, [user, fetchContents, handleError, setError]);

  /**
   * Unshare a resource from specified groups
   */
  const unshareResource = useCallback(async (
    resourceId: string,
    groupIds: string[]
  ): Promise<boolean> => {
    try {
      for (const groupId of groupIds) {
        const { error: deleteError } = await resourcesRepo.deleteResourceShare(resourceId, groupId);

        if (deleteError) throw deleteError;
      }

      await fetchContents();
      return true;
    } catch (err) {
      handleError(err, 'unshareResource');
      return false;
    }
  }, [fetchContents, handleError]);

  /**
   * Share a folder with specified groups
   */
  const shareFolder = useCallback(async (
    folderId: string,
    groupIds: string[]
  ): Promise<boolean> => {
    if (!user) {
      setError('Not authenticated');
      return false;
    }

    try {
      // Insert shares one by one to handle conflicts
      for (const groupId of groupIds) {
        const { error: insertError } = await resourcesRepo.upsertFolderShare(
          folderId, groupId, user.id
        );

        if (insertError) throw insertError;
      }

      await fetchContents();
      return true;
    } catch (err) {
      handleError(err, 'shareFolder');
      return false;
    }
  }, [user, fetchContents, handleError, setError]);

  /**
   * Unshare a folder from specified groups
   */
  const unshareFolder = useCallback(async (
    folderId: string,
    groupIds: string[]
  ): Promise<boolean> => {
    try {
      for (const groupId of groupIds) {
        const { error: deleteError } = await resourcesRepo.deleteFolderShare(folderId, groupId);

        if (deleteError) throw deleteError;
      }

      await fetchContents();
      return true;
    } catch (err) {
      handleError(err, 'unshareFolder');
      return false;
    }
  }, [fetchContents, handleError]);

  /**
   * Get current shares for a resource
   */
  const getResourceShares = useCallback(async (resourceId: string): Promise<ShareInfo[]> => {
    try {
      const { data, error: fetchError } = await resourcesRepo.fetchResourceShares(resourceId);

      if (fetchError) throw fetchError;

      return ((data || []) as any[])
        .filter((item) => item.group)
        .map((item) => ({
          groupId: item.group.id,
          groupName: item.group.name,
          sharedAt: item.shared_at,
        }));
    } catch (err) {
      // Log but don't set error state - this is a silent failure
      logger.error('useResources', 'Error getting resource shares', { error: err });
      return [];
    }
  }, []);

  /**
   * Get current shares for a folder
   */
  const getFolderShares = useCallback(async (folderId: string): Promise<ShareInfo[]> => {
    try {
      const { data, error: fetchError } = await resourcesRepo.fetchFolderShares(folderId);

      if (fetchError) throw fetchError;

      return ((data || []) as any[])
        .filter((item) => item.group)
        .map((item) => ({
          groupId: item.group.id,
          groupName: item.group.name,
          sharedAt: item.shared_at,
        }));
    } catch (err) {
      // Log but don't set error state - this is a silent failure
      logger.error('useResources', 'Error getting folder shares', { error: err });
      return [];
    }
  }, []);

  /**
   * Get all groups that can be shared to (excluding current group)
   * Leaders can share to any group, not just ones they're members of
   */
  const getShareableGroups = useCallback(async (): Promise<{ id: string; name: string }[]> => {
    if (!currentGroup) return [];

    try {
      const { data, error } = await resourcesRepo.fetchShareableGroups(currentGroup.id);

      if (error) throw error;

      return ((data || []) as any[]).map(g => ({ id: g.id, name: g.name }));
    } catch (err) {
      // Log but don't set error state - this is a silent failure
      logger.error('useResources', 'Error fetching shareable groups', { error: err });
      return [];
    }
  }, [currentGroup]);

  // Fetch contents when group or folder changes
  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  return {
    folders,
    resources,
    currentFolderId,
    folderPath,
    loading,
    uploading,
    error,
    openFolder,
    goBack,
    goToRoot,
    refetch: fetchContents,
    createFolder,
    uploadFileResource,
    createLinkResource,
    deleteFolder,
    deleteResource,
    getResourceUrl,
    shareResource,
    unshareResource,
    shareFolder,
    unshareFolder,
    getResourceShares,
    getFolderShares,
    getShareableGroups,
  };
}
