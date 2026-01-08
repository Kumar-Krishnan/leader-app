import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useParish } from '../../contexts/ParishContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ParishSelectScreen() {
  const { 
    parishes, 
    currentParish, 
    setCurrentParish, 
    createParish, 
    requestToJoin, 
    myPendingRequests,
    loading 
  } = useParish();
  const { isLeader } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [parishName, setParishName] = useState('');
  const [parishDescription, setParishDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!parishName.trim()) {
      setError('Please enter a parish name');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error } = await createParish(parishName.trim(), parishDescription.trim());

    if (error) {
      setError(error.message);
    } else {
      setParishName('');
      setParishDescription('');
      setShowCreateModal(false);
    }
    setSubmitting(false);
  };

  const handleRequestToJoin = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a parish code');
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

  const renderParish = ({ item }: { item: typeof parishes[0] }) => (
    <TouchableOpacity
      style={[styles.parishCard, currentParish?.id === item.id && styles.parishCardActive]}
      onPress={() => setCurrentParish(item)}
    >
      <View style={styles.parishIcon}>
        <Text style={styles.parishIconText}>⛪</Text>
      </View>
      <View style={styles.parishInfo}>
        <Text style={styles.parishName}>{item.name}</Text>
        <Text style={styles.parishRole}>{item.role.replace('-', ' ')}</Text>
      </View>
      {currentParish?.id === item.id && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Parishes</Text>
      </View>

      {parishes.length === 0 && myPendingRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⛪</Text>
          <Text style={styles.emptyTitle}>No parishes yet</Text>
          <Text style={styles.emptyText}>
            Request to join a parish with a code{isLeader ? ' or create a new one' : ''}.
          </Text>
        </View>
      ) : (
        <>
          {parishes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Parishes</Text>
              {parishes.map((parish) => (
                <TouchableOpacity
                  key={parish.id}
                  style={[styles.parishCard, currentParish?.id === parish.id && styles.parishCardActive]}
                  onPress={() => setCurrentParish(parish)}
                >
                  <View style={styles.parishIcon}>
                    <Text style={styles.parishIconText}>⛪</Text>
                  </View>
                  <View style={styles.parishInfo}>
                    <Text style={styles.parishName}>{parish.name}</Text>
                    <Text style={styles.parishRole}>{parish.role.replace('-', ' ')}</Text>
                  </View>
                  {currentParish?.id === parish.id && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {myPendingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              {myPendingRequests.map((request) => (
                <View key={request.id} style={styles.pendingCard}>
                  <View style={styles.pendingIcon}>
                    <Text style={styles.pendingIconText}>⏳</Text>
                  </View>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingText}>Waiting for approval</Text>
                    <Text style={styles.pendingDate}>
                      Requested {new Date(request.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => {
            setError(null);
            setSuccess(null);
            setShowJoinModal(true);
          }}
        >
          <Text style={styles.joinButtonText}>Request to Join Parish</Text>
        </TouchableOpacity>

        {isLeader && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              setError(null);
              setShowCreateModal(true);
            }}
          >
            <Text style={styles.createButtonText}>Create Parish</Text>
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
              <Text style={styles.modalTitle}>Request to Join</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
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

            <Text style={styles.label}>Parish Code</Text>
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
              Ask your parish leader for the join code. Your request will need to be approved.
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleRequestToJoin}
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
              <Text style={styles.modalTitle}>Create Parish</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Parish Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., St. Mary's Parish"
              placeholderTextColor="#64748B"
              value={parishName}
              onChangeText={setParishName}
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="A brief description..."
              placeholderTextColor="#64748B"
              value={parishDescription}
              onChangeText={setParishDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.hint}>
              You'll be the admin of this parish. A join code will be generated automatically.
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Parish</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  parishCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  parishCardActive: {
    borderColor: '#3B82F6',
  },
  parishIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parishIconText: {
    fontSize: 24,
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
    marginTop: 2,
    textTransform: 'capitalize',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  pendingIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#78350F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIconText: {
    fontSize: 24,
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FDE68A',
  },
  pendingDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  actions: {
    padding: 20,
    gap: 12,
    marginTop: 'auto',
  },
  joinButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  joinButtonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
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
