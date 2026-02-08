import { supabase } from '../lib/supabase';

export function fetchFolders(groupId: string, parentId: string | null) {
  let query = supabase
    .from('resource_folders')
    .select('*')
    .eq('group_id', groupId);

  if (parentId === null) {
    query = query.is('parent_id', null);
  } else {
    query = query.eq('parent_id', parentId);
  }

  return query.order('name');
}

export function fetchResources(
  groupId: string,
  folderId: string | null,
  visibility: 'all' | 'leaders_only' | 'members_only'
) {
  let query = supabase
    .from('resources')
    .select('*')
    .eq('group_id', groupId);

  if (visibility === 'leaders_only') {
    query = query.eq('visibility', 'leaders_only');
  } else if (visibility === 'members_only') {
    query = query.eq('visibility', 'members_only');
  } else {
    query = query.eq('visibility', 'all');
  }

  if (folderId === null) {
    query = query.is('folder_id', null);
  } else {
    query = query.eq('folder_id', folderId);
  }

  return query.order('created_at', { ascending: false });
}

export function fetchResourceShareCounts(resourceIds: string[]) {
  return (supabase
    .from('resource_group_shares' as any))
    .select('resource_id')
    .in('resource_id', resourceIds);
}

export function fetchFolderShareCounts(folderIds: string[]) {
  return (supabase
    .from('resource_folder_group_shares' as any))
    .select('folder_id')
    .in('folder_id', folderIds);
}

export function fetchSharedFolders(groupId: string) {
  return (supabase
    .from('resource_folder_group_shares' as any))
    .select(`
      folder_id,
      shared_at,
      folder:resource_folders!folder_id (
        *,
        group:groups!group_id (id, name)
      )
    `)
    .eq('shared_with_group_id', groupId);
}

export function fetchSharedResources(groupId: string) {
  return (supabase
    .from('resource_group_shares' as any))
    .select(`
      resource_id,
      shared_at,
      resource:resources!resource_id (
        *,
        group:groups!group_id (id, name)
      )
    `)
    .eq('shared_with_group_id', groupId);
}

export function fetchSharedSubfolders(parentId: string) {
  return supabase
    .from('resource_folders')
    .select('*, group:groups!group_id (id, name)')
    .eq('parent_id', parentId);
}

export function fetchSharedSubResources(
  folderId: string,
  visibility: 'all' | 'leaders_only' | 'members_only'
) {
  let query = supabase
    .from('resources')
    .select('*, group:groups!group_id (id, name)')
    .eq('folder_id', folderId);

  if (visibility === 'leaders_only') {
    query = query.eq('visibility', 'leaders_only');
  } else if (visibility === 'members_only') {
    query = query.eq('visibility', 'members_only');
  } else {
    query = query.eq('visibility', 'all');
  }

  return query;
}

export function createFolder(data: {
  name: string;
  group_id: string;
  parent_id: string | null;
  created_by: string;
}) {
  return (supabase
    .from('resource_folders') as any)
    .insert(data);
}

export function createResource(data: {
  title: string;
  type: string;
  group_id: string;
  folder_id: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  url?: string;
  visibility: string;
  shared_by: string;
  tags: string[];
}) {
  return (supabase
    .from('resources') as any)
    .insert(data);
}

export function deleteFolder(id: string) {
  return supabase
    .from('resource_folders')
    .delete()
    .eq('id', id);
}

export function deleteResource(id: string) {
  return supabase
    .from('resources')
    .delete()
    .eq('id', id);
}

export function upsertResourceShare(
  resourceId: string,
  groupId: string,
  userId: string
) {
  return (supabase as any)
    .from('resource_group_shares')
    .upsert(
      {
        resource_id: resourceId,
        shared_with_group_id: groupId,
        shared_by_user_id: userId,
      },
      { onConflict: 'resource_id,shared_with_group_id' }
    );
}

export function deleteResourceShare(resourceId: string, groupId: string) {
  return (supabase
    .from('resource_group_shares' as any))
    .delete()
    .eq('resource_id', resourceId)
    .eq('shared_with_group_id', groupId);
}

export function upsertFolderShare(
  folderId: string,
  groupId: string,
  userId: string
) {
  return (supabase as any)
    .from('resource_folder_group_shares')
    .upsert(
      {
        folder_id: folderId,
        shared_with_group_id: groupId,
        shared_by_user_id: userId,
      },
      { onConflict: 'folder_id,shared_with_group_id' }
    );
}

export function deleteFolderShare(folderId: string, groupId: string) {
  return (supabase
    .from('resource_folder_group_shares' as any))
    .delete()
    .eq('folder_id', folderId)
    .eq('shared_with_group_id', groupId);
}

export function fetchResourceShares(resourceId: string) {
  return (supabase
    .from('resource_group_shares' as any))
    .select(`
      shared_with_group_id,
      shared_at,
      group:groups!shared_with_group_id (id, name)
    `)
    .eq('resource_id', resourceId);
}

export function fetchFolderShares(folderId: string) {
  return (supabase
    .from('resource_folder_group_shares' as any))
    .select(`
      shared_with_group_id,
      shared_at,
      group:groups!shared_with_group_id (id, name)
    `)
    .eq('folder_id', folderId);
}

export function fetchShareableGroups(excludeGroupId: string) {
  return supabase
    .from('groups')
    .select('id, name')
    .neq('id', excludeGroupId)
    .order('name');
}
