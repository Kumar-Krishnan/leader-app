import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, borderRadius, fontSize, fontWeight } from '../constants/theme';

export const TIMEZONE_OPTIONS = [
  { label: 'Eastern', value: 'America/New_York' },
  { label: 'Central', value: 'America/Chicago' },
  { label: 'Mountain', value: 'America/Denver' },
  { label: 'Pacific', value: 'America/Los_Angeles' },
  { label: 'Alaska', value: 'America/Anchorage' },
  { label: 'Hawaii', value: 'Pacific/Honolulu' },
  { label: 'GMT/London', value: 'Europe/London' },
  { label: 'Central Europe', value: 'Europe/Paris' },
  { label: 'Japan', value: 'Asia/Tokyo' },
  { label: 'Australia East', value: 'Australia/Sydney' },
] as const;

export function timezoneLabel(value: string): string {
  return TIMEZONE_OPTIONS.find(tz => tz.value === value)?.label ?? value;
}

interface Props {
  value: string;
  onChange: (tz: string) => void;
}

export default function TimezonePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        style={[styles.pickerButton, open && { borderColor: colors.blue[500] }]}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.pickerButtonText}>{timezoneLabel(value)}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
            {TIMEZONE_OPTIONS.map((tz) => (
              <TouchableOpacity
                key={tz.value}
                style={[styles.dropdownItem, value === tz.value && styles.dropdownItemActive]}
                onPress={() => {
                  onChange(tz.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, value === tz.value && styles.dropdownItemTextActive]}>
                  {tz.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[700],
    marginBottom: 12,
  },
  pickerButtonText: { fontSize: fontSize.lg, color: colors.slate[50] },
  dropdownContainer: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.slate[700],
    marginBottom: 12,
    maxHeight: 264,
    overflow: 'hidden',
  },
  dropdownList: { maxHeight: 264 },
  dropdownItem: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  dropdownItemActive: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  dropdownItemText: { fontSize: fontSize.lg, color: colors.slate[50] },
  dropdownItemTextActive: { color: colors.blue[500], fontWeight: fontWeight.semibold },
});
