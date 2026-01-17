import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ResourceUpvoteCounts } from '../types/database';

/**
 * Upvote data for a resource including user's own upvote status
 */
export interface ResourceUpvoteData {
  resourceId: string;
  totalUpvotes: number;
  leaderUpvotes: number;
  userUpvotes: number;
  hasUpvoted: boolean;
}

/**
 * Return type for the useResourceUpvotes hook
 */
export interface UseResourceUpvotesResult {
  /** Map of resource ID to upvote data */
  upvotes: Map<string, ResourceUpvoteData>;
  /** Toggle upvote for a resource */
  toggleUpvote: (resourceId: string) => Promise<boolean>;
  /** Refresh upvote data for specific resources */
  fetchUpvotes: (resourceIds: string[]) => Promise<void>;
}

/**
 * Hook for managing resource upvotes
 * 
 * @example
 * ```tsx
 * const { upvotes, toggleUpvote } = useResourceUpvotes();
 * 
 * const resourceUpvote = upvotes.get(resource.id);
 * const count = resourceUpvote?.totalUpvotes || 0;
 * const hasUpvoted = resourceUpvote?.hasUpvoted || false;
 * ```
 */
export function useResourceUpvotes(): UseResourceUpvotesResult {
  const { user, isLeader } = useAuth();
  const [upvotes, setUpvotes] = useState<Map<string, ResourceUpvoteData>>(new Map());

  /**
   * Fetch upvote data for a list of resources
   */
  const fetchUpvotes = useCallback(async (resourceIds: string[]) => {
    if (!user || resourceIds.length === 0) return;

    try {
      // Fetch upvote counts from the view
      const { data: countsData, error: countsError } = await supabase
        .from('resource_upvote_counts')
        .select('*')
        .in('resource_id', resourceIds);

      if (countsError) {
        console.error('[useResourceUpvotes] Error fetching counts:', countsError);
      }

      // Fetch user's own upvotes
      const { data: myUpvotes, error: myError } = await supabase
        .from('resource_upvotes')
        .select('resource_id')
        .eq('user_id', user.id)
        .in('resource_id', resourceIds);

      if (myError) {
        console.error('[useResourceUpvotes] Error fetching my upvotes:', myError);
      }

      // Build upvote map
      const myUpvoteSet = new Set(myUpvotes?.map(u => u.resource_id) || []);
      const countsMap = new Map<string, ResourceUpvoteCounts>(
        (countsData || []).map(c => [c.resource_id, c])
      );

      const newUpvotes = new Map<string, ResourceUpvoteData>();
      
      for (const resourceId of resourceIds) {
        const counts = countsMap.get(resourceId);
        newUpvotes.set(resourceId, {
          resourceId,
          totalUpvotes: counts?.total_upvotes || 0,
          leaderUpvotes: counts?.leader_upvotes || 0,
          userUpvotes: counts?.user_upvotes || 0,
          hasUpvoted: myUpvoteSet.has(resourceId),
        });
      }

      setUpvotes(prev => {
        const merged = new Map(prev);
        for (const [k, v] of newUpvotes) {
          merged.set(k, v);
        }
        return merged;
      });
    } catch (error) {
      console.error('[useResourceUpvotes] Error:', error);
    }
  }, [user]);

  /**
   * Toggle upvote for a resource
   */
  const toggleUpvote = useCallback(async (resourceId: string): Promise<boolean> => {
    if (!user) return false;

    const current = upvotes.get(resourceId);
    const hasUpvoted = current?.hasUpvoted || false;

    try {
      if (hasUpvoted) {
        // Remove upvote
        const { error } = await supabase
          .from('resource_upvotes')
          .delete()
          .eq('resource_id', resourceId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Update local state immediately
        setUpvotes(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(resourceId);
          if (existing) {
            newMap.set(resourceId, {
              ...existing,
              hasUpvoted: false,
              totalUpvotes: Math.max(0, existing.totalUpvotes - 1),
              leaderUpvotes: isLeader ? Math.max(0, existing.leaderUpvotes - 1) : existing.leaderUpvotes,
              userUpvotes: !isLeader ? Math.max(0, existing.userUpvotes - 1) : existing.userUpvotes,
            });
          }
          return newMap;
        });
      } else {
        // Add upvote
        const { error } = await supabase
          .from('resource_upvotes')
          .insert({
            resource_id: resourceId,
            user_id: user.id,
            is_leader_upvote: isLeader,
          });

        if (error) throw error;

        // Update local state immediately
        setUpvotes(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(resourceId) || {
            resourceId,
            totalUpvotes: 0,
            leaderUpvotes: 0,
            userUpvotes: 0,
            hasUpvoted: false,
          };
          newMap.set(resourceId, {
            ...existing,
            hasUpvoted: true,
            totalUpvotes: existing.totalUpvotes + 1,
            leaderUpvotes: isLeader ? existing.leaderUpvotes + 1 : existing.leaderUpvotes,
            userUpvotes: !isLeader ? existing.userUpvotes + 1 : existing.userUpvotes,
          });
          return newMap;
        });
      }

      return true;
    } catch (error) {
      console.error('[useResourceUpvotes] Error toggling upvote:', error);
      return false;
    }
  }, [user, isLeader, upvotes]);

  return {
    upvotes,
    toggleUpvote,
    fetchUpvotes,
  };
}
