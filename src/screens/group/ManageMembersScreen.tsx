import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useGroup } from '../../contexts/GroupContext';
import { useGroupMembers, MemberWithProfile } from '../../hooks/useGroupMembers';
import { GroupRole } from '../../types/database';
import Avatar from '../../components/Avatar';
import { showAlert } from '../../lib/errors';

export default function ManageMembersScreen() {
  const { 
    currentGroup, 
    pendingRequests, 
    approveRequest, 
    rejectRequest,
    refreshPendingRequests,
    isGroupLeader,
    canApproveRequests,
  } = useGroup();
  
  // Use the useGroupMembers hook for member data and operations
  const {
    members,
    loading,
    processingId,
    updateRole,
    refetch,
  } = useGroupMembers();
  
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null);
  const [localProcessingId, setLocalProcessingId] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    setLocalProcessingId(requestId);
    const { error } = await approveRequest(requestId);
    if (error) {
      showAlert('Error', error.message);
    } else {
      refetch();
    }
    setLocalProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    setLocalProcessingId(requestId);
    const { error } = await rejectRequest(requestId);
    if (error) {
      showAlert('Error', error.message);
    }
    setLocalProcessingId(null);
  };

  const handleRoleChange = async (memberId: string, newRole: GroupRole) => {
    const success = await updateRole(memberId, newRole);
    if (!success) {
      showAlert('Error', 'Failed to update role');
    } else {
      setSelectedMember(null);
    }
  };

  const getRoleBadgeColor = (role: GroupRole) => {
    switch (role) {
      case 'admin': return '#DC2626';
      case 'leader': return '#7C3AED';
      case 'leader-helper': return '#0891B2';
      default: return '#3B82F6';
    }
  };

  const renderRequest = ({ item }: { item: typeof pendingRequests[0] }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestInfo}>
        <Avatar 
          uri={item.user?.avatar_url} 
          name={item.user?.full_name} 
          size={44}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.full_name || 'Unknown'}</Text>
          <Text style={styles.userEmail}>{item.user?.email}</Text>
          <Text style={styles.requestDate}>
            Requested {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApprove(item.id)}
          disabled={localProcessingId === item.id}
        >
          {localProcessingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.approveButtonText}>✓</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id)}
          disabled={localProcessingId === item.id}
        >
          <Text style={styles.rejectButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMember = ({ item }: { item: MemberWithProfile }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => isGroupLeader ? setSelectedMember(item) : null}
      disabled={!isGroupLeader || item.role === 'admin'}
    >
      <Avatar 
        uri={item.user?.avatar_url} 
        name={item.user?.full_name} 
        size={44}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.user?.full_name || 'Unknown'}</Text>
        <Text style={styles.memberEmail}>{item.user?.email}</Text>
      </View>
      <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
        <Text style={styles.roleBadgeText}>{item.role.replace('-', ' ')}</Text>
      </View>
    </TouchableOpacity>
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
        <Text style={styles.title}>Manage Members</Text>
        <Text style={styles.subtitle}>{currentGroup?.name}</Text>
      </View>

      {canApproveRequests && pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          </View>
          <FlatList
            data={pendingRequests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>

      {/* Role Change Modal */}
      <Modal visible={!!selectedMember} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedMember?.user?.full_name}
            </Text>

            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  selectedMember?.role === 'member' && styles.roleOptionActive,
                ]}
                onPress={() => handleRoleChange(selectedMember!.id, 'member')}
                disabled={processingId === selectedMember?.id}
              >
                <Text style={styles.roleOptionTitle}>Member</Text>
                <Text style={styles.roleOptionDesc}>Can view and participate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  selectedMember?.role === 'leader-helper' && styles.roleOptionActive,
                ]}
                onPress={() => handleRoleChange(selectedMember!.id, 'leader-helper')}
                disabled={processingId === selectedMember?.id}
              >
                <Text style={styles.roleOptionTitle}>Leader Helper</Text>
                <Text style={styles.roleOptionDesc}>Can approve join requests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  selectedMember?.role === 'leader' && styles.roleOptionActive,
                ]}
                onPress={() => handleRoleChange(selectedMember!.id, 'leader')}
                disabled={processingId === selectedMember?.id}
              >
                <Text style={styles.roleOptionTitle}>Leader</Text>
                <Text style={styles.roleOptionDesc}>Full access, can manage roles</Text>
              </TouchableOpacity>
            </View>

            {processingId === selectedMember?.id && (
              <ActivityIndicator style={{ marginTop: 16 }} color="#3B82F6" />
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  memberCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  requestDate: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  memberEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
  },
  closeButton: {
    fontSize: 20,
    color: '#94A3B8',
  },
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionActive: {
    borderColor: '#3B82F6',
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  roleOptionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});
