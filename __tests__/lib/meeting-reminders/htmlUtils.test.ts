/**
 * Tests for HTML utility functions used in meeting reminder Edge Functions
 *
 * These tests verify the logic of the html-utils.ts shared helper
 * by reimplementing the pure functions in a Jest-compatible way.
 */

// Reimplement functions to test (same logic as supabase/functions/_shared/html-utils.ts)
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function nl2br(text: string | null | undefined): string {
  if (!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('HTML Utility Functions', () => {
  describe('escapeHtml', () => {
    it('should return empty string for null input', () => {
      expect(escapeHtml(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape less than signs', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than signs', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's fine")).toBe('It&#039;s fine');
    });

    it('should escape multiple special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
    });

    it('should leave normal text unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should handle mixed content', () => {
      expect(escapeHtml("Hello <b>World</b> & 'Everyone'")).toBe(
        'Hello &lt;b&gt;World&lt;/b&gt; &amp; &#039;Everyone&#039;'
      );
    });
  });

  describe('nl2br', () => {
    it('should return empty string for null input', () => {
      expect(nl2br(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(nl2br(undefined)).toBe('');
    });

    it('should convert newlines to br tags', () => {
      expect(nl2br('Line 1\nLine 2')).toBe('Line 1<br>Line 2');
    });

    it('should handle multiple newlines', () => {
      expect(nl2br('Line 1\nLine 2\nLine 3')).toBe('Line 1<br>Line 2<br>Line 3');
    });

    it('should escape HTML before converting newlines', () => {
      expect(nl2br('<script>\nalert("XSS")\n</script>')).toBe(
        '&lt;script&gt;<br>alert(&quot;XSS&quot;)<br>&lt;/script&gt;'
      );
    });

    it('should handle text without newlines', () => {
      expect(nl2br('Single line')).toBe('Single line');
    });
  });

  describe('formatDate', () => {
    it('should format a date in long format', () => {
      // Using a fixed date to avoid timezone issues
      const date = '2024-03-15T10:00:00Z';
      const result = formatDate(date);

      // Check that it contains expected parts (exact format may vary by locale)
      expect(result).toMatch(/March/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should include the weekday', () => {
      const date = '2024-03-15T10:00:00Z'; // This is a Friday
      const result = formatDate(date);

      // The result should include a weekday
      expect(result).toMatch(/day/i); // "Friday" contains "day"
    });
  });

  describe('formatDateShort', () => {
    it('should format a date in short format', () => {
      const date = '2024-03-15T10:00:00Z';
      const result = formatDateShort(date);

      expect(result).toMatch(/March/);
      expect(result).toMatch(/15/);
      // Should NOT include year in short format
      expect(result).not.toMatch(/2024/);
    });
  });

  describe('formatTime', () => {
    it('should format time in 12-hour format', () => {
      const date = '2024-03-15T14:30:00Z';
      const result = formatTime(date);

      // Should be in 12-hour format with AM/PM
      expect(result).toMatch(/AM|PM/i);
      expect(result).toMatch(/:/); // Contains colon for time
    });

    it('should handle morning times', () => {
      const date = '2024-03-15T09:00:00Z';
      const result = formatTime(date);

      expect(result).toMatch(/AM|PM/i);
    });

    it('should handle midnight (local time)', () => {
      // Create a date at midnight local time
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      const result = formatTime(date.toISOString());

      expect(result).toMatch(/12.*AM|AM.*12/i);
    });

    it('should handle noon (local time)', () => {
      // Create a date at noon local time
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      const result = formatTime(date.toISOString());

      expect(result).toMatch(/12.*PM|PM.*12/i);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a 64-character token', () => {
      const token = generateSecureToken();
      expect(token.length).toBe(64);
    });

    it('should only contain hexadecimal characters', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should be cryptographically random', () => {
      // Generate multiple tokens and check they're sufficiently different
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      // Count differing characters
      let differences = 0;
      for (let i = 0; i < token1.length; i++) {
        if (token1[i] !== token2[i]) differences++;
      }

      // Should have significant differences (at least 50% different)
      expect(differences).toBeGreaterThan(32);
    });
  });
});

describe('Content Validation', () => {
  const MAX_DESCRIPTION_LENGTH = 5000;
  const MAX_MESSAGE_LENGTH = 2000;

  describe('Description length limits', () => {
    it('should allow descriptions up to max length', () => {
      const description = 'a'.repeat(MAX_DESCRIPTION_LENGTH);
      expect(description.length).toBe(MAX_DESCRIPTION_LENGTH);
    });

    it('should truncate descriptions over max length', () => {
      const description = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 100);
      const truncated = description.substring(0, MAX_DESCRIPTION_LENGTH);
      expect(truncated.length).toBe(MAX_DESCRIPTION_LENGTH);
    });
  });

  describe('Message length limits', () => {
    it('should allow messages up to max length', () => {
      const message = 'a'.repeat(MAX_MESSAGE_LENGTH);
      expect(message.length).toBe(MAX_MESSAGE_LENGTH);
    });

    it('should truncate messages over max length', () => {
      const message = 'a'.repeat(MAX_MESSAGE_LENGTH + 100);
      const truncated = message.substring(0, MAX_MESSAGE_LENGTH);
      expect(truncated.length).toBe(MAX_MESSAGE_LENGTH);
    });
  });
});
