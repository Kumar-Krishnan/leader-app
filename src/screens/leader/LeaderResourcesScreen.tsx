import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Resource } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_ICONS: Record<string, string> = {
  document: '📄',
  video: '🎬',
  link: '🔗',
  other: '📎',
};

export default function LeaderResourcesScreen() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [leaderCount, setLeaderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch leader-only resources
      const { data: resourceData, error: resourceError } = await supabase
        .from('resources')
        .select('*')
        .eq('visibility', 'leaders_only')
        .order('created_at', { ascending: false });

      if (resourceError) throw resourceError;
      setResources(resourceData || []);

      // Count leaders
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['leader', 'admin']);

      if (!countError && count) {
        setLeaderCount(count);
      }
    } catch (error) {
      console.error('Error fetching leader data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderResource = ({ item }: { item: Resource }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{TYPE_ICONS[item.type] || TYPE_ICONS.other}</Text>
      </View>
      <View style={styles.resourceInfo}>
        <Text style={styles.resourceTitle}>{item.title}</Text>
        <Text style={styles.sharedBy}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity style={styles.shareButton}>
        <Text style={styles.shareIcon}>↗</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⭐</Text>
      <Text style={styles.emptyTitle}>No leader resources yet</Text>
      <Text style={styles.emptyText}>
        Share resources exclusively with other leaders.
      </Text>
      <TouchableOpacity style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Share Resource</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Leader Hub</Text>
          <Text style={styles.subtitle}>Resources for leaders only</Text>
        </View>
        <TouchableOpacity style={styles.newButton}>
          <Text style={styles.newButtonText}>+ Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{resources.length}</Text>
          <Text style={styles.statLabel}>Resources</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{leaderCount}</Text>
          <Text style={styles.statLabel}>Leaders</Text>
        </View>
      </View>

      {resources.length > 0 && (
        <Text style={styles.sectionTitle}>Leader Resources</Text>
      )}
      
      <FlatList
        data={resources}
        renderItem={renderResource}
        keyExtractor={(item) => item.id}
        contentContainerStyle={resources.length === 0 ? styles.emptyList : styles.list}
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
  subtitle: {
    fontSize: 14,
    color: '#7C3AED',
    marginTop: 4,
  },
  newButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resourceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  resourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  sharedBy: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 18,
    color: '#94A3B8',
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
    backgroundColor: '#7C3AED',
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
