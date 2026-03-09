import { supabase } from '../lib/supabase';
import { AttendeeStatus } from '../types/database';

export function fetchMeetings(groupId: string, includePast: boolean = false) {
  let query = supabase
    .from('meetings')
    .select(`
      *,
      attendees:meeting_attendees(
        id,
        user_id,
        placeholder_id,
        status,
        is_series_rsvp,
        user:profiles(id, full_name, email),
        placeholder:placeholder_profiles(id, full_name, email)
      ),
      co_leaders:meeting_co_leaders(
        id,
        user_id,
        user:profiles(id, full_name, email)
      )
    `)
    .eq('group_id', groupId);

  if (!includePast) {
    query = query.gte('date', new Date().toISOString());
  }

  return query.order('date', { ascending: true });
}

export function updateAttendeeStatus(
  attendeeId: string,
  status: AttendeeStatus,
  isSeriesRsvp: boolean
) {
  return (supabase
    .from('meeting_attendees') as any)
    .update({
      status,
      responded_at: new Date().toISOString(),
      is_series_rsvp: isSeriesRsvp,
    })
    .eq('id', attendeeId);
}

export function updateAttendeesBatch(
  meetingIds: string[],
  userId: string,
  status: AttendeeStatus,
  isSeriesRsvp: boolean
) {
  return (supabase
    .from('meeting_attendees') as any)
    .update({
      status,
      responded_at: new Date().toISOString(),
      is_series_rsvp: isSeriesRsvp,
    })
    .eq('user_id', userId)
    .in('meeting_id', meetingIds);
}

export function deleteMeeting(meetingId: string) {
  return supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId);
}

export function deleteSeries(seriesId: string) {
  return supabase
    .from('meetings')
    .delete()
    .eq('series_id', seriesId);
}

export function updateMeeting(
  meetingId: string,
  updates: { description?: string }
) {
  return (supabase
    .from('meetings') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId);
}

export function updateMeetingDate(meetingId: string, newDate: string) {
  return (supabase
    .from('meetings') as any)
    .update({
      date: newDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId);
}

export function createMeetings(data: any[]) {
  return (supabase
    .from('meetings') as any)
    .insert(data)
    .select();
}

export function createMeetingAttendees(data: any[]) {
  return (supabase
    .from('meeting_attendees') as any)
    .insert(data);
}

export function deleteMeetingAttendees(
  meetingIds: string[],
  memberId: string,
  memberType: 'user' | 'placeholder'
) {
  const column = memberType === 'user' ? 'user_id' : 'placeholder_id';
  return supabase
    .from('meeting_attendees')
    .delete()
    .in('meeting_id', meetingIds)
    .eq(column, memberId);
}

export function fetchMeetingAttendeesByMeetings(meetingIds: string[]) {
  return supabase
    .from('meeting_attendees')
    .select('id, meeting_id, user_id, placeholder_id, status, is_series_rsvp')
    .in('meeting_id', meetingIds);
}

export function updateAttendeeRsvp(
  attendeeId: string,
  status: AttendeeStatus,
  isSeriesRsvp: boolean,
  respondedAt: string | null
) {
  return (supabase
    .from('meeting_attendees') as any)
    .update({
      status,
      is_series_rsvp: isSeriesRsvp,
      responded_at: respondedAt,
    })
    .eq('id', attendeeId);
}

export function createMeetingCoLeaders(data: { meeting_id: string; user_id: string }[]) {
  return (supabase as any)
    .from('meeting_co_leaders')
    .insert(data);
}

export function deleteMeetingCoLeaders(meetingIds: string[], userId: string) {
  return (supabase as any)
    .from('meeting_co_leaders')
    .delete()
    .in('meeting_id', meetingIds)
    .eq('user_id', userId);
}

export function fetchMeetingCoLeadersByMeetings(meetingIds: string[]) {
  return (supabase as any)
    .from('meeting_co_leaders')
    .select('id, meeting_id, user_id')
    .in('meeting_id', meetingIds);
}
