import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message, Profile } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

/**
 * Extended message interface with sender information
 */
export interface MessageWithSender extends Message {
  sender?: Profile;
}

/**
 * Return type for the useMessages hook
 */
export interface UseMessagesResult {
  /** List of messages in the thread */
  messages: MessageWithSender[];
  /** Whether messages are currently being fetched */
  loading: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Whether a message is currently being sent */
  sending: boolean;
  /** Manually refresh the message list */
  refetch: () => Promise<void>;
  /** Send a new message */
  sendMessage: (content: string) => Promise<boolean>;
  /** Edit an existing message */
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  /** Delete a message */
  deleteMessage: (messageId: string) => Promise<boolean>;
}

/**
 * Hook for managing messages in a thread
 * 
 * Encapsulates all message-related state and operations:
 * - Fetching messages with sender information
 * - Real-time subscription for new messages
 * - Sending, editing, and deleting messages
 * - Error handling
 * 
 * @param threadId - The ID of the thread to load messages for
 * 
 * @example
 * ```tsx
 * function ThreadDetailScreen({ threadId }) {
 *   const { messages, loading, sendMessage, editMessage, deleteMessage } = useMessages(threadId);
 *   
 *   if (loading) return <LoadingSpinner />;
 *   
 *   return <MessageList messages={messages} />;
 * }
 * ```
 */
export function useMessages(threadId: string): UseMessagesResult {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  /**
   * Fetch all messages for the thread with sender info
   */
  const fetchMessages = useCallback(async () => {
    if (!threadId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(*)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      
      setMessages(data || []);
    } catch (err: any) {
      console.error('[useMessages] Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  /**
   * Send a new message
   */
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim() || !user) {
      return false;
    }

    setSending(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content: content.trim(),
          attachments: [],
        });

      if (insertError) throw insertError;

      // Note: The realtime subscription will add the message to the list
      return true;
    } catch (err: any) {
      console.error('[useMessages] Error sending message:', err);
      setError(err.message || 'Failed to send message');
      return false;
    } finally {
      setSending(false);
    }
  }, [threadId, user]);

  /**
   * Edit an existing message
   */
  const editMessage = useCallback(async (
    messageId: string, 
    content: string
  ): Promise<boolean> => {
    if (!content.trim()) {
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ content: content.trim() })
        .eq('id', messageId);

      if (updateError) throw updateError;

      // Update local state immediately
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: content.trim() }
          : msg
      ));

      return true;
    } catch (err: any) {
      console.error('[useMessages] Error editing message:', err);
      setError(err.message || 'Failed to edit message');
      return false;
    }
  }, []);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      return true;
    } catch (err: any) {
      console.error('[useMessages] Error deleting message:', err);
      setError(err.message || 'Failed to delete message');
      return false;
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    if (!threadId) return;

    // Fetch initial messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      }, async (payload) => {
        // Fetch the sender info for the new message
        const newMsg = payload.new as Message;
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newMsg.sender_id)
          .single();
        
        setMessages(prev => [...prev, { ...newMsg, sender: sender || undefined }]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const updatedMsg = payload.new as Message;
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const deletedMsg = payload.old as Message;
        setMessages(prev => prev.filter(msg => msg.id !== deletedMsg.id));
      })
      .subscribe();

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [threadId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    refetch: fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}

