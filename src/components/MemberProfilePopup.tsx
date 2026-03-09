import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Avatar from './Avatar';
import { MemberWithProfile } from '../hooks/useGroupMembers';

const ROLE_COLORS: Record<string, string> = {
  admin: '#DC2626',
  leader: '#7C3AED',
  'leader-helper': '#0891B2',
  member: '#3B82F6',
};

interface MemberProfilePopupProps {
  member: MemberWithProfile | null;
  visible: boolean;
  onClose: () => void;
}

export default function MemberProfilePopup({ member, visible, onClose }: MemberProfilePopupProps) {
  if (!member) return null;

  const roleColor = ROLE_COLORS[member.role] || '#3B82F6';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Avatar
                uri={member.user?.avatar_url}
                name={member.displayName}
                size={64}
              />
              <Text style={styles.name}>{member.displayName}</Text>
              <Text style={styles.email}>{member.displayEmail}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
                <Text style={styles.roleText}>{member.role}</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 240,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
});
