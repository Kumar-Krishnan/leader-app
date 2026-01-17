import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages, MessageWithSender } from '../../hooks/useMessages';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ThreadsStackParamList } from '../../navigation/types';
import Avatar from '../../components/Avatar';
import { showAlert, showDestructiveConfirm } from '../../lib/errors';

type Props = NativeStackScreenProps<ThreadsStackParamList, 'ThreadDetail'>;

export default function ThreadDetailScreen({ route, navigation }: Props) {
  const { threadId, threadName } = route.params;
  const { user } = useAuth();
  
  // Use the useMessages hook for all data and operations
  const { 
    messages, 
    loading, 
    sending, 
    sendMessage, 
    editMessage, 
    deleteMessage 
  } = useMessages(threadId);
  
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Set navigation title
  React.useEffect(() => {
    navigation.setOptions({ title: threadName });
  }, [threadName, navigation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    const success = await sendMessage(messageText);
    
    if (success) {
      // Scroll to bottom after a brief delay
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } else {
      setNewMessage(messageText); // Restore message on error
    }
  };

  const startEdit = (message: MessageWithSender) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEdit = async () => {
    if (!editingText.trim() || !editingMessageId) return;

    const success = await editMessage(editingMessageId, editingText.trim());

    if (success) {
      cancelEdit();
    } else {
      showAlert('Error', 'Failed to update message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmDelete = await showDestructiveConfirm(
      'Delete Message',
      'Are you sure you want to delete this message?',
      'Delete'
    );

    if (!confirmDelete) return;

    const success = await deleteMessage(messageId);

    if (!success) {
      showAlert('Error', 'Failed to delete message');
    }
  };

  const renderMessage = ({ item }: { item: MessageWithSender }) => {
    const isMe = item.sender_id === user?.id;
    const isEditing = editingMessageId === item.id;
    
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <Avatar 
            uri={item.sender?.avatar_url} 
            name={item.sender?.full_name} 
            size={32}
            style={styles.messageAvatar}
          />
        )}
        <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
          {isMe && (
            <Avatar 
              uri={item.sender?.avatar_url} 
              name={item.sender?.full_name} 
              size={24}
              style={styles.messageAvatarMe}
            />
          )}
          {!isMe && (
            <Text style={styles.messageSender}>
              {item.sender?.full_name || 'Unknown'}
            </Text>
          )}
          
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editingText}
                onChangeText={setEditingText}
                multiline
                autoFocus
              />
              <View style={styles.editButtons}>
                <TouchableOpacity 
                  style={styles.editButtonCancel}
                  onPress={cancelEdit}
                >
                  <Text style={styles.editButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.editButtonSave}
                  onPress={saveEdit}
                >
                  <Text style={styles.editButtonTextSave}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                {item.content}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                  {new Date(item.created_at).toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </Text>
                {isMe && (
                  <View style={styles.messageActions}>
                    <TouchableOpacity 
                      style={styles.messageActionButton}
                      onPress={() => startEdit(item)}
                    >
                      <Text style={styles.messageActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.messageActionButton}
                      onPress={() => handleDeleteMessage(item.id)}
                    >
                      <Text style={[styles.messageActionText, styles.messageActionTextDelete]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptyText}>Send the first message to start the conversation!</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator testID="activity-indicator" size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageList}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#64748B"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text testID="send-button-text" style={styles.sendButtonText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyList: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageAvatarMe: {
    position: 'absolute',
    top: -12,
    right: -12,
    borderWidth: 2,
    borderColor: '#0F172A',
    borderRadius: 12,
  },
  messageBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '75%',
  },
  messageBubbleMe: {
    backgroundColor: '#3B82F6',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    position: 'relative',
    overflow: 'visible',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#F8FAFC',
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#F8FAFC',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  messageActionButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  messageActionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  messageActionTextDelete: {
    color: '#EF4444',
  },
  editContainer: {
    gap: 8,
  },
  editInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    color: '#F8FAFC',
    fontSize: 15,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButtonCancel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  editButtonSave: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  editButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  editButtonTextSave: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
