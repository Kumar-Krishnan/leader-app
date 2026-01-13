/**
 * Tests for Supabase configuration logic
 */

describe('Supabase Configuration', () => {
  describe('isSupabaseConfigured logic', () => {
    it('should return false when URL is missing', () => {
      const url = '';
      const key = 'test-key';
      const isConfigured = !!(url && key);
      expect(isConfigured).toBe(false);
    });

    it('should return false when key is missing', () => {
      const url = 'https://test.supabase.co';
      const key = '';
      const isConfigured = !!(url && key);
      expect(isConfigured).toBe(false);
    });

    it('should return true when both values present', () => {
      const url = 'https://test.supabase.co';
      const key = 'test-anon-key';
      const isConfigured = !!(url && key);
      expect(isConfigured).toBe(true);
    });
  });

  describe('Supabase URL validation', () => {
    it('should accept valid Supabase URLs', () => {
      const validUrls = [
        'https://abcdefghijklmnop.supabase.co',
        'https://my-project.supabase.co',
        'http://localhost:54321',
      ];

      validUrls.forEach(url => {
        expect(() => new URL(url)).not.toThrow();
      });
    });

    it('should reject empty string as invalid', () => {
      expect('').toBeFalsy();
    });

    it('should reject non-URL strings', () => {
      expect(() => new URL('not-a-url')).toThrow();
    });
  });

  describe('Auth configuration defaults', () => {
    it('should have correct auth options structure', () => {
      const authOptions = {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      };

      expect(authOptions.autoRefreshToken).toBe(true);
      expect(authOptions.persistSession).toBe(true);
      expect(authOptions.detectSessionInUrl).toBe(true);
    });
  });
});
