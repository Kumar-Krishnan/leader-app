import { renderHook } from '@testing-library/react-native';
import { useMentions } from '../../src/hooks/useMentions';
import { MemberWithProfile } from '../../src/hooks/useGroupMembers';

const makeMember = (overrides: Partial<MemberWithProfile> = {}): MemberWithProfile => ({
  id: overrides.id || 'member-1',
  group_id: 'group-1',
  user_id: overrides.user_id || 'user-1',
  placeholder_id: null,
  role: 'member',
  created_at: '2024-01-01T00:00:00Z',
  user: null,
  placeholder: null,
  isPlaceholder: false,
  displayName: overrides.displayName || 'John Smith',
  displayEmail: overrides.displayEmail || 'john@example.com',
  ...overrides,
} as MemberWithProfile);

const members = [
  makeMember({ id: 'm1', displayName: 'John Smith' }),
  makeMember({ id: 'm2', displayName: 'Jane Doe' }),
  makeMember({ id: 'm3', displayName: 'Bob Johnson' }),
];

describe('useMentions', () => {
  it('should not show mentions when no @ is typed', () => {
    const { result } = renderHook(() => useMentions(members, 'hello world', 11));
    expect(result.current.showMentions).toBe(false);
    expect(result.current.filteredMembers).toEqual([]);
  });

  it('should show mentions when @ is typed at start', () => {
    const { result } = renderHook(() => useMentions(members, '@', 1));
    expect(result.current.showMentions).toBe(true);
    expect(result.current.filteredMembers).toHaveLength(3);
  });

  it('should show mentions when @ is typed after space', () => {
    const { result } = renderHook(() => useMentions(members, 'hey @', 5));
    expect(result.current.showMentions).toBe(true);
    expect(result.current.filteredMembers).toHaveLength(3);
  });

  it('should filter members by query', () => {
    const { result } = renderHook(() => useMentions(members, '@Jo', 3));
    expect(result.current.showMentions).toBe(true);
    expect(result.current.filteredMembers).toHaveLength(2); // John Smith, Bob Johnson
    expect(result.current.mentionQuery).toBe('Jo');
  });

  it('should filter case-insensitively', () => {
    const { result } = renderHook(() => useMentions(members, '@jane', 5));
    expect(result.current.showMentions).toBe(true);
    expect(result.current.filteredMembers).toHaveLength(1);
    expect(result.current.filteredMembers[0].displayName).toBe('Jane Doe');
  });

  it('should NOT trigger on email addresses', () => {
    const { result } = renderHook(() => useMentions(members, 'user@example.com', 16));
    expect(result.current.showMentions).toBe(false);
  });

  it('should NOT trigger when @ is preceded by non-whitespace', () => {
    const { result } = renderHook(() => useMentions(members, 'test@Jo', 7));
    expect(result.current.showMentions).toBe(false);
  });

  it('should not show when no members match', () => {
    const { result } = renderHook(() => useMentions(members, '@xyz', 4));
    expect(result.current.showMentions).toBe(false);
    expect(result.current.filteredMembers).toHaveLength(0);
  });

  it('should handle @ after newline', () => {
    const { result } = renderHook(() => useMentions(members, 'hello\n@', 7));
    expect(result.current.showMentions).toBe(true);
  });

  it('should not trigger when cursor is at 0', () => {
    const { result } = renderHook(() => useMentions(members, '@test', 0));
    expect(result.current.showMentions).toBe(false);
  });

  describe('completeMention', () => {
    it('should replace @query with @DisplayName and trailing space', () => {
      const { result } = renderHook(() => useMentions(members, '@Ja', 3));
      const jane = members[1]; // Jane Doe
      const { newText, newCursorPosition } = result.current.completeMention(jane);
      expect(newText).toBe('@Jane Doe ');
      expect(newCursorPosition).toBe(10);
    });

    it('should preserve text before and after mention', () => {
      const { result } = renderHook(() => useMentions(members, 'hey @Jo more text', 7));
      const john = members[0]; // John Smith
      const { newText, newCursorPosition } = result.current.completeMention(john);
      expect(newText).toBe('hey @John Smith  more text');
      expect(newCursorPosition).toBe(16); // after "hey @John Smith "
    });

    it('should work at start of text', () => {
      const { result } = renderHook(() => useMentions(members, '@Bo', 3));
      const bob = members[2]; // Bob Johnson
      const { newText, newCursorPosition } = result.current.completeMention(bob);
      expect(newText).toBe('@Bob Johnson ');
      expect(newCursorPosition).toBe(13);
    });
  });
});
