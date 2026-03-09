import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { createMeetings, createMeetingAttendees, createMeetingCoLeaders } from '../repositories/meetingsRepo';
import { InvitableMember } from '../types/members';
import { useInvitableMembers } from '../hooks/useInvitableMembers';
import { formatDateNoYear, formatDateForInput } from '../lib/formatters';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import MemberCheckList from './MemberCheckList';
import TimePicker, { timeLabel } from './TimePicker';
import TimezonePicker from './TimezonePicker';
import RecurrencePicker, { RecurrenceType } from './RecurrencePicker';

interface SeriesInfo {
  seriesId: string;
  seriesTitle: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (seriesInfo?: SeriesInfo) => void;
}

export default function CreateMeetingModal({ visible, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { currentGroup } = useGroup();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Timezone
  const [timezone, setTimezone] = useState(
    currentGroup?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Time
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [endMinutes, setEndMinutes] = useState<number | null>(null);
  const timeSelected = startMinutes !== null;

  // Date picker (native)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Recurrence
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceCount, setRecurrenceCount] = useState('4');

  // Members
  const { members: groupMembers, loading: loadingMembers, refetch: fetchGroupMembers } = useInvitableMembers(currentGroup?.id);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [selectedCoLeaders, setSelectedCoLeaders] = useState<Set<string>>(new Set());

  // ── Reset on open ────────────────────────────────────────────────

  useEffect(() => {
    if (visible && currentGroup) {
      fetchGroupMembers();
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setSelectedDate(d);
      setStartMinutes(null);
      setEndMinutes(null);
      setRecurrence('none');
      setRecurrenceCount('4');
      setTimezone(currentGroup.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [visible, currentGroup]);

  // Select all members once they load
  useEffect(() => {
    if (groupMembers.length > 0 && visible) {
      setSelectedMembers(new Set(groupMembers.map(m => m.id)));
      setSelectedCoLeaders(new Set());
    }
  }, [groupMembers, visible]);

  // ── Members ──────────────────────────────────────────────────────

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedMembers(new Set(groupMembers.map(m => m.id)));
  const selectNone = () => setSelectedMembers(new Set());

  const eligibleCoLeaders = groupMembers.filter(
    m => m.type === 'user' && m.id !== user?.id &&
    ['leader', 'leader-helper', 'admin'].includes(m.groupRole || '')
  );

  const toggleCoLeader = (id: string) => {
    setSelectedCoLeaders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Time callbacks ─────────────────────────────────────────────

  const handleStartChange = (minutes: number) => {
    setStartMinutes(minutes);
    const autoEnd = (minutes + 60) % (24 * 60);
    setEndMinutes(autoEnd);
    const d = new Date(selectedDate);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    setSelectedDate(d);
  };

  const handleEndChange = (minutes: number) => {
    setEndMinutes(minutes);
  };

  // ── Date helpers ─────────────────────────────────────────────────

  const generateRecurringDates = (startDate: Date, type: RecurrenceType, count: number): Date[] => {
    const dates: Date[] = [startDate];
    if (type === 'none') return dates;
    for (let i = 1; i < count; i++) {
      const d = new Date(startDate);
      if (type === 'weekly') d.setDate(startDate.getDate() + i * 7);
      else if (type === 'biweekly') d.setDate(startDate.getDate() + i * 14);
      else if (type === 'monthly') d.setMonth(startDate.getMonth() + i);
      dates.push(d);
    }
    return dates;
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const d = new Date(selectedDate);
      d.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(d);
    }
  };

  const onWebDateChange = (s: string) => {
    if (!s) return;
    const [y, mo, d] = s.split('-').map(Number);
    const nd = new Date(selectedDate);
    nd.setFullYear(y, mo - 1, d);
    setSelectedDate(nd);
  };

  // ── Create / Close ───────────────────────────────────────────────

  const handleCreate = async () => {
    if (!title.trim()) { setError('Please enter a title'); return; }
    if (!timeSelected) { setError('Please select a time'); return; }
    if (!currentGroup || !user) { setError('No group selected'); return; }

    const count = parseInt(recurrenceCount) || 1;
    if (recurrence !== 'none' && (count < 1 || count > 52)) {
      setError('Number of occurrences must be between 1 and 52');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const eventDates = generateRecurringDates(selectedDate, recurrence, count);
      const seriesId = recurrence !== 'none' ? crypto.randomUUID() : null;

      const eventsToCreate = eventDates.map((eventDate, index) => {
        const base: any = {
          title: title.trim(),
          description: description.trim() || null,
          date: eventDate.toISOString(),
          location: location.trim() || null,
          group_id: currentGroup.id,
          created_by: user.id,
          passages: [],
          attachments: [],
          series_id: seriesId,
          series_index: recurrence !== 'none' ? index + 1 : null,
          series_total: recurrence !== 'none' ? eventDates.length : null,
          timezone,
        };
        if (endMinutes !== null) {
          const endDate = new Date(eventDate);
          endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
          if (endDate <= eventDate) endDate.setDate(endDate.getDate() + 1);
          base.end_date = endDate.toISOString();
        }
        return base;
      });

      const { data: meetings, error: meetingError } = await createMeetings(eventsToCreate);
      if (meetingError) throw meetingError;

      if (selectedMembers.size > 0 && meetings) {
        const allAttendees = (meetings as any[]).flatMap((meeting: any) =>
          Array.from(selectedMembers).map(memberId => {
            const member = groupMembers.find(m => m.id === memberId);
            if (!member) return null;
            return {
              meeting_id: meeting.id,
              user_id: member.type === 'user' ? memberId : null,
              placeholder_id: member.type === 'placeholder' ? memberId : null,
              status: 'invited' as const,
            };
          }).filter((a): a is NonNullable<typeof a> => a !== null)
        );

        if (allAttendees.length > 0) {
          const { error: attendeesError } = await createMeetingAttendees(allAttendees);
          if (attendeesError) throw attendeesError;
        }
      }

      if (selectedCoLeaders.size > 0 && meetings) {
        const allCoLeaders = (meetings as any[]).flatMap((meeting: any) =>
          Array.from(selectedCoLeaders).map(userId => ({
            meeting_id: meeting.id,
            user_id: userId,
          }))
        );

        if (allCoLeaders.length > 0) {
          const { error: coLeadersError } = await createMeetingCoLeaders(allCoLeaders);
          if (coLeadersError) throw coLeadersError;
        }
      }

      const seriesInfo = seriesId ? { seriesId, seriesTitle: title.trim() } : undefined;
      resetForm();
      onCreated(seriesInfo);
      onClose();
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      setError(err.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setLocation('');
    setStartMinutes(null);
    setEndMinutes(null);
    setRecurrence('none');
    setRecurrenceCount('4');
    setTimezone(currentGroup?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    setError('');
    setSelectedMembers(new Set());
    setSelectedCoLeaders(new Set());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────

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
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Event</Text>
          <TouchableOpacity onPress={handleCreate} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.blue[500]} />
            ) : (
              <Text style={styles.createButton}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            <TextInput
              style={styles.input}
              placeholder="Event title"
              placeholderTextColor={colors.slate[500]}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.slate[500]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Date */}
            <Text style={styles.fieldLabel}>Date</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.dateFieldWeb}>
                <input
                  ref={dateInputRef as any}
                  type="date"
                  value={formatDateForInput(selectedDate)}
                  onChange={(e) => onWebDateChange(e.target.value)}
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    padding: '14px',
                    fontSize: 16,
                    color: '#F8FAFC',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {formatDateNoYear(selectedDate)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Time */}
            <Text style={styles.fieldLabel}>Time</Text>
            <TimePicker
              startMinutes={startMinutes}
              endMinutes={endMinutes}
              onStartChange={handleStartChange}
              onEndChange={handleEndChange}
            />

            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            {/* Timezone */}
            <Text style={styles.fieldLabel}>Timezone</Text>
            <TimezonePicker value={timezone} onChange={setTimezone} />

            {/* Recurrence */}
            <RecurrencePicker
              recurrence={recurrence}
              onRecurrenceChange={setRecurrence}
              count={recurrenceCount}
              onCountChange={setRecurrenceCount}
            />

            <TextInput
              style={styles.input}
              placeholder="Location (optional)"
              placeholderTextColor={colors.slate[500]}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Invite Members */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Invite Members</Text>
              <View style={styles.selectionButtons}>
                <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
                  <Text style={styles.selectionButtonText}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={selectNone} style={styles.selectionButton}>
                  <Text style={styles.selectionButtonText}>None</Text>
                </TouchableOpacity>
              </View>
            </View>

            <MemberCheckList
              members={groupMembers}
              selectedIds={selectedMembers}
              onToggle={toggleMember}
              loading={loadingMembers}
            />

            <Text style={styles.selectedCount}>
              {selectedMembers.size} of {groupMembers.length} members invited
            </Text>
          </View>

          {/* Co-Leaders (optional) */}
          {eligibleCoLeaders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Co-Leaders (Optional)</Text>
              <Text style={styles.coLeaderHint}>
                Co-leaders can edit, skip, and send reminders for this event.
              </Text>
              <MemberCheckList
                members={eligibleCoLeaders}
                selectedIds={selectedCoLeaders}
                onToggle={toggleCoLeader}
              />
            </View>
          )}
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
  cancelButton: { fontSize: fontSize.lg, color: colors.slate[400] },
  createButton: { fontSize: fontSize.lg, color: colors.blue[500], fontWeight: fontWeight.semibold },
  content: { flex: 1, padding: spacing.lg },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  errorText: { color: colors.red[500], fontSize: fontSize.md },
  section: { marginBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: fontSize.lg,
    color: colors.slate[50],
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: fontSize.sm, color: colors.slate[400], marginBottom: 6 },
  dateFieldWeb: { marginBottom: spacing.md },
  pickerButton: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[700],
    marginBottom: spacing.md,
  },
  pickerButtonText: { fontSize: fontSize.lg, color: colors.slate[50] },
  selectionButtons: { flexDirection: 'row', gap: spacing.sm },
  selectionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
  },
  selectionButtonText: { color: colors.blue[500], fontSize: 13, fontWeight: fontWeight.medium },
  selectedCount: { fontSize: 13, color: colors.slate[500], textAlign: 'center', marginTop: spacing.md },
  coLeaderHint: { fontSize: 13, color: colors.slate[500], marginBottom: spacing.md },
});
