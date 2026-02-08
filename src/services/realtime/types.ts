export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export interface RealtimeCallbacks {
  onInsert?: (newRecord: any) => void;
  onUpdate?: (newRecord: any) => void;
  onDelete?: (oldRecord: any) => void;
}

export interface RealtimeService {
  subscribeToTable(
    table: string,
    filter: string,
    callbacks: RealtimeCallbacks
  ): RealtimeSubscription;
}
