import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types/database';
import { recordLogin, recordSignup } from '../services/locationAnalytics';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLeader: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] init, isSupabaseConfigured:', isSupabaseConfigured);
    
    // Skip auth if Supabase isn't configured
    if (!isSupabaseConfigured) {
      console.log('[AuthContext] Supabase not configured, setting loading false');
      setLoading(false);
      return;
    }

    // Track current user ID to avoid unnecessary updates
    let currentUserId: string | null = null;

    const initSession = async (retryCount = 0) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthContext] Got session:', !!session, session?.user?.email);
        currentUserId = session?.user?.id ?? null;
        console.log('[AuthContext] Set currentUserId to:', currentUserId);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[AuthContext] getSession error:', err);
        // Retry on AbortError (common in dev with StrictMode)
        if (err?.name === 'AbortError' && retryCount < 2) {
          console.log('[AuthContext] Retrying after AbortError...');
          setTimeout(() => initSession(retryCount + 1), 500);
          return;
        }
        setLoading(false);
      }
    };

    initSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        const newUserId = newSession?.user?.id ?? null;
        console.log('[AuthContext] onAuthStateChange event:', event, 'currentUserId:', currentUserId, 'newUserId:', newUserId);
        
        // Ignore token refreshes entirely
        if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] Token refreshed, ignoring');
          return;
        }
        
        // For SIGNED_IN, only update if user actually changed
        if (event === 'SIGNED_IN' && currentUserId === newUserId) {
          console.log('[AuthContext] SIGNED_IN but same user, ignoring');
          return;
        }
        
        // For INITIAL_SESSION, skip if we already have this user
        if (event === 'INITIAL_SESSION' && currentUserId === newUserId) {
          console.log('[AuthContext] INITIAL_SESSION but same user, ignoring');
          return;
        }
        
        console.log('[AuthContext] Auth state changed, updating from', currentUserId, 'to', newUserId);
        currentUserId = newUserId;
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchProfile(newSession.user.id);
        }
      }
    );

    // Log visibility changes for debugging
    const handleVisibility = () => {
      console.log('[AuthContext] Visibility changed to:', document.visibilityState);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    console.log('[AuthContext] fetchProfile starting for:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      console.log('[AuthContext] fetchProfile got data:', !!data);
      setProfile(data);
      setLoading(false);
    } catch (error: any) {
      console.error('[AuthContext] fetchProfile error:', error);
      // Retry on AbortError
      if (error?.message?.includes('AbortError') && retryCount < 2) {
        console.log('[AuthContext] Retrying fetchProfile after AbortError...');
        setTimeout(() => fetchProfile(userId, retryCount + 1), 500);
        return;
      }
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please add your credentials to .env') };
    }
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Profile is created automatically by database trigger
      
      // Record anonymous location event for analytics
      recordSignup();
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please add your credentials to .env') };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Record anonymous location event for analytics
      recordLogin();
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const isLeader = profile?.role === 'leader' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        isLeader,
        isAdmin,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
