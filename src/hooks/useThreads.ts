import { useState, useEffect, useCallback } from 'react';
import * as threadsRepo from '../repositories/threadsRepo';
import { Thread } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { useErrorHandler } from './useErrorHandler';

/**
 * Extended thread interface with optional UI-specific fields
 */
export interface ThreadWithDetails extends Thread {
  lastMessage?: string;
  unreadCount?: number;
}

/**
 * Return type for the useThreads hook
 */
export interface UseThreadsResult {
  /** List of threads for the current group */
  threads: ThreadWithDetails[];
  /** Whether threads are currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refresh the thread list */
  refetch: () => Promise<void>;
  /** Create a new thread (returns the created thread or null on error) */
  createThread: (name: string, description?: string) => Promise<Thread | null>;
  /** Archive a thread */
  archiveThread: (threadId: string) => Promise<boolean>;
}

/**
 * Hook for managing threads in the current group
 *
 * Encapsulates all thread-related state and operations:
 * - Fetching threads for the current group
 * - Creating new threads
 * - Archiving threads
 * - Error handling
 *
 * @example
 * ```tsx
 * function ThreadsScreen() {
 *   const { threads, loading, error, refetch, createThread } = useThreads();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage message={error} />;
 *
 *   return <ThreadList threads={threads} />;
 * }
 * ```
 */
export function useThreads(): UseThreadsResult {
  const { user } = useAuth();
  const { currentGroup } = useGroup();
  const { error, setError, handleError, clearError } = useErrorHandler({
    context: 'useThreads'
  });

  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch all non-archived threads for the current group
   */
  const fetchThreads = useCallback(async () => {
    if (!user || !currentGroup) {
      setLoading(false);
      return;
    }

    setLoading(true);
    clearError();

    try {
      const { data, error: fetchError } = await threadsRepo.fetchThreads(currentGroup.id);

      if (fetchError) throw fetchError;

      setThreads(data || []);
    } catch (err) {
      handleError(err, 'fetchThreads');
    } finally {
      setLoading(false);
    }
  }, [user, currentGroup, clearError, handleError]);

  /**
   * Create a new thread in the current group
   */
  const createThread = useCallback(async (
    name: string,
    description?: string
  ): Promise<Thread | null> => {
    if (!user || !currentGroup) {
      setError('Not authenticated or no group selected');
      return null;
    }

    try {
      const { data, error: createError } = await threadsRepo.createThread({
        name: name.trim(),
        description: description?.trim() || null,
        group_id: currentGroup.id,
        created_by: user.id,
        is_archived: false,
      });

      if (createError) throw createError;

      // Add to local state immediately for optimistic UI
      if (data) {
        setThreads(prev => [data, ...prev]);
      }

      return data;
    } catch (err) {
      handleError(err, 'createThread');
      return null;
    }
  }, [user, currentGroup, handleError, setError]);

  /**
   * Archive a thread (soft delete)
   */
  const archiveThread = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const { error: archiveError } = await threadsRepo.archiveThread(threadId);

      if (archiveError) throw archiveError;

      // Remove from local state immediately
      setThreads(prev => prev.filter(t => t.id !== threadId));

      return true;
    } catch (err) {
      handleError(err, 'archiveThread');
      return false;
    }
  }, [handleError]);

  // Fetch threads when user or group changes
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return {
    threads,
    loading,
    error,
    refetch: fetchThreads,
    createThread,
    archiveThread,
  };
}
