import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MeetingWithAttendees } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';

/**
 * RSVP status type
 */
export type RSVPStatus = 'invited' | 'accepted' | 'declined' | 'maybe';

/**
 * Return type for the useMeetings hook
 */
export interface UseMeetingsResult {
  /** List of upcoming meetings for the current group */
  meetings: MeetingWithAttendees[];
  /** Whether meetings are currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refresh the meeting list */
  refetch: () => Promise<void>;
  /** RSVP to a single meeting */
  rsvpToMeeting: (meetingId: string, attendeeId: string, status: RSVPStatus) => Promise<boolean>;
  /** RSVP to all meetings in a series */
  rsvpToSeries: (seriesId: string, status: RSVPStatus) => Promise<boolean>;
  /** Delete a single meeting */
  deleteMeeting: (meetingId: string) => Promise<boolean>;
  /** Delete all meetings in a series */
  deleteSeries: (seriesId: string) => Promise<boolean>;
}

/**
 * Hook for managing meetings in the current group
 * 
 * Encapsulates all meeting-related state and operations:
 * - Fetching upcoming meetings with attendees
 * - RSVP functionality (single and series)
 * - Delete functionality (single and series)
 * - Error handling
 * 
 * @example
 * ```tsx
 * function MeetingsScreen() {
 *   const { meetings, loading, rsvpToMeeting, deleteMeeting } = useMeetings();
 *   
 *   if (loading) return <LoadingSpinner />;
 *   
 *   return <MeetingList meetings={meetings} />;
 * }
 * ```
 */
export function useMeetings(): UseMeetingsResult {
  const { user } = useAuth();
  const { currentGroup } = useGroup();
  
  const [meetings, setMeetings] = useState<MeetingWithAttendees[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all upcoming meetings for the current group with attendees
   */
  const fetchMeetings = useCallback(async () => {
    if (!currentGroup) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('meetings')
        .select(`
          *,
          attendees:meeting_attendees(
            id,
            user_id,
            status,
            is_series_rsvp,
            user:profiles(id, full_name, email)
          )
        `)
        .eq('group_id', currentGroup.id)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;
      
      setMeetings(data || []);
    } catch (err: any) {
      console.error('[useMeetings] Error fetching meetings:', err);
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [currentGroup]);

  /**
   * RSVP to a single meeting
   */
  const rsvpToMeeting = useCallback(async (
    meetingId: string, 
    attendeeId: string, 
    status: RSVPStatus
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('meeting_attendees')
        .update({ 
          status, 
          responded_at: new Date().toISOString(),
          is_series_rsvp: false,
        })
        .eq('id', attendeeId);

      if (updateError) throw updateError;

      // Update local state immediately (optimistic update)
      setMeetings(prev => prev.map(meeting => {
        if (meeting.id === meetingId) {
          return {
            ...meeting,
            attendees: meeting.attendees?.map(a => 
              a.id === attendeeId ? { ...a, status, is_series_rsvp: false } : a
            ),
          };
        }
        return meeting;
      }));

      return true;
    } catch (err: any) {
      console.error('[useMeetings] Error updating RSVP:', err);
      setError(err.message || 'Failed to update RSVP');
      return false;
    }
  }, []);

  /**
   * RSVP to all meetings in a series
   */
  const rsvpToSeries = useCallback(async (
    seriesId: string, 
    status: RSVPStatus
  ): Promise<boolean> => {
    if (!user) {
      setError('Not authenticated');
      return false;
    }

    try {
      // Get all meeting IDs in this series
      const seriesMeetingIds = meetings
        .filter(m => m.series_id === seriesId)
        .map(m => m.id);

      if (seriesMeetingIds.length === 0) {
        setError('No meetings found in series');
        return false;
      }

      // Update all attendee records for this user in this series
      const { error: updateError } = await supabase
        .from('meeting_attendees')
        .update({ 
          status, 
          responded_at: new Date().toISOString(),
          is_series_rsvp: true,
        })
        .eq('user_id', user.id)
        .in('meeting_id', seriesMeetingIds);

      if (updateError) throw updateError;

      // Update local state for all meetings in the series
      setMeetings(prev => prev.map(meeting => {
        if (meeting.series_id === seriesId) {
          return {
            ...meeting,
            attendees: meeting.attendees?.map(a => 
              a.user_id === user.id ? { ...a, status, is_series_rsvp: true } : a
            ),
          };
        }
        return meeting;
      }));

      return true;
    } catch (err: any) {
      console.error('[useMeetings] Error updating series RSVP:', err);
      setError(err.message || 'Failed to update series RSVP');
      return false;
    }
  }, [user, meetings]);

  /**
   * Delete a single meeting
   */
  const deleteMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMeetings(prev => prev.filter(m => m.id !== meetingId));

      return true;
    } catch (err: any) {
      console.error('[useMeetings] Error deleting meeting:', err);
      setError(err.message || 'Failed to delete meeting');
      return false;
    }
  }, []);

  /**
   * Delete all meetings in a series
   */
  const deleteSeries = useCallback(async (seriesId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('series_id', seriesId);

      if (deleteError) throw deleteError;

      // Remove all meetings in series from local state
      setMeetings(prev => prev.filter(m => m.series_id !== seriesId));

      return true;
    } catch (err: any) {
      console.error('[useMeetings] Error deleting series:', err);
      setError(err.message || 'Failed to delete series');
      return false;
    }
  }, []);

  // Fetch meetings when group changes
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    loading,
    error,
    refetch: fetchMeetings,
    rsvpToMeeting,
    rsvpToSeries,
    deleteMeeting,
    deleteSeries,
  };
}

