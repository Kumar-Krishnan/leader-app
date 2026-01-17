import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { storage, RESOURCES_BUCKET, generateFilePath } from '../lib/storage';
import { Resource, ResourceFolder } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { logger } from '../lib/logger';
import { getUserErrorMessage } from '../lib/errors';

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
export function useResources(): UseResourcesResult {
  const { user } = useAuth();
  const { currentGroup, groups } = useGroup();

  const [folders, setFolders] = useState<ResourceFolderWithSharing[]>([]);
  const [resources, setResources] = useState<ResourceWithSharing[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    try {
      // Fetch own folders
      let folderQuery = supabase
        .from('resource_folders')
        .select('*')
        .eq('group_id', currentGroup.id);

      if (currentFolderId === null) {
        folderQuery = folderQuery.is('parent_id', null);
      } else {
        folderQuery = folderQuery.eq('parent_id', currentFolderId);
      }

      const { data: folderData, error: folderError } = await folderQuery.order('name');
      if (folderError) throw folderError;

      // Fetch own resources
      let resourceQuery = supabase
        .from('resources')
        .select('*')
        .eq('group_id', currentGroup.id);

      if (currentFolderId === null) {
        resourceQuery = resourceQuery.is('folder_id', null);
      } else {
        resourceQuery = resourceQuery.eq('folder_id', currentFolderId);
      }

      const { data: resourceData, error: resourceError } = await resourceQuery
        .order('created_at', { ascending: false });
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
        const { data: resourceShareCounts } = await supabase
          .from('resource_group_shares')
          .select('resource_id')
          .in('resource_id', resourceIds);

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
        const { data: folderShareCounts } = await supabase
          .from('resource_folder_group_shares')
          .select('folder_id')
          .in('folder_id', folderIds);

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
        const { data: sharedFolderData } = await supabase
          .from('resource_folder_group_shares')
          .select(`
            folder_id,
            shared_at,
            folder:resource_folders!folder_id (
              *,
              group:groups!group_id (id, name)
            )
          `)
          .eq('shared_with_group_id', currentGroup.id);

        sharedFolders = ((sharedFolderData || []) as any[])
          .filter((item) => item.folder)
          .map((item) => ({
            ...item.folder,
            isShared: true,
            sourceGroupId: item.folder.group?.id,
            sourceGroupName: item.folder.group?.name,
          }));

        // Fetch directly shared resources (at root level)
        const { data: sharedResourceData } = await supabase
          .from('resource_group_shares')
          .select(`
            resource_id,
            shared_at,
            resource:resources!resource_id (
              *,
              group:groups!group_id (id, name)
            )
          `)
          .eq('shared_with_group_id', currentGroup.id);

        sharedResources = ((sharedResourceData || []) as any[])
          .filter((item) => item.resource && item.resource.folder_id === null)
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
            const { data: subFolderData } = await supabase
              .from('resource_folders')
              .select('*, group:groups!group_id (id, name)')
              .eq('parent_id', currentFolderId);

            sharedFolders = ((subFolderData || []) as any[]).map((f) => ({
              ...f,
              isShared: true,
              sourceGroupId: f.group?.id,
              sourceGroupName: f.group?.name,
            }));

            // Fetch resources in the current shared folder
            const { data: subResourceData } = await supabase
              .from('resources')
              .select('*, group:groups!group_id (id, name)')
              .eq('folder_id', currentFolderId);

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
    } catch (err: any) {
      logger.error('useResources', 'Error fetching contents', { error: err });
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentGroup, currentFolderId, folderPath]);

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
      const { error: insertError } = await supabase
        .from('resource_folders')
        .insert({
          name: name.trim(),
          group_id: currentGroup.id,
          parent_id: currentFolderId,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      await fetchContents();
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error creating folder', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, [currentGroup, currentFolderId, user, fetchContents]);

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
    setError(null);

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

      const { error: insertError } = await supabase
        .from('resources')
        .insert({
          title: title.trim(),
          type: 'document',
          group_id: currentGroup.id,
          folder_id: currentFolderId,
          file_path: storagePath,
          file_size: file.size || null,
          mime_type: file.type || null,
          visibility: 'all',
          shared_by: user.id,
          tags: [],
        });

      if (insertError) throw insertError;

      await fetchContents();
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error uploading file', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    } finally {
      setUploading(false);
    }
  }, [currentGroup, currentFolderId, user, fetchContents]);

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
      const { error: insertError } = await supabase
        .from('resources')
        .insert({
          title: title.trim(),
          type: 'link',
          url: url.trim(),
          group_id: currentGroup.id,
          folder_id: currentFolderId,
          visibility: 'all',
          shared_by: user.id,
          tags: [],
        });

      if (insertError) throw insertError;

      await fetchContents();
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error creating link', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, [currentGroup, currentFolderId, user, fetchContents]);

  /**
   * Delete a folder
   */
  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('resource_folders')
        .delete()
        .eq('id', folderId);

      if (deleteError) throw deleteError;

      setFolders(prev => prev.filter(f => f.id !== folderId));
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error deleting folder', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, []);

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

      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (deleteError) throw deleteError;

      setResources(prev => prev.filter(r => r.id !== resourceId));
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error deleting resource', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, []);

  /**
   * Get download URL for a resource file
   */
  const getResourceUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const result = await storage.getDownloadUrl(RESOURCES_BUCKET, filePath, 3600);
      return result.url || null;
    } catch (err: any) {
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
        const { error: insertError } = await supabase
          .from('resource_group_shares')
          .upsert({
            resource_id: resourceId,
            shared_with_group_id: groupId,
            shared_by_user_id: user.id,
          }, { onConflict: 'resource_id,shared_with_group_id' });

        if (insertError) throw insertError;
      }

      await fetchContents();
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error sharing resource', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, [user, fetchContents]);

  /**
   * Unshare a resource from specified groups
   */
  const unshareResource = useCallback(async (
    resourceId: string,
    groupIds: string[]
  ): Promise<boolean> => {
    try {
      for (const groupId of groupIds) {
        const { error: deleteError } = await supabase
          .from('resource_group_shares')
          .delete()
          .eq('resource_id', resourceId)
          .eq('shared_with_group_id', groupId);

        if (deleteError) throw deleteError;
      }

      await fetchContents();
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error unsharing resource', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, [fetchContents]);

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
        const { error: insertError } = await supabase
          .from('resource_folder_group_shares')
          .upsert({
            folder_id: folderId,
            shared_with_group_id: groupId,
            shared_by_user_id: user.id,
          }, { onConflict: 'folder_id,shared_with_group_id' });

        if (insertError) throw insertError;
      }

      await fetchContents();
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error sharing folder', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, [user, fetchContents]);

  /**
   * Unshare a folder from specified groups
   */
  const unshareFolder = useCallback(async (
    folderId: string,
    groupIds: string[]
  ): Promise<boolean> => {
    try {
      for (const groupId of groupIds) {
        const { error: deleteError } = await supabase
          .from('resource_folder_group_shares')
          .delete()
          .eq('folder_id', folderId)
          .eq('shared_with_group_id', groupId);

        if (deleteError) throw deleteError;
      }

      await fetchContents();
      return true;
    } catch (err: any) {
      logger.error('useResources', 'Error unsharing folder', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, [fetchContents]);

  /**
   * Get current shares for a resource
   */
  const getResourceShares = useCallback(async (resourceId: string): Promise<ShareInfo[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('resource_group_shares')
        .select(`
          shared_with_group_id,
          shared_at,
          group:groups!shared_with_group_id (id, name)
        `)
        .eq('resource_id', resourceId);

      if (fetchError) throw fetchError;

      return ((data || []) as any[])
        .filter((item) => item.group)
        .map((item) => ({
          groupId: item.group.id,
          groupName: item.group.name,
          sharedAt: item.shared_at,
        }));
    } catch (err: any) {
      logger.error('useResources', 'Error getting resource shares', { error: err });
      return [];
    }
  }, []);

  /**
   * Get current shares for a folder
   */
  const getFolderShares = useCallback(async (folderId: string): Promise<ShareInfo[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('resource_folder_group_shares')
        .select(`
          shared_with_group_id,
          shared_at,
          group:groups!shared_with_group_id (id, name)
        `)
        .eq('folder_id', folderId);

      if (fetchError) throw fetchError;

      return ((data || []) as any[])
        .filter((item) => item.group)
        .map((item) => ({
          groupId: item.group.id,
          groupName: item.group.name,
          sharedAt: item.shared_at,
        }));
    } catch (err: any) {
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
      // Fetch all groups in the system (excluding current group)
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .neq('id', currentGroup.id)
        .order('name');

      if (error) throw error;

      return (data || []).map(g => ({ id: g.id, name: g.name }));
    } catch (err: any) {
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
