/**
 * Send Meeting Email Edge Function
 *
 * Sends meeting invitation/notification emails via SendGrid
 * Only group leaders, leader-helpers, and admins can send emails
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface MeetingEmailRequest {
  meetingId: string;
  customMessage?: string | null; // Personal message from leader
  descriptionFirst?: boolean; // Whether description comes before custom message (default: true)
  customDescription?: string | null; // Optional override for meeting description
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format date for display in email
 */
function formatDate(isoDate: string, timezone?: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

/**
 * Format time for display in email
 */
function formatTime(isoDate: string, timezone?: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

/**
 * Get short timezone label for display (e.g., "EST", "PST")
 */
function formatTimezoneShort(isoDate: string, timezone: string): string {
  const date = new Date(isoDate);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value || '';
}

interface EmailData {
  title: string;
  description: string | null;
  customMessage: string | null;
  descriptionFirst: boolean;
  date: string;
  location: string | null;
  senderName: string;
  senderEmail: string;
  groupName: string;
  timezone: string;
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(email: EmailData): string {
  const formattedDate = formatDate(email.date, email.timezone);
  const formattedTime = formatTime(email.date, email.timezone);
  const tzShort = formatTimezoneShort(email.date, email.timezone);

  const safeTitle = escapeHtml(email.title);
  const safeGroupName = escapeHtml(email.groupName);
  const safeSenderName = escapeHtml(email.senderName);
  const safeLocation = email.location ? escapeHtml(email.location) : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
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
                ${safeGroupName}
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
                ${safeTitle}
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
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${formattedTime} ${tzShort}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${safeLocation ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 18px;">📍</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Location</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${safeLocation}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>

              ${(() => {
                const descriptionBlock = email.description ? `
                <div style="margin-bottom: 24px;">
                  <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Details</p>
                  <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    ${escapeHtml(email.description).replace(/\n/g, '<br>')}
                  </p>
                </div>
                ` : '';

                const messageBlock = email.customMessage ? `
                <div style="margin-bottom: 24px; background-color: #F0F9FF; border-left: 4px solid #4F46E5; padding: 16px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Message from ${safeSenderName}</p>
                  <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    ${escapeHtml(email.customMessage).replace(/\n/g, '<br>')}
                  </p>
                </div>
                ` : '';

                const descriptionFirst = email.descriptionFirst !== false;
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
                Sent by ${safeSenderName} via ${safeGroupName}
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
function generateEmailText(email: EmailData): string {
  const formattedDate = formatDate(email.date, email.timezone);
  const formattedTime = formatTime(email.date, email.timezone);
  const tzShort = formatTimezoneShort(email.date, email.timezone);

  let text = `You're invited to: ${email.title}\n\n`;
  text += `Date: ${formattedDate}\n`;
  text += `Time: ${formattedTime} ${tzShort}\n`;
  if (email.location) {
    text += `Location: ${email.location}\n`;
  }

  const descriptionText = email.description ? `\nDetails:\n${email.description}\n` : '';
  const messageText = email.customMessage ? `\nMessage from ${email.senderName}:\n${email.customMessage}\n` : '';

  const descriptionFirst = email.descriptionFirst !== false;
  text += descriptionFirst
    ? descriptionText + messageText
    : messageText + descriptionText;

  text += `\nOpen the app to RSVP and see more details.\n`;
  text += `\n---\nSent by ${email.senderName} via ${email.groupName}`;

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
    // Verify the caller's JWT and extract their identity
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller's JWT using the service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the request body
    const body: MeetingEmailRequest = await req.json();

    if (!body.meetingId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: meetingId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch meeting from DB to get group_id and meeting details
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings')
      .select('id, title, description, date, location, group_id, timezone')
      .eq('id', body.meetingId)
      .single();

    if (meetingError || !meeting) {
      return new Response(
        JSON.stringify({ error: 'Meeting not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the caller is a leader-helper, leader, or admin in THIS meeting's group
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('group_id', meeting.group_id)
      .in('role', ['leader-helper', 'leader', 'admin'])
      .limit(1)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: only leaders of this group can send meeting emails' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch group name and timezone from DB
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('name, timezone')
      .eq('id', meeting.group_id)
      .single();

    const groupName = group?.name || 'Group';
    const resolvedTimezone = meeting.timezone || group?.timezone || 'America/New_York';

    // Fetch attendees from DB (not from client request)
    // Join with profiles to get email/name, exclude the sender
    const { data: attendeeRows, error: attendeesError } = await supabaseAdmin
      .from('meeting_attendees')
      .select('user_id, profiles:user_id(email, full_name)')
      .eq('meeting_id', body.meetingId)
      .neq('user_id', user.id);

    if (attendeesError) {
      console.error('Error fetching attendees:', attendeesError);
      throw new Error('Failed to fetch meeting attendees');
    }

    // Also fetch placeholder attendees (they have placeholder_id instead of user_id linked to profiles)
    const { data: placeholderRows } = await supabaseAdmin
      .from('meeting_attendees')
      .select('placeholder_id, placeholder_profiles:placeholder_id(email, full_name)')
      .eq('meeting_id', body.meetingId)
      .not('placeholder_id', 'is', null);

    // Build attendee list from DB data
    const attendees: Array<{ email: string; name: string | null }> = [];

    // Real users
    if (attendeeRows) {
      for (const row of attendeeRows) {
        const profile = (row as any).profiles;
        if (profile?.email) {
          attendees.push({
            email: profile.email,
            name: profile.full_name || null,
          });
        }
      }
    }

    // Placeholder members
    if (placeholderRows) {
      for (const row of placeholderRows) {
        const placeholder = (row as any).placeholder_profiles;
        if (placeholder?.email) {
          attendees.push({
            email: placeholder.email,
            name: placeholder.full_name || null,
          });
        }
      }
    }

    if (attendees.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No attendees with email addresses to send to' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get sender profile from DB
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const senderName = senderProfile?.full_name || 'Leader';
    const senderEmail = senderName.replace(/\s+/g, '') + '@manatee.link';

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const defaultFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');

    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    if (!defaultFromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL not configured');
    }

    // Use generated sender email, fall back to default
    const fromEmail = senderEmail || defaultFromEmail;

    // Build email data from server-side sources
    const emailData: EmailData = {
      title: meeting.title,
      description: body.customDescription !== undefined && body.customDescription !== null
        ? body.customDescription
        : meeting.description,
      customMessage: body.customMessage || null,
      descriptionFirst: body.descriptionFirst !== false,
      date: meeting.date,
      location: meeting.location,
      senderName,
      senderEmail,
      groupName,
      timezone: resolvedTimezone,
    };

    const htmlContent = generateEmailHtml(emailData);
    const textContent = generateEmailText(emailData);

    // Build personalizations for each recipient
    const personalizations = attendees.map((attendee) => ({
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
          name: senderName,
        },
        subject: `${groupName}: ${meeting.title}`,
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
        message: `Email sent to ${attendees.length} recipient(s)`,
        recipientCount: attendees.length,
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
