import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { ShareInfo } from '../hooks/useResources';

interface ShareableGroup {
  id: string;
  name: string;
}

interface ShareResourceModalProps {
  visible: boolean;
  onClose: () => void;
  resourceId?: string;
  folderId?: string;
  title: string;
  getShareableGroups: () => Promise<ShareableGroup[]>;
  getShares: (id: string) => Promise<ShareInfo[]>;
  onShare: (id: string, groupIds: string[]) => Promise<boolean>;
  onUnshare: (id: string, groupIds: string[]) => Promise<boolean>;
}

export default function ShareResourceModal({
  visible,
  onClose,
  resourceId,
  folderId,
  title,
  getShareableGroups,
  getShares,
  onShare,
  onUnshare,
}: ShareResourceModalProps) {
  const [shareableGroups, setShareableGroups] = useState<ShareableGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [originalShares, setOriginalShares] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const itemId = resourceId || folderId;
  const itemType = resourceId ? 'resource' : 'folder';

  useEffect(() => {
    if (visible && itemId) {
      loadData();
    }
  }, [visible, itemId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load shareable groups and current shares in parallel
      const [groups, shares] = await Promise.all([
        getShareableGroups(),
        getShares(itemId!),
      ]);

      setShareableGroups(groups);

      const sharedGroupIds = new Set(shares.map(s => s.groupId));
      setSelectedGroups(sharedGroupIds);
      setOriginalShares(new Set(sharedGroupIds));
    } catch (err) {
      console.error('[ShareResourceModal] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!itemId) return;

    setSaving(true);
    try {
      // Determine groups to add and remove
      const groupsToAdd = [...selectedGroups].filter(id => !originalShares.has(id));
      const groupsToRemove = [...originalShares].filter(id => !selectedGroups.has(id));

      let success = true;

      // Share with new groups
      if (groupsToAdd.length > 0) {
        success = await onShare(itemId, groupsToAdd);
      }

      // Unshare from removed groups
      if (success && groupsToRemove.length > 0) {
        success = await onUnshare(itemId, groupsToRemove);
      }

      if (success) {
        onClose();
      } else {
        const alertMessage = `Failed to update sharing settings`;
        if (Platform.OS === 'web') {
          window.alert(alertMessage);
        } else {
          Alert.alert('Error', alertMessage);
        }
      }
    } catch (err: any) {
      console.error('[ShareResourceModal] Error saving shares:', err);
      const alertMessage = err.message || 'Failed to save sharing settings';
      if (Platform.OS === 'web') {
        window.alert(alertMessage);
      } else {
        Alert.alert('Error', alertMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (selectedGroups.size !== originalShares.size) return true;
    for (const id of selectedGroups) {
      if (!originalShares.has(id)) return true;
    }
    return false;
  };

  const renderGroupItem = ({ item }: { item: ShareableGroup }) => {
    const isSelected = selectedGroups.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.groupItem, isSelected && styles.groupItemSelected]}
        onPress={() => toggleGroup(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.groupName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No other groups</Text>
      <Text style={styles.emptyText}>
        There are no other groups to share with yet.
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.modalTitle}>Share {itemType}</Text>
              <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : shareableGroups.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                Select groups to share with
              </Text>
              <FlatList
                data={shareableGroups}
                renderItem={renderGroupItem}
                keyExtractor={item => item.id}
                style={styles.groupList}
                showsVerticalScrollIndicator={false}
              />

              <View style={styles.shareInfo}>
                <Text style={styles.shareInfoText}>
                  {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''} selected
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!hasChanges() || saving) && styles.submitButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!hasChanges() || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {hasChanges() ? 'Save Changes' : 'No Changes'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  closeButton: {
    fontSize: 20,
    color: '#94A3B8',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupList: {
    maxHeight: 300,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F8FAFC',
    flex: 1,
  },
  shareInfo: {
    marginTop: 16,
    marginBottom: 8,
  },
  shareInfoText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#475569',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});
