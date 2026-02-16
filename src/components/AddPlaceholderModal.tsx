import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GroupRole } from '../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (email: string, fullName: string, role: GroupRole) => Promise<boolean>;
  groupName?: string;
}

export default function AddPlaceholderModal({ visible, onClose, onSubmit, groupName }: Props) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<GroupRole>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCreate = async () => {
    // Validation
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter a name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await onSubmit(email.trim(), fullName.trim(), role);

      if (success) {
        // Reset form and close
        setEmail('');
        setFullName('');
        setRole('member');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create placeholder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setFullName('');
    setRole('member');
    setError(null);
    onClose();
  };

  const roles: { value: GroupRole; label: string; description: string }[] = [
    { value: 'member', label: 'Member', description: 'Can view and participate' },
    { value: 'leader-helper', label: 'Leader Helper', description: 'Can approve join requests' },
    { value: 'leader', label: 'Leader', description: 'Full access, can manage roles' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Member</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Add someone to this group by email. If they don't have an account yet, they'll receive an invite and be added automatically when they sign up.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="John Smith"
              placeholderTextColor="#64748B"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleOptions}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleOption,
                    role === r.value && styles.roleOptionActive,
                  ]}
                  onPress={() => setRole(r.value)}
                >
                  <Text style={[
                    styles.roleOptionTitle,
                    role === r.value && styles.roleOptionTitleActive,
                  ]}>
                    {r.label}
                  </Text>
                  <Text style={styles.roleOptionDesc}>{r.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {groupName && (
              <Text style={styles.hint}>
                This placeholder will be added to {groupName}.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Add Member</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
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
  form: {
    gap: 8,
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
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  roleOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  roleOptionTitleActive: {
    color: '#3B82F6',
  },
  roleOptionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
