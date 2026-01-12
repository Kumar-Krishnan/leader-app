import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useGroup } from '../../contexts/GroupContext';
import { supabase } from '../../lib/supabase';
import { Thread } from '../../types/database';
import CreateThreadModal from '../../components/CreateThreadModal';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ThreadsStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<ThreadsStackParamList>;

interface ThreadWithDetails extends Thread {
  lastMessage?: string;
  unreadCount?: number;
}

export default function ThreadsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { currentGroup, isGroupLeader } = useGroup();
  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    console.log('[ThreadsScreen] useEffect, currentGroup:', currentGroup?.id, 'user:', user?.id);
    if (currentGroup) {
      fetchThreads();
    } else {
      console.log('[ThreadsScreen] No currentGroup, setting loading false');
      setLoading(false);
    }
  }, [user, currentGroup]);

  const fetchThreads = async () => {
    console.log('[ThreadsScreen] fetchThreads called');
    if (!user || !currentGroup) {
      console.log('[ThreadsScreen] Missing user or currentGroup, returning');
      return;
    }
    
    try {
      console.log('[ThreadsScreen] Fetching threads for group:', currentGroup.id);
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('group_id', currentGroup.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      console.log('[ThreadsScreen] Got threads:', data?.length);
      setThreads(data || []);
    } catch (error) {
      console.error('[ThreadsScreen] Error fetching threads:', error);
    } finally {
      console.log('[ThreadsScreen] Setting loading false');
      setLoading(false);
    }
  };

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
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Threads</Text>
          <Text style={styles.parishName}>{currentGroup?.name}</Text>
        </View>
        {isGroupLeader && (
          <TouchableOpacity 
            style={styles.newButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>
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
        onCreated={fetchThreads}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  parishName: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 4,
  },
  newButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 20,
    gap: 12,
  },
  emptyList: {
    flex: 1,
    padding: 20,
  },
  threadCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  threadInfo: {
    flex: 1,
    marginLeft: 12,
  },
  threadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  lastMessage: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
