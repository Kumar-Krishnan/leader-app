import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Parish, ParishRole, ParishJoinRequest, ParishJoinRequestWithDetails } from '../types/database';
import { useAuth } from './AuthContext';

interface ParishWithMembership extends Parish {
  role: ParishRole;
  memberId: string;
}

interface ParishContextType {
  parishes: ParishWithMembership[];
  currentParish: ParishWithMembership | null;
  setCurrentParish: (parish: ParishWithMembership | null) => void;
  loading: boolean;
  isParishLeader: boolean;
  isParishAdmin: boolean;
  canApproveRequests: boolean;
  pendingRequests: ParishJoinRequestWithDetails[];
  myPendingRequests: ParishJoinRequest[];
  refreshParishes: () => Promise<void>;
  refreshPendingRequests: () => Promise<void>;
  createParish: (name: string, description?: string) => Promise<{ parish: Parish | null; error: Error | null }>;
  requestToJoin: (code: string) => Promise<{ error: Error | null }>;
  approveRequest: (requestId: string) => Promise<{ error: Error | null }>;
  rejectRequest: (requestId: string) => Promise<{ error: Error | null }>;
  updateMemberRole: (memberId: string, newRole: ParishRole) => Promise<{ error: Error | null }>;
}

const ParishContext = createContext<ParishContextType | undefined>(undefined);

export function ParishProvider({ children }: { children: React.ReactNode }) {
  const { user, isLeader, loading: authLoading } = useAuth();
  const [parishes, setParishes] = useState<ParishWithMembership[]>([]);
  const [currentParish, setCurrentParish] = useState<ParishWithMembership | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ParishJoinRequestWithDetails[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<ParishJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[ParishContext] useEffect, authLoading:', authLoading, 'user:', user?.id);
    
    // Wait for auth to finish loading before making queries
    if (authLoading) {
      console.log('[ParishContext] Auth still loading, waiting...');
      return;
    }
    
    if (user) {
      loadData();
    } else {
      setParishes([]);
      setCurrentParish(null);
      setPendingRequests([]);
      setMyPendingRequests([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (currentParish && canApproveRequests) {
      fetchPendingRequests();
    }
  }, [currentParish]);

  // Persist selected parish to storage
  useEffect(() => {
    if (currentParish) {
      AsyncStorage.setItem('selectedParishId', currentParish.id).catch(err => {
        console.warn('[ParishContext] Failed to save parish to storage:', err);
      });
    }
  }, [currentParish?.id]);

  const loadData = async () => {
    console.log('[ParishContext] loadData starting...');
    setLoading(true);
    try {
      // Fetch parishes first (essential)
      await fetchParishes();
      
      // Fetch pending requests in background (non-blocking)
      // This can fail without breaking the app
      fetchMyPendingRequests().catch(err => {
        console.warn('[ParishContext] Failed to fetch pending requests:', err);
      });
      
      console.log('[ParishContext] loadData complete');
    } catch (error) {
      console.error('[ParishContext] loadData error:', error);
    } finally {
      setLoading(false);
      console.log('[ParishContext] loading set to false');
    }
  };

  const fetchParishes = async () => {
    console.log('[ParishContext] fetchParishes called, user:', user?.id);
    if (!user) {
      console.log('[ParishContext] No user, returning from fetchParishes');
      return;
    }

    try {
      console.log('[ParishContext] Querying parish_members...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from('parish_members')
        .select(`
          id,
          role,
          parish:parishes(*)
        `)
        .eq('user_id', user.id);

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('[ParishContext] parish_members query complete, error:', error, 'data:', data?.length);
      if (error) {
        console.error('Error fetching parishes:', error);
        setParishes([]);
        return;
      }

      const parishList: ParishWithMembership[] = (data || [])
        .filter((item: any) => item.parish)
        .map((item: any) => ({
          ...item.parish,
          role: item.role as ParishRole,
          memberId: item.id,
        }));

      setParishes(parishList);

      // Try to restore last selected parish from storage
      try {
        const savedParishId = await AsyncStorage.getItem('selectedParishId');
        if (savedParishId && parishList.length > 0) {
          const savedParish = parishList.find(p => p.id === savedParishId);
          if (savedParish) {
            console.log('[ParishContext] Restored parish from storage:', savedParish.name);
            setCurrentParish(savedParish);
            return;
          }
        }
      } catch (error) {
        console.warn('[ParishContext] Failed to restore parish from storage:', error);
      }

      // Auto-select first parish if none selected and none saved
      if (parishList.length > 0 && !currentParish) {
        setCurrentParish(parishList[0]);
      } else if (parishList.length === 0) {
        setCurrentParish(null);
      }
    } catch (error) {
      console.error('Error fetching parishes:', error);
      setParishes([]);
    }
  };

  const fetchMyPendingRequests = async () => {
    console.log('[ParishContext] fetchMyPendingRequests called, user:', user?.id);
    if (!user) {
      console.log('[ParishContext] No user, returning from fetchMyPendingRequests');
      return;
    }

    try {
      console.log('[ParishContext] Querying parish_join_requests...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from('parish_join_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('[ParishContext] parish_join_requests query complete, error:', error, 'data:', data?.length);
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
    if (!currentParish) return;

    try {
      const { data, error } = await supabase
        .from('parish_join_requests')
        .select(`
          *,
          user:profiles!user_id(*)
        `)
        .eq('parish_id', currentParish.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending requests:', error);
        setPendingRequests([]);
        return;
      }
      
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setPendingRequests([]);
    }
  };

  const refreshPendingRequests = async () => {
    await fetchPendingRequests();
  };

  const createParish = async (name: string, description?: string) => {
    if (!user) return { parish: null, error: new Error('Not authenticated') };
    if (!isLeader) return { parish: null, error: new Error('Only leaders can create parishes') };

    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: parish, error: parishError } = await supabase
        .from('parishes')
        .insert({
          name,
          description: description || null,
          code,
          created_by: user.id,
        })
        .select()
        .single();

      if (parishError) throw parishError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('parish_members')
        .insert({
          parish_id: parish.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      await fetchParishes();
      return { parish, error: null };
    } catch (error) {
      return { parish: null, error: error as Error };
    }
  };

  const requestToJoin = async (code: string) => {
    try {
      const { error } = await supabase.rpc('request_to_join_parish', {
        parish_code: code.toUpperCase(),
      });

      if (error) throw error;

      await fetchMyPendingRequests();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('approve_join_request', {
        request_id: requestId,
      });

      if (error) throw error;

      await fetchPendingRequests();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('reject_join_request', {
        request_id: requestId,
      });

      if (error) throw error;

      await fetchPendingRequests();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: ParishRole) => {
    try {
      const { error } = await supabase.rpc('update_member_role', {
        member_id: memberId,
        new_role: newRole,
      });

      if (error) throw error;

      await fetchParishes();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const isParishLeader = currentParish?.role === 'leader' || currentParish?.role === 'admin';
  const isParishAdmin = currentParish?.role === 'admin';
  const canApproveRequests = currentParish?.role === 'leader-helper' || currentParish?.role === 'leader' || currentParish?.role === 'admin';

  return (
    <ParishContext.Provider
      value={{
        parishes,
        currentParish,
        setCurrentParish,
        loading,
        isParishLeader,
        isParishAdmin,
        canApproveRequests,
        pendingRequests,
        myPendingRequests,
        refreshParishes: fetchParishes,
        refreshPendingRequests,
        createParish,
        requestToJoin,
        approveRequest,
        rejectRequest,
        updateMemberRole,
      }}
    >
      {children}
    </ParishContext.Provider>
  );
}

export function useParish() {
  const context = useContext(ParishContext);
  if (context === undefined) {
    throw new Error('useParish must be used within a ParishProvider');
  }
  return context;
}
