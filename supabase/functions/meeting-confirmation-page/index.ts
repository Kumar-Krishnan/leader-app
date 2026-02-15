/**
 * Meeting Confirmation Page Edge Function
 *
 * Serves an HTML page for leaders to review and confirm meeting reminders.
 * GET: Renders the confirmation form
 * POST: Processes confirmation and sends emails to attendees
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  escapeHtml,
  nl2br,
  formatDate,
  formatDateShort,
  formatTime,
  formatTimezoneShort,
  htmlHead,
  htmlFooter,
} from '../_shared/html-utils.ts';

// Content limits
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 2000;

interface TokenRecord {
  id: string;
  meeting_id: string;
  leader_id: string;
  token: string;
  reminder_sent_at: string | null;
  confirmed_at: string | null;
  attendee_email_sent_at: string | null;
  custom_description: string | null;
  custom_message: string | null;
  expires_at: string;
}

interface MeetingData {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  group_id: string;
  created_by: string;
  timezone: string | null;
  groups: { name: string; timezone: string | null };
  profiles: { email: string; full_name: string | null };
  resolvedTimezone: string;
}

interface Attendee {
  user_id: string | null;
  placeholder_id: string | null;
  profiles: { email: string; full_name: string | null } | null;
  placeholder_profiles: { email: string; full_name: string } | null;
}

/**
 * Render the confirmation form page
 */
function renderConfirmationForm(
  meeting: MeetingData,
  attendeeCount: number,
  error?: string
): string {
  const tz = meeting.resolvedTimezone;
  const formattedDate = formatDate(meeting.date, tz);
  const formattedTime = formatTime(meeting.date, tz);
  const tzShort = formatTimezoneShort(meeting.date, tz);
  const groupName = meeting.groups.name;
  const leaderName = meeting.profiles.full_name || 'Meeting Leader';

  return `
${htmlHead(`Confirm Reminder: ${meeting.title}`)}
  <div class="container">
    <div class="header">
      <h1>Send Meeting Reminder</h1>
    </div>
    <div class="content">
      ${error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : ''}

      <h2 class="meeting-title">${escapeHtml(meeting.title)}</h2>

      <div class="detail-row">
        <span class="detail-icon">&#128197;</span>
        <div class="detail-content">
          <span class="detail-label">Date</span>
          <div class="detail-value">${formattedDate}</div>
        </div>
      </div>

      <div class="detail-row">
        <span class="detail-icon">&#128336;</span>
        <div class="detail-content">
          <span class="detail-label">Time</span>
          <div class="detail-value">${formattedTime} ${tzShort}</div>
        </div>
      </div>

      ${
        meeting.location
          ? `
      <div class="detail-row">
        <span class="detail-icon">&#128205;</span>
        <div class="detail-content">
          <span class="detail-label">Location</span>
          <div class="detail-value">${escapeHtml(meeting.location)}</div>
        </div>
      </div>
      `
          : ''
      }

      <div class="detail-row">
        <span class="detail-icon">&#128101;</span>
        <div class="detail-content">
          <span class="detail-label">Attendees</span>
          <div class="detail-value">${attendeeCount} people will receive this reminder</div>
        </div>
      </div>

      <form method="POST" style="margin-top: 32px;">
        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            name="description"
            maxlength="${MAX_DESCRIPTION_LENGTH}"
            placeholder="Add details about the meeting..."
          >${escapeHtml(meeting.description || '')}</textarea>
          <p class="hint">This will appear in the reminder email. You can edit the description above.</p>
        </div>

        <div class="form-group">
          <label for="message">Personal Message (Optional)</label>
          <textarea
            id="message"
            name="message"
            maxlength="${MAX_MESSAGE_LENGTH}"
            placeholder="Add a personal note to attendees..."
            style="min-height: 80px;"
          ></textarea>
          <p class="hint">Add a personal note that will be highlighted in the email.</p>
        </div>

        <button type="submit" class="btn btn-primary">
          Confirm &amp; Send to ${attendeeCount} Attendee${attendeeCount !== 1 ? 's' : ''}
        </button>
      </form>
    </div>
    <div class="footer">
      Sent by ${escapeHtml(leaderName)} via ${escapeHtml(groupName)}
    </div>
  </div>
${htmlFooter()}
  `.trim();
}

/**
 * Render success page after emails are sent
 */
function renderSuccessPage(
  meeting: MeetingData,
  attendeeCount: number
): string {
  const formattedDate = formatDate(meeting.date, meeting.resolvedTimezone);
  const groupName = meeting.groups.name;

  return `
${htmlHead('Reminder Sent!')}
  <div class="container">
    <div class="header">
      <h1>Reminder Sent!</h1>
    </div>
    <div class="content" style="text-align: center;">
      <div style="font-size: 64px; margin-bottom: 24px;">&#9989;</div>
      <h2 class="meeting-title">${escapeHtml(meeting.title)}</h2>
      <p style="color: #6B7280; font-size: 16px; margin-bottom: 24px;">
        ${formattedDate}
      </p>
      <div class="alert alert-success">
        Your reminder has been sent to ${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}.
      </div>
      <p style="color: #374151; font-size: 14px; margin-top: 24px;">
        You can close this page now.
      </p>
    </div>
    <div class="footer">
      ${escapeHtml(groupName)}
    </div>
  </div>
${htmlFooter()}
  `.trim();
}

/**
 * Render error page
 */
function renderErrorPage(title: string, message: string): string {
  return `
${htmlHead(title)}
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="content" style="text-align: center;">
      <div style="font-size: 64px; margin-bottom: 24px;">&#10060;</div>
      <div class="alert alert-error">
        ${escapeHtml(message)}
      </div>
      <p style="color: #374151; font-size: 14px; margin-top: 24px;">
        Please contact the meeting organizer if you need assistance.
      </p>
    </div>
  </div>
${htmlFooter()}
  `.trim();
}

/**
 * Generate attendee reminder email HTML
 */
function generateAttendeeEmailHtml(
  meeting: MeetingData,
  customDescription: string | null,
  customMessage: string | null
): string {
  const tz = meeting.resolvedTimezone;
  const formattedDate = formatDate(meeting.date, tz);
  const formattedTime = formatTime(meeting.date, tz);
  const tzShort = formatTimezoneShort(meeting.date, tz);
  const groupName = meeting.groups.name;
  const leaderName = meeting.profiles.full_name || 'Meeting Leader';
  const description = customDescription || meeting.description;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meeting.title)}</title>
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
                ${escapeHtml(groupName)}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                Reminder
              </p>
              <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 28px; font-weight: 700;">
                ${escapeHtml(meeting.title)}
              </h2>

              ${
                customMessage
                  ? `
              <!-- Personal Message -->
              <div style="background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 8px 0; color: #4F46E5; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                  Message from ${escapeHtml(leaderName)}
                </p>
                <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  ${nl2br(customMessage)}
                </p>
              </div>
              `
                  : ''
              }

              <!-- Meeting Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 18px;">&#128197;</span>
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
                          <span style="font-size: 18px;">&#128336;</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Time</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${formattedTime} ${tzShort}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${
                  meeting.location
                    ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 18px;">&#128205;</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Location</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${escapeHtml(meeting.location)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : ''
                }
              </table>

              ${
                description
                  ? `
              <!-- Description -->
              <div style="margin-bottom: 32px;">
                <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Details</p>
                <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  ${nl2br(description)}
                </p>
              </div>
              `
                  : ''
              }

              <!-- CTA -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <p style="margin: 0; color: #6B7280; font-size: 14px;">
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
                Sent by ${escapeHtml(leaderName)} via ${escapeHtml(groupName)}
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
 * Generate attendee reminder email plain text
 */
function generateAttendeeEmailText(
  meeting: MeetingData,
  customDescription: string | null,
  customMessage: string | null
): string {
  const tz = meeting.resolvedTimezone;
  const formattedDate = formatDate(meeting.date, tz);
  const formattedTime = formatTime(meeting.date, tz);
  const tzShort = formatTimezoneShort(meeting.date, tz);
  const groupName = meeting.groups.name;
  const leaderName = meeting.profiles.full_name || 'Meeting Leader';
  const description = customDescription || meeting.description;

  let text = `REMINDER: ${meeting.title}\n\n`;

  if (customMessage) {
    text += `Message from ${leaderName}:\n"${customMessage}"\n\n`;
  }

  text += `Date: ${formattedDate}\n`;
  text += `Time: ${formattedTime} ${tzShort}\n`;
  if (meeting.location) {
    text += `Location: ${meeting.location}\n`;
  }

  if (description) {
    text += `\nDetails:\n${description}\n`;
  }

  text += `\nOpen the app to RSVP and see more details.\n`;
  text += `\n---\nSent by ${leaderName} via ${groupName}`;

  return text;
}

/** Helper to return JSON or HTML error */
function errorResponse(
  req: Request,
  status: number,
  title: string,
  message: string
): Response {
  const wantsJson = req.headers.get('accept')?.includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(renderErrorPage(title, message), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return errorResponse(req, 400, 'Invalid Link', 'No token provided.');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('meeting_reminder_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return errorResponse(req, 404, 'Invalid Link', 'This link is invalid or has expired.');
    }

    const typedToken = tokenRecord as TokenRecord;

    // Check if token is expired
    if (new Date(typedToken.expires_at) < new Date()) {
      return errorResponse(req, 410, 'Link Expired', 'This link has expired. Please contact the meeting organizer.');
    }

    // Check if already confirmed
    if (typedToken.confirmed_at) {
      return errorResponse(req, 409, 'Already Sent', 'The reminder for this meeting has already been sent.');
    }

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(
        `
        id,
        title,
        description,
        date,
        location,
        group_id,
        created_by,
        timezone,
        groups!inner(name, timezone),
        profiles!meetings_created_by_fkey(email, full_name)
      `
      )
      .eq('id', typedToken.meeting_id)
      .single();

    if (meetingError || !meeting) {
      return errorResponse(req, 404, 'Meeting Not Found', 'The meeting associated with this link no longer exists.');
    }

    const rawMeeting = meeting as unknown as MeetingData;
    const resolvedTimezone = rawMeeting.timezone || rawMeeting.groups.timezone || 'America/New_York';
    const typedMeeting: MeetingData = { ...rawMeeting, resolvedTimezone };

    // Check if meeting is still in the future
    if (new Date(typedMeeting.date) < new Date()) {
      return errorResponse(req, 410, 'Meeting Passed', 'This meeting has already occurred.');
    }

    // Fetch attendees with profiles (real users) and placeholder_profiles (placeholders)
    const { data: attendees, error: attendeesError } = await supabase
      .from('meeting_attendees')
      .select(
        `
        user_id,
        placeholder_id,
        profiles(email, full_name),
        placeholder_profiles(email, full_name)
      `
      )
      .eq('meeting_id', typedMeeting.id)
      .in('status', ['invited', 'accepted']);

    if (attendeesError) {
      console.error('Error fetching attendees:', attendeesError);
      throw attendeesError;
    }

    const typedAttendees = (attendees || []) as unknown as Attendee[];
    const attendeeCount = typedAttendees.length;

    // Build recipients from whichever profile exists (real user or placeholder)
    const recipients = typedAttendees
      .map((a) => {
        const email = a.profiles?.email || a.placeholder_profiles?.email;
        const name = a.profiles?.full_name || a.placeholder_profiles?.full_name || null;
        return email ? { email, name } : null;
      })
      .filter((r): r is { email: string; name: string | null } => r !== null);

    console.log(`Meeting ${typedMeeting.id}: ${attendeeCount} attendees, ${recipients.length} with email`);

    const wantsJson = req.headers.get('accept')?.includes('application/json');
    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

    // Handle GET request
    if (req.method === 'GET') {
      if (wantsJson) {
        return new Response(
          JSON.stringify({
            meeting: {
              id: typedMeeting.id,
              title: typedMeeting.title,
              description: typedMeeting.description,
              date: typedMeeting.date,
              location: typedMeeting.location,
            },
            groupName: typedMeeting.groups.name,
            leaderName: typedMeeting.profiles.full_name || 'Meeting Leader',
            attendeeCount,
            resolvedTimezone,
          }),
          { status: 200, headers: jsonHeaders }
        );
      }
      return new Response(renderConfirmationForm(typedMeeting, attendeeCount), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Handle POST request - process confirmation
    if (req.method === 'POST') {
      let customDescription: string | null = null;
      let customMessage: string | null = null;

      // Support both JSON and form data
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json();
        customDescription = body.description || null;
        customMessage = body.message || null;
      } else {
        const formData = await req.formData();
        customDescription = formData.get('description') as string | null;
        customMessage = formData.get('message') as string | null;
      }

      // Trim and validate content
      customDescription = customDescription?.trim() || null;
      customMessage = customMessage?.trim() || null;

      // Enforce content limits
      if (customDescription && customDescription.length > MAX_DESCRIPTION_LENGTH) {
        customDescription = customDescription.substring(0, MAX_DESCRIPTION_LENGTH);
      }
      if (customMessage && customMessage.length > MAX_MESSAGE_LENGTH) {
        customMessage = customMessage.substring(0, MAX_MESSAGE_LENGTH);
      }

      // Check again if already confirmed (race condition protection)
      const { data: currentToken } = await supabase
        .from('meeting_reminder_tokens')
        .select('confirmed_at')
        .eq('id', typedToken.id)
        .single();

      if (currentToken?.confirmed_at) {
        return errorResponse(req, 409, 'Already Sent', 'The reminder for this meeting has already been sent.');
      }

      // Update token with custom content and confirmed_at
      const { error: updateError } = await supabase
        .from('meeting_reminder_tokens')
        .update({
          custom_description: customDescription,
          custom_message: customMessage,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', typedToken.id);

      if (updateError) {
        console.error('Error updating token:', updateError);
        throw updateError;
      }

      // Send emails to attendees with valid email addresses
      if (recipients.length > 0) {
        const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
        const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
        const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Leader App';

        if (!sendgridApiKey || !fromEmail) {
          throw new Error('Missing SendGrid configuration');
        }

        const htmlContent = generateAttendeeEmailHtml(
          typedMeeting,
          customDescription,
          customMessage
        );
        const textContent = generateAttendeeEmailText(
          typedMeeting,
          customDescription,
          customMessage
        );

        const dateShort = formatDateShort(typedMeeting.date, typedMeeting.resolvedTimezone);

        // Build personalizations for each recipient
        const personalizations = recipients.map((recipient) => ({
          to: [
            {
              email: recipient.email,
              name: recipient.name || undefined,
            },
          ],
        }));

        // Send via SendGrid
        const sendgridResponse = await fetch(
          'https://api.sendgrid.com/v3/mail/send',
          {
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
              subject: `Reminder: "${typedMeeting.title}" - ${dateShort}`,
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
          }
        );

        if (!sendgridResponse.ok) {
          const errorBody = await sendgridResponse.text();
          console.error('SendGrid error:', sendgridResponse.status, errorBody);

          // Roll back confirmed_at
          await supabase
            .from('meeting_reminder_tokens')
            .update({ confirmed_at: null })
            .eq('id', typedToken.id);

          if (wantsJson) {
            return new Response(
              JSON.stringify({ error: 'Failed to send emails. Please try again.' }),
              { status: 500, headers: jsonHeaders }
            );
          }
          return new Response(
            renderConfirmationForm(typedMeeting, attendeeCount, 'Failed to send emails. Please try again.'),
            { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }

        // Update token with attendee_email_sent_at
        await supabase
          .from('meeting_reminder_tokens')
          .update({ attendee_email_sent_at: new Date().toISOString() })
          .eq('id', typedToken.id);

      }

      const emailsSent = recipients.length;
      console.log(`Meeting ${typedMeeting.id}: sent ${emailsSent} of ${attendeeCount} emails`);

      if (wantsJson) {
        return new Response(
          JSON.stringify({ success: true, attendeeCount: emailsSent }),
          { status: 200, headers: jsonHeaders }
        );
      }
      return new Response(renderSuccessPage(typedMeeting, emailsSent), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Method not allowed
    return errorResponse(req, 405, 'Method Not Allowed', 'Invalid request method.');
  } catch (error) {
    console.error('Error in meeting-confirmation-page:', error);

    const wantsJson = req.headers.get('accept')?.includes('application/json');
    if (wantsJson) {
      return new Response(
        JSON.stringify({ error: 'An unexpected error occurred. Please try again later.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      renderErrorPage('Error', 'An unexpected error occurred. Please try again later.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});
