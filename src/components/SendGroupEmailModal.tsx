import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';
import { emailService } from '../services/email';

interface SendGroupEmailModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  groupId: string;
}

export default function SendGroupEmailModal({
  visible,
  onClose,
  groupName,
  groupId,
}: SendGroupEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleClose = () => {
    setSubject('');
    setMessage('');
    onClose();
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      Alert.alert('Missing Subject', 'Please enter an email subject.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Missing Message', 'Please enter a message.');
      return;
    }

    setSending(true);
    const result = await emailService.sendGroupEmail({
      groupId,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSending(false);

    if (result.success) {
      Alert.alert(
        'Email Sent',
        `Your email was sent to ${result.recipientCount || 0} group member${result.recipientCount !== 1 ? 's' : ''}.`
      );
      setSubject('');
      setMessage('');
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Failed to send email.');
    }
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
          <Text style={styles.headerTitle}>Email Group</Text>
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
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupHint}>
              This email will be sent to all members of this group.
            </Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.subjectInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Email subject..."
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your message to the group..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              textAlignVertical="top"
            />
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
  groupInfo: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  groupName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  groupHint: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  fieldContainer: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subjectInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  messageInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});
