import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { colors, borderRadius, fontSize, fontWeight } from '../constants/theme';

export interface TimeOption {
  minutes: number; // minutes since midnight (0–1425)
  label: string;   // e.g. "9:00pm"
}

export function buildTimeOptions(): TimeOption[] {
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

export const TIME_OPTIONS = buildTimeOptions();

export function timeLabel(minutes: number | null): string {
  if (minutes === null) return '';
  return TIME_OPTIONS.find(t => t.minutes === minutes)?.label ?? '';
}

interface Props {
  startMinutes: number | null;
  endMinutes: number | null;
  onStartChange: (minutes: number) => void;
  onEndChange: (minutes: number) => void;
}

export default function TimePicker({ startMinutes, endMinutes, onStartChange, onEndChange }: Props) {
  const [activeDropdown, setActiveDropdown] = useState<'start' | 'end' | null>(null);
  const timeListRef = useRef<FlatList>(null);
  const timeSelected = startMinutes !== null;

  const openDropdown = (which: 'start' | 'end') => {
    setActiveDropdown(which);
    setTimeout(() => {
      const current = which === 'start' ? startMinutes : endMinutes;
      const target = current ?? 19 * 60;
      const idx = TIME_OPTIONS.findIndex(t => t.minutes >= target);
      if (idx >= 0 && timeListRef.current) {
        timeListRef.current.scrollToIndex({ index: Math.max(0, idx - 2), animated: false });
      }
    }, 100);
  };

  const onTimeSelect = (minutes: number) => {
    if (activeDropdown === 'start') {
      onStartChange(minutes);
    } else {
      onEndChange(minutes);
    }
    setActiveDropdown(null);
  };

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

  return (
    <View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  timeChip: {
    flex: 1,
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[700],
    alignItems: 'center',
  },
  timeChipActive: { borderColor: colors.blue[500] },
  timeChipText: { fontSize: fontSize.lg, color: colors.slate[50] },
  timeChipPlaceholder: { color: colors.slate[500] },
  timeDash: { color: colors.slate[500], fontSize: fontSize.xl },
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
