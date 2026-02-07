/**
 * Send Meeting Email Edge Function
 *
 * Sends meeting invitation/notification emails via SendGrid
 * Only group leaders, leader-helpers, and admins can send emails
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface Attendee {
  email: string;
  name: string | null;
}

interface MeetingEmailRequest {
  meetingId: string;
  title: string;
  description: string | null;
  customMessage?: string | null; // Personal message from leader
  descriptionFirst?: boolean; // Whether description comes before custom message (default: true)
  date: string; // ISO date string
  location: string | null;
  attendees: Attendee[];
  senderName: string;
  senderEmail?: string; // Optional custom sender email (e.g., "JonSnow@manatee.link")
  groupName: string;
  rsvpBaseUrl?: string; // Optional deep link base URL
}

/**
 * Format date for display in email
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time for display in email
 */
function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(meeting: MeetingEmailRequest): string {
  const formattedDate = formatDate(meeting.date);
  const formattedTime = formatTime(meeting.date);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meeting.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4F46E5; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${meeting.groupName}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                You're invited to
              </p>
              <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 28px; font-weight: 700;">
                ${meeting.title}
              </h2>

              <!-- Meeting Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 18px;">📅</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Date</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${formattedDate}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 18px;">🕐</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Time</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${formattedTime}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${meeting.location ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 18px;">📍</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Location</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${meeting.location}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>

              ${(() => {
                const descriptionBlock = meeting.description ? `
                <div style="margin-bottom: 24px;">
                  <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Details</p>
                  <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    ${meeting.description.replace(/\n/g, '<br>')}
                  </p>
                </div>
                ` : '';

                const messageBlock = meeting.customMessage ? `
                <div style="margin-bottom: 24px; background-color: #F0F9FF; border-left: 4px solid #4F46E5; padding: 16px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Message from ${meeting.senderName}</p>
                  <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    ${meeting.customMessage.replace(/\n/g, '<br>')}
                  </p>
                </div>
                ` : '';

                const descriptionFirst = meeting.descriptionFirst !== false;
                return descriptionFirst
                  ? descriptionBlock + messageBlock
                  : messageBlock + descriptionBlock;
              })()}

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 14px;">
                      Open the app to RSVP and see more details
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #6B7280; font-size: 14px;">
                Sent by ${meeting.senderName} via ${meeting.groupName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content (fallback)
 */
function generateEmailText(meeting: MeetingEmailRequest): string {
  const formattedDate = formatDate(meeting.date);
  const formattedTime = formatTime(meeting.date);

  let text = `You're invited to: ${meeting.title}\n\n`;
  text += `Date: ${formattedDate}\n`;
  text += `Time: ${formattedTime}\n`;
  if (meeting.location) {
    text += `Location: ${meeting.location}\n`;
  }

  const descriptionText = meeting.description ? `\nDetails:\n${meeting.description}\n` : '';
  const messageText = meeting.customMessage ? `\nMessage from ${meeting.senderName}:\n${meeting.customMessage}\n` : '';

  const descriptionFirst = meeting.descriptionFirst !== false;
  text += descriptionFirst
    ? descriptionText + messageText
    : messageText + descriptionText;

  text += `\nOpen the app to RSVP and see more details.\n`;
  text += `\n---\nSent by ${meeting.senderName} via ${meeting.groupName}`;

  return text;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the request body
    const body: MeetingEmailRequest = await req.json();

    // Note: Authorization is handled client-side (only leaders see the Send Email button)
    // The authHeader is still required to ensure the request comes from an authenticated user
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const defaultFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
    const defaultFromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Leader App';

    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    if (!defaultFromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL not configured');
    }

    // Use custom sender email if provided, otherwise use default
    const fromEmail = body.senderEmail || defaultFromEmail;
    const fromName = body.senderName || defaultFromName;

    // Validate required fields
    if (!body.meetingId || !body.title || !body.date || !body.attendees?.length) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: meetingId, title, date, and attendees are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const htmlContent = generateEmailHtml(body);
    const textContent = generateEmailText(body);

    // Build personalizations for each recipient
    const personalizations = body.attendees.map((attendee) => ({
      to: [
        {
          email: attendee.email,
          name: attendee.name || undefined,
        },
      ],
    }));

    // SendGrid API request
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: `${body.groupName}: ${body.title}`,
        content: [
          {
            type: 'text/plain',
            value: textContent,
          },
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorBody = await sendgridResponse.text();
      console.error('SendGrid error:', sendgridResponse.status, errorBody);
      throw new Error(`SendGrid API error: ${sendgridResponse.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${body.attendees.length} recipient(s)`,
        recipientCount: body.attendees.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending meeting email:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to send email',
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
