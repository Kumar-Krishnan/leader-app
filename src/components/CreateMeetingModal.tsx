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
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { supabase } from '../lib/supabase';
import { Profile, PlaceholderProfile } from '../types/database';

interface SeriesInfo {
  seriesId: string;
  seriesTitle: string;
}

/** Member that can be invited (either real user or placeholder) */
interface InvitableMember {
  id: string;
  type: 'user' | 'placeholder';
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (seriesInfo?: SeriesInfo) => void;
}

type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

// ── Time option helpers ──────────────────────────────────────────────

interface TimeOption {
  minutes: number; // minutes since midnight (0–1425)
  label: string;   // e.g. "9:00pm"
}

function buildTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    const h24 = Math.floor(m / 60);
    const min = m % 60;
    const period = h24 < 12 ? 'am' : 'pm';
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    options.push({ minutes: m, label: `${h12}:${String(min).padStart(2, '0')}${period}` });
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function timeLabel(minutes: number | null): string {
  if (minutes === null) return '';
  return TIME_OPTIONS.find(t => t.minutes === minutes)?.label ?? '';
}

// ── Component ────────────────────────────────────────────────────────

export default function CreateMeetingModal({ visible, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { currentGroup } = useGroup();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Time state
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [endMinutes, setEndMinutes] = useState<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<'start' | 'end' | null>(null);
  const timeListRef = useRef<FlatList>(null);
  const timeSelected = startMinutes !== null;

  // Date picker (native)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Recurrence
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceCount, setRecurrenceCount] = useState('4');

  // Members
  const [groupMembers, setGroupMembers] = useState<InvitableMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ── Reset on open ────────────────────────────────────────────────

  useEffect(() => {
    if (visible && currentGroup) {
      fetchGroupMembers();
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setSelectedDate(d);
      setStartMinutes(null);
      setEndMinutes(null);
      setActiveDropdown(null);
      setRecurrence('none');
      setRecurrenceCount('4');
    }
  }, [visible, currentGroup]);

  // ── Members ──────────────────────────────────────────────────────

  const fetchGroupMembers = async () => {
    if (!currentGroup) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          placeholder_id,
          user:profiles(*),
          placeholder:placeholder_profiles(*)
        `)
        .eq('group_id', currentGroup.id);

      if (error) throw error;

      const members: InvitableMember[] = [];
      for (const item of (data || []) as any[]) {
        if (item.user_id && item.user) {
          members.push({
            id: item.user_id,
            type: 'user',
            displayName: item.user.full_name || item.user.email,
            email: item.user.email,
            avatarUrl: item.user.avatar_url,
          });
        } else if (item.placeholder_id && item.placeholder) {
          members.push({
            id: item.placeholder_id,
            type: 'placeholder',
            displayName: item.placeholder.full_name,
            email: item.placeholder.email,
            avatarUrl: null,
          });
        }
      }
      setGroupMembers(members);
      setSelectedMembers(new Set(members.map(m => m.id)));
    } catch (err) {
      console.error('Error fetching group members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedMembers(new Set(groupMembers.map(m => m.id)));
  const selectNone = () => setSelectedMembers(new Set());

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

  const formatDateForInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // ── Time dropdown ────────────────────────────────────────────────

  const openDropdown = (which: 'start' | 'end') => {
    setActiveDropdown(which);
    setTimeout(() => {
      const current = which === 'start' ? startMinutes : endMinutes;
      const target = current ?? 19 * 60; // default scroll near 7pm
      const idx = TIME_OPTIONS.findIndex(t => t.minutes >= target);
      if (idx >= 0 && timeListRef.current) {
        timeListRef.current.scrollToIndex({ index: Math.max(0, idx - 2), animated: false });
      }
    }, 100);
  };

  const onTimeSelect = (minutes: number) => {
    if (activeDropdown === 'start') {
      setStartMinutes(minutes);
      // Auto-set end to start + 60 min (wrap at midnight)
      const autoEnd = (minutes + 60) % (24 * 60);
      setEndMinutes(autoEnd);
      // Update selectedDate
      const d = new Date(selectedDate);
      d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      setSelectedDate(d);
    } else {
      setEndMinutes(minutes);
    }
    setActiveDropdown(null);
  };

  // Filter end-time options: show times after start (with wrap)
  const dropdownOptions = activeDropdown === 'end' && startMinutes !== null
    ? TIME_OPTIONS.filter(t => t.minutes > startMinutes)
    : TIME_OPTIONS;

  const renderTimeRow = ({ item }: { item: TimeOption }) => {
    const current = activeDropdown === 'start' ? startMinutes : endMinutes;
    const isActive = item.minutes === current;
    return (
      <TouchableOpacity
        style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
        onPress={() => onTimeSelect(item.minutes)}
      >
        <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
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

      // Build end_date from endMinutes relative to each event's start date
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
        };
        if (endMinutes !== null) {
          const endDate = new Date(eventDate);
          endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
          // If end is before start (e.g. past midnight), push to next day
          if (endDate <= eventDate) endDate.setDate(endDate.getDate() + 1);
          base.end_date = endDate.toISOString();
        }
        return base;
      });

      const { data: meetings, error: meetingError } = await supabase
        .from('meetings')
        .insert(eventsToCreate as any)
        .select();

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
          const { error: attendeesError } = await supabase
            .from('meeting_attendees')
            .insert(allAttendees as any);
          if (attendeesError) throw attendeesError;
        }
      }

      const seriesInfo = seriesId ? { seriesId, seriesTitle: title.trim() } : undefined;

      // Reset
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
    setActiveDropdown(null);
    setRecurrence('none');
    setRecurrenceCount('4');
    setError('');
    setSelectedMembers(new Set());
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Event</Text>
          <TouchableOpacity onPress={handleCreate} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#3B82F6" />
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
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* ── Date ── */}
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
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Time ── */}
            <Text style={styles.fieldLabel}>Time</Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[styles.timeChip, activeDropdown === 'start' && styles.timeChipActive]}
                onPress={() => openDropdown('start')}
              >
                <Text style={[styles.timeChipText, !timeSelected && styles.timeChipPlaceholder]}>
                  {timeSelected ? timeLabel(startMinutes) : 'Start'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.timeDash}>–</Text>

              <TouchableOpacity
                style={[styles.timeChip, activeDropdown === 'end' && styles.timeChipActive]}
                onPress={() => openDropdown('end')}
              >
                <Text style={[styles.timeChipText, endMinutes === null && styles.timeChipPlaceholder]}>
                  {endMinutes !== null ? timeLabel(endMinutes) : 'End'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Native date picker */}
            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            {/* Time dropdown (shared for start / end) */}
            {activeDropdown && (
              <View style={styles.dropdownContainer}>
                <FlatList
                  ref={timeListRef}
                  data={dropdownOptions}
                  renderItem={renderTimeRow}
                  keyExtractor={(item) => String(item.minutes)}
                  style={styles.dropdownList}
                  getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
                  onScrollToIndexFailed={() => {}}
                />
              </View>
            )}

            {/* Recurrence */}
            <View style={styles.recurrenceSection}>
              <Text style={styles.fieldLabel}>Repeat</Text>
              <View style={styles.recurrenceOptions}>
                {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.recurrenceOption, recurrence === type && styles.recurrenceOptionActive]}
                    onPress={() => setRecurrence(type)}
                  >
                    <Text style={[styles.recurrenceOptionText, recurrence === type && styles.recurrenceOptionTextActive]}>
                      {type === 'none' ? 'Once' : type === 'biweekly' ? 'Bi-weekly' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {recurrence !== 'none' && (
                <View style={styles.recurrenceCountRow}>
                  <Text style={styles.recurrenceCountLabel}>Number of occurrences:</Text>
                  <TextInput
                    style={styles.recurrenceCountInput}
                    placeholder="4"
                    placeholderTextColor="#64748B"
                    value={recurrenceCount}
                    onChangeText={setRecurrenceCount}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Location (optional)"
              placeholderTextColor="#64748B"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* ── Invite Members ── */}
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

            {loadingMembers ? (
              <ActivityIndicator size="small" color="#3B82F6" style={styles.loadingMembers} />
            ) : (
              <View style={styles.membersList}>
                {groupMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.memberItem, selectedMembers.has(member.id) && styles.memberItemSelected]}
                    onPress={() => toggleMember(member.id)}
                  >
                    {member.type === 'placeholder' ? (
                      <View style={styles.placeholderAvatar}>
                        <Text style={styles.placeholderAvatarText}>?</Text>
                      </View>
                    ) : (
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {member.displayName?.[0] || member.email[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{member.displayName}</Text>
                        {member.type === 'placeholder' && (
                          <View style={styles.placeholderBadge}>
                            <Text style={styles.placeholderBadgeText}>Placeholder</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>
                    <View style={[styles.checkbox, selectedMembers.has(member.id) && styles.checkboxChecked]}>
                      {selectedMembers.has(member.id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.selectedCount}>
              {selectedMembers.size} of {groupMembers.length} members invited
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#F8FAFC' },
  cancelButton: { fontSize: 16, color: '#94A3B8' },
  createButton: { fontSize: 16, color: '#3B82F6', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 14 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#F8FAFC',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 6 },

  // ── Date field ───────────────────────────────────────────────────
  dateFieldWeb: {
    marginBottom: 12,
  },
  pickerButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#F8FAFC',
  },

  // ── Time row ────────────────────────────────────────────────────
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  timeChip: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  timeChipActive: {
    borderColor: '#3B82F6',
  },
  timeChipText: {
    fontSize: 16,
    color: '#F8FAFC',
  },
  timeChipPlaceholder: {
    color: '#64748B',
  },
  timeDash: {
    color: '#64748B',
    fontSize: 18,
  },

  // ── Time dropdown ────────────────────────────────────────────────
  dropdownContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    maxHeight: 264,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 264,
  },
  dropdownItem: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#F8FAFC',
  },
  dropdownItemTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // ── Recurrence ───────────────────────────────────────────────────
  recurrenceSection: { marginBottom: 12 },
  recurrenceOptions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  recurrenceOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  recurrenceOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  recurrenceOptionText: { fontSize: 14, fontWeight: '500', color: '#94A3B8' },
  recurrenceOptionTextActive: { color: '#3B82F6' },
  recurrenceCountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recurrenceCountLabel: { fontSize: 14, color: '#94A3B8', flex: 1 },
  recurrenceCountInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    width: 60,
    textAlign: 'center',
  },

  // ── Members ──────────────────────────────────────────────────────
  selectionButtons: { flexDirection: 'row', gap: 8 },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  selectionButtonText: { color: '#3B82F6', fontSize: 13, fontWeight: '500' },
  loadingMembers: { padding: 20 },
  membersList: { gap: 8 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  placeholderAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#475569', justifyContent: 'center', alignItems: 'center',
  },
  placeholderAvatarText: { color: '#94A3B8', fontSize: 18, fontWeight: '600' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '500', color: '#F8FAFC' },
  placeholderBadge: {
    backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  placeholderBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  memberEmail: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#475569',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  selectedCount: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 12 },
});
