import React, { useState, useEffect } from 'react';
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
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';

interface SendMeetingEmailModalProps {
  visible: boolean;
  onClose: () => void;
  meeting: MeetingWithAttendees | null;
  onSend: (meetingId: string, customDescription: string, customMessage: string, descriptionFirst: boolean) => Promise<boolean>;
  sending: boolean;
}

export default function SendMeetingEmailModal({
  visible,
  onClose,
  meeting,
  onSend,
  sending,
}: SendMeetingEmailModalProps) {
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [descriptionFirst, setDescriptionFirst] = useState(true);

  // Reset form when meeting changes
  useEffect(() => {
    if (meeting) {
      setDescription(meeting.description || '');
      setMessage('');
      setDescriptionFirst(true);
    }
  }, [meeting]);

  const handleSend = async () => {
    if (!meeting) return;

    const success = await onSend(meeting.id, description, message, descriptionFirst);
    if (success) {
      onClose();
    }
  };

  const swapOrder = () => {
    setDescriptionFirst(!descriptionFirst);
  };

  const attendeeCount = meeting?.attendees?.filter(a => a.user?.email).length || 0;

  if (!meeting) return null;

  const formattedDate = new Date(meeting.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = new Date(meeting.date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const renderTextField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    isFirst: boolean
  ) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity onPress={swapOrder} style={styles.moveButton}>
          <Text style={styles.moveButtonText}>
            {isFirst ? '↓ Move down' : '↑ Move up'}
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        multiline
        textAlignVertical="top"
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Reminder</Text>
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Meeting Info */}
          <View style={styles.meetingInfo}>
            <Text style={styles.meetingTitle}>{meeting.title}</Text>
            <Text style={styles.meetingDetails}>
              {formattedDate} at {formattedTime}
              {meeting.location ? ` • ${meeting.location}` : ''}
            </Text>
            <Text style={styles.recipientCount}>
              Will be sent to {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Reorderable Fields */}
          <View style={styles.fieldsContainer}>
            <Text style={styles.orderHint}>
              Drag fields to change order in email
            </Text>

            {descriptionFirst ? (
              <>
                {renderTextField(
                  'Description',
                  description,
                  setDescription,
                  'Add meeting details...',
                  true
                )}
                {renderTextField(
                  'Personal Message',
                  message,
                  setMessage,
                  'Add a personal note to attendees...',
                  false
                )}
              </>
            ) : (
              <>
                {renderTextField(
                  'Personal Message',
                  message,
                  setMessage,
                  'Add a personal note to attendees...',
                  true
                )}
                {renderTextField(
                  'Description',
                  description,
                  setDescription,
                  'Add meeting details...',
                  false
                )}
              </>
            )}
          </View>

          {/* Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Email Preview Order</Text>
            <View style={styles.previewOrder}>
              <View style={styles.previewItem}>
                <Text style={styles.previewNumber}>1</Text>
                <Text style={styles.previewLabel}>Meeting Details (date, time, location)</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewNumber}>2</Text>
                <Text style={styles.previewLabel}>
                  {descriptionFirst ? 'Description' : 'Personal Message'}
                </Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewNumber}>3</Text>
                <Text style={styles.previewLabel}>
                  {descriptionFirst ? 'Personal Message' : 'Description'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  cancelButton: {
    fontSize: fontSize.lg,
    color: colors.text.secondary,
  },
  sendButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  meetingInfo: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  meetingTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  meetingDetails: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  recipientCount: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  fieldsContainer: {
    marginBottom: spacing.lg,
  },
  orderHint: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  fieldContainer: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  moveButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  moveButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  textInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  previewSection: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    ...shadows.sm,
  },
  previewTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  previewOrder: {
    gap: spacing.sm,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  previewLabel: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
});
