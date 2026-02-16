import { supabase } from '../lib/supabase';

export function fetchProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

export function updateProfile(
  userId: string,
  updates: Record<string, any>
) {
  return (supabase
    .from('profiles') as any)
    .update(updates)
    .eq('id', userId);
}
