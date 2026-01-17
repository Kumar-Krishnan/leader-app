import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ResourceCommentWithUser } from '../types/database';
import Avatar from './Avatar';
import { showAlert, showDestructiveConfirm } from '../lib/errors';

/**
 * Props for the ResourceCommentsModal component
 */
interface ResourceCommentsModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** ID of the resource to show comments for (mutually exclusive with folderId) */
  resourceId?: string;
  /** ID of the folder to show comments for (mutually exclusive with resourceId) */
  folderId?: string;
  /** Display title of the resource or folder */
  title: string;
}

/**
 * Modal component for viewing and posting comments on resources or folders.
 *
 * Features:
 * - Real-time comment updates via Supabase subscriptions
 * - User avatars and timestamps for each comment
 * - Delete functionality for own comments
 * - Keyboard-aware input for composing new comments
 *
 * @example
 * ```tsx
 * <ResourceCommentsModal
 *   visible={showComments}
 *   onClose={() => setShowComments(false)}
 *   resourceId={resource.id}
 *   title={resource.title}
 * />
 * ```
 */
export default function ResourceCommentsModal({
  visible,
  onClose,
  resourceId,
  folderId,
  title,
}: ResourceCommentsModalProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<ResourceCommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!resourceId && !folderId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('resource_comments')
        .select(`
          *,
          user:profiles!user_id(*)
        `)
        .order('created_at', { ascending: true });

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      } else if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('[ResourceComments] Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [resourceId, folderId]);

  useEffect(() => {
    if (visible) {
      fetchComments();
    }
  }, [visible, fetchComments]);

  // Setup realtime subscription
  useEffect(() => {
    if (!visible || (!resourceId && !folderId)) return;

    const filter = resourceId 
      ? `resource_id=eq.${resourceId}` 
      : `folder_id=eq.${folderId}`;

    const channel = supabase
      .channel(`comments:${resourceId || folderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'resource_comments',
        filter,
      }, async (payload) => {
        // Fetch user info for the new comment
        const newComment = payload.new as ResourceCommentWithUser;
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newComment.user_id)
          .single();
        
        setComments(prev => [...prev, { ...newComment, user: userData || undefined }]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'resource_comments',
        filter,
      }, (payload) => {
        const deleted = payload.old as ResourceCommentWithUser;
        setComments(prev => prev.filter(c => c.id !== deleted.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, resourceId, folderId]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !user) return;

    setSending(true);
    try {
      const commentData: any = {
        user_id: user.id,
        content: newComment.trim(),
      };

      if (resourceId) {
        commentData.resource_id = resourceId;
      } else if (folderId) {
        commentData.folder_id = folderId;
      }

      const { error } = await supabase
        .from('resource_comments')
        .insert(commentData);

      if (error) throw error;
      setNewComment('');
    } catch (error) {
      console.error('[ResourceComments] Error sending comment:', error);
      showAlert('Error', 'Failed to send comment');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirm = await showDestructiveConfirm(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      'Delete'
    );

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('resource_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      console.error('[ResourceComments] Error deleting comment:', error);
    }
  };

  const renderComment = ({ item }: { item: ResourceCommentWithUser }) => {
    const isOwn = item.user_id === user?.id;
    const timeAgo = getTimeAgo(new Date(item.created_at));

    return (
      <View style={styles.commentRow}>
        <Avatar
          uri={item.user?.avatar_url}
          name={item.user?.full_name}
          size={36}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>
              {item.user?.full_name || 'Unknown'}
            </Text>
            <Text style={styles.commentTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
          {isOwn && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteComment(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No comments yet</Text>
      <Text style={styles.emptyText}>Be the first to add a comment!</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Comments</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={comments.length === 0 ? styles.emptyList : styles.commentList}
              ListEmptyComponent={renderEmptyState}
            />
          )}

          <View style={styles.inputContainer}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.full_name}
              size={32}
            />
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#64748B"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newComment.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendComment}
              disabled={!newComment.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Formats a date as a human-readable relative time string.
 *
 * @param date - The date to format
 * @returns A string like "just now", "5m ago", "2h ago", "3d ago", or a locale date string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  commentList: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  commentTime: {
    fontSize: 12,
    color: '#64748B',
  },
  commentText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F8FAFC',
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

