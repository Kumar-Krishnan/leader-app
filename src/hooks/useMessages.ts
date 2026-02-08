import { useState, useEffect, useCallback, useRef } from 'react';
import * as messagesRepo from '../repositories/messagesRepo';
import { realtimeService } from '../services/realtime';
import { RealtimeSubscription } from '../services/realtime/types';
import { Message, Profile } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { getUserErrorMessage } from '../lib/errors';

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
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);

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
      const { data, error: fetchError } = await messagesRepo.fetchMessages(threadId);

      if (fetchError) throw fetchError;

      setMessages(data || []);
    } catch (err: any) {
      logger.error('useMessages', 'Error fetching messages', { error: err });
      setError(getUserErrorMessage(err));
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
      const { error: insertError } = await messagesRepo.insertMessage(
        threadId, user.id, content.trim()
      );

      if (insertError) throw insertError;

      // Note: The realtime subscription will add the message to the list
      return true;
    } catch (err: any) {
      logger.error('useMessages', 'Error sending message', { error: err });
      setError(getUserErrorMessage(err));
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
      const { error: updateError } = await messagesRepo.updateMessage(
        messageId, content.trim()
      );

      if (updateError) throw updateError;

      // Update local state immediately
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: content.trim() }
          : msg
      ));

      return true;
    } catch (err: any) {
      logger.error('useMessages', 'Error editing message', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, []);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await messagesRepo.deleteMessage(messageId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      return true;
    } catch (err: any) {
      logger.error('useMessages', 'Error deleting message', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    if (!threadId) return;

    // Fetch initial messages
    fetchMessages();

    // Subscribe to message changes via realtime service
    const subscription = realtimeService.subscribeToTable(
      'messages',
      `thread_id=eq.${threadId}`,
      {
        onInsert: async (newMsg: Message) => {
          // Fetch the sender info for the new message
          const { data: sender } = await messagesRepo.fetchProfile(newMsg.sender_id);
          setMessages(prev => [...prev, { ...newMsg, sender: sender || undefined }]);
        },
        onUpdate: (updatedMsg: Message) => {
          setMessages(prev => prev.map(msg =>
            msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg
          ));
        },
        onDelete: (deletedMsg: Message) => {
          setMessages(prev => prev.filter(msg => msg.id !== deletedMsg.id));
        },
      }
    );

    subscriptionRef.current = subscription;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
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
