import { Session } from '@supabase/supabase-js';

export interface AuthStateChangeCallback {
  (event: string, session: Session | null): void;
}

export interface AuthSubscription {
  unsubscribe: () => void;
}

export interface AuthService {
  getSession(): Promise<{ data: { session: Session | null }; error: any }>;
  onAuthStateChange(
    callback: AuthStateChangeCallback
  ): { data: { subscription: AuthSubscription } };
  signUp(
    email: string,
    password: string,
    metadata: { full_name: string }
  ): Promise<{ error: Error | null }>;
  signIn(
    email: string,
    password: string
  ): Promise<{ error: Error | null }>;
  signOut(): Promise<void>;
}
