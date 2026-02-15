/**
 * HTML utility functions for Edge Functions
 * Provides HTML escaping and template helpers
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert newlines to <br> tags (after escaping)
 */
export function nl2br(text: string | null | undefined): string {
  if (!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br>');
}

/**
 * Format a date for display
 */
export function formatDate(isoDate: string, timezone?: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date in short form (e.g., "March 15")
 */
export function formatDateShort(isoDate: string, timezone?: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time for display
 */
export function formatTime(isoDate: string, timezone?: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  };
  return date.toLocaleTimeString('en-US', options);
}

/**
 * Get short timezone label for display (e.g., "EST", "PST")
 */
export function formatTimezoneShort(isoDate: string, timezone: string): string {
  const date = new Date(isoDate);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value || '';
}

/**
 * Generate a secure random token (64-character hex string)
 */
export function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Common HTML head section with responsive meta tags
 */
export function htmlHead(title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #111827;
      line-height: 1.5;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: #4F46E5;
      padding: 24px 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
    }
    .content {
      padding: 32px;
    }
    .meeting-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 24px;
      color: #111827;
    }
    .detail-row {
      display: flex;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .detail-icon {
      font-size: 18px;
      width: 32px;
      flex-shrink: 0;
    }
    .detail-content {
      flex: 1;
    }
    .detail-label {
      font-size: 12px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value {
      font-size: 16px;
      font-weight: 500;
      margin-top: 2px;
    }
    .form-group {
      margin-bottom: 24px;
    }
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .form-group textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 100px;
    }
    .form-group textarea:focus {
      outline: none;
      border-color: #4F46E5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    .form-group .hint {
      font-size: 12px;
      color: #6B7280;
      margin-top: 4px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      width: 100%;
    }
    .btn-primary {
      background-color: #4F46E5;
      color: #ffffff;
    }
    .btn-primary:hover {
      background-color: #4338CA;
    }
    .btn-primary:disabled {
      background-color: #9CA3AF;
      cursor: not-allowed;
    }
    .alert {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .alert-error {
      background-color: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }
    .alert-success {
      background-color: #D1FAE5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }
    .message-box {
      background-color: #EEF2FF;
      border-left: 4px solid #4F46E5;
      padding: 16px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
    }
    .message-box-label {
      font-size: 12px;
      color: #4F46E5;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 32px;
      text-align: center;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
`.trim();
}

/**
 * Common HTML closing tags
 */
export function htmlFooter(): string {
  return `
</body>
</html>
`.trim();
}
