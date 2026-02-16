import { supabase } from '../lib/supabase';

export function fetchThreads(groupId: string) {
  return supabase
    .from('threads')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });
}

export function createThread(data: {
  name: string;
  description: string | null;
  group_id: string;
  created_by: string;
  is_archived: boolean;
}) {
  return (supabase
    .from('threads') as any)
    .insert(data)
    .select()
    .single();
}

export function addThreadMember(threadId: string, userId: string) {
  return (supabase
    .from('thread_members') as any)
    .insert({ thread_id: threadId, user_id: userId });
}

export function archiveThread(threadId: string) {
  return (supabase
    .from('threads') as any)
    .update({ is_archived: true })
    .eq('id', threadId);
}
