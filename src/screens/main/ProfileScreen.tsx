import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const { profile, signOut, isLeader, isAdmin } = useAuth();
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

      {isLeader && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leader Options</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Manage Members</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>HubSpot Integration</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuItemText: {
    fontSize: 16,
    color: '#F8FAFC',
  },
  menuItemArrow: {
    fontSize: 18,
    color: '#64748B',
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
});


