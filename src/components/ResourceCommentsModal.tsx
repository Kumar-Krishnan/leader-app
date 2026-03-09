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
import { fetchComments as fetchCommentsRepo, insertComment, deleteComment } from '../repositories/commentsRepo';
import { fetchProfile } from '../repositories/profilesRepo';
import { realtimeService } from '../services/realtime';
import { useAuth } from '../contexts/AuthContext';
import { ResourceCommentWithUser } from '../types/database';
import Avatar from './Avatar';
import MentionTextInput from './MentionTextInput';
import MentionText from './MentionText';
import { showAlert, showDestructiveConfirm } from '../lib/errors';
import { getTimeAgo } from '../lib/formatters';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';

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

  const loadComments = useCallback(async () => {
    if (!resourceId && !folderId) return;

    setLoading(true);
    try {
      const { data, error } = await fetchCommentsRepo({ resourceId, folderId });

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
      loadComments();
    }
  }, [visible, loadComments]);

  // Setup realtime subscription
  useEffect(() => {
    if (!visible || (!resourceId && !folderId)) return;

    const filter = resourceId
      ? `resource_id=eq.${resourceId}`
      : `folder_id=eq.${folderId}`;

    const subscription = realtimeService.subscribeToTable(
      'resource_comments',
      filter,
      {
        onInsert: async (newRecord: any) => {
          const newComment = newRecord as ResourceCommentWithUser;
          const { data: userData } = await fetchProfile(newComment.user_id);
          setComments(prev => [...prev, { ...newComment, user: userData || undefined }]);
        },
        onDelete: (oldRecord: any) => {
          const deleted = oldRecord as ResourceCommentWithUser;
          setComments(prev => prev.filter(c => c.id !== deleted.id));
        },
      }
    );

    return () => {
      subscription.unsubscribe();
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

      const { error } = await insertComment(commentData);

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

    // Optimistically remove from UI
    setComments(prev => prev.filter(c => c.id !== commentId));

    try {
      const { error } = await deleteComment(commentId);

      if (error) throw error;
    } catch (error) {
      console.error('[ResourceComments] Error deleting comment:', error);
      // Reload to restore if delete failed
      loadComments();
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
          <MentionText text={item.content} style={styles.commentText} />
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
              <ActivityIndicator size="large" color={colors.blue[500]} />
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

          <MentionTextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            maxLength={500}
            onSubmit={handleSendComment}
            sending={sending}
            showSendButton
            leftElement={
              <Avatar
                uri={profile?.avatar_url}
                name={profile?.full_name}
                size={32}
              />
            }
            containerStyle={styles.inputContainer}
          />
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
    backgroundColor: colors.slate[800],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.slate[50],
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.slate[400],
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.slate[400],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  commentList: {
    padding: spacing.lg,
  },
  emptyList: {
    flex: 1,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing.md,
    backgroundColor: colors.slate[900],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  commentAuthor: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.slate[50],
  },
  commentTime: {
    fontSize: fontSize.sm,
    color: colors.slate[500],
  },
  commentText: {
    fontSize: fontSize.md,
    color: colors.slate[300],
    lineHeight: 20,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    color: colors.red[500],
    fontWeight: fontWeight.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.slate[50],
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.slate[400],
    textAlign: 'center',
  },
  inputContainer: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing.md,
    backgroundColor: colors.slate[900],
    borderTopWidth: 1,
    borderTopColor: colors.slate[700],
  },
});

