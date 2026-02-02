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
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';

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
    sendingEmail,
    refetch,
    rsvpToMeeting,
    rsvpToSeries,
    deleteMeeting,
    deleteSeries,
    updateMeeting,
    getSeriesMeetings,
    skipMeeting,
    sendMeetingEmail,
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

  // Send email notification for a meeting
  const handleSendEmail = async (meetingId: string) => {
    const success = await sendMeetingEmail(meetingId);
    if (success) {
      showAlert('Email Sent', 'Meeting notification has been sent to all attendees.');
    } else {
      showAlert('Error', 'Failed to send email. Please try again.');
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
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => handleSendEmail(meeting.id)}
                    style={styles.emailButton}
                    disabled={sendingEmail}
                  >
                    <Text style={styles.emailButtonText}>{sendingEmail ? '...' : '✉️'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => initiateDelete(meeting)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
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
        <ActivityIndicator testID="activity-indicator" size="large" color={colors.primary[500]} />
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
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  groupName: {
    fontSize: fontSize.md,
    color: colors.primary[600],
    marginTop: spacing.xs,
  },
  newButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  newButtonText: {
    color: colors.text.inverse,
    fontWeight: fontWeight.semibold,
  },
  list: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
    padding: spacing.xl,
  },
  meetingCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateBox: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 60,
  },
  dateMonth: {
    color: colors.primary[100],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  dateDay: {
    color: colors.text.inverse,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  meetingInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  meetingTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emailButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  emailButtonText: {
    fontSize: fontSize.lg,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteButtonText: {
    fontSize: fontSize.lg,
  },
  editSeriesButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  editSeriesButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  meetingDetails: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
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
    borderColor: colors.card.background,
    backgroundColor: colors.neutral[400],
  },
  attendeeAvatarMore: {
    backgroundColor: colors.neutral[400],
  },
  attendeeAvatarAccepted: {
    borderColor: colors.success.main,
  },
  attendeeAvatarDeclined: {
    borderColor: colors.error.main,
    opacity: 0.6,
  },
  attendeeAvatarText: {
    color: colors.text.inverse,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  attendeeCount: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  passagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  passageBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  passageText: {
    color: colors.primary[700],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: spacing.xxl,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  rsvpSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  rsvpLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  rsvpButtonAccepted: {
    borderColor: colors.rsvp.accepted,
    backgroundColor: colors.rsvp.acceptedBg,
  },
  rsvpButtonMaybe: {
    borderColor: colors.rsvp.maybe,
    backgroundColor: colors.rsvp.maybeBg,
  },
  rsvpButtonDeclined: {
    borderColor: colors.rsvp.declined,
    backgroundColor: colors.rsvp.declinedBg,
  },
  rsvpButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  rsvpButtonTextActive: {
    color: colors.text.primary,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seriesBadge: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  seriesBadgeText: {
    color: colors.text.inverse,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalText: {
    fontSize: fontSize.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalButtonDestructive: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.error.main,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.text.tertiary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  // Series card styles
  seriesCard: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  viewSeriesHint: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    marginTop: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  seriesSkipSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  seriesSkipButton: {
    backgroundColor: colors.rsvp.maybeBg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning.main,
  },
  seriesSkipButtonText: {
    color: colors.warning.dark,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  // Series view modal styles
  seriesViewContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  seriesViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  seriesViewTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  seriesViewDoneButton: {
    fontSize: fontSize.lg,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  seriesViewEditButton: {
    fontSize: fontSize.lg,
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  seriesViewSubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  seriesViewContent: {
    flex: 1,
    padding: spacing.lg,
  },
  seriesViewMeetingCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  seriesViewMeetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  seriesViewIndexBadge: {
    backgroundColor: colors.primary[500],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesViewIndexText: {
    color: colors.text.inverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  seriesViewMeetingInfo: {
    flex: 1,
  },
  seriesViewMeetingDate: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  seriesViewMeetingDescription: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  seriesViewRsvpSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  seriesViewSkipButton: {
    backgroundColor: colors.rsvp.maybeBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning.main,
    marginLeft: spacing.sm,
  },
  seriesViewSkipButtonText: {
    color: colors.warning.dark,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
