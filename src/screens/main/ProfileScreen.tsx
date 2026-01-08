import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useParish } from '../../contexts/ParishContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { profile, signOut, isLeader, isAdmin } = useAuth();
  const { currentParish, parishes, setCurrentParish, isParishAdmin, canApproveRequests, pendingRequests } = useParish();
  const [showParishPicker, setShowParishPicker] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(
    profile?.notification_preferences?.push_enabled ?? true
  );

  const getRoleBadge = () => {
    if (isAdmin) return { text: 'Admin', color: '#DC2626' };
    if (isLeader) return { text: 'Leader', color: '#7C3AED' };
    return { text: 'Member', color: '#3B82F6' };
  };

  const roleBadge = getRoleBadge();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Unknown User'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleBadge.color }]}>
          <Text style={styles.roleBadgeText}>{roleBadge.text}</Text>
        </View>
      </View>

      {/* Parish Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Parish</Text>
        <TouchableOpacity 
          style={styles.parishSelector}
          onPress={() => setShowParishPicker(true)}
        >
          <View style={styles.parishIcon}>
            <Text style={styles.parishIconText}>⛪</Text>
          </View>
          <View style={styles.parishInfo}>
            <Text style={styles.parishName}>{currentParish?.name}</Text>
            <Text style={styles.parishRole}>{currentParish?.role}</Text>
          </View>
          <Text style={styles.switchText}>Switch</Text>
        </TouchableOpacity>

        {isParishAdmin && currentParish?.code && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Parish Join Code:</Text>
            <Text style={styles.codeValue}>{currentParish.code}</Text>
          </View>
        )}

        {canApproveRequests && (
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => navigation.navigate('ManageMembers')}
          >
            <Text style={styles.manageButtonText}>Manage Members</Text>
            {pendingRequests.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>Receive notifications on your device</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Message Alerts</Text>
            <Text style={styles.settingDescription}>Notify on new thread messages</Text>
          </View>
          <Switch
            value={profile?.notification_preferences?.messages ?? true}
            onValueChange={() => {}}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Meeting Reminders</Text>
            <Text style={styles.settingDescription}>Get reminded about upcoming meetings</Text>
          </View>
          <Switch
            value={profile?.notification_preferences?.meetings ?? true}
            onValueChange={() => {}}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Parish Picker Modal */}
      <Modal visible={showParishPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Parish</Text>
              <TouchableOpacity onPress={() => setShowParishPicker(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {parishes.map((parish) => (
              <TouchableOpacity
                key={parish.id}
                style={[
                  styles.parishOption,
                  currentParish?.id === parish.id && styles.parishOptionActive,
                ]}
                onPress={() => {
                  setCurrentParish(parish);
                  setShowParishPicker(false);
                }}
              >
                <Text style={styles.parishOptionName}>{parish.name}</Text>
                <Text style={styles.parishOptionRole}>{parish.role}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  email: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  parishSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
  },
  parishIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parishIconText: {
    fontSize: 20,
  },
  parishInfo: {
    flex: 1,
    marginLeft: 12,
  },
  parishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  parishRole: {
    fontSize: 13,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  switchText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  codeLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  codeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
    marginLeft: 8,
    letterSpacing: 2,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 14,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingLabel: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  signOutButton: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#FCA5A5',
    fontSize: 16,
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
  },
  parishOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  parishOptionActive: {
    borderColor: '#3B82F6',
  },
  parishOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  parishOptionRole: {
    fontSize: 14,
    color: '#64748B',
    textTransform: 'capitalize',
  },
});
