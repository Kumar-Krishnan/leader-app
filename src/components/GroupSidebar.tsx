import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
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
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import SendGroupEmailModal from './SendGroupEmailModal';

const ROLE_COLORS: Record<string, string> = {
  admin: colors.error.main,
  leader: colors.primary[600],
  'leader-helper': colors.warning.main,
  member: colors.primary[500],
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
  const [emailModalGroup, setEmailModalGroup] = useState<{ id: string; name: string } | null>(null);

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
              {['leader', 'admin', 'leader-helper'].includes(group.role) && (
                <Pressable
                  style={styles.mailButton}
                  onPress={() => setEmailModalGroup({ id: group.id, name: group.name })}
                >
                  <Text style={styles.mailButtonText}>✉️</Text>
                </Pressable>
              )}
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

      {/* Group Email Modal */}
      <SendGroupEmailModal
        visible={!!emailModalGroup}
        onClose={() => setEmailModalGroup(null)}
        groupName={emailModalGroup?.name || ''}
        groupId={emailModalGroup?.id || ''}
      />

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
              placeholder="e.g., London Group"
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
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.card.background,
  },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  groupsList: {
    flex: 1,
  },
  groupsContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupItemActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.accent.light,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.neutral[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  groupInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  groupName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  groupNameActive: {
    color: colors.primary[500],
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text.inverse,
  },
  mailButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[700],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  mailButtonText: {
    fontSize: 16,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicatorText: {
    color: colors.text.inverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  pendingSection: {
    marginTop: spacing.lg,
  },
  pendingSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning.main,
    borderStyle: 'dashed',
  },
  pendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIconText: {
    fontSize: fontSize.xl,
    color: colors.primary[200],
  },
  pendingInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pendingText: {
    fontSize: fontSize.md,
    color: colors.primary[200],
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.card.background,
  },
  joinButton: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  joinButtonText: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  createButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  closeButton: {
    fontSize: fontSize.xxl,
    color: colors.text.secondary,
    fontWeight: fontWeight.semibold,
  },
  errorContainer: {
    backgroundColor: colors.error.dark,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error.light,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: colors.success.dark,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  successText: {
    color: colors.success.light,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
