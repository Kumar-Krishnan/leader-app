import { supabase } from '../../lib/supabase';
import { AuthService, AuthStateChangeCallback } from './types';

export class SupabaseAuthService implements AuthService {
  async getSession() {
    return supabase.auth.getSession();
  }

  onAuthStateChange(callback: AuthStateChangeCallback) {
    return supabase.auth.onAuthStateChange(callback as any);
  }

  async signUp(
    email: string,
    password: string,
    metadata: { full_name: string }
  ) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { error: error ? (error as unknown as Error) : null };
  }

  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? (error as unknown as Error) : null };
  }

  async signOut() {
    await supabase.auth.signOut();
  }
}
