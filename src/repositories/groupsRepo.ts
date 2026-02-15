import { supabase } from '../lib/supabase';

export function fetchUserGroups(userId: string) {
  return supabase
    .from('group_members')
    .select(`
      id,
      role,
      group:groups(*)
    `)
    .eq('user_id', userId);
}

export function fetchMyPendingRequests(userId: string) {
  return (supabase
    .from('group_join_requests' as any))
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending');
}

export function fetchGroupPendingRequests(groupId: string) {
  return (supabase
    .from('group_join_requests' as any))
    .select(`
      *,
      user:profiles!user_id(*)
    `)
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
}

export function createGroup(data: {
  name: string;
  description: string | null;
  code: string;
  created_by: string;
}) {
  return (supabase
    .from('groups') as any)
    .insert(data)
    .select()
    .single();
}

export function addGroupMember(data: {
  group_id: string;
  user_id: string;
  role: string;
}) {
  return (supabase
    .from('group_members') as any)
    .insert(data);
}

export function requestToJoinGroup(code: string) {
  return (supabase as any).rpc('request_to_join_group', {
    group_code: code.toUpperCase(),
  });
}

export function approveJoinRequest(requestId: string) {
  return (supabase as any).rpc('approve_join_request', {
    request_id: requestId,
  });
}

export function rejectJoinRequest(requestId: string) {
  return (supabase as any).rpc('reject_join_request', {
    request_id: requestId,
  });
}

export function updateMemberRole(memberId: string, newRole: string) {
  return (supabase as any).rpc('update_member_role', {
    member_id: memberId,
    new_role: newRole,
  });
}

export function updateGroupTimezone(groupId: string, timezone: string) {
  return supabase
    .from('groups')
    .update({ timezone } as any)
    .eq('id', groupId);
}
