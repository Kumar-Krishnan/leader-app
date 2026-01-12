import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useGroup } from '../../contexts/GroupContext';
import { supabase } from '../../lib/supabase';
import { Meeting } from '../../types/database';

export default function MeetingsScreen() {
  const { currentGroup, isGroupLeader } = useGroup();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentGroup) {
      fetchMeetings();
    } else {
      setLoading(false);
    }
  }, [currentGroup]);

  const fetchMeetings = async () => {
    if (!currentGroup) return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', currentGroup.id)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMeeting = ({ item }: { item: Meeting }) => (
    <TouchableOpacity style={styles.meetingCard}>
      <View style={styles.dateBox}>
        <Text style={styles.dateMonth}>
          {new Date(item.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
        </Text>
        <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
      </View>
      <View style={styles.meetingInfo}>
        <Text style={styles.meetingTitle}>{item.title}</Text>
        <Text style={styles.meetingDetails}>
          {new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          {item.location ? ` • ${item.location}` : ''}
        </Text>
        {item.passages && item.passages.length > 0 && (
          <View style={styles.passagesContainer}>
            {item.passages.map((passage, idx) => (
              <View key={idx} style={styles.passageBadge}>
                <Text style={styles.passageText}>{passage}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyTitle}>No upcoming meetings</Text>
      <Text style={styles.emptyText}>
        {isGroupLeader 
          ? 'Schedule a meeting to get your group together.'
          : 'Upcoming meetings will appear here.'}
      </Text>
      {isGroupLeader && (
        <TouchableOpacity style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Schedule Meeting</Text>
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
          <Text style={styles.title}>Meetings</Text>
          <Text style={styles.parishName}>{currentGroup?.name}</Text>
        </View>
        {isGroupLeader && (
          <TouchableOpacity style={styles.newButton}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={meetings}
        renderItem={renderMeeting}
        keyExtractor={(item) => item.id}
        contentContainerStyle={meetings.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
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
  meetingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateBox: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 60,
  },
  dateMonth: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '600',
  },
  dateDay: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  meetingInfo: {
    flex: 1,
    marginLeft: 16,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  meetingDetails: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  passagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  passageBadge: {
    backgroundColor: '#164E63',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passageText: {
    color: '#67E8F9',
    fontSize: 12,
    fontWeight: '500',
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
