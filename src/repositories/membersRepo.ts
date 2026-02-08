import { supabase } from '../lib/supabase';
import { GroupRole } from '../types/database';

export function fetchMembers(groupId: string) {
  return supabase
    .from('group_members')
    .select(`
      *,
      user:profiles!user_id(*),
      placeholder:placeholder_profiles!placeholder_id(*)
    `)
    .eq('group_id', groupId)
    .order('role', { ascending: true });
}

export function updateMemberRole(
  memberId: string,
  groupId: string,
  role: GroupRole
) {
  return (supabase
    .from('group_members') as any)
    .update({ role })
    .eq('id', memberId)
    .eq('group_id', groupId);
}

export function removeMember(memberId: string, groupId: string) {
  return supabase
    .from('group_members')
    .delete()
    .eq('id', memberId)
    .eq('group_id', groupId);
}

export function createPlaceholderMember(
  groupId: string,
  email: string,
  fullName: string,
  role: string
) {
  return (supabase as any).rpc('create_placeholder_member', {
    p_group_id: groupId,
    p_email: email,
    p_full_name: fullName,
    p_role: role,
  });
}
