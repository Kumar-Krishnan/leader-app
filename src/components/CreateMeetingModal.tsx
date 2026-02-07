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
import { supabase } from '../lib/supabase';
import { Profile, PlaceholderProfile } from '../types/database';

interface SeriesInfo {
  seriesId: string;
  seriesTitle: string;
}

/** Member that can be invited (either real user or placeholder) */
interface InvitableMember {
  id: string; // user_id or placeholder_id
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

export default function CreateMeetingModal({ visible, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { currentGroup } = useGroup();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Date/Time picker visibility (for native)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Refs for web inputs
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  
  // Recurrence options
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceCount, setRecurrenceCount] = useState('4'); // Number of occurrences
  
  // Group members for invitation (includes placeholders)
  const [groupMembers, setGroupMembers] = useState<InvitableMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (visible && currentGroup) {
      fetchGroupMembers();
      // Set default date to today at 7pm
      const defaultDate = new Date();
      defaultDate.setHours(19, 0, 0, 0);
      setSelectedDate(defaultDate);
      setRecurrence('none');
      setRecurrenceCount('4');
    }
  }, [visible, currentGroup]);

  const fetchGroupMembers = async () => {
    if (!currentGroup) return;

    setLoadingMembers(true);
    try {
      // Query group members with joined profile/placeholder data
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

      // Transform to InvitableMember format
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

      // Select all members by default
      setSelectedMembers(new Set(members.map(m => m.id)));
    } catch (err) {
      console.error('Error fetching group members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedMembers(new Set(groupMembers.map(m => m.id)));
  };

  const selectNone = () => {
    setSelectedMembers(new Set());
  };

  // Generate dates for recurring events
  const generateRecurringDates = (startDate: Date, type: RecurrenceType, count: number): Date[] => {
    const dates: Date[] = [startDate];

    if (type === 'none') return dates;

    for (let i = 1; i < count; i++) {
      const newDate = new Date(startDate);
      if (type === 'weekly') {
        newDate.setDate(startDate.getDate() + (i * 7));
      } else if (type === 'biweekly') {
        newDate.setDate(startDate.getDate() + (i * 14));
      } else if (type === 'monthly') {
        newDate.setMonth(startDate.getMonth() + i);
      }
      dates.push(newDate);
    }

    return dates;
  };

  // Handle date change from native picker
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(newDate);
    }
  };

  // Handle time change from native picker
  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(newDate);
    }
  };

  // Handle web date input change
  const onWebDateChange = (dateString: string) => {
    if (dateString) {
      const [year, month, day] = dateString.split('-').map(Number);
      const newDate = new Date(selectedDate);
      newDate.setFullYear(year, month - 1, day);
      setSelectedDate(newDate);
    }
  };

  // Handle web time input change
  const onWebTimeChange = (timeString: string) => {
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes);
      setSelectedDate(newDate);
    }
  };

  // Format date for web input
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Format time for web input
  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!currentGroup || !user) {
      setError('No group selected');
      return;
    }

    const count = parseInt(recurrenceCount) || 1;
    if (recurrence !== 'none' && (count < 1 || count > 52)) {
      setError('Number of occurrences must be between 1 and 52');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate all dates for recurring events
      const eventDates = generateRecurringDates(selectedDate, recurrence, count);
      
      // Generate a series_id if this is a recurring event
      const seriesId = recurrence !== 'none' ? crypto.randomUUID() : null;
      
      // Create all events
      const eventsToCreate = eventDates.map((eventDate, index) => ({
        title: title.trim(), // Keep original title, use series_index for display
        description: description.trim() || null,
        date: eventDate.toISOString(),
        location: location.trim() || null,
        group_id: currentGroup.id,
        created_by: user.id,
        passages: [],
        attachments: [],
        // Series tracking
        series_id: seriesId,
        series_index: recurrence !== 'none' ? index + 1 : null,
        series_total: recurrence !== 'none' ? eventDates.length : null,
      }));

      const { data: meetings, error: meetingError } = await supabase
        .from('meetings')
        .insert(eventsToCreate as any)
        .select();

      if (meetingError) throw meetingError;

      // Add attendees to all created meetings
      if (selectedMembers.size > 0 && meetings) {
        const allAttendees = (meetings as any[]).flatMap((meeting: any) =>
          Array.from(selectedMembers).map(memberId => {
            // Find the member to determine if it's a user or placeholder
            const member = groupMembers.find(m => m.id === memberId);
            if (!member) return null;

            if (member.type === 'user') {
              return {
                meeting_id: meeting.id,
                user_id: memberId,
                placeholder_id: null,
                status: 'invited' as const,
              };
            } else {
              return {
                meeting_id: meeting.id,
                user_id: null,
                placeholder_id: memberId,
                status: 'invited' as const,
              };
            }
          }).filter((a): a is NonNullable<typeof a> => a !== null)
        );

        if (allAttendees.length > 0) {
          const { error: attendeesError } = await supabase
            .from('meeting_attendees')
            .insert(allAttendees as any);

          if (attendeesError) throw attendeesError;
        }
      }

      // Capture series info before resetting form
      const seriesInfo = seriesId ? { seriesId, seriesTitle: title.trim() } : undefined;

      // Reset form
      setTitle('');
      setDescription('');
      const defaultDate = new Date();
      defaultDate.setHours(19, 0, 0, 0);
      setSelectedDate(defaultDate);
      setLocation('');
      setRecurrence('none');
      setRecurrenceCount('4');
      setSelectedMembers(new Set());

      onCreated(seriesInfo);
      onClose();
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      setError(err.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    const defaultDate = new Date();
    defaultDate.setHours(19, 0, 0, 0);
    setSelectedDate(defaultDate);
    setLocation('');
    setRecurrence('none');
    setRecurrenceCount('4');
    setError('');
    setSelectedMembers(new Set());
    onClose();
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

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeField}>
                <Text style={styles.fieldLabel}>Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webInputContainer}>
                    <input
                      ref={dateInputRef as any}
                      type="date"
                      value={formatDateForInput(selectedDate)}
                      onChange={(e) => onWebDateChange(e.target.value)}
                      style={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 16,
                        color: '#F8FAFC',
                        width: '100%',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateTimeButtonText}>
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.dateTimeField}>
                <Text style={styles.fieldLabel}>Time</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webInputContainer}>
                    <input
                      ref={timeInputRef as any}
                      type="time"
                      value={formatTimeForInput(selectedDate)}
                      onChange={(e) => onWebTimeChange(e.target.value)}
                      style={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 16,
                        color: '#F8FAFC',
                        width: '100%',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.dateTimeButtonText}>
                      {selectedDate.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Native Date/Time Pickers */}
            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
            {showTimePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}

            <View style={styles.recurrenceSection}>
              <Text style={styles.fieldLabel}>Repeat</Text>
              <View style={styles.recurrenceOptions}>
                <TouchableOpacity
                  style={[styles.recurrenceOption, recurrence === 'none' && styles.recurrenceOptionActive]}
                  onPress={() => setRecurrence('none')}
                >
                  <Text style={[styles.recurrenceOptionText, recurrence === 'none' && styles.recurrenceOptionTextActive]}>
                    Once
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recurrenceOption, recurrence === 'weekly' && styles.recurrenceOptionActive]}
                  onPress={() => setRecurrence('weekly')}
                >
                  <Text style={[styles.recurrenceOptionText, recurrence === 'weekly' && styles.recurrenceOptionTextActive]}>
                    Weekly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recurrenceOption, recurrence === 'biweekly' && styles.recurrenceOptionActive]}
                  onPress={() => setRecurrence('biweekly')}
                >
                  <Text style={[styles.recurrenceOptionText, recurrence === 'biweekly' && styles.recurrenceOptionTextActive]}>
                    Bi-weekly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recurrenceOption, recurrence === 'monthly' && styles.recurrenceOptionActive]}
                  onPress={() => setRecurrence('monthly')}
                >
                  <Text style={[styles.recurrenceOptionText, recurrence === 'monthly' && styles.recurrenceOptionTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
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
                    style={[
                      styles.memberItem,
                      selectedMembers.has(member.id) && styles.memberItemSelected,
                    ]}
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
                        <Text style={styles.memberName}>
                          {member.displayName}
                        </Text>
                        {member.type === 'placeholder' && (
                          <View style={styles.placeholderBadge}>
                            <Text style={styles.placeholderBadgeText}>Placeholder</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      selectedMembers.has(member.id) && styles.checkboxChecked,
                    ]}>
                      {selectedMembers.has(member.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
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
  cancelButton: {
    fontSize: 16,
    color: '#94A3B8',
  },
  createButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeField: {
    flex: 1,
  },
  dateTimeButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#F8FAFC',
  },
  webInputContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  selectionButtonText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingMembers: {
    padding: 20,
  },
  membersList: {
    gap: 8,
  },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderAvatarText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F8FAFC',
  },
  placeholderBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  placeholderBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedCount: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  recurrenceSection: {
    marginBottom: 12,
  },
  recurrenceOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
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
  recurrenceOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  recurrenceOptionTextActive: {
    color: '#3B82F6',
  },
  recurrenceCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recurrenceCountLabel: {
    fontSize: 14,
    color: '#94A3B8',
    flex: 1,
  },
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
});

