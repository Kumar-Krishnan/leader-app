import { useState, useEffect, useCallback } from 'react';
import * as meetingsRepo from '../repositories/meetingsRepo';
import { emailService } from '../services/email';
import { MeetingWithAttendees } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { useErrorHandler } from './useErrorHandler';
import { logger } from '../lib/logger';

/**
 * RSVP status type
 */
export type RSVPStatus = 'invited' | 'accepted' | 'declined' | 'maybe';

/**
 * Return type for the useMeetings hook
 */
export interface UseMeetingsResult {
  /** List of meetings for the current group (upcoming only unless includePast is set) */
  meetings: MeetingWithAttendees[];
  /** Whether meetings are currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether an email is currently being sent */
  sendingEmail: boolean;
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
  /** Update a single meeting's fields */
  updateMeeting: (meetingId: string, updates: { description?: string }) => Promise<boolean>;
  /** Get all meetings in a series, sorted by series_index */
  getSeriesMeetings: (seriesId: string) => MeetingWithAttendees[];
  /** Skip a meeting - moves it and all subsequent meetings forward by one frequency interval */
  skipMeeting: (meetingId: string) => Promise<boolean>;
  /** Send email notification for a meeting to all attendees */
  sendMeetingEmail: (
    meetingId: string,
    customDescription?: string,
    customMessage?: string,
    descriptionFirst?: boolean
  ) => Promise<boolean>;
}

/**
 * Hook for managing meetings in the current group
 *
 * Encapsulates all meeting-related state and operations:
 * - Fetching all meetings with attendees
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
export function useMeetings(options?: { includePast?: boolean }): UseMeetingsResult {
  const includePast = options?.includePast ?? false;
  const { user, profile } = useAuth();
  const { currentGroup } = useGroup();
  const { error, setError, handleError, clearError } = useErrorHandler({
    context: 'useMeetings'
  });

  const [meetings, setMeetings] = useState<MeetingWithAttendees[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  /**
   * Fetch meetings for the current group with attendees.
   * When includePast is false (default), only fetches upcoming meetings.
   */
  const fetchMeetings = useCallback(async () => {
    if (!currentGroup) {
      setLoading(false);
      return;
    }

    setLoading(true);
    clearError();

    try {
      const { data, error: fetchError } = await meetingsRepo.fetchMeetings(currentGroup.id, includePast);

      if (fetchError) throw fetchError;

      setMeetings(data || []);
    } catch (err) {
      handleError(err, 'fetchMeetings');
    } finally {
      setLoading(false);
    }
  }, [currentGroup, includePast, clearError, handleError]);

  /**
   * RSVP to a single meeting
   */
  const rsvpToMeeting = useCallback(async (
    meetingId: string,
    attendeeId: string,
    status: RSVPStatus
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await meetingsRepo.updateAttendeeStatus(attendeeId, status, false);

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
    } catch (err) {
      handleError(err, 'rsvpToMeeting');
      return false;
    }
  }, [handleError]);

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
      const { error: updateError } = await meetingsRepo.updateAttendeesBatch(
        seriesMeetingIds, user.id, status, true
      );

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
    } catch (err) {
      handleError(err, 'rsvpToSeries');
      return false;
    }
  }, [user, meetings, handleError]);

  /**
   * Delete a single meeting
   */
  const deleteMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await meetingsRepo.deleteMeeting(meetingId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMeetings(prev => prev.filter(m => m.id !== meetingId));

      return true;
    } catch (err) {
      handleError(err, 'deleteMeeting');
      return false;
    }
  }, [handleError]);

  /**
   * Delete all meetings in a series
   */
  const deleteSeries = useCallback(async (seriesId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await meetingsRepo.deleteSeries(seriesId);

      if (deleteError) throw deleteError;

      // Remove all meetings in series from local state
      setMeetings(prev => prev.filter(m => m.series_id !== seriesId));

      return true;
    } catch (err) {
      handleError(err, 'deleteSeries');
      return false;
    }
  }, [handleError]);

  /**
   * Update a single meeting's fields (e.g., description)
   */
  const updateMeeting = useCallback(async (
    meetingId: string,
    updates: { description?: string }
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await meetingsRepo.updateMeeting(meetingId, updates);

      if (updateError) throw updateError;

      // Update local state immediately (optimistic update)
      setMeetings(prev => prev.map(meeting => {
        if (meeting.id === meetingId) {
          return {
            ...meeting,
            ...updates,
          };
        }
        return meeting;
      }));

      return true;
    } catch (err) {
      handleError(err, 'updateMeeting');
      return false;
    }
  }, [handleError]);

  /**
   * Get all meetings in a series, sorted by series_index
   */
  const getSeriesMeetings = useCallback((seriesId: string): MeetingWithAttendees[] => {
    return meetings
      .filter(m => m.series_id === seriesId)
      .sort((a, b) => (a.series_index || 0) - (b.series_index || 0));
  }, [meetings]);

  /**
   * Skip a meeting - moves it and all subsequent meetings forward by one frequency interval.
   *
   * Behavior:
   * - Meeting dates shift forward by one frequency interval
   * - Descriptions stay with their meeting records (move with the dates)
   * - For attendees who RSVPed to the whole series: RSVPs are preserved
   * - For attendees who RSVPed to specific dates only:
   *   - If they have a series preference (from another meeting), revert to that preference
   *   - Otherwise, reset to 'invited'
   */
  const skipMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      // Find the meeting to skip
      const meetingToSkip = meetings.find(m => m.id === meetingId);
      if (!meetingToSkip || !meetingToSkip.series_id) {
        setError('Meeting not found or not part of a series');
        return false;
      }

      // Get all meetings in the series, sorted by index
      const seriesMeetings = meetings
        .filter(m => m.series_id === meetingToSkip.series_id)
        .sort((a, b) => (a.series_index || 0) - (b.series_index || 0));

      if (seriesMeetings.length < 2) {
        setError('Cannot determine frequency with only one meeting');
        return false;
      }

      // Build a map of user_id -> series preference status
      // This captures what users originally RSVPed to the series as
      const seriesPreferences = new Map<string, RSVPStatus>();
      for (const meeting of seriesMeetings) {
        for (const attendee of meeting.attendees || []) {
          // Only capture series RSVPs (is_series_rsvp = true)
          if (attendee.is_series_rsvp && attendee.user_id && !seriesPreferences.has(attendee.user_id)) {
            seriesPreferences.set(attendee.user_id, attendee.status as RSVPStatus);
          }
        }
      }

      // Calculate frequency from first two meetings (in milliseconds)
      const firstDate = new Date(seriesMeetings[0].date).getTime();
      const secondDate = new Date(seriesMeetings[1].date).getTime();
      const frequencyMs = secondDate - firstDate;

      // Find meetings to update (this meeting and all subsequent ones)
      const meetingsToUpdate = seriesMeetings.filter(
        m => (m.series_index || 0) >= (meetingToSkip.series_index || 0)
      );

      // Update each meeting's date and revert non-series RSVPs
      for (const meeting of meetingsToUpdate) {
        const currentDate = new Date(meeting.date);
        const newDate = new Date(currentDate.getTime() + frequencyMs);

        // Update meeting date
        const { error: updateError } = await meetingsRepo.updateMeetingDate(
          meeting.id, newDate.toISOString()
        );

        if (updateError) throw updateError;

        // For each attendee with non-series RSVP, update to their series preference or 'invited'
        for (const attendee of meeting.attendees || []) {
          if (!attendee.is_series_rsvp && attendee.user_id) {
            const seriesStatus = seriesPreferences.get(attendee.user_id);
            const newStatus = seriesStatus || 'invited';

            const { error: rsvpError } = await meetingsRepo.updateAttendeeRsvp(
              attendee.id,
              newStatus,
              seriesStatus ? true : false,
              seriesStatus ? new Date().toISOString() : null
            );

            if (rsvpError) throw rsvpError;
          }
        }
      }

      // Update local state - dates and RSVPs
      setMeetings(prev => prev.map(meeting => {
        const shouldUpdate = meetingsToUpdate.some(m => m.id === meeting.id);
        if (shouldUpdate) {
          const currentDate = new Date(meeting.date);
          const newDate = new Date(currentDate.getTime() + frequencyMs);
          return {
            ...meeting,
            date: newDate.toISOString(),
            attendees: meeting.attendees?.map(a => {
              if (a.is_series_rsvp) {
                return a; // Keep series RSVP intact
              }
              // Revert to series preference or 'invited'
              const seriesStatus = a.user_id ? seriesPreferences.get(a.user_id) : undefined;
              if (seriesStatus) {
                return { ...a, status: seriesStatus, is_series_rsvp: true };
              }
              return { ...a, status: 'invited' as const };
            }),
          };
        }
        return meeting;
      }));

      return true;
    } catch (err) {
      handleError(err, 'skipMeeting');
      return false;
    }
  }, [meetings, handleError]);

  /**
   * Send email notification for a meeting to all attendees
   */
  const sendMeetingEmail = useCallback(async (
    meetingId: string,
    customDescription?: string,
    customMessage?: string,
    descriptionFirst: boolean = true
  ): Promise<boolean> => {
    if (!user) {
      setError('Not authenticated');
      return false;
    }

    setSendingEmail(true);
    clearError();

    try {
      const result = await emailService.sendMeetingEmail({
        meetingId,
        customDescription: customDescription !== undefined ? customDescription : null,
        customMessage: customMessage || null,
        descriptionFirst,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('useMeetings', 'Meeting email sent successfully', { meetingId });

      return true;
    } catch (err) {
      handleError(err, 'sendMeetingEmail');
      return false;
    } finally {
      setSendingEmail(false);
    }
  }, [user, clearError, handleError]);

  // Fetch meetings when group changes
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    loading,
    error,
    sendingEmail,
    refetch: fetchMeetings,
    rsvpToMeeting,
    rsvpToSeries,
    deleteMeeting,
    deleteSeries,
    updateMeeting,
    getSeriesMeetings,
    skipMeeting,
    sendMeetingEmail,
  };
}
