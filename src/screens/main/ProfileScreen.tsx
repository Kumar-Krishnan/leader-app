import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useGroup } from '../../contexts/GroupContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/Avatar';
import ScreenHeader from '../../components/ScreenHeader';
import { showAlert } from '../../lib/errors';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { profile, signOut, isLeader, isAdmin, refreshProfile } = useAuth();
  const { currentGroup, groups, setCurrentGroup, isGroupAdmin, canApproveRequests, pendingRequests, refreshPendingRequests } = useGroup();

  // Refresh pending requests when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('[ProfileScreen] Focus effect - canApproveRequests:', canApproveRequests, 'currentGroup role:', currentGroup?.role, 'pendingRequests:', pendingRequests.length);
      if (canApproveRequests) {
        console.log('[ProfileScreen] Refreshing pending requests on focus');
        refreshPendingRequests();
      }
    }, [canApproveRequests, refreshPendingRequests, currentGroup?.role, pendingRequests.length])
  );
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(
    profile?.notification_preferences?.push_enabled ?? true
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const getRoleBadge = () => {
    if (isAdmin) return { text: 'Admin', color: '#DC2626' };
    if (isLeader) return { text: 'Leader', color: '#7C3AED' };
    return { text: 'Member', color: '#3B82F6' };
  };

  const roleBadge = getRoleBadge();

  const pickAndUploadAvatar = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Permission to access photos is required!');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingAvatar(true);
      const asset = result.assets[0];
      
      // Fetch the image data first
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      // Determine extension from MIME type (more reliable than URL parsing)
      let ext = 'jpg';
      const mimeType = blob.type || asset.mimeType || 'image/jpeg';
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('gif')) ext = 'gif';
      else if (mimeType.includes('webp')) ext = 'webp';
      
      const fileName = `${profile?.id}/avatar.${ext}`;

      // Prepare upload data
      let uploadData: ArrayBuffer | Blob;
      if (Platform.OS === 'web') {
        uploadData = blob;
      } else {
        uploadData = await blob.arrayBuffer();
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, uploadData, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('[ProfileScreen] Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache buster to force reload
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile?.id);

      if (updateError) {
        console.error('[ProfileScreen] Profile update error:', updateError);
        throw updateError;
      }

      // Refresh profile to show new avatar
      if (refreshProfile) {
        await refreshProfile();
      }

      console.log('[ProfileScreen] Avatar uploaded successfully:', avatarUrl);
    } catch (error) {
      console.error('[ProfileScreen] Error uploading avatar:', error);
      showAlert('Error', 'Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader title="Profile" showGroupName={false} />

      <View style={styles.profileSection}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={pickAndUploadAvatar}
          disabled={uploadingAvatar}
        >
          {uploadingAvatar ? (
            <View style={styles.avatarLoading}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : (
            <>
              <Avatar 
                uri={profile?.avatar_url} 
                name={profile?.full_name} 
                size={80}
              />
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>✏️</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{profile?.full_name || 'Unknown User'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleBadge.color }]}>
          <Text style={styles.roleBadgeText}>{roleBadge.text}</Text>
        </View>
      </View>

      {/* Group Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Group</Text>
        <TouchableOpacity 
          style={styles.groupSelector}
          onPress={() => setShowGroupPicker(true)}
        >
          <View style={styles.groupIcon}>
            <Text style={styles.groupIconText}>👥</Text>
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{currentGroup?.name}</Text>
            <Text style={styles.groupRole}>{currentGroup?.role}</Text>
          </View>
          <Text style={styles.switchText}>Switch</Text>
        </TouchableOpacity>

        {isGroupAdmin && currentGroup?.code && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Group Join Code:</Text>
            <Text style={styles.codeValue}>{currentGroup.code}</Text>
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

      {/* Group Picker Modal */}
      <Modal visible={showGroupPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Group</Text>
              <TouchableOpacity onPress={() => setShowGroupPicker(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupOption,
                  currentGroup?.id === group.id && styles.groupOptionActive,
                ]}
                onPress={() => {
                  setCurrentGroup(group);
                  setShowGroupPicker(false);
                }}
              >
                <Text style={styles.groupOptionName}>{group.name}</Text>
                <Text style={styles.groupOptionRole}>{group.role}</Text>
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarLoading: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  editBadgeText: {
    fontSize: 12,
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
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 20,
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  groupRole: {
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
  groupOption: {
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
  groupOptionActive: {
    borderColor: '#3B82F6',
  },
  groupOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  groupOptionRole: {
    fontSize: 14,
    color: '#64748B',
    textTransform: 'capitalize',
  },
});
