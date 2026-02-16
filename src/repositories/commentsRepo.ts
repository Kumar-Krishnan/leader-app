import { supabase } from '../lib/supabase';

export function fetchComments(filter: { resourceId?: string; folderId?: string }) {
  let query = supabase
    .from('resource_comments')
    .select(`
      *,
      user:profiles!user_id(*)
    `)
    .order('created_at', { ascending: true });

  if (filter.resourceId) {
    query = query.eq('resource_id', filter.resourceId);
  } else if (filter.folderId) {
    query = query.eq('folder_id', filter.folderId);
  }

  return query;
}

export function insertComment(data: {
  user_id: string;
  content: string;
  resource_id?: string;
  folder_id?: string;
}) {
  return (supabase
    .from('resource_comments') as any)
    .insert(data);
}

export function deleteComment(commentId: string) {
  return supabase
    .from('resource_comments')
    .delete()
    .eq('id', commentId);
}
