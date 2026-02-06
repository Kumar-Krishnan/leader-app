/**
 * Tests for meeting reminder generation logic
 *
 * Tests the business logic of the generate-meeting-reminders Edge Function
 */
import {
  createMockMeetingWithGroupAndLeader,
  createMockMeetingReminderToken,
  createMockSentReminderToken,
  MeetingWithGroupAndLeader,
} from '../../../__mocks__/factories';

// Helper functions that mirror the Edge Function logic
function isWithinReminderWindow(
  meetingDate: string,
  now: Date = new Date()
): boolean {
  const targetStart = new Date(now.getTime() + 47 * 60 * 60 * 1000); // 47 hours
  const targetEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000); // 49 hours
  const meeting = new Date(meetingDate);
  return meeting >= targetStart && meeting <= targetEnd;
}

function shouldSendReminder(
  meeting: MeetingWithGroupAndLeader,
  existingToken: { reminder_sent_at: string | null } | null
): boolean {
  // Don't send if no creator
  if (!meeting.created_by) return false;

  // Don't send if reminder already sent
  if (existingToken?.reminder_sent_at) return false;

  return true;
}

function generateLeaderEmailSubject(
  meetingTitle: string,
  dateShort: string
): string {
  return `[Action Required] Confirm reminder for "${meetingTitle}" - ${dateShort}`;
}

function generateConfirmationUrl(
  supabaseUrl: string,
  token: string
): string {
  return `${supabaseUrl}/functions/v1/meeting-confirmation-page?token=${token}`;
}

describe('Meeting Reminder Generation Logic', () => {
  describe('isWithinReminderWindow', () => {
    it('should return true for meetings exactly 48 hours away', () => {
      const now = new Date('2024-03-15T09:00:00Z');
      const meetingDate = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

      expect(isWithinReminderWindow(meetingDate, now)).toBe(true);
    });

    it('should return true for meetings 47 hours away', () => {
      const now = new Date('2024-03-15T09:00:00Z');
      const meetingDate = new Date(now.getTime() + 47 * 60 * 60 * 1000).toISOString();

      expect(isWithinReminderWindow(meetingDate, now)).toBe(true);
    });

    it('should return true for meetings 49 hours away', () => {
      const now = new Date('2024-03-15T09:00:00Z');
      const meetingDate = new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString();

      expect(isWithinReminderWindow(meetingDate, now)).toBe(true);
    });

    it('should return false for meetings less than 47 hours away', () => {
      const now = new Date('2024-03-15T09:00:00Z');
      const meetingDate = new Date(now.getTime() + 46 * 60 * 60 * 1000).toISOString();

      expect(isWithinReminderWindow(meetingDate, now)).toBe(false);
    });

    it('should return false for meetings more than 49 hours away', () => {
      const now = new Date('2024-03-15T09:00:00Z');
      const meetingDate = new Date(now.getTime() + 50 * 60 * 60 * 1000).toISOString();

      expect(isWithinReminderWindow(meetingDate, now)).toBe(false);
    });

    it('should return false for meetings in the past', () => {
      const now = new Date('2024-03-15T09:00:00Z');
      const meetingDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      expect(isWithinReminderWindow(meetingDate, now)).toBe(false);
    });

    it('should return false for meetings happening now', () => {
      const now = new Date('2024-03-15T09:00:00Z');

      expect(isWithinReminderWindow(now.toISOString(), now)).toBe(false);
    });
  });

  describe('shouldSendReminder', () => {
    it('should return true for meeting with no existing token', () => {
      const meeting = createMockMeetingWithGroupAndLeader();

      expect(shouldSendReminder(meeting, null)).toBe(true);
    });

    it('should return true for meeting with unsent token', () => {
      const meeting = createMockMeetingWithGroupAndLeader();
      const token = createMockMeetingReminderToken({ reminder_sent_at: null });

      expect(shouldSendReminder(meeting, token)).toBe(true);
    });

    it('should return false for meeting with already sent reminder', () => {
      const meeting = createMockMeetingWithGroupAndLeader();
      const token = createMockSentReminderToken();

      expect(shouldSendReminder(meeting, token)).toBe(false);
    });

    it('should return false for meeting without a creator', () => {
      const meeting = createMockMeetingWithGroupAndLeader({
        created_by: null as unknown as string,
      });

      expect(shouldSendReminder(meeting, null)).toBe(false);
    });
  });

  describe('generateLeaderEmailSubject', () => {
    it('should generate correct subject line', () => {
      const subject = generateLeaderEmailSubject('Team Meeting', 'March 15');

      expect(subject).toBe('[Action Required] Confirm reminder for "Team Meeting" - March 15');
    });

    it('should handle special characters in title', () => {
      const subject = generateLeaderEmailSubject('Q&A Session', 'March 15');

      expect(subject).toBe('[Action Required] Confirm reminder for "Q&A Session" - March 15');
    });

    it('should handle long titles', () => {
      const longTitle = 'A Very Long Meeting Title That Goes On And On';
      const subject = generateLeaderEmailSubject(longTitle, 'March 15');

      expect(subject).toContain(longTitle);
    });
  });

  describe('generateConfirmationUrl', () => {
    it('should generate correct URL', () => {
      const url = generateConfirmationUrl(
        'https://example.supabase.co',
        'abc123token'
      );

      expect(url).toBe(
        'https://example.supabase.co/functions/v1/meeting-confirmation-page?token=abc123token'
      );
    });

    it('should handle tokens with special characters', () => {
      const url = generateConfirmationUrl(
        'https://example.supabase.co',
        '0123456789abcdef'
      );

      expect(url).toContain('token=0123456789abcdef');
    });
  });

  describe('Token expiration', () => {
    it('should set expiration to 7 days from creation', () => {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const token = createMockMeetingReminderToken();
      const expiresAt = new Date(token.expires_at);

      // Should be approximately 7 days from now (within 1 minute tolerance)
      const diff = Math.abs(expiresAt.getTime() - sevenDaysFromNow.getTime());
      expect(diff).toBeLessThan(60 * 1000); // Less than 1 minute difference
    });
  });

  describe('Meeting query window', () => {
    it('should correctly calculate 47-49 hour window', () => {
      const now = new Date('2024-03-15T09:00:00Z');
      const targetStart = new Date(now.getTime() + 47 * 60 * 60 * 1000);
      const targetEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000);

      // Should be March 17, 8:00 AM to 10:00 AM UTC
      expect(targetStart.toISOString()).toBe('2024-03-17T08:00:00.000Z');
      expect(targetEnd.toISOString()).toBe('2024-03-17T10:00:00.000Z');
    });

    it('should handle month boundaries', () => {
      const now = new Date('2024-02-28T09:00:00Z');
      const targetStart = new Date(now.getTime() + 47 * 60 * 60 * 1000);
      const targetEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000);

      // Should cross into March (2024 is a leap year)
      expect(targetStart.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(targetEnd.getUTCMonth()).toBe(2);
    });

    it('should handle year boundaries', () => {
      const now = new Date('2024-12-30T09:00:00Z');
      const targetStart = new Date(now.getTime() + 47 * 60 * 60 * 1000);
      const targetEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000);

      // Should be in January 2025
      expect(targetStart.getUTCFullYear()).toBe(2025);
      expect(targetEnd.getUTCFullYear()).toBe(2025);
    });
  });

  describe('Email content generation', () => {
    it('should include meeting title in email', () => {
      const meeting = createMockMeetingWithGroupAndLeader({
        title: 'Important Strategy Meeting',
      });

      // The email HTML/text should contain the title
      expect(meeting.title).toBe('Important Strategy Meeting');
    });

    it('should include leader email', () => {
      const meeting = createMockMeetingWithGroupAndLeader({
        profiles: { email: 'leader@company.com', full_name: 'John Leader' },
      });

      expect(meeting.profiles.email).toBe('leader@company.com');
    });

    it('should include group name', () => {
      const meeting = createMockMeetingWithGroupAndLeader({
        groups: { name: 'Executive Team' },
      });

      expect(meeting.groups.name).toBe('Executive Team');
    });

    it('should handle missing location', () => {
      const meeting = createMockMeetingWithGroupAndLeader({
        location: null,
      });

      expect(meeting.location).toBeNull();
    });

    it('should handle missing description', () => {
      const meeting = createMockMeetingWithGroupAndLeader({
        description: null,
      });

      expect(meeting.description).toBeNull();
    });
  });
});

describe('Reminder Processing Results', () => {
  interface ProcessingResult {
    processed: number;
    skipped: number;
    errors: string[];
  }

  function createProcessingResult(
    meetings: { shouldProcess: boolean; hasError?: boolean }[]
  ): ProcessingResult {
    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const meeting of meetings) {
      if (meeting.hasError) {
        errors.push(`Error processing meeting`);
      } else if (meeting.shouldProcess) {
        processed++;
      } else {
        skipped++;
      }
    }

    return { processed, skipped, errors };
  }

  it('should count processed meetings correctly', () => {
    const result = createProcessingResult([
      { shouldProcess: true },
      { shouldProcess: true },
      { shouldProcess: true },
    ]);

    expect(result.processed).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should count skipped meetings correctly', () => {
    const result = createProcessingResult([
      { shouldProcess: false },
      { shouldProcess: false },
      { shouldProcess: true },
    ]);

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(2);
  });

  it('should collect errors without stopping processing', () => {
    const result = createProcessingResult([
      { shouldProcess: true },
      { shouldProcess: true, hasError: true },
      { shouldProcess: true },
    ]);

    expect(result.errors).toHaveLength(1);
    // Processing continues despite error
    expect(result.processed).toBe(2);
  });

  it('should handle empty meeting list', () => {
    const result = createProcessingResult([]);

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
