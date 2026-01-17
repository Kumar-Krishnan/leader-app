import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GroupMember, Profile, GroupRole } from '../types/database';
import { useGroup } from '../contexts/GroupContext';
import { logger } from '../lib/logger';
import { getUserErrorMessage } from '../lib/errors';

/**
 * Member with profile information
 */
export interface MemberWithProfile extends GroupMember {
  user: Profile;
}

/**
 * Return type for the useGroupMembers hook
 */
export interface UseGroupMembersResult {
  /** List of members in the current group */
  members: MemberWithProfile[];
  /** Whether members are loading */
  loading: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** ID of member currently being processed */
  processingId: string | null;
  /** Refresh the member list */
  refetch: () => Promise<void>;
  /** Update a member's role */
  updateRole: (memberId: string, newRole: GroupRole) => Promise<boolean>;
  /** Remove a member from the group */
  removeMember: (memberId: string) => Promise<boolean>;
}

/**
 * Hook for managing group members
 * 
 * Encapsulates all member-related state and operations:
 * - Fetching members with profile info
 * - Role updates
 * - Member removal
 * 
 * Note: Join request handling is in GroupContext as it's
 * needed across multiple screens (badge count, etc.)
 * 
 * @example
 * ```tsx
 * function ManageMembersScreen() {
 *   const { members, loading, updateRole, removeMember } = useGroupMembers();
 *   
 *   if (loading) return <LoadingSpinner />;
 *   
 *   return <MemberList members={members} onRoleChange={updateRole} />;
 * }
 * ```
 */
export function useGroupMembers(): UseGroupMembersResult {
  const { currentGroup } = useGroup();
  
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  /**
   * Fetch all members in the current group
   */
  const fetchMembers = useCallback(async () => {
    if (!currentGroup) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('group_members')
        .select(`
          *,
          user:profiles!user_id(*)
        `)
        .eq('group_id', currentGroup.id)
        .order('role', { ascending: true });

      if (fetchError) throw fetchError;
      setMembers(data || []);
    } catch (err: any) {
      logger.error('useGroupMembers', 'Error fetching members', { error: err });
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentGroup]);

  /**
   * Update a member's role
   */
  const updateRole = useCallback(async (
    memberId: string, 
    newRole: GroupRole
  ): Promise<boolean> => {
    if (!currentGroup) {
      setError('No group selected');
      return false;
    }

    setProcessingId(memberId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('group_id', currentGroup.id);

      if (updateError) throw updateError;

      // Update local state
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));

      return true;
    } catch (err: any) {
      logger.error('useGroupMembers', 'Error updating role', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    } finally {
      setProcessingId(null);
    }
  }, [currentGroup]);

  /**
   * Remove a member from the group
   */
  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!currentGroup) {
      setError('No group selected');
      return false;
    }

    setProcessingId(memberId);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId)
        .eq('group_id', currentGroup.id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMembers(prev => prev.filter(m => m.id !== memberId));

      return true;
    } catch (err: any) {
      logger.error('useGroupMembers', 'Error removing member', { error: err });
      setError(getUserErrorMessage(err));
      return false;
    } finally {
      setProcessingId(null);
    }
  }, [currentGroup]);

  // Fetch members when group changes
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    processingId,
    refetch: fetchMembers,
    updateRole,
    removeMember,
  };
}

