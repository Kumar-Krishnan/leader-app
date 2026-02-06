/**
 * Generate Meeting Reminders Edge Function
 *
 * Scheduled daily via GitHub Actions to:
 * 1. Find meetings ~2 days from now
 * 2. Generate secure tokens for leaders
 * 3. Send reminder emails to leaders with confirmation links
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  generateSecureToken,
  formatDate,
  formatDateShort,
  formatTime,
  escapeHtml,
} from '../_shared/html-utils.ts';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  group_id: string;
  created_by: string;
}

interface MeetingWithDetails extends Meeting {
  group: { name: string };
  leader: { email: string; full_name: string | null };
  attendee_count: number;
}

/**
 * Generate HTML email for leader reminder
 */
function generateLeaderReminderHtml(
  meeting: MeetingWithDetails,
  confirmationUrl: string
): string {
  const formattedDate = formatDate(meeting.date);
  const formattedTime = formatTime(meeting.date);
  const dateShort = formatDateShort(meeting.date);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Meeting Reminder</title>
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
                Meeting Reminder
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
                Your meeting is coming up in 2 days
              </p>
              <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 28px; font-weight: 700;">
                ${escapeHtml(meeting.title)}
              </h2>

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
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${formattedTime}</p>
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
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 18px;">&#128101;</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase;">Attendees</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 500;">${meeting.attendee_count} people invited</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Click the button below to review the meeting details and send a reminder to all attendees. You'll be able to customize the message before it's sent.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Review &amp; Send Reminder
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                This link expires in 7 days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #6B7280; font-size: 14px;">
                Sent via ${escapeHtml(meeting.group.name)}
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
 * Generate plain text email for leader reminder
 */
function generateLeaderReminderText(
  meeting: MeetingWithDetails,
  confirmationUrl: string
): string {
  const formattedDate = formatDate(meeting.date);
  const formattedTime = formatTime(meeting.date);

  let text = `Your meeting is coming up in 2 days\n\n`;
  text += `${meeting.title}\n\n`;
  text += `Date: ${formattedDate}\n`;
  text += `Time: ${formattedTime}\n`;
  if (meeting.location) {
    text += `Location: ${meeting.location}\n`;
  }
  text += `Attendees: ${meeting.attendee_count} people invited\n\n`;
  text += `Click the link below to review the meeting details and send a reminder to all attendees:\n\n`;
  text += `${confirmationUrl}\n\n`;
  text += `This link expires in 7 days.\n\n`;
  text += `---\nSent via ${meeting.group.name}`;

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
    // Initialize Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
    const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Leader App';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!sendgridApiKey || !fromEmail) {
      throw new Error('Missing SendGrid configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the time window for meetings ~2 days from now
    // We use a 2-hour window (47-49 hours) to account for scheduler timing variations
    const now = new Date();
    const targetStart = new Date(now.getTime() + 47 * 60 * 60 * 1000); // 47 hours from now
    const targetEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000); // 49 hours from now

    console.log(
      `Looking for meetings between ${targetStart.toISOString()} and ${targetEnd.toISOString()}`
    );

    // Find meetings in the target window that don't have a reminder sent yet
    const { data: meetings, error: meetingsError } = await supabase
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
        groups!inner(name),
        profiles!meetings_created_by_fkey(email, full_name)
      `
      )
      .gte('date', targetStart.toISOString())
      .lte('date', targetEnd.toISOString())
      .not('created_by', 'is', null);

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError);
      throw meetingsError;
    }

    if (!meetings || meetings.length === 0) {
      console.log('No meetings found in target window');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No meetings found in target window',
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${meetings.length} meetings to process`);

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const meeting of meetings) {
      try {
        // Check if token already exists for this meeting
        const { data: existingToken } = await supabase
          .from('meeting_reminder_tokens')
          .select('id, reminder_sent_at')
          .eq('meeting_id', meeting.id)
          .single();

        if (existingToken?.reminder_sent_at) {
          console.log(
            `Skipping meeting ${meeting.id}: reminder already sent`
          );
          skipped++;
          continue;
        }

        // Get attendee count
        const { count: attendeeCount } = await supabase
          .from('meeting_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('meeting_id', meeting.id)
          .in('status', ['invited', 'accepted']);

        // Generate secure token
        const token = generateSecureToken();
        const expiresAt = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(); // 7 days

        // Create or update token record
        const tokenData = {
          meeting_id: meeting.id,
          leader_id: meeting.created_by,
          token,
          expires_at: expiresAt,
          reminder_sent_at: null as string | null,
        };

        let tokenRecord;
        if (existingToken) {
          // Update existing token
          const { data, error } = await supabase
            .from('meeting_reminder_tokens')
            .update({ token, expires_at: expiresAt })
            .eq('id', existingToken.id)
            .select()
            .single();

          if (error) throw error;
          tokenRecord = data;
        } else {
          // Insert new token
          const { data, error } = await supabase
            .from('meeting_reminder_tokens')
            .insert(tokenData)
            .select()
            .single();

          if (error) throw error;
          tokenRecord = data;
        }

        // Build confirmation URL
        const confirmationUrl = `${supabaseUrl}/functions/v1/meeting-confirmation-page?token=${token}`;

        // Prepare meeting data for email
        const meetingWithDetails: MeetingWithDetails = {
          ...meeting,
          group: { name: (meeting.groups as { name: string }).name },
          leader: meeting.profiles as { email: string; full_name: string | null },
          attendee_count: attendeeCount || 0,
        };

        // Generate email content
        const htmlContent = generateLeaderReminderHtml(
          meetingWithDetails,
          confirmationUrl
        );
        const textContent = generateLeaderReminderText(
          meetingWithDetails,
          confirmationUrl
        );

        const dateShort = formatDateShort(meeting.date);

        // Send email via SendGrid
        const sendgridResponse = await fetch(
          'https://api.sendgrid.com/v3/mail/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sendgridApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [
                {
                  to: [
                    {
                      email: meetingWithDetails.leader.email,
                      name: meetingWithDetails.leader.full_name || undefined,
                    },
                  ],
                },
              ],
              from: {
                email: fromEmail,
                name: fromName,
              },
              subject: `[Action Required] Confirm reminder for "${meeting.title}" - ${dateShort}`,
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
          console.error(
            `SendGrid error for meeting ${meeting.id}:`,
            sendgridResponse.status,
            errorBody
          );
          throw new Error(`SendGrid API error: ${sendgridResponse.status}`);
        }

        // Update token with reminder_sent_at
        await supabase
          .from('meeting_reminder_tokens')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', tokenRecord.id);

        console.log(
          `Sent reminder for meeting ${meeting.id} to ${meetingWithDetails.leader.email}`
        );
        processed++;
      } catch (error) {
        console.error(`Error processing meeting ${meeting.id}:`, error);
        errors.push(
          `Meeting ${meeting.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} meetings, skipped ${skipped}`,
        processed,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-meeting-reminders:', error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate meeting reminders',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
