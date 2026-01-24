import React, { useState, useEffect, useCallback } from 'react';
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

interface Props {
  visible: boolean;
  onClose: () => void;
  seriesId: string;
  seriesTitle: string;
  meetings: MeetingWithAttendees[];
  onUpdateMeeting: (meetingId: string, updates: { description?: string }) => Promise<boolean>;
  onSkipMeeting: (meetingId: string) => Promise<boolean>;
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
  onUpdateMeeting,
  onSkipMeeting,
  onRefresh,
}: Props) {
  const [editState, setEditState] = useState<Record<string, MeetingEdit>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [skippingMeetingId, setSkippingMeetingId] = useState<string | null>(null);

  // Initialize edit state when modal opens or meetings change
  useEffect(() => {
    if (visible && meetings.length > 0) {
      const initialState: Record<string, MeetingEdit> = {};
      meetings.forEach(meeting => {
        initialState[meeting.id] = {
          description: meeting.description || '',
          isDirty: false,
          isSaving: false,
        };
      });
      setEditState(initialState);
    }
  }, [visible, meetings]);

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
    // Don't call onRefresh here - it would reset other unsaved changes
  }, [editState, onUpdateMeeting]);

  const handleSaveAll = useCallback(async () => {
    const dirtyMeetings = Object.entries(editState).filter(([_, edit]) => edit.isDirty);
    if (dirtyMeetings.length === 0) {
      // No changes to save, just close
      handleClose();
      return;
    }

    setSavingAll(true);

    // Save all dirty meetings in parallel
    await Promise.all(
      dirtyMeetings.map(async ([meetingId, edit]) => {
        await onUpdateMeeting(meetingId, { description: edit.description || undefined });
      })
    );

    setSavingAll(false);

    // Close modal and refresh after saving all
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
    onRefresh(); // Refresh to sync any saved changes
    onClose();
  }, [onClose, onRefresh]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
              <ActivityIndicator size="small" color="#3B82F6" />
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
                  <Text style={styles.meetingDate}>{formatDate(meeting.date)}</Text>
                  {isDirty && (
                    <View style={styles.unsavedBadge}>
                      <Text style={styles.unsavedBadgeText}>Unsaved</Text>
                    </View>
                  )}
                </View>

                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Add a description for this meeting..."
                  placeholderTextColor="#64748B"
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
                      <ActivityIndicator size="small" color="#F59E0B" />
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
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  doneButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  saveAllButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  saveAllButtonDisabled: {
    color: '#475569',
  },
  seriesInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  seriesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  seriesCount: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  meetingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  indexBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  indexBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  meetingDate: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F8FAFC',
    flex: 1,
  },
  unsavedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unsavedBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 80,
  },
  meetingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  skipButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
    minWidth: 70,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#334155',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#64748B',
  },
});
