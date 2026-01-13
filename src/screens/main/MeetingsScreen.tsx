import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { useGroup } from '../../contexts/GroupContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { MeetingWithAttendees } from '../../types/database';
import CreateMeetingModal from '../../components/CreateMeetingModal';

type RSVPStatus = 'invited' | 'accepted' | 'declined' | 'maybe';

interface RSVPModalState {
  visible: boolean;
  meetingId: string;
  attendeeId: string;
  seriesId: string | null;
  status: RSVPStatus;
}

interface DeleteModalState {
  visible: boolean;
  meetingId: string;
  seriesId: string | null;
}

export default function MeetingsScreen() {
  const { currentGroup, isGroupLeader } = useGroup();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithAttendees[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rsvpModal, setRsvpModal] = useState<RSVPModalState>({
    visible: false,
    meetingId: '',
    attendeeId: '',
    seriesId: null,
    status: 'accepted',
  });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    visible: false,
    meetingId: '',
    seriesId: null,
  });

  useEffect(() => {
    if (currentGroup) {
      fetchMeetings();
    } else {
      setLoading(false);
    }
  }, [currentGroup?.id]);

  const fetchMeetings = async () => {
    if (!currentGroup) return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          attendees:meeting_attendees(
            id,
            user_id,
            status,
            user:profiles(id, full_name, email)
          )
        `)
        .eq('group_id', currentGroup.id)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if meeting is part of a series and show modal if so
  const initiateRSVP = (meeting: MeetingWithAttendees, attendeeId: string, status: RSVPStatus) => {
    if (meeting.series_id) {
      // Show modal to ask about series RSVP
      setRsvpModal({
        visible: true,
        meetingId: meeting.id,
        attendeeId,
        seriesId: meeting.series_id,
        status,
      });
    } else {
      // No series, just RSVP to this event
      handleSingleRSVP(meeting.id, attendeeId, status);
    }
  };

  // RSVP to a single event only
  const handleSingleRSVP = async (meetingId: string, attendeeId: string, status: RSVPStatus) => {
    try {
      const { error } = await supabase
        .from('meeting_attendees')
        .update({ 
          status, 
          responded_at: new Date().toISOString(),
          is_series_rsvp: false,
        })
        .eq('id', attendeeId);

      if (error) throw error;

      // Update local state
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
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  };

  // RSVP to all events in a series
  const handleSeriesRSVP = async (seriesId: string, status: RSVPStatus) => {
    if (!user) return;

    try {
      // Get all meeting IDs in this series
      const seriesMeetingIds = meetings
        .filter(m => m.series_id === seriesId)
        .map(m => m.id);

      // Update all attendee records for this user in this series
      const { error } = await supabase
        .from('meeting_attendees')
        .update({ 
          status, 
          responded_at: new Date().toISOString(),
          is_series_rsvp: true,
        })
        .eq('user_id', user.id)
        .in('meeting_id', seriesMeetingIds);

      if (error) throw error;

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
    } catch (error) {
      console.error('Error updating series RSVP:', error);
    }
  };

  // Handle modal response
  const handleRSVPModalResponse = async (applyToAll: boolean) => {
    const { meetingId, attendeeId, seriesId, status } = rsvpModal;
    setRsvpModal(prev => ({ ...prev, visible: false }));

    if (applyToAll && seriesId) {
      await handleSeriesRSVP(seriesId, status);
    } else {
      await handleSingleRSVP(meetingId, attendeeId, status);
    }
  };

  // Initiate delete - check if part of series
  const initiateDelete = (meeting: MeetingWithAttendees) => {
    if (meeting.series_id) {
      // Show modal to ask about series delete
      setDeleteModal({
        visible: true,
        meetingId: meeting.id,
        seriesId: meeting.series_id,
      });
    } else {
      // No series, just confirm single delete
      confirmSingleDelete(meeting.id);
    }
  };

  // Confirm and delete a single meeting
  const confirmSingleDelete = (meetingId: string) => {
    const performDelete = async () => {
      try {
        const { error } = await supabase
          .from('meetings')
          .delete()
          .eq('id', meetingId);

        if (error) throw error;

        setMeetings(prev => prev.filter(m => m.id !== meetingId));
      } catch (error) {
        console.error('Error deleting meeting:', error);
        if (Platform.OS === 'web') {
          window.alert('Failed to delete meeting');
        } else {
          Alert.alert('Error', 'Failed to delete meeting');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this event?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Event',
        'Are you sure you want to delete this event?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  // Delete all meetings in a series
  const handleDeleteSeries = async (seriesId: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('series_id', seriesId);

      if (error) throw error;

      // Update local state
      setMeetings(prev => prev.filter(m => m.series_id !== seriesId));
    } catch (error) {
      console.error('Error deleting series:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete series');
      } else {
        Alert.alert('Error', 'Failed to delete series');
      }
    }
  };

  // Handle delete modal response
  const handleDeleteModalResponse = async (deleteAll: boolean) => {
    const { meetingId, seriesId } = deleteModal;
    setDeleteModal(prev => ({ ...prev, visible: false }));

    if (deleteAll && seriesId) {
      await handleDeleteSeries(seriesId);
    } else {
      // Delete just this one (no confirmation needed, modal already confirmed)
      try {
        const { error } = await supabase
          .from('meetings')
          .delete()
          .eq('id', meetingId);

        if (error) throw error;
        setMeetings(prev => prev.filter(m => m.id !== meetingId));
      } catch (error) {
        console.error('Error deleting meeting:', error);
      }
    }
  };

  const renderMeeting = ({ item }: { item: MeetingWithAttendees }) => {
    const attendeeCount = item.attendees?.length || 0;
    const acceptedCount = item.attendees?.filter(a => a.status === 'accepted').length || 0;
    
    // Find current user's attendance record
    const myAttendance = item.attendees?.find(a => a.user_id === user?.id);
    const myStatus = myAttendance?.status;
    
    return (
      <View style={styles.meetingCard}>
        <View style={styles.meetingHeader}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
          </View>
          <View style={styles.meetingInfo}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.meetingTitle}>{item.title}</Text>
                {item.series_id && item.series_index && item.series_total && (
                  <View style={styles.seriesBadge}>
                    <Text style={styles.seriesBadgeText}>
                      {item.series_index}/{item.series_total}
                    </Text>
                  </View>
                )}
              </View>
              {isGroupLeader && (
                <TouchableOpacity 
                  onPress={() => initiateDelete(item)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.meetingDetails}>
              {new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {item.location ? ` • ${item.location}` : ''}
            </Text>
            
            {attendeeCount > 0 && (
              <View style={styles.attendeesRow}>
                <View style={styles.attendeeAvatars}>
                  {item.attendees?.slice(0, 4).map((attendee, idx) => (
                    <View 
                      key={attendee.id} 
                      style={[
                        styles.attendeeAvatar,
                        { marginLeft: idx > 0 ? -8 : 0, zIndex: 4 - idx },
                        attendee.status === 'accepted' && styles.attendeeAvatarAccepted,
                        attendee.status === 'declined' && styles.attendeeAvatarDeclined,
                      ]}
                    >
                      <Text style={styles.attendeeAvatarText}>
                        {attendee.user?.full_name?.[0] || '?'}
                      </Text>
                    </View>
                  ))}
                  {attendeeCount > 4 && (
                    <View style={[styles.attendeeAvatar, styles.attendeeAvatarMore, { marginLeft: -8, zIndex: 0 }]}>
                      <Text style={styles.attendeeAvatarText}>+{attendeeCount - 4}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.attendeeCount}>
                  {acceptedCount > 0 ? `${acceptedCount} attending` : `${attendeeCount} invited`}
                </Text>
              </View>
            )}

            {item.passages && item.passages.length > 0 && (
              <View style={styles.passagesContainer}>
                {item.passages.map((passage, idx) => (
                  <View key={idx} style={styles.passageBadge}>
                    <Text style={styles.passageText}>{passage}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        
        {/* RSVP Section */}
        {myAttendance && (
          <View style={styles.rsvpSection}>
            <Text style={styles.rsvpLabel}>
              {myStatus === 'invited' ? 'Are you attending?' : 'Your response:'}
              {myAttendance.is_series_rsvp && item.series_id && ' (series)'}
            </Text>
            <View style={styles.rsvpButtons}>
              <TouchableOpacity
                style={[styles.rsvpButton, myStatus === 'accepted' && styles.rsvpButtonAccepted]}
                onPress={() => initiateRSVP(item, myAttendance.id, 'accepted')}
              >
                <Text style={[styles.rsvpButtonText, myStatus === 'accepted' && styles.rsvpButtonTextActive]}>
                  ✓ Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpButton, myStatus === 'maybe' && styles.rsvpButtonMaybe]}
                onPress={() => initiateRSVP(item, myAttendance.id, 'maybe')}
              >
                <Text style={[styles.rsvpButtonText, myStatus === 'maybe' && styles.rsvpButtonTextActive]}>
                  ? Maybe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpButton, myStatus === 'declined' && styles.rsvpButtonDeclined]}
                onPress={() => initiateRSVP(item, myAttendance.id, 'declined')}
              >
                <Text style={[styles.rsvpButtonText, myStatus === 'declined' && styles.rsvpButtonTextActive]}>
                  ✗ No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyTitle}>No upcoming events</Text>
      <Text style={styles.emptyText}>
        {isGroupLeader 
          ? 'Schedule an event to get your group together.'
          : 'Upcoming events will appear here.'}
      </Text>
      {isGroupLeader && (
        <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.emptyButtonText}>Create Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator testID="activity-indicator" size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Events</Text>
          <Text style={styles.groupName}>{currentGroup?.name}</Text>
        </View>
        {isGroupLeader && (
          <TouchableOpacity style={styles.newButton} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={meetings}
        renderItem={renderMeeting}
        keyExtractor={(item) => item.id}
        contentContainerStyle={meetings.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
      
      <CreateMeetingModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchMeetings}
      />

      {/* Series RSVP Modal */}
      <Modal
        visible={rsvpModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRsvpModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply to all events?</Text>
            <Text style={styles.modalText}>
              This event is part of a recurring series. Would you like to apply your response to all events in this series?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => handleRSVPModalResponse(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Just this event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => handleRSVPModalResponse(true)}
              >
                <Text style={styles.modalButtonPrimaryText}>All in series</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Series Delete Modal */}
      <Modal
        visible={deleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete recurring event?</Text>
            <Text style={styles.modalText}>
              This event is part of a recurring series. Would you like to delete just this event or all events in the series?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => handleDeleteModalResponse(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Just this event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonDestructive}
                onPress={() => handleDeleteModalResponse(true)}
              >
                <Text style={styles.modalButtonPrimaryText}>Delete all</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setDeleteModal(prev => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  groupName: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 4,
  },
  newButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
    padding: 20,
  },
  meetingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateBox: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 60,
  },
  dateMonth: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '600',
  },
  dateDay: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  meetingInfo: {
    flex: 1,
    marginLeft: 16,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  meetingDetails: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  attendeeAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  attendeeAvatarMore: {
    backgroundColor: '#475569',
  },
  attendeeAvatarAccepted: {
    backgroundColor: '#22C55E',
  },
  attendeeAvatarDeclined: {
    backgroundColor: '#EF4444',
    opacity: 0.6,
  },
  attendeeAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  attendeeCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  passagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  passageBadge: {
    backgroundColor: '#164E63',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passageText: {
    color: '#67E8F9',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rsvpSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  rsvpLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  rsvpButtonAccepted: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  rsvpButtonMaybe: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  rsvpButtonDeclined: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  rsvpButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  rsvpButtonTextActive: {
    color: '#F8FAFC',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seriesBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  seriesBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonDestructive: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
});
