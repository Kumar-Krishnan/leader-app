import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as groupsRepo from '../repositories/groupsRepo';
import { Group, GroupRole, GroupJoinRequest, GroupJoinRequestWithDetails } from '../types/database';
import { useAuth } from './AuthContext';

interface GroupWithMembership extends Group {
  role: GroupRole;
  memberId: string;
}

interface GroupContextType {
  groups: GroupWithMembership[];
  currentGroup: GroupWithMembership | null;
  setCurrentGroup: (group: GroupWithMembership | null) => void;
  loading: boolean;
  isGroupLeader: boolean;
  isGroupAdmin: boolean;
  canApproveRequests: boolean;
  pendingRequests: GroupJoinRequestWithDetails[];
  myPendingRequests: GroupJoinRequest[];
  refreshGroups: () => Promise<void>;
  refreshPendingRequests: () => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<{ group: Group | null; error: Error | null }>;
  requestToJoin: (code: string) => Promise<{ error: Error | null }>;
  approveRequest: (requestId: string) => Promise<{ error: Error | null }>;
  rejectRequest: (requestId: string) => Promise<{ error: Error | null }>;
  updateMemberRole: (memberId: string, newRole: GroupRole) => Promise<{ error: Error | null }>;
  updateGroupTimezone: (groupId: string, timezone: string) => Promise<{ error: Error | null }>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user, isLeader, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupWithMembership[]>([]);
  const [currentGroup, setCurrentGroup] = useState<GroupWithMembership | null>(null);
  const [pendingRequests, setPendingRequests] = useState<GroupJoinRequestWithDetails[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<GroupJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Track if we've already loaded data for this user to prevent duplicate loads
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  // Computed values - must be defined before useEffects that use them
  const isGroupLeader = currentGroup?.role === 'leader' || currentGroup?.role === 'admin';
  const isGroupAdmin = currentGroup?.role === 'admin';
  const canApproveRequests = currentGroup?.role === 'leader-helper' || currentGroup?.role === 'leader' || currentGroup?.role === 'admin';

  useEffect(() => {
    console.log('[GroupContext] useEffect triggered, authLoading:', authLoading, 'user:', user?.id, 'loadedUserId:', loadedUserId);

    // Wait for auth to finish loading before making queries
    if (authLoading) {
      console.log('[GroupContext] Auth still loading, waiting...');
      return;
    }

    if (user) {
      // Only load if user changed (not just object reference)
      if (loadedUserId !== user.id) {
        console.log('[GroupContext] User changed from', loadedUserId, 'to', user.id, '- loading data...');
        setLoadedUserId(user.id);
        loadData();
      } else {
        console.log('[GroupContext] Same user, skipping reload');
      }
    } else {
      console.log('[GroupContext] No user, clearing state');
      setLoadedUserId(null);
      setGroups([]);
      setCurrentGroup(null);
      setPendingRequests([]);
      setMyPendingRequests([]);
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    console.log('[GroupContext] Pending requests effect, currentGroup:', currentGroup?.id, 'canApprove:', canApproveRequests);
    if (currentGroup && canApproveRequests) {
      console.log('[GroupContext] Fetching pending requests for group:', currentGroup.name);
      fetchPendingRequests();
    } else {
      setPendingRequests([]);
    }
  }, [currentGroup?.id, canApproveRequests]);

  // Persist selected group to storage
  useEffect(() => {
    if (currentGroup) {
      AsyncStorage.setItem('selectedGroupId', currentGroup.id).catch(err => {
        console.warn('[GroupContext] Failed to save group to storage:', err);
      });
    }
  }, [currentGroup?.id]);

  const loadData = async (retryCount = 0) => {
    console.log('[GroupContext] loadData starting...');
    setLoading(true);
    try {
      // Fetch groups first (essential)
      await fetchGroups();

      // Fetch pending requests in background (non-blocking)
      // This can fail without breaking the app
      fetchMyPendingRequests().catch(err => {
        console.warn('[GroupContext] Failed to fetch pending requests:', err);
      });

      console.log('[GroupContext] loadData complete');
    } catch (error: any) {
      console.error('[GroupContext] loadData error:', error);
      // Retry on AbortError
      if (error?.message?.includes('AbortError') && retryCount < 2) {
        console.log('[GroupContext] Retrying loadData after AbortError...');
        setTimeout(() => loadData(retryCount + 1), 500);
        return;
      }
    } finally {
      setLoading(false);
      console.log('[GroupContext] loading set to false');
    }
  };

  const fetchGroups = async (retryCount = 0) => {
    console.log('[GroupContext] fetchGroups called, user:', user?.id);
    if (!user) {
      console.log('[GroupContext] No user, returning from fetchGroups');
      return;
    }

    try {
      console.log('[GroupContext] Querying group_members...');

      const { data, error } = await groupsRepo.fetchUserGroups(user.id);

      console.log('[GroupContext] group_members query complete, error:', error, 'data:', data?.length);
      if (error) {
        // Retry on AbortError
        if (error.message?.includes('AbortError') && retryCount < 2) {
          console.log('[GroupContext] Retrying fetchGroups after AbortError...');
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchGroups(retryCount + 1);
        }
        console.error('Error fetching groups:', error);
        setGroups([]);
        return;
      }

      const groupList: GroupWithMembership[] = (data || [])
        .filter((item: any) => item.group)
        .map((item: any) => ({
          ...item.group,
          role: item.role as GroupRole,
          memberId: item.id,
        }));

      setGroups(groupList);

      // Try to restore last selected group from storage
      try {
        const savedGroupId = await AsyncStorage.getItem('selectedGroupId');
        if (savedGroupId && groupList.length > 0) {
          const savedGroup = groupList.find(p => p.id === savedGroupId);
          if (savedGroup) {
            console.log('[GroupContext] Restored group from storage:', savedGroup.name);
            setCurrentGroup(savedGroup);
            return;
          }
        }
      } catch (error) {
        console.warn('[GroupContext] Failed to restore group from storage:', error);
      }

      // Auto-select first group if none selected and none saved
      if (groupList.length > 0 && !currentGroup) {
        setCurrentGroup(groupList[0]);
      } else if (groupList.length === 0) {
        setCurrentGroup(null);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    }
  };

  const fetchMyPendingRequests = async () => {
    console.log('[GroupContext] fetchMyPendingRequests called, user:', user?.id);
    if (!user) {
      console.log('[GroupContext] No user, returning from fetchMyPendingRequests');
      return;
    }

    try {
      console.log('[GroupContext] Querying group_join_requests...');

      const { data, error } = await groupsRepo.fetchMyPendingRequests(user.id);

      console.log('[GroupContext] group_join_requests query complete, error:', error, 'data:', data?.length);
      if (error) {
        console.error('Error fetching pending requests:', error);
        setMyPendingRequests([]);
        return;
      }

      setMyPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching my pending requests:', error);
      setMyPendingRequests([]);
    }
  };

  const fetchPendingRequests = async () => {
    console.log('[GroupContext] fetchPendingRequests called, currentGroup:', currentGroup?.id, currentGroup?.name);
    if (!currentGroup) {
      console.log('[GroupContext] No current group, skipping fetchPendingRequests');
      return;
    }

    try {
      console.log('[GroupContext] Querying group_join_requests for group:', currentGroup.id);
      const { data, error } = await groupsRepo.fetchGroupPendingRequests(currentGroup.id);

      console.log('[GroupContext] fetchPendingRequests result - error:', error, 'data:', data);

      if (error) {
        console.error('[GroupContext] Error fetching pending requests:', error);
        setPendingRequests([]);
        return;
      }

      console.log('[GroupContext] Setting pending requests:', data?.length || 0, 'requests');
      setPendingRequests(data || []);
    } catch (error) {
      console.error('[GroupContext] Exception fetching pending requests:', error);
      setPendingRequests([]);
    }
  };

  const refreshPendingRequests = async () => {
    await fetchPendingRequests();
  };

  const createGroup = async (name: string, description?: string) => {
    if (!user) return { group: null, error: new Error('Not authenticated') };
    if (!isLeader) return { group: null, error: new Error('Only leaders can create groups') };

    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: group, error: groupError } = await groupsRepo.createGroup({
        name,
        description: description || null,
        code,
        created_by: user.id,
      }) as { data: any; error: any };

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: memberError } = await groupsRepo.addGroupMember({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      });

      if (memberError) throw memberError;

      await fetchGroups();
      return { group, error: null };
    } catch (error) {
      return { group: null, error: error as Error };
    }
  };

  const requestToJoin = async (code: string) => {
    try {
      const { error } = await groupsRepo.requestToJoinGroup(code);

      if (error) throw error;

      await fetchMyPendingRequests();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const { error } = await groupsRepo.approveJoinRequest(requestId);

      if (error) throw error;

      await fetchPendingRequests();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await groupsRepo.rejectJoinRequest(requestId);

      if (error) throw error;

      await fetchPendingRequests();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: GroupRole) => {
    try {
      const { error } = await groupsRepo.updateMemberRole(memberId, newRole);

      if (error) throw error;

      await fetchGroups();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateGroupTimezone = async (groupId: string, timezone: string) => {
    try {
      const { error } = await groupsRepo.updateGroupTimezone(groupId, timezone);

      if (error) throw error;

      await fetchGroups();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        currentGroup,
        setCurrentGroup,
        loading,
        isGroupLeader,
        isGroupAdmin,
        canApproveRequests,
        pendingRequests,
        myPendingRequests,
        refreshGroups: fetchGroups,
        refreshPendingRequests,
        createGroup,
        requestToJoin,
        approveRequest,
        rejectRequest,
        updateMemberRole,
        updateGroupTimezone,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}
