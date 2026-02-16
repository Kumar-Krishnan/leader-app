import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database';

// Polyfill only needed for React Native, not web
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// SecureStore adapter for React Native only
const NativeSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase'));

// Create client with platform-specific config
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // Only use custom storage on native - web uses built-in localStorage
      ...(Platform.OS !== 'web' && { storage: NativeSecureStoreAdapter }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web', // Enable for web to handle redirects
      // Bypass navigator.locks — Safari leaves stale locks after reload/crash,
      // causing AbortError on all Supabase requests. A simple pass-through is
      // safe since the app doesn't need multi-tab session coordination.
      ...(Platform.OS === 'web' && {
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => await fn(),
      }),
    },
  }
);
