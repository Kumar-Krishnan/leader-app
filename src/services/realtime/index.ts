import { RealtimeService } from './types';
import { SupabaseRealtimeService } from './supabaseRealtimeService';

export const realtimeService: RealtimeService = new SupabaseRealtimeService();
export type { RealtimeService, RealtimeSubscription, RealtimeCallbacks } from './types';
