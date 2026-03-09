import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MeetingWithAttendees } from '../types/database';
import { InvitableMember } from '../types/members';
import { useInvitableMembers } from '../hooks/useInvitableMembers';
import { formatDateShort } from '../lib/formatters';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import MemberCheckList from './MemberCheckList';
import Avatar from './Avatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  seriesId: string;
  seriesTitle: string;
  meetings: MeetingWithAttendees[];
  groupId: string;
  onUpdateMeeting: (meetingId: string, updates: { description?: string }) => Promise<boolean>;
  onSkipMeeting: (meetingId: string) => Promise<boolean>;
  onAddAttendees: (seriesId: string, members: { id: string; type: 'user' | 'placeholder' }[]) => Promise<boolean>;
  onRemoveAttendee: (seriesId: string, memberId: string, memberType: 'user' | 'placeholder') => Promise<boolean>;
  onAddCoLeaders: (seriesId: string, userIds: string[]) => Promise<boolean>;
  onRemoveCoLeader: (seriesId: string, userId: string) => Promise<boolean>;
  onRefresh: () => void;
}

interface MeetingEdit {
  description: string;
  isDirty: boolean;
  isSaving: boolean;
}

export default function MeetingSeriesEditorModal({
  visible,
  onClose,
  seriesId,
  seriesTitle,
  meetings,
  groupId,
  onUpdateMeeting,
  onSkipMeeting,
  onAddAttendees,
  onRemoveAttendee,
  onAddCoLeaders,
  onRemoveCoLeader,
  onRefresh,
}: Props) {
  const [editState, setEditState] = useState<Record<string, MeetingEdit>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [skippingMeetingId, setSkippingMeetingId] = useState<string | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [addingAttendees, setAddingAttendees] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showCoLeaderPicker, setShowCoLeaderPicker] = useState(false);
  const [selectedCoLeaders, setSelectedCoLeaders] = useState<Set<string>>(new Set());
  const [addingCoLeaders, setAddingCoLeaders] = useState(false);
  const [removingCoLeaderId, setRemovingCoLeaderId] = useState<string | null>(null);

  const { members: groupMembers, loading: loadingMembers, refetch: fetchGroupMembers } = useInvitableMembers(groupId);

  // Deduplicated current attendees across all meetings in the series
  const currentAttendees = useMemo(() => {
    const seen = new Set<string>();
    const attendees: { id: string; type: 'user' | 'placeholder'; name: string; email: string; avatarUrl?: string | null }[] = [];

    for (const meeting of meetings) {
      for (const a of meeting.attendees || []) {
        const memberId = a.user_id || a.placeholder_id;
        if (!memberId || seen.has(memberId)) continue;
        seen.add(memberId);

        if (a.user_id && a.user) {
          attendees.push({
            id: a.user_id,
            type: 'user',
            name: a.user.full_name || a.user.email || 'Unknown',
            email: a.user.email || '',
            avatarUrl: (a.user as any).avatar_url,
          });
        } else if (a.placeholder_id && a.placeholder) {
          attendees.push({
            id: a.placeholder_id,
            type: 'placeholder',
            name: a.placeholder.full_name || a.placeholder.email || 'Unknown',
            email: a.placeholder.email || '',
            avatarUrl: null,
          });
        }
      }
    }

    return attendees;
  }, [meetings]);

  const currentAttendeeIds = useMemo(
    () => new Set(currentAttendees.map(a => a.id)),
    [currentAttendees]
  );

  const availableMembers = useMemo(
    () => groupMembers.filter(m => !currentAttendeeIds.has(m.id)),
    [groupMembers, currentAttendeeIds]
  );

  // Deduplicated current co-leaders across all meetings in the series
  const currentCoLeaders = useMemo(() => {
    const seen = new Set<string>();
    const coLeaders: { id: string; name: string; email: string; avatarUrl?: string | null }[] = [];

    for (const meeting of meetings) {
      for (const cl of meeting.co_leaders || []) {
        if (seen.has(cl.user_id)) continue;
        seen.add(cl.user_id);
        coLeaders.push({
          id: cl.user_id,
          name: cl.user?.full_name || cl.user?.email || 'Unknown',
          email: cl.user?.email || '',
          avatarUrl: (cl.user as any)?.avatar_url,
        });
      }
    }

    return coLeaders;
  }, [meetings]);

  const currentCoLeaderIds = useMemo(
    () => new Set(currentCoLeaders.map(cl => cl.id)),
    [currentCoLeaders]
  );

  const eligibleCoLeaders = useMemo(() => {
    const creatorId = meetings[0]?.created_by;
    return groupMembers.filter(
      m => m.type === 'user' &&
        m.id !== creatorId &&
        !currentCoLeaderIds.has(m.id) &&
        ['leader', 'leader-helper', 'admin'].includes(m.groupRole || '')
    );
  }, [groupMembers, currentCoLeaderIds, meetings]);

  // Initialize edit state when modal opens
  useEffect(() => {
    if (visible && meetings.length > 0) {
      setEditState(prev => {
        const newState: Record<string, MeetingEdit> = {};
        meetings.forEach(meeting => {
          const existing = prev[meeting.id];
          if (existing?.isDirty) {
            newState[meeting.id] = existing;
          } else {
            newState[meeting.id] = {
              description: meeting.description || '',
              isDirty: false,
              isSaving: false,
            };
          }
        });
        return newState;
      });
    }
  }, [visible, meetings]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setEditState({});
      setShowMemberPicker(false);
      setSelectedMembers(new Set());
      setShowCoLeaderPicker(false);
      setSelectedCoLeaders(new Set());
    }
  }, [visible]);

  const handleOpenMemberPicker = useCallback(() => {
    setShowMemberPicker(true);
    setSelectedMembers(new Set());
    if (groupMembers.length === 0) {
      fetchGroupMembers();
    }
  }, [groupMembers.length, fetchGroupMembers]);

  const toggleMember = useCallback((id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(async () => {
    if (selectedMembers.size === 0) return;

    setAddingAttendees(true);
    const membersToAdd = Array.from(selectedMembers).map(id => {
      const member = groupMembers.find(m => m.id === id);
      return { id, type: member?.type || 'user' as const };
    });

    const success = await onAddAttendees(seriesId, membersToAdd);
    setAddingAttendees(false);

    if (success) {
      setShowMemberPicker(false);
      setSelectedMembers(new Set());
    }
  }, [selectedMembers, groupMembers, seriesId, onAddAttendees]);

  const handleRemoveAttendee = useCallback(async (memberId: string, memberType: 'user' | 'placeholder') => {
    setRemovingMemberId(memberId);
    await onRemoveAttendee(seriesId, memberId, memberType);
    setRemovingMemberId(null);
  }, [seriesId, onRemoveAttendee]);

  const handleOpenCoLeaderPicker = useCallback(() => {
    setShowCoLeaderPicker(true);
    setSelectedCoLeaders(new Set());
    if (groupMembers.length === 0) {
      fetchGroupMembers();
    }
  }, [groupMembers.length, fetchGroupMembers]);

  const toggleCoLeader = useCallback((id: string) => {
    setSelectedCoLeaders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAddCoLeaders = useCallback(async () => {
    if (selectedCoLeaders.size === 0) return;

    setAddingCoLeaders(true);
    const success = await onAddCoLeaders(seriesId, Array.from(selectedCoLeaders));
    setAddingCoLeaders(false);

    if (success) {
      setShowCoLeaderPicker(false);
      setSelectedCoLeaders(new Set());
    }
  }, [selectedCoLeaders, seriesId, onAddCoLeaders]);

  const handleRemoveCoLeader = useCallback(async (userId: string) => {
    setRemovingCoLeaderId(userId);
    await onRemoveCoLeader(seriesId, userId);
    setRemovingCoLeaderId(null);
  }, [seriesId, onRemoveCoLeader]);

  const handleDescriptionChange = useCallback((meetingId: string, description: string) => {
    setEditState(prev => ({
      ...prev,
      [meetingId]: {
        ...prev[meetingId],
        description,
        isDirty: description !== (meetings.find(m => m.id === meetingId)?.description || ''),
      },
    }));
  }, [meetings]);

  const handleSaveSingle = useCallback(async (meetingId: string) => {
    const edit = editState[meetingId];
    if (!edit || !edit.isDirty) return;

    setEditState(prev => ({
      ...prev,
      [meetingId]: { ...prev[meetingId], isSaving: true },
    }));

    const success = await onUpdateMeeting(meetingId, { description: edit.description || undefined });

    setEditState(prev => ({
      ...prev,
      [meetingId]: {
        ...prev[meetingId],
        isSaving: false,
        isDirty: !success,
      },
    }));
  }, [editState, onUpdateMeeting]);

  const handleSaveAll = useCallback(async () => {
    const dirtyMeetings = Object.entries(editState).filter(([_, edit]) => edit.isDirty);
    if (dirtyMeetings.length === 0) {
      handleClose();
      return;
    }

    setSavingAll(true);

    await Promise.all(
      dirtyMeetings.map(async ([meetingId, edit]) => {
        await onUpdateMeeting(meetingId, { description: edit.description || undefined });
      })
    );

    setSavingAll(false);
    setEditState({});
    onRefresh();
    onClose();
  }, [editState, onUpdateMeeting, onRefresh, onClose]);

  const hasUnsavedChanges = Object.values(editState).some(edit => edit.isDirty);

  const handleSkip = useCallback(async (meetingId: string) => {
    setSkippingMeetingId(meetingId);
    const success = await onSkipMeeting(meetingId);
    setSkippingMeetingId(null);
    if (success) {
      onRefresh();
    }
  }, [onSkipMeeting, onRefresh]);

  const handleClose = useCallback(() => {
    setEditState({});
    onRefresh();
    onClose();
  }, [onClose, onRefresh]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.doneButton}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Series</Text>
          <TouchableOpacity
            onPress={handleSaveAll}
            disabled={!hasUnsavedChanges || savingAll}
          >
            {savingAll ? (
              <ActivityIndicator size="small" color={colors.blue[500]} />
            ) : (
              <Text style={[
                styles.saveAllButton,
                !hasUnsavedChanges && styles.saveAllButtonDisabled,
              ]}>
                Save All
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.seriesInfo}>
          <Text style={styles.seriesTitle}>{seriesTitle}</Text>
          <Text style={styles.seriesCount}>{meetings.length} meetings in series</Text>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Co-Leaders Section */}
          <View style={styles.invitesSection}>
            <View style={styles.invitesSectionHeader}>
              <Text style={styles.invitesSectionTitle}>Co-Leaders</Text>
              <TouchableOpacity
                style={styles.addMembersButton}
                onPress={handleOpenCoLeaderPicker}
              >
                <Text style={styles.addMembersButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {currentCoLeaders.length > 0 ? (
              <View style={styles.attendeesList}>
                {currentCoLeaders.map((coLeader) => (
                  <View key={coLeader.id} style={styles.attendeeRow}>
                    <View style={styles.attendeeInfo}>
                      <Avatar
                        uri={coLeader.avatarUrl}
                        name={coLeader.name}
                        size={32}
                      />
                      <View style={styles.attendeeDetails}>
                        <Text style={styles.attendeeName}>{coLeader.name}</Text>
                        <Text style={styles.attendeeEmail}>{coLeader.email}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveCoLeader(coLeader.id)}
                      disabled={removingCoLeaderId === coLeader.id}
                    >
                      {removingCoLeaderId === coLeader.id ? (
                        <ActivityIndicator size="small" color={colors.red[500]} />
                      ) : (
                        <Text style={styles.removeButtonText}>✕</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noAttendeesText}>No co-leaders assigned</Text>
            )}

            {/* Inline Co-Leader Picker */}
            {showCoLeaderPicker && (
              <View style={styles.memberPicker}>
                <View style={styles.memberPickerHeader}>
                  <Text style={styles.memberPickerTitle}>Select Co-Leaders</Text>
                  <TouchableOpacity onPress={() => setShowCoLeaderPicker(false)}>
                    <Text style={styles.memberPickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                <MemberCheckList
                  members={eligibleCoLeaders}
                  selectedIds={selectedCoLeaders}
                  onToggle={toggleCoLeader}
                  loading={loadingMembers}
                  emptyText="No eligible leaders to add"
                />

                {eligibleCoLeaders.length > 0 && !loadingMembers && (
                  <TouchableOpacity
                    style={[
                      styles.addSelectedButton,
                      selectedCoLeaders.size === 0 && styles.addSelectedButtonDisabled,
                    ]}
                    onPress={handleAddCoLeaders}
                    disabled={selectedCoLeaders.size === 0 || addingCoLeaders}
                  >
                    {addingCoLeaders ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[
                        styles.addSelectedButtonText,
                        selectedCoLeaders.size === 0 && styles.addSelectedButtonTextDisabled,
                      ]}>
                        Add {selectedCoLeaders.size > 0 ? `${selectedCoLeaders.size} ` : ''}Co-Leader{selectedCoLeaders.size !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Manage Invites Section */}
          <View style={styles.invitesSection}>
            <View style={styles.invitesSectionHeader}>
              <Text style={styles.invitesSectionTitle}>Manage Invites</Text>
              <TouchableOpacity
                style={styles.addMembersButton}
                onPress={handleOpenMemberPicker}
              >
                <Text style={styles.addMembersButtonText}>+ Add Members</Text>
              </TouchableOpacity>
            </View>

            {currentAttendees.length > 0 ? (
              <View style={styles.attendeesList}>
                {currentAttendees.map((attendee) => (
                  <View key={attendee.id} style={styles.attendeeRow}>
                    <View style={styles.attendeeInfo}>
                      {attendee.type === 'placeholder' ? (
                        <View style={styles.placeholderAvatar}>
                          <Text style={styles.placeholderAvatarText}>?</Text>
                        </View>
                      ) : (
                        <Avatar
                          uri={attendee.avatarUrl}
                          name={attendee.name}
                          size={32}
                        />
                      )}
                      <View style={styles.attendeeDetails}>
                        <View style={styles.attendeeNameRow}>
                          <Text style={styles.attendeeName}>{attendee.name}</Text>
                          {attendee.type === 'placeholder' && (
                            <View style={styles.placeholderBadge}>
                              <Text style={styles.placeholderBadgeText}>Placeholder</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.attendeeEmail}>{attendee.email}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveAttendee(attendee.id, attendee.type)}
                      disabled={removingMemberId === attendee.id}
                    >
                      {removingMemberId === attendee.id ? (
                        <ActivityIndicator size="small" color={colors.red[500]} />
                      ) : (
                        <Text style={styles.removeButtonText}>✕</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noAttendeesText}>No attendees yet</Text>
            )}

            {/* Inline Member Picker */}
            {showMemberPicker && (
              <View style={styles.memberPicker}>
                <View style={styles.memberPickerHeader}>
                  <Text style={styles.memberPickerTitle}>Select Members</Text>
                  <TouchableOpacity onPress={() => setShowMemberPicker(false)}>
                    <Text style={styles.memberPickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                <MemberCheckList
                  members={availableMembers}
                  selectedIds={selectedMembers}
                  onToggle={toggleMember}
                  loading={loadingMembers}
                  emptyText="All group members are already invited"
                />

                {availableMembers.length > 0 && !loadingMembers && (
                  <TouchableOpacity
                    style={[
                      styles.addSelectedButton,
                      selectedMembers.size === 0 && styles.addSelectedButtonDisabled,
                    ]}
                    onPress={handleAddSelected}
                    disabled={selectedMembers.size === 0 || addingAttendees}
                  >
                    {addingAttendees ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[
                        styles.addSelectedButtonText,
                        selectedMembers.size === 0 && styles.addSelectedButtonTextDisabled,
                      ]}>
                        Add {selectedMembers.size > 0 ? `${selectedMembers.size} ` : ''}Member{selectedMembers.size !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Meeting Cards */}
          {meetings.map((meeting) => {
            const edit = editState[meeting.id];
            const isDirty = edit?.isDirty || false;
            const isSaving = edit?.isSaving || false;

            return (
              <View key={meeting.id} style={styles.meetingCard}>
                <View style={styles.meetingHeader}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>
                      {meeting.series_index}
                    </Text>
                  </View>
                  <Text style={styles.meetingDate}>{formatDateShort(meeting.date)}</Text>
                  {isDirty && (
                    <View style={styles.unsavedBadge}>
                      <Text style={styles.unsavedBadgeText}>Unsaved</Text>
                    </View>
                  )}
                </View>

                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Add a description for this meeting..."
                  placeholderTextColor={colors.slate[500]}
                  value={edit?.description || ''}
                  onChangeText={(text) => handleDescriptionChange(meeting.id, text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.meetingFooter}>
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => handleSkip(meeting.id)}
                    disabled={skippingMeetingId === meeting.id}
                  >
                    {skippingMeetingId === meeting.id ? (
                      <ActivityIndicator size="small" color={colors.amber[500]} />
                    ) : (
                      <Text style={styles.skipButtonText}>Skip</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      !isDirty && styles.saveButtonDisabled,
                    ]}
                    onPress={() => handleSaveSingle(meeting.id)}
                    disabled={!isDirty || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[
                        styles.saveButtonText,
                        !isDirty && styles.saveButtonTextDisabled,
                      ]}>
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[900] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  headerTitle: { fontSize: 17, fontWeight: fontWeight.semibold, color: colors.slate[50] },
  doneButton: { fontSize: fontSize.lg, color: colors.blue[500], fontWeight: fontWeight.medium },
  saveAllButton: { fontSize: fontSize.lg, color: colors.blue[500], fontWeight: fontWeight.semibold },
  saveAllButtonDisabled: { color: colors.slate[600] },
  seriesInfo: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  seriesTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.slate[50] },
  seriesCount: { fontSize: fontSize.md, color: colors.slate[400], marginTop: spacing.xs },
  content: { flex: 1, padding: spacing.lg },
  invitesSection: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  invitesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  invitesSectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.slate[50] },
  addMembersButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.blue[500],
  },
  addMembersButtonText: { color: colors.blue[500], fontSize: 13, fontWeight: fontWeight.semibold },
  attendeesList: { gap: spacing.sm },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[900],
    borderRadius: 10,
    padding: 10,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  attendeeDetails: { flex: 1 },
  attendeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeeName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.slate[50] },
  attendeeEmail: { fontSize: fontSize.sm, color: colors.slate[500], marginTop: 1 },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  removeButtonText: { color: colors.red[500], fontSize: fontSize.md, fontWeight: fontWeight.bold },
  noAttendeesText: {
    fontSize: fontSize.md,
    color: colors.slate[500],
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  placeholderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderAvatarText: { color: colors.slate[400], fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  placeholderBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  placeholderBadgeText: { color: colors.amber[500], fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  memberPicker: {
    marginTop: spacing.md,
    backgroundColor: colors.slate[900],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.slate[700],
    overflow: 'hidden',
  },
  memberPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  memberPickerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.slate[50] },
  memberPickerCancel: { fontSize: fontSize.md, color: colors.blue[500], fontWeight: fontWeight.medium },
  addSelectedButton: {
    backgroundColor: colors.blue[500],
    margin: spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addSelectedButtonDisabled: { backgroundColor: colors.slate[700] },
  addSelectedButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  addSelectedButtonTextDisabled: { color: colors.slate[500] },
  meetingCard: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 10,
  },
  indexBadge: {
    backgroundColor: colors.violet[600],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  indexBadgeText: { color: '#fff', fontSize: 13, fontWeight: fontWeight.semibold },
  meetingDate: { fontSize: 15, fontWeight: fontWeight.medium, color: colors.slate[50], flex: 1 },
  unsavedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  unsavedBadgeText: { color: colors.amber[500], fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  descriptionInput: {
    backgroundColor: colors.slate[900],
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: 15,
    color: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[700],
    minHeight: 80,
  },
  meetingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  skipButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.amber[500],
    minWidth: 70,
    alignItems: 'center',
  },
  skipButtonText: { color: colors.amber[500], fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  saveButton: {
    backgroundColor: colors.blue[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: colors.slate[700] },
  saveButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  saveButtonTextDisabled: { color: colors.slate[500] },
});
