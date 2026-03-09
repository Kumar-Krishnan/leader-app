import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';

export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

interface Props {
  recurrence: RecurrenceType;
  onRecurrenceChange: (type: RecurrenceType) => void;
  count: string;
  onCountChange: (count: string) => void;
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Once',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

export default function RecurrencePicker({
  recurrence,
  onRecurrenceChange,
  count,
  onCountChange,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Repeat</Text>
      <View style={styles.options}>
        {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.option, recurrence === type && styles.optionActive]}
            onPress={() => onRecurrenceChange(type)}
          >
            <Text style={[styles.optionText, recurrence === type && styles.optionTextActive]}>
              {RECURRENCE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {recurrence !== 'none' && (
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>Number of occurrences:</Text>
          <TextInput
            style={styles.countInput}
            placeholder="4"
            placeholderTextColor={colors.slate[500]}
            value={count}
            onChangeText={onCountChange}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.slate[400], marginBottom: 6 },
  options: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  option: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.slate[700],
    alignItems: 'center',
  },
  optionActive: {
    borderColor: colors.blue[500],
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  optionText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.slate[400] },
  optionTextActive: { color: colors.blue[500] },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  countLabel: { fontSize: fontSize.md, color: colors.slate[400], flex: 1 },
  countInput: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.sm,
    padding: 10,
    fontSize: fontSize.lg,
    color: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[700],
    width: 60,
    textAlign: 'center',
  },
});
