import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Resource } from '../../types/database';

const TYPE_ICONS: Record<string, string> = {
  document: '📄',
  video: '🎬',
  link: '🔗',
  other: '📎',
};

export default function ResourcesScreen() {
  const { isLeader } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, [isLeader]);

  const fetchResources = async () => {
    try {
      // Leaders see all resources, users only see public ones
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
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
        <View style={styles.titleRow}>
          <Text style={styles.resourceTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.visibility === 'leaders_only' && (
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderBadgeText}>Leaders</Text>
            </View>
          )}
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No resources yet</Text>
      <Text style={styles.emptyText}>
        {isLeader 
          ? 'Add resources for your group to access.'
          : 'Resources shared with you will appear here.'}
      </Text>
      {isLeader && (
        <TouchableOpacity style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Add Resource</Text>
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
        <Text style={styles.title}>Resources</Text>
        {isLeader && (
          <TouchableOpacity style={styles.newButton}>
            <Text style={styles.newButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
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
  resourceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  resourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  leaderBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  leaderBadgeText: {
    color: '#E9D5FF',
    fontSize: 10,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    color: '#9CA3AF',
    fontSize: 12,
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
