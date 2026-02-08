import { supabase } from '../lib/supabase';

export function fetchMessages(threadId: string) {
  return supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(*)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
}

export function insertMessage(
  threadId: string,
  senderId: string,
  content: string
) {
  return (supabase
    .from('messages') as any)
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      content,
      attachments: [],
    });
}

export function updateMessage(messageId: string, content: string) {
  return (supabase
    .from('messages') as any)
    .update({ content })
    .eq('id', messageId);
}

export function deleteMessage(messageId: string) {
  return supabase
    .from('messages')
    .delete()
    .eq('id', messageId);
}

export function fetchProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}
