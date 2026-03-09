/**
 * Centralized date/time formatting utilities.
 *
 * Convention: every function takes a Date (or ISO string) and an optional
 * IANA timezone. This mirrors the server-side helpers in
 * supabase/functions/_shared/html-utils.ts so the same formats appear
 * everywhere.
 */

// ── Date formatters ─────────────────────────────────────────────────

/** "Monday, March 15, 2026" */
export function formatDate(date: string | Date, timezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  if (timezone) opts.timeZone = timezone;
  return new Date(date).toLocaleDateString('en-US', opts);
}

/** "Mon, Mar 15, 2026" */
export function formatDateShort(date: string | Date, timezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  if (timezone) opts.timeZone = timezone;
  return new Date(date).toLocaleDateString('en-US', opts);
}

/** "MAR" (uppercase month abbreviation) */
export function formatMonthAbbrev(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

/** Day of month number (e.g. 15) */
export function formatDayOfMonth(date: string | Date): number {
  return new Date(date).getDate();
}

/** "Monday, March 15" (no year — used in event creation / email preview) */
export function formatDateNoYear(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** "2026-03-15" (for HTML date inputs) */
export function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Time formatters ─────────────────────────────────────────────────

/** "2:30 PM" */
export function formatTime(date: string | Date, timezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  if (timezone) opts.timeZone = timezone;
  return new Date(date).toLocaleTimeString('en-US', opts);
}

/** "EST", "PST", etc. */
export function formatTimezoneShort(date: string | Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date(date));
  return parts.find((p) => p.type === 'timeZoneName')?.value || '';
}

// ── Relative time ───────────────────────────────────────────────────

/** "just now", "5m ago", "2h ago", "3d ago", or locale date string */
export function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
