import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroup } from '../contexts/GroupContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showGroupName?: boolean;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
  rightContent?: React.ReactNode;
}

export default function ScreenHeader({
  title,
  subtitle,
  showGroupName = true,
  rightAction,
  rightContent
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { currentGroup } = useGroup();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.leftSection}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <View style={styles.menuIcon}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : showGroupName && currentGroup ? (
            <TouchableOpacity onPress={openDrawer} activeOpacity={0.7}>
              <Text style={styles.groupName}>{currentGroup.name}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {rightContent ? (
        rightContent
      ) : rightAction ? (
        <TouchableOpacity style={styles.rightButton} onPress={rightAction.onPress}>
          <Text style={styles.rightButtonText}>{rightAction.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  menuButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  menuIcon: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: 22,
    height: 2,
    backgroundColor: colors.text.primary,
    borderRadius: 1,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  groupName: {
    fontSize: fontSize.md,
    color: colors.primary[500],
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.primary[500],
    marginTop: spacing.xs,
  },
  rightButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    marginTop: spacing.xs,
  },
  rightButtonText: {
    color: colors.text.inverse,
    fontWeight: fontWeight.semibold,
  },
});
