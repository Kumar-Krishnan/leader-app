import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
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

    // Check what's in localStorage for debugging
    if (typeof localStorage !== 'undefined') {
      const authKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth'));
      console.log('[AuthContext] Auth keys in localStorage:', authKeys);
      authKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          console.log(`[AuthContext] ${key}:`, value?.substring(0, 100) + '...');
        } catch (e) {
          console.error(`[AuthContext] Error reading ${key}:`, e);
        }
      });
    }

    // Get initial session with timeout (handles corrupted cache)
    console.log('[AuthContext] Calling getSession()...');
    const timeoutId = setTimeout(async () => {
      console.warn('[AuthContext] getSession timed out after 3s');
      
      // Check if we already tried to recover (prevent infinite loop)
      const recoveryAttempted = sessionStorage.getItem('auth_recovery_attempted');
      
      if (typeof localStorage !== 'undefined' && !recoveryAttempted) {
        console.log('[AuthContext] Clearing corrupted session and reloading...');
        // Mark that we attempted recovery
        sessionStorage.setItem('auth_recovery_attempted', 'true');
        
        // Clear corrupted auth data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            console.log('[AuthContext] Removing:', key);
            localStorage.removeItem(key);
          }
        });
        
        // Reload to get fresh client
        window.location.reload();
        return;
      }
      
      // Already tried recovery, just show login
      console.log('[AuthContext] Recovery already attempted, showing login');
      sessionStorage.removeItem('auth_recovery_attempted');
      setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      console.log('[AuthContext] Got session:', !!session, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.error('[AuthContext] getSession error:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
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
    } catch (error) {
      console.error('[AuthContext] fetchProfile error:', error);
    } finally {
      console.log('[AuthContext] fetchProfile complete, setting loading false');
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
