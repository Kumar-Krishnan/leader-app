import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroup } from '../contexts/GroupContext';

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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 1,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  groupName: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7C3AED',
    marginTop: 4,
  },
  rightButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  rightButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
