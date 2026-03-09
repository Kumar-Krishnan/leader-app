import { useState, useCallback } from 'react';
import { fetchMembers } from '../repositories/membersRepo';
import { InvitableMember } from '../types/members';
import { GroupRole } from '../types/database';

export function useInvitableMembers(groupId: string | undefined) {
  const [members, setMembers] = useState<InvitableMember[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data, error } = await fetchMembers(groupId);
      if (error) throw error;

      const result: InvitableMember[] = [];
      for (const item of (data || []) as any[]) {
        if (item.user_id && item.user) {
          result.push({
            id: item.user_id,
            type: 'user',
            displayName: item.user.full_name || item.user.email,
            email: item.user.email,
            avatarUrl: item.user.avatar_url,
            groupRole: item.role as GroupRole,
          });
        } else if (item.placeholder_id && item.placeholder) {
          result.push({
            id: item.placeholder_id,
            type: 'placeholder',
            displayName: item.placeholder.full_name,
            email: item.placeholder.email,
            avatarUrl: null,
            groupRole: item.role as GroupRole,
          });
        }
      }
      setMembers(result);
    } catch (err) {
      console.error('Error fetching group members:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  return { members, loading, refetch };
}
