import { supabase } from '../lib/supabase';

interface LocationEvent {
  lat: number;
  lng: number;
  event_type: string;
  platform: string;
}

export function insertLocationEvent(event: LocationEvent) {
  return (supabase as any)
    .from('location_events')
    .insert(event);
}
