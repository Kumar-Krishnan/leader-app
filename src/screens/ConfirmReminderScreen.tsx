import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';

interface MeetingInfo {
  meeting: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    location: string | null;
  };
  groupName: string;
  leaderName: string;
  attendeeCount: number;
  resolvedTimezone: string;
}

type ScreenState = 'loading' | 'form' | 'sending' | 'success' | 'error';

export default function ConfirmReminderScreen() {
  const route = useRoute();
  const token = (route.params as any)?.token as string | undefined;

  const [state, setState] = useState<ScreenState>('loading');
  const [error, setError] = useState('');
  const [data, setData] = useState<MeetingInfo | null>(null);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (token) fetchMeetingData();
    else {
      setError('No token provided in the URL.');
      setState('error');
    }
  }, [token]);

  const getEdgeFunctionUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    return `${supabaseUrl}/functions/v1/meeting-confirmation-page?token=${token}`;
  };

  const fetchMeetingData = async () => {
    try {
      setState('loading');
      const url = getEdgeFunctionUrl();
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(body.error || `Error: ${res.status}`);
        setState('error');
        return;
      }

      const json: MeetingInfo = await res.json();
      setData(json);
      setDescription(json.meeting.description || '');
      setState('form');
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting data.');
      setState('error');
    }
  };

  const handleConfirm = async () => {
    if (!data) return;
    try {
      setState('sending');
      const url = getEdgeFunctionUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim() || null,
          message: message.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({ error: 'Unknown error' }));

      if (!res.ok) {
        setError(json.error || 'Failed to send reminder.');
        setState('form');
        return;
      }

      setSentCount(json.attendeeCount || data.attendeeCount);
      setState('success');
    } catch (err: any) {
      setError(err.message || 'Failed to send reminder.');
      setState('form');
    }
  };

  const formatDate = (isoDate: string, tz: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz,
    });
  };

  const formatTime = (isoDate: string, tz: string) => {
    return new Date(isoDate).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    });
  };

  const formatTzShort = (isoDate: string, tz: string) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date(isoDate));
    return parts.find((p) => p.type === 'timeZoneName')?.value || '';
  };

  // Loading
  if (state === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading meeting details...</Text>
      </View>
    );
  }

  // Error (no meeting data)
  if (state === 'error' && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorTitle}>Unable to Load</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  // Success
  if (state === 'success') {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Reminder Sent!</Text>
        <Text style={styles.successMessage}>
          Your reminder has been sent to {sentCount} attendee{sentCount !== 1 ? 's' : ''}.
        </Text>
        {data && (
          <Text style={styles.successMeetingTitle}>{data.meeting.title}</Text>
        )}
      </View>
    );
  }

  // Form
  if (!data) return null;

  const tz = data.resolvedTimezone;
  const formattedDate = formatDate(data.meeting.date, tz);
  const formattedTime = formatTime(data.meeting.date, tz);
  const tzShort = formatTzShort(data.meeting.date, tz);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Send Meeting Reminder</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.meetingTitle}>{data.meeting.title}</Text>

      {/* Meeting details */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formattedDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{formattedTime} {tzShort}</Text>
        </View>
        {data.meeting.location && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{data.meeting.location}</Text>
          </View>
        )}
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.detailLabel}>Attendees</Text>
          <Text style={styles.detailValue}>
            {data.attendeeCount} {data.attendeeCount === 1 ? 'person' : 'people'} will receive this reminder
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.fieldLabel}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Add details about the meeting..."
        placeholderTextColor={colors.text.tertiary}
        multiline
        maxLength={5000}
      />
      <Text style={styles.hint}>This will appear in the reminder email. You can edit the description above.</Text>

      {/* Personal message */}
      <Text style={styles.fieldLabel}>Personal Message (Optional)</Text>
      <TextInput
        style={[styles.input, styles.messageArea]}
        value={message}
        onChangeText={setMessage}
        placeholder="Add a personal note to attendees..."
        placeholderTextColor={colors.text.tertiary}
        multiline
        maxLength={2000}
      />
      <Text style={styles.hint}>Add a personal note that will be highlighted in the email.</Text>

      {/* Confirm button */}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirm}
        disabled={state === 'sending'}
      >
        {state === 'sending' ? (
          <ActivityIndicator size="small" color={colors.text.inverse} />
        ) : (
          <Text style={styles.confirmButtonText}>
            Confirm & Send to {data.attendeeCount} Attendee{data.attendeeCount !== 1 ? 's' : ''}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Sent by {data.leaderName} via {data.groupName}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 60,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.xxl,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: fontSize.md,
    marginTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.primary[500],
  },
  meetingTitle: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  detailsCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  detailRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  messageArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  confirmButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  confirmButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.inverse,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.text.tertiary,
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    color: colors.error.light,
    fontSize: fontSize.md,
  },
  errorIcon: {
    fontSize: 48,
    color: colors.error.main,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
    width: 80,
    height: 80,
    lineHeight: 80,
    textAlign: 'center',
    borderRadius: 40,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    overflow: 'hidden',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: colors.success.main,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
    width: 80,
    height: 80,
    lineHeight: 80,
    textAlign: 'center',
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    overflow: 'hidden',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  successMessage: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  successMeetingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary[500],
    marginTop: spacing.lg,
  },
});
