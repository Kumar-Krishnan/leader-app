import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useGroup } from '../../contexts/GroupContext';
import { useThreads, ThreadWithDetails } from '../../hooks/useThreads';
import CreateThreadModal from '../../components/CreateThreadModal';
import ScreenHeader from '../../components/ScreenHeader';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ThreadsStackParamList } from '../../navigation/types';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<ThreadsStackParamList>;

export default function ThreadsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isGroupLeader } = useGroup();
  const { threads, loading, refetch } = useThreads();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const openThread = (thread: ThreadWithDetails) => {
    navigation.navigate('ThreadDetail', {
      threadId: thread.id,
      threadName: thread.name,
    });
  };

  const renderThread = ({ item }: { item: ThreadWithDetails }) => (
    <TouchableOpacity style={styles.threadCard} onPress={() => openThread(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0]}</Text>
      </View>
      <View style={styles.threadInfo}>
        <Text style={styles.threadName}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
      {item.unreadCount && item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No threads yet</Text>
      <Text style={styles.emptyText}>
        {isGroupLeader 
          ? 'Create a new thread to start a conversation with your group.'
          : 'You\'ll see threads here once you\'re added to one.'}
      </Text>
      {isGroupLeader && (
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.emptyButtonText}>Create Thread</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator testID="activity-indicator" size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Threads"
        rightAction={isGroupLeader ? {
          label: '+ New',
          onPress: () => setShowCreateModal(true),
        } : undefined}
      />
      <FlatList
        data={threads}
        renderItem={renderThread}
        keyExtractor={(item) => item.id}
        contentContainerStyle={threads.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      <CreateThreadModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
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
  newButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  newButtonText: {
    color: colors.text.inverse,
    fontWeight: fontWeight.semibold,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyList: {
    flex: 1,
    padding: spacing.xl,
  },
  threadCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.text.inverse,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  threadInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  threadName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  lastMessage: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  unreadBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: spacing.xxl,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
