import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useGroup } from '../../contexts/GroupContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../../lib/storage';
import { updateProfile } from '../../repositories/profilesRepo';
import Avatar from '../../components/Avatar';
import ScreenHeader from '../../components/ScreenHeader';
import { showAlert } from '../../lib/errors';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';
import { TIMEZONE_OPTIONS } from '../../components/CreateMeetingModal';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { profile, signOut, isLeader, isAdmin, refreshProfile } = useAuth();
  const { currentGroup, groups, setCurrentGroup, isGroupAdmin, canApproveRequests, pendingRequests, refreshPendingRequests, updateGroupTimezone } = useGroup();

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
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(
    profile?.notification_preferences?.push_enabled ?? true
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const getRoleBadge = () => {
    if (isAdmin) return { text: 'Admin', color: colors.error.main };
    if (isLeader) return { text: 'Leader', color: colors.primary[600] };
    return { text: 'Member', color: colors.primary[500] };
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

      // Upload to storage
      const uploadResult = await storage.upload('avatars', fileName, uploadData as any, {
        contentType: mimeType,
        upsert: true,
      });

      if (uploadResult.error) {
        console.error('[ProfileScreen] Upload error:', uploadResult.error);
        throw uploadResult.error;
      }

      // Get public URL
      const { url: publicUrl } = storage.getPublicUrl('avatars', fileName);

      // Add cache buster to force reload
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await updateProfile(profile?.id, { avatar_url: avatarUrl });

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

        {isGroupAdmin && currentGroup && (
          <View style={styles.timezoneContainer}>
            <Text style={styles.codeLabel}>Group Timezone:</Text>
            <TouchableOpacity
              style={styles.timezoneButton}
              onPress={() => setShowTimezonePicker(true)}
            >
              <Text style={styles.timezoneButtonText}>
                {TIMEZONE_OPTIONS.find(tz => tz.value === currentGroup.timezone)?.label || currentGroup.timezone || 'Eastern'}
              </Text>
              <Text style={styles.timezoneEditHint}>Change</Text>
            </TouchableOpacity>
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
            trackColor={{ false: colors.neutral[700], true: colors.primary[500] }}
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
            trackColor={{ false: colors.neutral[700], true: colors.primary[500] }}
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
            trackColor={{ false: colors.neutral[700], true: colors.primary[500] }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Timezone Picker Modal */}
      <Modal visible={showTimezonePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Timezone</Text>
              <TouchableOpacity onPress={() => setShowTimezonePicker(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {TIMEZONE_OPTIONS.map((tz) => (
              <TouchableOpacity
                key={tz.value}
                style={[
                  styles.groupOption,
                  currentGroup?.timezone === tz.value && styles.groupOptionActive,
                ]}
                onPress={async () => {
                  if (currentGroup) {
                    await updateGroupTimezone(currentGroup.id, tz.value);
                    setShowTimezonePicker(false);
                  }
                }}
              >
                <Text style={styles.groupOptionName}>{tz.label}</Text>
                <Text style={styles.groupOptionRole}>{tz.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

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
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatarLoading: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.card.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  editBadgeText: {
    fontSize: fontSize.sm,
  },
  name: {
    fontSize: 22,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  email: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: borderRadius.xl,
  },
  roleBadgeText: {
    color: colors.text.inverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  section: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
    fontSize: fontSize.xxl,
  },
  groupInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  groupName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  groupRole: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
  switchText: {
    fontSize: fontSize.md,
    color: colors.primary[500],
    fontWeight: fontWeight.semibold,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  codeLabel: {
    fontSize: fontSize.md,
    color: colors.text.tertiary,
  },
  codeValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary[500],
    marginLeft: spacing.sm,
    letterSpacing: 2,
  },
  timezoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  timezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    flex: 1,
    justifyContent: 'space-between',
  },
  timezoneButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary[500],
  },
  timezoneEditHint: {
    fontSize: fontSize.sm,
    color: colors.primary[500],
    fontWeight: fontWeight.semibold,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.md,
    padding: 14,
  },
  manageButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  pendingBadge: {
    backgroundColor: colors.warning.main,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  pendingBadgeText: {
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingLabel: {
    fontSize: fontSize.lg,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  settingDescription: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.error.dark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.error.light,
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
  },
  groupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupOptionActive: {
    borderColor: colors.primary[500],
  },
  groupOptionName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  groupOptionRole: {
    fontSize: fontSize.md,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
});
