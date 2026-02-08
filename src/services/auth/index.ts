import { AuthService } from './types';
import { SupabaseAuthService } from './supabaseAuthService';

export const authService: AuthService = new SupabaseAuthService();
export type { AuthService, AuthStateChangeCallback, AuthSubscription } from './types';
