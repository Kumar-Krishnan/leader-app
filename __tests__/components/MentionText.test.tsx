import { parseMentions } from '../../src/components/MentionText';
import { MemberWithProfile } from '../../src/hooks/useGroupMembers';

const makeMember = (name: string, email = `${name.toLowerCase().replace(' ', '.')}@test.com`): MemberWithProfile => ({
  id: `member-${name}`,
  group_id: 'group-1',
  user_id: `user-${name}`,
  role: 'member' as any,
  joined_at: '2024-01-01',
  placeholder_profile_id: null,
  user: { id: `user-${name}`, full_name: name, avatar_url: null, email, created_at: '2024-01-01', updated_at: '2024-01-01' },
  placeholder: null,
  isPlaceholder: false,
  displayName: name,
  displayEmail: email,
});

const members = [
  makeMember('John Smith'),
  makeMember('Jane Doe'),
  makeMember('John'),
];

describe('parseMentions', () => {
  it('returns plain text when no mentions', () => {
    const result = parseMentions('Hello world', members);
    expect(result).toEqual([{ text: 'Hello world' }]);
  });

  it('parses a single mention', () => {
    const result = parseMentions('Hello @John Smith!', members);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ text: 'Hello ' });
    expect(result[1].text).toBe('@John Smith');
    expect(result[1].member?.displayName).toBe('John Smith');
    expect(result[2]).toEqual({ text: '!' });
  });

  it('parses mention at start of text', () => {
    const result = parseMentions('@Jane Doe hi', members);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('@Jane Doe');
    expect(result[0].member?.displayName).toBe('Jane Doe');
    expect(result[1]).toEqual({ text: ' hi' });
  });

  it('parses multiple mentions', () => {
    const result = parseMentions('@John Smith and @Jane Doe', members);
    expect(result).toHaveLength(3);
    expect(result[0].member?.displayName).toBe('John Smith');
    expect(result[1]).toEqual({ text: ' and ' });
    expect(result[2].member?.displayName).toBe('Jane Doe');
  });

  it('does not match mention without leading whitespace', () => {
    const result = parseMentions('abc@John Smith', members);
    expect(result).toEqual([{ text: 'abc@John Smith' }]);
  });

  it('matches mention after newline', () => {
    const result = parseMentions('Hello\n@John Smith', members);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ text: 'Hello\n' });
    expect(result[1].member?.displayName).toBe('John Smith');
  });

  it('prefers longer name match (greedy)', () => {
    // "John Smith" should match over "John" when both could match
    const result = parseMentions('@John Smith', members);
    expect(result).toHaveLength(1);
    expect(result[0].member?.displayName).toBe('John Smith');
  });

  it('matches shorter name when longer does not apply', () => {
    const result = parseMentions('@John is here', members);
    expect(result).toHaveLength(2);
    expect(result[0].member?.displayName).toBe('John');
  });

  it('returns plain text for non-member mention', () => {
    const result = parseMentions('@Unknown Person hi', members);
    expect(result).toEqual([{ text: '@Unknown Person hi' }]);
  });

  it('handles empty text', () => {
    const result = parseMentions('', members);
    expect(result).toEqual([{ text: '' }]);
  });

  it('handles empty members', () => {
    const result = parseMentions('@John Smith', []);
    expect(result).toEqual([{ text: '@John Smith' }]);
  });
});
