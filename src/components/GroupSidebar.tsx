import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroup } from '../contexts/GroupContext';
import { useAuth } from '../contexts/AuthContext';

const ROLE_COLORS: Record<string, string> = {
  admin: '#DC2626',
  leader: '#7C3AED',
  'leader-helper': '#F59E0B',
  member: '#3B82F6',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  leader: 'Leader',
  'leader-helper': 'Helper',
  member: 'Member',
};

export default function GroupSidebar(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { groups, currentGroup, setCurrentGroup, createGroup, requestToJoin, myPendingRequests } = useGroup();
  const { isLeader, profile } = useAuth();

  // Modal states
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSelectGroup = (group: typeof groups[0]) => {
    setCurrentGroup(group);
    props.navigation.closeDrawer();
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a group code');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error } = await requestToJoin(joinCode.trim());

    if (error) {
      setError(error.message);
    } else {
      setJoinCode('');
      setSuccess('Request sent! A leader will review your request.');
      setTimeout(() => {
        setSuccess(null);
        setShowJoinModal(false);
      }, 2000);
    }
    setSubmitting(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error } = await createGroup(groupName.trim(), groupDescription.trim());

    if (error) {
      setError(error.message);
    } else {
      setGroupName('');
      setGroupDescription('');
      setShowCreateModal(false);
    }
    setSubmitting(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Groups</Text>
        {profile && (
          <Text style={styles.headerSubtitle}>{profile.full_name}</Text>
        )}
      </View>

      {/* Groups List */}
      <ScrollView style={styles.groupsList} contentContainerStyle={styles.groupsContent}>
        {groups.map((group) => {
          const isActive = currentGroup?.id === group.id;
          const roleColor = ROLE_COLORS[group.role] || ROLE_COLORS.member;
          const roleLabel = ROLE_LABELS[group.role] || group.role;

          return (
            <TouchableOpacity
              key={group.id}
              style={[styles.groupItem, isActive && styles.groupItemActive]}
              onPress={() => handleSelectGroup(group)}
            >
              <View style={styles.groupIcon}>
                <Text style={styles.groupIconText}>
                  {group.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={[styles.groupName, isActive && styles.groupNameActive]} numberOfLines={1}>
                  {group.name}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              </View>
              {isActive && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeIndicatorText}>*</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Pending requests */}
        {myPendingRequests.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingSectionTitle}>Pending Requests</Text>
            {myPendingRequests.map((request) => (
              <View key={request.id} style={styles.pendingItem}>
                <View style={styles.pendingIcon}>
                  <Text style={styles.pendingIconText}>...</Text>
                </View>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingText}>Waiting for approval</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {groups.length === 0 && myPendingRequests.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>
              Join a group or create one to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => {
            setError(null);
            setSuccess(null);
            setShowJoinModal(true);
          }}
        >
          <Text style={styles.joinButtonText}>Join Group</Text>
        </TouchableOpacity>

        {isLeader && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              setError(null);
              setShowCreateModal(true);
            }}
          >
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Join Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Group</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Text style={styles.closeButton}>X</Text>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <Text style={styles.label}>Group Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-character code"
              placeholderTextColor="#64748B"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={6}
            />

            <Text style={styles.hint}>
              Ask your group leader for the join code.
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleJoinGroup}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeButton}>X</Text>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Youth Leaders Group"
              placeholderTextColor="#64748B"
              value={groupName}
              onChangeText={setGroupName}
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="A brief description..."
              placeholderTextColor="#64748B"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.hint}>
              A join code will be generated automatically.
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleCreateGroup}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  groupsList: {
    flex: 1,
  },
  groupsContent: {
    padding: 16,
    gap: 8,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupItemActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  groupNameActive: {
    color: '#3B82F6',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingSection: {
    marginTop: 16,
  },
  pendingSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  pendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#78350F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIconText: {
    fontSize: 18,
    color: '#FDE68A',
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingText: {
    fontSize: 14,
    color: '#FDE68A',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  joinButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  joinButtonText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeButton: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#14532D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#86EFAC',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
