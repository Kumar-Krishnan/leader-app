import { useState, useEffect, useCallback } from 'react';
import * as membersRepo from '../repositories/membersRepo';
import { GroupMember, Profile, GroupRole, PlaceholderProfile } from '../types/database';
import { useGroup } from '../contexts/GroupContext';
import { useErrorHandler } from './useErrorHandler';

/**
 * Member with profile information (either real user or placeholder)
 */
export interface MemberWithProfile extends GroupMember {
  user: Profile | null;
  placeholder: PlaceholderProfile | null;
  /** Convenience flag to check if this is a placeholder */
  isPlaceholder: boolean;
  /** Display name (from user or placeholder) */
  displayName: string;
  /** Email (from user or placeholder) */
  displayEmail: string;
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
  /** Create a placeholder member (for users who haven't signed up yet) */
  createPlaceholder: (email: string, fullName: string, role?: GroupRole) => Promise<boolean>;
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
  const { error, setError, handleError, clearError } = useErrorHandler({
    context: 'useGroupMembers'
  });

  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  /**
   * Fetch all members in the current group (including placeholders)
   */
  const fetchMembers = useCallback(async () => {
    if (!currentGroup) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    clearError();

    try {
      const { data, error: fetchError } = await membersRepo.fetchMembers(currentGroup.id);

      if (fetchError) throw fetchError;

      // Transform data to add convenience properties
      const transformedMembers: MemberWithProfile[] = (data || []).map((member: any) => ({
        ...member,
        user: member.user || null,
        placeholder: member.placeholder || null,
        isPlaceholder: member.placeholder_id !== null,
        displayName: member.user?.full_name || member.placeholder?.full_name || 'Unknown',
        displayEmail: member.user?.email || member.placeholder?.email || '',
      }));

      setMembers(transformedMembers);
    } catch (err) {
      handleError(err, 'fetchMembers');
    } finally {
      setLoading(false);
    }
  }, [currentGroup, clearError, handleError]);

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
    clearError();

    try {
      const { error: updateError } = await membersRepo.updateMemberRole(
        memberId, currentGroup.id, newRole
      );

      if (updateError) throw updateError;

      // Update local state
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ));

      return true;
    } catch (err) {
      handleError(err, 'updateRole');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, [currentGroup, clearError, handleError, setError]);

  /**
   * Remove a member from the group
   */
  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!currentGroup) {
      setError('No group selected');
      return false;
    }

    setProcessingId(memberId);
    clearError();

    try {
      const { error: deleteError } = await membersRepo.removeMember(memberId, currentGroup.id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMembers(prev => prev.filter(m => m.id !== memberId));

      return true;
    } catch (err) {
      handleError(err, 'removeMember');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, [currentGroup, clearError, handleError, setError]);

  /**
   * Create a placeholder member (for users who haven't signed up yet)
   */
  const createPlaceholder = useCallback(async (
    email: string,
    fullName: string,
    role: GroupRole = 'member'
  ): Promise<boolean> => {
    if (!currentGroup) {
      setError('No group selected');
      return false;
    }

    clearError();

    try {
      const { data, error: rpcError } = await membersRepo.createPlaceholderMember(
        currentGroup.id, email, fullName, role as string
      );

      if (rpcError) throw rpcError;

      // Refetch members to get the updated list
      await fetchMembers();

      return true;
    } catch (err) {
      handleError(err, 'createPlaceholder');
      return false;
    }
  }, [currentGroup, fetchMembers, clearError, handleError, setError]);

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
    createPlaceholder,
  };
}
