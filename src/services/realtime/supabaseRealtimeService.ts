import { supabase } from '../../lib/supabase';
import { RealtimeService, RealtimeCallbacks, RealtimeSubscription } from './types';

export class SupabaseRealtimeService implements RealtimeService {
  subscribeToTable(
    table: string,
    filter: string,
    callbacks: RealtimeCallbacks
  ): RealtimeSubscription {
    let channel = supabase
      .channel(`${table}:${filter}`);

    if (callbacks.onInsert) {
      const onInsert = callbacks.onInsert;
      channel = channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table,
        filter,
      }, (payload) => onInsert(payload.new));
    }

    if (callbacks.onUpdate) {
      const onUpdate = callbacks.onUpdate;
      channel = channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table,
        filter,
      }, (payload) => onUpdate(payload.new));
    }

    if (callbacks.onDelete) {
      const onDelete = callbacks.onDelete;
      channel = channel.on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table,
        filter,
      }, (payload) => onDelete(payload.old));
    }

    channel.subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  }
}
