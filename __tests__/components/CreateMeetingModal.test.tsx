/**
 * Tests for CreateMeetingModal - focusing on date generation logic
 *
 * The component itself requires complex mocking due to useEffect side effects,
 * so we focus on testing the core date generation algorithm directly.
 */

/**
 * Recurrence type matching the component
 */
type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

/**
 * generateRecurringDates - same logic as the component
 * Extracted for testing purposes
 */
function generateRecurringDates(
  startDate: Date,
  type: RecurrenceType,
  count: number
): Date[] {
  const dates: Date[] = [new Date(startDate)];

  if (type === 'none') return dates;

  for (let i = 1; i < count; i++) {
    const newDate = new Date(startDate);
    if (type === 'weekly') {
      newDate.setDate(startDate.getDate() + i * 7);
    } else if (type === 'biweekly') {
      newDate.setDate(startDate.getDate() + i * 14);
    } else if (type === 'monthly') {
      newDate.setMonth(startDate.getMonth() + i);
    }
    dates.push(newDate);
  }

  return dates;
}

describe('generateRecurringDates', () => {
  describe('No recurrence (none)', () => {
    it('should return single date for none recurrence', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'none', 1);

      expect(dates).toHaveLength(1);
      expect(dates[0].toISOString()).toBe(startDate.toISOString());
    });

    it('should ignore count for none recurrence', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'none', 10);

      expect(dates).toHaveLength(1);
    });
  });

  describe('Weekly recurrence', () => {
    it('should generate weekly dates (7 days apart)', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'weekly', 4);

      expect(dates).toHaveLength(4);
      expect(dates[0].toISOString()).toBe('2024-03-15T19:00:00.000Z');
      expect(dates[1].toISOString()).toBe('2024-03-22T19:00:00.000Z'); // +7 days
      expect(dates[2].toISOString()).toBe('2024-03-29T19:00:00.000Z'); // +14 days
      expect(dates[3].toISOString()).toBe('2024-04-05T19:00:00.000Z'); // +21 days
    });

    it('should preserve time across weekly dates', () => {
      const startDate = new Date('2024-03-15T14:30:00Z');
      const dates = generateRecurringDates(startDate, 'weekly', 3);

      dates.forEach((date) => {
        expect(date.getUTCHours()).toBe(14);
        expect(date.getUTCMinutes()).toBe(30);
      });
    });

    it('should have exactly 7 days between each weekly meeting', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'weekly', 5);

      for (let i = 1; i < dates.length; i++) {
        const daysDiff =
          (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBe(7);
      }
    });
  });

  describe('Bi-weekly recurrence', () => {
    it('should generate bi-weekly dates (14 days apart)', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'biweekly', 4);

      expect(dates).toHaveLength(4);
      expect(dates[0].toISOString()).toBe('2024-03-15T19:00:00.000Z');
      expect(dates[1].toISOString()).toBe('2024-03-29T19:00:00.000Z'); // +14 days
      expect(dates[2].toISOString()).toBe('2024-04-12T19:00:00.000Z'); // +28 days
      expect(dates[3].toISOString()).toBe('2024-04-26T19:00:00.000Z'); // +42 days
    });

    it('should preserve time across bi-weekly dates', () => {
      const startDate = new Date('2024-03-15T10:00:00Z');
      const dates = generateRecurringDates(startDate, 'biweekly', 3);

      dates.forEach((date) => {
        expect(date.getUTCHours()).toBe(10);
        expect(date.getUTCMinutes()).toBe(0);
      });
    });

    it('should handle month boundaries for bi-weekly', () => {
      const startDate = new Date('2024-01-25T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'biweekly', 3);

      expect(dates[0].getUTCMonth()).toBe(0); // January
      expect(dates[1].getUTCMonth()).toBe(1); // February (Jan 25 + 14 = Feb 8)
      expect(dates[2].getUTCMonth()).toBe(1); // February (Jan 25 + 28 = Feb 22)
    });

    it('should handle year boundaries for bi-weekly', () => {
      const startDate = new Date('2024-12-20T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'biweekly', 3);

      expect(dates[0].getUTCFullYear()).toBe(2024);
      expect(dates[1].getUTCFullYear()).toBe(2025); // Dec 20 + 14 = Jan 3, 2025
      expect(dates[2].getUTCFullYear()).toBe(2025); // Dec 20 + 28 = Jan 17, 2025
    });

    it('should generate correct number of bi-weekly occurrences', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');

      expect(generateRecurringDates(startDate, 'biweekly', 1)).toHaveLength(1);
      expect(generateRecurringDates(startDate, 'biweekly', 5)).toHaveLength(5);
      expect(generateRecurringDates(startDate, 'biweekly', 10)).toHaveLength(10);
      expect(generateRecurringDates(startDate, 'biweekly', 26)).toHaveLength(26); // Half a year
    });

    it('should have exactly 14 days between each bi-weekly meeting', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'biweekly', 5);

      for (let i = 1; i < dates.length; i++) {
        const daysDiff =
          (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBe(14);
      }
    });

    it('should handle leap year for bi-weekly', () => {
      // Feb 15, 2024 is in a leap year
      const startDate = new Date('2024-02-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'biweekly', 3);

      expect(dates[0].toISOString()).toBe('2024-02-15T19:00:00.000Z');
      expect(dates[1].toISOString()).toBe('2024-02-29T19:00:00.000Z'); // Leap day!
      // Third date is 28 days from start - check date is correct (time may vary due to DST)
      expect(dates[2].getUTCFullYear()).toBe(2024);
      expect(dates[2].getUTCMonth()).toBe(2); // March
      expect(dates[2].getUTCDate()).toBe(14);
    });

    it('should handle non-leap year for bi-weekly', () => {
      // Feb 15, 2023 is NOT a leap year
      const startDate = new Date('2023-02-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'biweekly', 3);

      expect(dates[0].toISOString()).toBe('2023-02-15T19:00:00.000Z');
      expect(dates[1].toISOString()).toBe('2023-03-01T19:00:00.000Z'); // Skips Feb 29
      // Third date is 28 days from start - check date is correct (time may vary due to DST)
      expect(dates[2].getUTCFullYear()).toBe(2023);
      expect(dates[2].getUTCMonth()).toBe(2); // March
      expect(dates[2].getUTCDate()).toBe(15);
    });
  });

  describe('Monthly recurrence', () => {
    it('should generate monthly dates', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'monthly', 4);

      expect(dates).toHaveLength(4);
      expect(dates[0].getUTCMonth()).toBe(2); // March
      expect(dates[1].getUTCMonth()).toBe(3); // April
      expect(dates[2].getUTCMonth()).toBe(4); // May
      expect(dates[3].getUTCMonth()).toBe(5); // June
    });

    it('should preserve day of month for monthly dates', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'monthly', 4);

      dates.forEach((date) => {
        expect(date.getUTCDate()).toBe(15);
      });
    });

    it('should handle year boundaries for monthly', () => {
      const startDate = new Date('2024-11-15T19:00:00Z');
      const dates = generateRecurringDates(startDate, 'monthly', 4);

      expect(dates[0].getUTCMonth()).toBe(10); // November 2024
      expect(dates[1].getUTCMonth()).toBe(11); // December 2024
      expect(dates[2].getUTCMonth()).toBe(0); // January 2025
      expect(dates[2].getUTCFullYear()).toBe(2025);
      expect(dates[3].getUTCMonth()).toBe(1); // February 2025
    });
  });

  describe('Edge cases', () => {
    it('should handle single occurrence', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');

      expect(generateRecurringDates(startDate, 'weekly', 1)).toHaveLength(1);
      expect(generateRecurringDates(startDate, 'biweekly', 1)).toHaveLength(1);
      expect(generateRecurringDates(startDate, 'monthly', 1)).toHaveLength(1);
    });

    it('should handle maximum occurrences (52)', () => {
      const startDate = new Date('2024-01-01T19:00:00Z');

      const weeklyDates = generateRecurringDates(startDate, 'weekly', 52);
      expect(weeklyDates).toHaveLength(52);

      const biweeklyDates = generateRecurringDates(startDate, 'biweekly', 52);
      expect(biweeklyDates).toHaveLength(52);

      const monthlyDates = generateRecurringDates(startDate, 'monthly', 52);
      expect(monthlyDates).toHaveLength(52);
    });

    it('should not modify the original start date', () => {
      const startDate = new Date('2024-03-15T19:00:00Z');
      const originalTime = startDate.getTime();

      generateRecurringDates(startDate, 'biweekly', 5);

      expect(startDate.getTime()).toBe(originalTime);
    });
  });
});

describe('Bi-weekly vs Weekly comparison', () => {
  it('bi-weekly should produce half as many meetings as weekly for same time span', () => {
    const startDate = new Date('2024-01-01T19:00:00Z');

    // 8 weekly meetings = 7 weeks
    const weeklyDates = generateRecurringDates(startDate, 'weekly', 8);
    // 4 bi-weekly meetings = 6 weeks (close to same span)
    const biweeklyDates = generateRecurringDates(startDate, 'biweekly', 4);

    // Weekly: spans 49 days (7 intervals × 7 days)
    const weeklySpan =
      (weeklyDates[7].getTime() - weeklyDates[0].getTime()) /
      (1000 * 60 * 60 * 24);
    expect(weeklySpan).toBe(49);

    // Bi-weekly: spans 42 days (3 intervals × 14 days)
    const biweeklySpan =
      (biweeklyDates[3].getTime() - biweeklyDates[0].getTime()) /
      (1000 * 60 * 60 * 24);
    expect(biweeklySpan).toBe(42);
  });

  it('bi-weekly second meeting should equal weekly third meeting date', () => {
    const startDate = new Date('2024-03-01T19:00:00Z');

    const weeklyDates = generateRecurringDates(startDate, 'weekly', 5);
    const biweeklyDates = generateRecurringDates(startDate, 'biweekly', 3);

    // Weekly meeting 3 is 14 days out = bi-weekly meeting 2
    expect(weeklyDates[2].getTime()).toBe(biweeklyDates[1].getTime());
  });

  it('26 bi-weekly meetings should span same time as 52 weekly meetings', () => {
    const startDate = new Date('2024-01-01T19:00:00Z');

    const weeklyDates = generateRecurringDates(startDate, 'weekly', 52);
    const biweeklyDates = generateRecurringDates(startDate, 'biweekly', 26);

    // Both should end on the same date (1 year - 1 week later)
    // Weekly: 51 intervals × 7 days = 357 days
    // Bi-weekly: 25 intervals × 14 days = 350 days
    // Close but not exactly equal due to different interval counts

    const weeklyEndDays =
      (weeklyDates[51].getTime() - weeklyDates[0].getTime()) /
      (1000 * 60 * 60 * 24);
    const biweeklyEndDays =
      (biweeklyDates[25].getTime() - biweeklyDates[0].getTime()) /
      (1000 * 60 * 60 * 24);

    expect(weeklyEndDays).toBe(357); // 51 weeks
    expect(biweeklyEndDays).toBe(350); // 25 bi-weeks
  });
});

describe('RecurrenceType validation', () => {
  it('should support all four recurrence types', () => {
    const types: RecurrenceType[] = ['none', 'weekly', 'biweekly', 'monthly'];
    const startDate = new Date('2024-03-15T19:00:00Z');

    types.forEach((type) => {
      const dates = generateRecurringDates(startDate, type, 3);
      expect(dates.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('bi-weekly should be distinct from weekly', () => {
    const startDate = new Date('2024-03-15T19:00:00Z');

    const weeklyDates = generateRecurringDates(startDate, 'weekly', 4);
    const biweeklyDates = generateRecurringDates(startDate, 'biweekly', 4);

    // Second meeting should be different
    expect(weeklyDates[1].getTime()).not.toBe(biweeklyDates[1].getTime());

    // Weekly second = 7 days out, biweekly second = 14 days out
    const weeklySecondDays =
      (weeklyDates[1].getTime() - weeklyDates[0].getTime()) /
      (1000 * 60 * 60 * 24);
    const biweeklySecondDays =
      (biweeklyDates[1].getTime() - biweeklyDates[0].getTime()) /
      (1000 * 60 * 60 * 24);

    expect(weeklySecondDays).toBe(7);
    expect(biweeklySecondDays).toBe(14);
  });
});

describe('Skip meeting compatibility', () => {
  /**
   * The skip meeting feature calculates frequency from the time difference
   * between the first two meetings. This verifies bi-weekly meetings will
   * work correctly with the skip functionality.
   */
  it('bi-weekly frequency can be correctly calculated from dates', () => {
    const startDate = new Date('2024-03-15T19:00:00Z');
    const dates = generateRecurringDates(startDate, 'biweekly', 4);

    // Simulate how skipMeeting calculates frequency
    const firstDate = dates[0].getTime();
    const secondDate = dates[1].getTime();
    const frequencyMs = secondDate - firstDate;

    // Should be exactly 14 days in milliseconds
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    expect(frequencyMs).toBe(fourteenDaysMs);

    // Verify this can be used to shift all dates
    const shiftedDates = dates.map(
      (date) => new Date(date.getTime() + frequencyMs)
    );

    expect(shiftedDates[0].toISOString()).toBe('2024-03-29T19:00:00.000Z');
    expect(shiftedDates[1].toISOString()).toBe('2024-04-12T19:00:00.000Z');
    expect(shiftedDates[2].toISOString()).toBe('2024-04-26T19:00:00.000Z');
    expect(shiftedDates[3].toISOString()).toBe('2024-05-10T19:00:00.000Z');
  });
});

/**
 * InvitableMember type for placeholder testing
 */
interface InvitableMember {
  id: string;
  type: 'user' | 'placeholder';
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

/**
 * Tests for placeholder member handling in CreateMeetingModal
 */
describe('Placeholder member handling', () => {
  /**
   * Transform group_members data (simulating fetchGroupMembers logic)
   */
  function transformGroupMembers(data: any[]): InvitableMember[] {
    const members: InvitableMember[] = [];
    for (const item of data) {
      if (item.user_id && item.user) {
        members.push({
          id: item.user_id,
          type: 'user',
          displayName: item.user.full_name || item.user.email,
          email: item.user.email,
          avatarUrl: item.user.avatar_url,
        });
      } else if (item.placeholder_id && item.placeholder) {
        members.push({
          id: item.placeholder_id,
          type: 'placeholder',
          displayName: item.placeholder.full_name,
          email: item.placeholder.email,
          avatarUrl: null,
        });
      }
    }
    return members;
  }

  it('should transform regular user members correctly', () => {
    const data = [
      {
        user_id: 'user-1',
        placeholder_id: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        placeholder: null,
      },
    ];

    const members = transformGroupMembers(data);

    expect(members).toHaveLength(1);
    expect(members[0]).toEqual({
      id: 'user-1',
      type: 'user',
      displayName: 'John Doe',
      email: 'user@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('should transform placeholder members correctly', () => {
    const data = [
      {
        user_id: null,
        placeholder_id: 'placeholder-1',
        user: null,
        placeholder: {
          id: 'placeholder-1',
          email: 'placeholder@example.com',
          full_name: 'Placeholder User',
        },
      },
    ];

    const members = transformGroupMembers(data);

    expect(members).toHaveLength(1);
    expect(members[0]).toEqual({
      id: 'placeholder-1',
      type: 'placeholder',
      displayName: 'Placeholder User',
      email: 'placeholder@example.com',
      avatarUrl: null,
    });
  });

  it('should handle mixed regular and placeholder members', () => {
    const data = [
      {
        user_id: 'user-1',
        placeholder_id: null,
        user: { id: 'user-1', email: 'user@example.com', full_name: 'John', avatar_url: null },
        placeholder: null,
      },
      {
        user_id: null,
        placeholder_id: 'placeholder-1',
        user: null,
        placeholder: { id: 'placeholder-1', email: 'placeholder@example.com', full_name: 'Placeholder' },
      },
    ];

    const members = transformGroupMembers(data);

    expect(members).toHaveLength(2);
    expect(members[0].type).toBe('user');
    expect(members[1].type).toBe('placeholder');
  });

  it('should skip invalid entries without user or placeholder', () => {
    const data = [
      {
        user_id: null,
        placeholder_id: null,
        user: null,
        placeholder: null,
      },
    ];

    const members = transformGroupMembers(data);

    expect(members).toHaveLength(0);
  });

  it('should use email as displayName when full_name is missing for user', () => {
    const data = [
      {
        user_id: 'user-1',
        placeholder_id: null,
        user: { id: 'user-1', email: 'user@example.com', full_name: null, avatar_url: null },
        placeholder: null,
      },
    ];

    const members = transformGroupMembers(data);

    expect(members[0].displayName).toBe('user@example.com');
  });

  /**
   * Generate meeting attendees (simulating handleCreate logic)
   */
  function generateAttendees(
    meetingId: string,
    selectedMemberIds: string[],
    groupMembers: InvitableMember[]
  ) {
    return selectedMemberIds
      .map(memberId => {
        const member = groupMembers.find(m => m.id === memberId);
        if (!member) return null;

        if (member.type === 'user') {
          return {
            meeting_id: meetingId,
            user_id: memberId,
            placeholder_id: null,
            status: 'invited' as const,
          };
        } else {
          return {
            meeting_id: meetingId,
            user_id: null,
            placeholder_id: memberId,
            status: 'invited' as const,
          };
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  }

  it('should generate correct attendee record for regular user', () => {
    const groupMembers: InvitableMember[] = [
      { id: 'user-1', type: 'user', displayName: 'John', email: 'john@example.com' },
    ];

    const attendees = generateAttendees('meeting-1', ['user-1'], groupMembers);

    expect(attendees).toHaveLength(1);
    expect(attendees[0]).toEqual({
      meeting_id: 'meeting-1',
      user_id: 'user-1',
      placeholder_id: null,
      status: 'invited',
    });
  });

  it('should generate correct attendee record for placeholder', () => {
    const groupMembers: InvitableMember[] = [
      { id: 'placeholder-1', type: 'placeholder', displayName: 'Placeholder', email: 'placeholder@example.com' },
    ];

    const attendees = generateAttendees('meeting-1', ['placeholder-1'], groupMembers);

    expect(attendees).toHaveLength(1);
    expect(attendees[0]).toEqual({
      meeting_id: 'meeting-1',
      user_id: null,
      placeholder_id: 'placeholder-1',
      status: 'invited',
    });
  });

  it('should handle mixed selection of users and placeholders', () => {
    const groupMembers: InvitableMember[] = [
      { id: 'user-1', type: 'user', displayName: 'John', email: 'john@example.com' },
      { id: 'placeholder-1', type: 'placeholder', displayName: 'Placeholder', email: 'placeholder@example.com' },
    ];

    const attendees = generateAttendees('meeting-1', ['user-1', 'placeholder-1'], groupMembers);

    expect(attendees).toHaveLength(2);
    expect(attendees[0].user_id).toBe('user-1');
    expect(attendees[0].placeholder_id).toBeNull();
    expect(attendees[1].user_id).toBeNull();
    expect(attendees[1].placeholder_id).toBe('placeholder-1');
  });

  it('should skip invalid member IDs', () => {
    const groupMembers: InvitableMember[] = [
      { id: 'user-1', type: 'user', displayName: 'John', email: 'john@example.com' },
    ];

    const attendees = generateAttendees('meeting-1', ['user-1', 'non-existent-id'], groupMembers);

    expect(attendees).toHaveLength(1);
    expect(attendees[0].user_id).toBe('user-1');
  });
});
