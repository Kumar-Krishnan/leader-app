import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { storage, RESOURCES_BUCKET, generateFilePath } from '../lib/storage';
import { Resource, ResourceFolder } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';

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
 * Return type for the useResources hook
 */
export interface UseResourcesResult {
  /** List of folders in the current folder */
  folders: ResourceFolder[];
  /** List of resources in the current folder */
  resources: Resource[];
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
 *     uploadFileResource 
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
  const { currentGroup } = useGroup();
  
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch folders and resources for the current folder
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
      // Fetch folders
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
      setFolders(folderData || []);

      // Fetch resources
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
      setResources(resourceData || []);
    } catch (err: any) {
      console.error('[useResources] Error fetching contents:', err);
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [currentGroup, currentFolderId]);

  /**
   * Navigate into a folder
   */
  const openFolder = useCallback((folder: ResourceFolder) => {
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
      console.error('[useResources] Error creating folder:', err);
      setError(err.message || 'Failed to create folder');
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
      console.error('[useResources] Error uploading file:', err);
      setError(err.message || 'Failed to upload file');
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
      console.error('[useResources] Error creating link:', err);
      setError(err.message || 'Failed to create link');
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
      console.error('[useResources] Error deleting folder:', err);
      setError(err.message || 'Failed to delete folder');
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
        await storage.delete(RESOURCES_BUCKET, [filePath]);
      }

      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (deleteError) throw deleteError;

      setResources(prev => prev.filter(r => r.id !== resourceId));
      return true;
    } catch (err: any) {
      console.error('[useResources] Error deleting resource:', err);
      setError(err.message || 'Failed to delete resource');
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
      console.error('[useResources] Error getting download URL:', err);
      return null;
    }
  }, []);

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
  };
}

