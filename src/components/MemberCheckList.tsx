import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { InvitableMember } from '../types/members';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';

interface Props {
  members: InvitableMember[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  loading?: boolean;
  emptyText?: string;
}

export default function MemberCheckList({
  members,
  selectedIds,
  onToggle,
  loading,
  emptyText = 'No members available',
}: Props) {
  if (loading) {
    return <ActivityIndicator size="small" color={colors.blue[500]} style={styles.loading} />;
  }

  if (members.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.list}>
      {members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={[styles.item, selectedIds.has(member.id) && styles.itemSelected]}
          onPress={() => onToggle(member.id)}
        >
          {member.type === 'placeholder' ? (
            <View style={styles.placeholderAvatar}>
              <Text style={styles.placeholderAvatarText}>?</Text>
            </View>
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {member.displayName?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{member.displayName}</Text>
              {member.type === 'placeholder' && (
                <View style={styles.placeholderBadge}>
                  <Text style={styles.placeholderBadgeText}>Placeholder</Text>
                </View>
              )}
              {member.type === 'user' && member.groupRole && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{member.groupRole}</Text>
                </View>
              )}
            </View>
            <Text style={styles.email}>{member.email}</Text>
          </View>
          <View style={[styles.checkbox, selectedIds.has(member.id) && styles.checkboxChecked]}>
            {selectedIds.has(member.id) && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { padding: spacing.xl },
  emptyText: { fontSize: fontSize.md, color: colors.slate[500], textAlign: 'center', padding: spacing.lg },
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: colors.blue[500],
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.blue[500], justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  placeholderAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.slate[600], justifyContent: 'center', alignItems: 'center',
  },
  placeholderAvatarText: { color: colors.slate[400], fontSize: fontSize.xl, fontWeight: fontWeight.semibold },
  info: { flex: 1, marginLeft: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 15, fontWeight: fontWeight.medium, color: colors.slate[50] },
  placeholderBadge: {
    backgroundColor: colors.amber[500], paddingHorizontal: 6, paddingVertical: 2, borderRadius: spacing.sm,
  },
  placeholderBadgeText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  roleBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: spacing.sm,
  },
  roleBadgeText: { color: colors.violet[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  email: { fontSize: 13, color: colors.slate[400], marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.slate[600],
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.blue[500], borderColor: colors.blue[500] },
  checkmark: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
