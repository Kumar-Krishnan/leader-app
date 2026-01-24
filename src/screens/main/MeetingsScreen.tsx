import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useGroup } from '../../contexts/GroupContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMeetings, RSVPStatus } from '../../hooks/useMeetings';
import { MeetingWithAttendees } from '../../types/database';
import CreateMeetingModal from '../../components/CreateMeetingModal';
import MeetingSeriesEditorModal from '../../components/MeetingSeriesEditorModal';
import Avatar from '../../components/Avatar';
import ScreenHeader from '../../components/ScreenHeader';
import { showAlert, showDestructiveConfirm } from '../../lib/errors';

// Display item can be either a single meeting or a series (represented by its next meeting)
interface DisplayItem {
  type: 'single' | 'series';
  meeting: MeetingWithAttendees; // For series, this is the next upcoming meeting
  seriesMeetings?: MeetingWithAttendees[]; // All meetings in the series (for series type)
}

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

interface SeriesEditorModalState {
  visible: boolean;
  seriesId: string;
  seriesTitle: string;
}

interface SeriesViewModalState {
  visible: boolean;
  seriesId: string;
  seriesTitle: string;
  meetings: MeetingWithAttendees[];
}

export default function MeetingsScreen() {
  const { isGroupLeader } = useGroup();
  const { user } = useAuth();
  
  // Use the useMeetings hook for all data and operations
  const {
    meetings,
    loading,
    refetch,
    rsvpToMeeting,
    rsvpToSeries,
    deleteMeeting,
    deleteSeries,
    updateMeeting,
    getSeriesMeetings,
    skipMeeting,
  } = useMeetings();
  
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
  const [seriesEditorModal, setSeriesEditorModal] = useState<SeriesEditorModalState>({
    visible: false,
    seriesId: '',
    seriesTitle: '',
  });
  const [seriesViewModal, setSeriesViewModal] = useState<SeriesViewModalState>({
    visible: false,
    seriesId: '',
    seriesTitle: '',
    meetings: [],
  });

  // Group meetings: standalone meetings + one entry per series (showing next upcoming meeting)
  const displayItems = useMemo((): DisplayItem[] => {
    const items: DisplayItem[] = [];
    const processedSeriesIds = new Set<string>();

    // Sort meetings by date
    const sortedMeetings = [...meetings].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const meeting of sortedMeetings) {
      if (!meeting.series_id) {
        // Standalone meeting
        items.push({ type: 'single', meeting });
      } else if (!processedSeriesIds.has(meeting.series_id)) {
        // First (next upcoming) meeting in this series
        processedSeriesIds.add(meeting.series_id);
        const seriesMeetings = getSeriesMeetings(meeting.series_id);
        items.push({
          type: 'series',
          meeting, // This is the next upcoming meeting
          seriesMeetings,
        });
      }
      // Skip subsequent meetings in already-processed series
    }

    return items;
  }, [meetings, getSeriesMeetings]);

  // Open series view modal
  const openSeriesView = (item: DisplayItem) => {
    if (item.type === 'series' && item.seriesMeetings) {
      setSeriesViewModal({
        visible: true,
        seriesId: item.meeting.series_id!,
        seriesTitle: item.meeting.title,
        meetings: item.seriesMeetings,
      });
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
      rsvpToMeeting(meeting.id, attendeeId, status);
    }
  };

  // Handle modal response
  const handleRSVPModalResponse = async (applyToAll: boolean) => {
    const { meetingId, attendeeId, seriesId, status } = rsvpModal;
    setRsvpModal(prev => ({ ...prev, visible: false }));

    if (applyToAll && seriesId) {
      await rsvpToSeries(seriesId, status);
    } else {
      await rsvpToMeeting(meetingId, attendeeId, status);
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
  const confirmSingleDelete = async (meetingId: string) => {
    const confirmed = await showDestructiveConfirm(
      'Delete Event',
      'Are you sure you want to delete this event?',
      'Delete'
    );

    if (confirmed) {
      const success = await deleteMeeting(meetingId);
      if (!success) {
        showAlert('Error', 'Failed to delete meeting');
      }
    }
  };

  // Handle delete modal response
  const handleDeleteModalResponse = async (deleteAll: boolean) => {
    const { meetingId, seriesId } = deleteModal;
    setDeleteModal(prev => ({ ...prev, visible: false }));

    if (deleteAll && seriesId) {
      const success = await deleteSeries(seriesId);
      if (!success) {
        showAlert('Error', 'Failed to delete series');
      }
    } else {
      const success = await deleteMeeting(meetingId);
      if (!success) {
        showAlert('Error', 'Failed to delete meeting');
      }
    }
  };

  // Open series editor modal
  const openSeriesEditor = (meeting: MeetingWithAttendees) => {
    if (meeting.series_id) {
      setSeriesEditorModal({
        visible: true,
        seriesId: meeting.series_id,
        seriesTitle: meeting.title,
      });
    }
  };

  // Handle meeting created - refetch and optionally open series editor
  const handleMeetingCreated = async (seriesInfo?: { seriesId: string; seriesTitle: string }) => {
    await refetch();
    if (seriesInfo) {
      // Open series editor for the newly created series
      setSeriesEditorModal({
        visible: true,
        seriesId: seriesInfo.seriesId,
        seriesTitle: seriesInfo.seriesTitle,
      });
    }
  };

  const renderMeetingCard = (meeting: MeetingWithAttendees, isSeries: boolean = false, seriesCount?: number) => {
    const attendeeCount = meeting.attendees?.length || 0;
    const acceptedCount = meeting.attendees?.filter(a => a.status === 'accepted').length || 0;

    // Find current user's attendance record
    const myAttendance = meeting.attendees?.find(a => a.user_id === user?.id);
    const myStatus = myAttendance?.status;

    return (
      <>
        <View style={styles.meetingHeader}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>
              {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={styles.dateDay}>{new Date(meeting.date).getDate()}</Text>
          </View>
          <View style={styles.meetingInfo}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.meetingTitle}>{meeting.title}</Text>
                {isSeries && seriesCount && (
                  <View style={styles.seriesBadge}>
                    <Text style={styles.seriesBadgeText}>
                      {seriesCount} meetings
                    </Text>
                  </View>
                )}
              </View>
              {isGroupLeader && !isSeries && (
                <TouchableOpacity
                  onPress={() => initiateDelete(meeting)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.meetingDetails}>
              {isSeries ? 'Next: ' : ''}
              {new Date(meeting.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {meeting.location ? ` • ${meeting.location}` : ''}
            </Text>

            {attendeeCount > 0 && (
              <View style={styles.attendeesRow}>
                <View style={styles.attendeeAvatars}>
                  {meeting.attendees?.slice(0, 4).map((attendee, idx) => (
                    <View
                      key={attendee.id}
                      style={[
                        styles.attendeeAvatarWrapper,
                        { marginLeft: idx > 0 ? -8 : 0, zIndex: 4 - idx },
                        attendee.status === 'accepted' && styles.attendeeAvatarAccepted,
                        attendee.status === 'declined' && styles.attendeeAvatarDeclined,
                      ]}
                    >
                      <Avatar
                        uri={attendee.user?.avatar_url}
                        name={attendee.user?.full_name}
                        size={22}
                      />
                    </View>
                  ))}
                  {attendeeCount > 4 && (
                    <View style={[styles.attendeeAvatarWrapper, styles.attendeeAvatarMore, { marginLeft: -8, zIndex: 0 }]}>
                      <Text style={styles.attendeeAvatarText}>+{attendeeCount - 4}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.attendeeCount}>
                  {acceptedCount > 0 ? `${acceptedCount} attending` : `${attendeeCount} invited`}
                </Text>
              </View>
            )}

            {meeting.passages && meeting.passages.length > 0 && (
              <View style={styles.passagesContainer}>
                {meeting.passages.map((passage, idx) => (
                  <View key={idx} style={styles.passageBadge}>
                    <Text style={styles.passageText}>{passage}</Text>
                  </View>
                ))}
              </View>
            )}

            {isSeries && (
              <Text style={styles.viewSeriesHint}>Tap to view all meetings</Text>
            )}
          </View>
        </View>

        {/* Skip button for series - allows skipping upcoming meeting from main view */}
        {isSeries && meeting.created_by === user?.id && isGroupLeader && (
          <View style={styles.seriesSkipSection}>
            <TouchableOpacity
              style={styles.seriesSkipButton}
              onPress={async () => {
                const success = await skipMeeting(meeting.id);
                if (success) {
                  refetch();
                }
              }}
            >
              <Text style={styles.seriesSkipButtonText}>Skip This Week</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RSVP Section - only for single meetings */}
        {!isSeries && myAttendance && (
          <View style={styles.rsvpSection}>
            <Text style={styles.rsvpLabel}>
              {myStatus === 'invited' ? 'Are you attending?' : 'Your response:'}
            </Text>
            <View style={styles.rsvpButtons}>
              <TouchableOpacity
                style={[styles.rsvpButton, myStatus === 'accepted' && styles.rsvpButtonAccepted]}
                onPress={() => initiateRSVP(meeting, myAttendance.id, 'accepted')}
              >
                <Text style={[styles.rsvpButtonText, myStatus === 'accepted' && styles.rsvpButtonTextActive]}>
                  ✓ Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpButton, myStatus === 'maybe' && styles.rsvpButtonMaybe]}
                onPress={() => initiateRSVP(meeting, myAttendance.id, 'maybe')}
              >
                <Text style={[styles.rsvpButtonText, myStatus === 'maybe' && styles.rsvpButtonTextActive]}>
                  ? Maybe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpButton, myStatus === 'declined' && styles.rsvpButtonDeclined]}
                onPress={() => initiateRSVP(meeting, myAttendance.id, 'declined')}
              >
                <Text style={[styles.rsvpButtonText, myStatus === 'declined' && styles.rsvpButtonTextActive]}>
                  ✗ No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </>
    );
  };

  const renderDisplayItem = ({ item }: { item: DisplayItem }) => {
    if (item.type === 'series') {
      return (
        <TouchableOpacity
          style={[styles.meetingCard, styles.seriesCard]}
          onPress={() => openSeriesView(item)}
          activeOpacity={0.7}
        >
          {renderMeetingCard(item.meeting, true, item.seriesMeetings?.length)}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.meetingCard}>
        {renderMeetingCard(item.meeting)}
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
      <ScreenHeader
        title="Events"
        rightAction={isGroupLeader ? {
          label: '+ New',
          onPress: () => setShowCreateModal(true),
        } : undefined}
      />
      <FlatList
        data={displayItems}
        renderItem={renderDisplayItem}
        keyExtractor={(item) => item.type === 'series' ? `series-${item.meeting.series_id}` : item.meeting.id}
        contentContainerStyle={displayItems.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
      
      <CreateMeetingModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleMeetingCreated}
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

      {/* Series Editor Modal */}
      <MeetingSeriesEditorModal
        visible={seriesEditorModal.visible}
        onClose={() => setSeriesEditorModal(prev => ({ ...prev, visible: false }))}
        seriesId={seriesEditorModal.seriesId}
        seriesTitle={seriesEditorModal.seriesTitle}
        meetings={seriesEditorModal.seriesId ? getSeriesMeetings(seriesEditorModal.seriesId) : []}
        onUpdateMeeting={updateMeeting}
        onSkipMeeting={skipMeeting}
        onRefresh={refetch}
      />

      {/* Series View Modal */}
      <Modal
        visible={seriesViewModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSeriesViewModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.seriesViewContainer}>
          <View style={styles.seriesViewHeader}>
            <TouchableOpacity onPress={() => setSeriesViewModal(prev => ({ ...prev, visible: false }))}>
              <Text style={styles.seriesViewDoneButton}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.seriesViewTitle}>{seriesViewModal.seriesTitle}</Text>
            {seriesViewModal.meetings[0]?.created_by === user?.id && isGroupLeader && (
              <TouchableOpacity
                onPress={() => {
                  setSeriesViewModal(prev => ({ ...prev, visible: false }));
                  setSeriesEditorModal({
                    visible: true,
                    seriesId: seriesViewModal.seriesId,
                    seriesTitle: seriesViewModal.seriesTitle,
                  });
                }}
              >
                <Text style={styles.seriesViewEditButton}>Edit</Text>
              </TouchableOpacity>
            )}
            {!(seriesViewModal.meetings[0]?.created_by === user?.id && isGroupLeader) && (
              <View style={{ width: 40 }} />
            )}
          </View>
          <Text style={styles.seriesViewSubtitle}>
            {seriesViewModal.meetings.length} meetings in series
          </Text>
          <ScrollView style={styles.seriesViewContent}>
            {seriesViewModal.meetings.map((meeting) => {
              const myAttendance = meeting.attendees?.find(a => a.user_id === user?.id);
              const myStatus = myAttendance?.status;

              return (
                <View key={meeting.id} style={styles.seriesViewMeetingCard}>
                  <View style={styles.seriesViewMeetingHeader}>
                    <View style={styles.seriesViewIndexBadge}>
                      <Text style={styles.seriesViewIndexText}>{meeting.series_index}</Text>
                    </View>
                    <View style={styles.seriesViewMeetingInfo}>
                      <Text style={styles.seriesViewMeetingDate}>
                        {new Date(meeting.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' at '}
                        {new Date(meeting.date).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                      {meeting.description && (
                        <Text style={styles.seriesViewMeetingDescription}>{meeting.description}</Text>
                      )}
                    </View>
                    {/* Skip button for organizers */}
                    {meeting.created_by === user?.id && isGroupLeader && (
                      <TouchableOpacity
                        style={styles.seriesViewSkipButton}
                        onPress={async () => {
                          const success = await skipMeeting(meeting.id);
                          if (success) {
                            refetch();
                          }
                        }}
                      >
                        <Text style={styles.seriesViewSkipButtonText}>Skip</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* RSVP for each meeting in series */}
                  {myAttendance && (
                    <View style={styles.seriesViewRsvpSection}>
                      <View style={styles.rsvpButtons}>
                        <TouchableOpacity
                          style={[styles.rsvpButton, myStatus === 'accepted' && styles.rsvpButtonAccepted]}
                          onPress={() => rsvpToMeeting(meeting.id, myAttendance.id, 'accepted')}
                        >
                          <Text style={[styles.rsvpButtonText, myStatus === 'accepted' && styles.rsvpButtonTextActive]}>
                            ✓ Yes
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rsvpButton, myStatus === 'maybe' && styles.rsvpButtonMaybe]}
                          onPress={() => rsvpToMeeting(meeting.id, myAttendance.id, 'maybe')}
                        >
                          <Text style={[styles.rsvpButtonText, myStatus === 'maybe' && styles.rsvpButtonTextActive]}>
                            ? Maybe
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rsvpButton, myStatus === 'declined' && styles.rsvpButtonDeclined]}
                          onPress={() => rsvpToMeeting(meeting.id, myAttendance.id, 'declined')}
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
            })}
          </ScrollView>
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
  editSeriesButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  editSeriesButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  attendeeAvatarWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
    backgroundColor: '#475569',
  },
  attendeeAvatarMore: {
    backgroundColor: '#475569',
  },
  attendeeAvatarAccepted: {
    borderColor: '#22C55E',
  },
  attendeeAvatarDeclined: {
    borderColor: '#EF4444',
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
  // Series card styles
  seriesCard: {
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  viewSeriesHint: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 8,
    fontWeight: '500',
  },
  seriesSkipSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  seriesSkipButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  seriesSkipButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  // Series view modal styles
  seriesViewContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  seriesViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  seriesViewTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  seriesViewDoneButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  seriesViewEditButton: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  seriesViewSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  seriesViewContent: {
    flex: 1,
    padding: 16,
  },
  seriesViewMeetingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  seriesViewMeetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  seriesViewIndexBadge: {
    backgroundColor: '#7C3AED',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesViewIndexText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  seriesViewMeetingInfo: {
    flex: 1,
  },
  seriesViewMeetingDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  seriesViewMeetingDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 20,
  },
  seriesViewRsvpSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  seriesViewSkipButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginLeft: 8,
  },
  seriesViewSkipButtonText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
});
