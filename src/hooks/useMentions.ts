import { useMemo } from 'react';
import { MemberWithProfile } from './useGroupMembers';

export interface MentionResult {
  /** Whether to show the mentions dropdown */
  showMentions: boolean;
  /** Filtered members matching the query */
  filteredMembers: MemberWithProfile[];
  /** The current query string after @ */
  mentionQuery: string;
  /** Replace @query with @DisplayName and return new text + cursor position */
  completeMention: (member: MemberWithProfile) => {
    newText: string;
    newCursorPosition: number;
  };
}

/**
 * Pure logic hook for @mention detection and completion.
 *
 * Scans backward from cursor to find `@` preceded by whitespace or at position 0.
 * Avoids triggering on email addresses. No spaces allowed in the query.
 */
export function useMentions(
  members: MemberWithProfile[],
  text: string,
  cursorPosition: number
): MentionResult {
  const { mentionQuery, mentionStart } = useMemo(() => {
    if (cursorPosition <= 0 || text.length === 0) {
      return { mentionQuery: '', mentionStart: -1 };
    }

    // Scan backward from cursor to find @
    const textBeforeCursor = text.slice(0, cursorPosition);

    // Find the last @ before the cursor
    let atIndex = -1;
    for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
      const char = textBeforeCursor[i];
      // Stop if we hit a space (no spaces in query)
      if (char === ' ' || char === '\n') break;
      if (char === '@') {
        atIndex = i;
        break;
      }
    }

    if (atIndex === -1) {
      return { mentionQuery: '', mentionStart: -1 };
    }

    // @ must be at position 0 or preceded by whitespace (avoid emails)
    if (atIndex > 0) {
      const charBefore = text[atIndex - 1];
      if (charBefore !== ' ' && charBefore !== '\n') {
        return { mentionQuery: '', mentionStart: -1 };
      }
    }

    const query = textBeforeCursor.slice(atIndex + 1);
    return { mentionQuery: query, mentionStart: atIndex };
  }, [text, cursorPosition]);

  const filteredMembers = useMemo(() => {
    if (mentionStart === -1) return [];
    const lowerQuery = mentionQuery.toLowerCase();
    return members.filter(
      (m) => m.displayName.toLowerCase().includes(lowerQuery)
    );
  }, [members, mentionQuery, mentionStart]);

  const showMentions = mentionStart !== -1 && filteredMembers.length > 0;

  const completeMention = (member: MemberWithProfile) => {
    // Replace @query with @DisplayName + trailing space
    const before = text.slice(0, mentionStart);
    const after = text.slice(cursorPosition);
    const insertion = `@${member.displayName} `;
    const newText = before + insertion + after;
    const newCursorPosition = before.length + insertion.length;
    return { newText, newCursorPosition };
  };

  return { showMentions, filteredMembers, mentionQuery, completeMention };
}
