import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useGroup } from '../contexts/GroupContext';
import { useMentions } from '../hooks/useMentions';
import { MemberWithProfile } from '../hooks/useGroupMembers';
import Avatar from './Avatar';

interface MentionTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  onSubmit: () => void;
  sending?: boolean;
  showSendButton?: boolean;
  leftElement?: React.ReactNode;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

export default function MentionTextInput({
  value,
  onChangeText,
  placeholder,
  maxLength,
  onSubmit,
  sending = false,
  showSendButton = true,
  leftElement,
  inputStyle,
  containerStyle,
}: MentionTextInputProps) {
  const { groupMembers } = useGroup();
  const [cursorPosition, setCursorPosition] = useState(0);
  const [forcedSelection, setForcedSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const inputRef = useRef<TextInput>(null);

  const { showMentions, filteredMembers, completeMention } = useMentions(
    groupMembers,
    value,
    cursorPosition
  );

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCursorPosition(e.nativeEvent.selection.end);
      // Clear forced selection after it's been applied
      if (forcedSelection) {
        setForcedSelection(undefined);
      }
    },
    [forcedSelection]
  );

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
    },
    [onChangeText]
  );

  const handleSelectMember = useCallback(
    (member: MemberWithProfile) => {
      const { newText, newCursorPosition } = completeMention(member);
      onChangeText(newText);
      setCursorPosition(newCursorPosition);
      setForcedSelection({ start: newCursorPosition, end: newCursorPosition });
    },
    [completeMention, onChangeText]
  );

  const renderMentionItem = ({ item }: { item: MemberWithProfile }) => (
    <TouchableOpacity
      style={styles.mentionRow}
      onPress={() => handleSelectMember(item)}
    >
      <Avatar
        uri={item.user?.avatar_url}
        name={item.displayName}
        size={28}
      />
      <Text style={styles.mentionName} numberOfLines={1}>
        {item.displayName}
      </Text>
    </TouchableOpacity>
  );

  const disabled = !value.trim() || sending;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {showMentions && (
        <View style={styles.mentionDropdown}>
          <FlatList
            data={filteredMembers.slice(0, 4)}
            renderItem={renderMentionItem}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            style={styles.mentionList}
          />
        </View>
      )}
      <View style={styles.inputContainer}>
        {leftElement}
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          value={value}
          onChangeText={handleChangeText}
          onSelectionChange={handleSelectionChange}
          selection={forcedSelection}
          multiline
          maxLength={maxLength}
        />
        {showSendButton && (
          <TouchableOpacity
            style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
            onPress={onSubmit}
            disabled={disabled}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text testID="send-button-text" style={styles.sendButtonText}>
                ↑
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  mentionDropdown: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 4,
    maxHeight: 180,
    overflow: 'hidden',
  },
  mentionList: {
    flexGrow: 0,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 10,
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F8FAFC',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
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
});
