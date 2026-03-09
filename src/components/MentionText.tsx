import React, { useState, useMemo } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useGroup } from '../contexts/GroupContext';
import { MemberWithProfile } from '../hooks/useGroupMembers';
import MemberProfilePopup from './MemberProfilePopup';

interface MentionTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

interface TextSegment {
  text: string;
  member?: MemberWithProfile;
}

function parseMentions(text: string, members: MemberWithProfile[]): TextSegment[] {
  if (!text || members.length === 0) {
    return [{ text }];
  }

  // Build map of display names to members, sorted longest first for greedy matching
  const sortedMembers = [...members].sort(
    (a, b) => b.displayName.length - a.displayName.length
  );

  const segments: TextSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Find the earliest mention in the remaining text
    let earliestIndex = -1;
    let matchedMember: MemberWithProfile | null = null;
    let matchedName = '';

    for (const member of sortedMembers) {
      const pattern = '@' + member.displayName;
      const idx = remaining.indexOf(pattern);
      if (idx === -1) continue;

      // Only match @ at start of text or after whitespace
      if (idx > 0 && remaining[idx - 1] !== ' ' && remaining[idx - 1] !== '\n') continue;

      if (earliestIndex === -1 || idx < earliestIndex) {
        earliestIndex = idx;
        matchedMember = member;
        matchedName = pattern;
      }
    }

    if (earliestIndex === -1 || !matchedMember) {
      // No more mentions found
      segments.push({ text: remaining });
      break;
    }

    // Add text before the mention
    if (earliestIndex > 0) {
      segments.push({ text: remaining.substring(0, earliestIndex) });
    }

    // Add the mention segment
    segments.push({ text: matchedName, member: matchedMember });

    remaining = remaining.substring(earliestIndex + matchedName.length);
  }

  return segments;
}

export { parseMentions };

export default function MentionText({ text, style }: MentionTextProps) {
  const { groupMembers } = useGroup();
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null);

  const segments = useMemo(
    () => parseMentions(text, groupMembers),
    [text, groupMembers]
  );

  const hasMentions = segments.some(s => s.member);

  if (!hasMentions) {
    return <Text style={style}>{text}</Text>;
  }

  return (
    <>
      <Text style={style}>
        {segments.map((segment, i) =>
          segment.member ? (
            <Text
              key={i}
              style={{ color: '#3B82F6', fontWeight: '600' }}
              onPress={() => setSelectedMember(segment.member!)}
            >
              {segment.text}
            </Text>
          ) : (
            <Text key={i}>{segment.text}</Text>
          )
        )}
      </Text>
      <MemberProfilePopup
        member={selectedMember}
        visible={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
      />
    </>
  );
}
