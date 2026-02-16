/**
 * Send Group Email Edge Function
 *
 * Sends an email to all members of a group via SendGrid.
 * Only group leaders, leader-helpers, and admins can send.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface GroupEmailRequest {
  groupId: string;
  subject: string;
  message: string;
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
 * Generate HTML email content for group email
 */
function generateGroupEmailHtml(
  subject: string,
  message: string,
  senderName: string,
  groupName: string,
  appUrl: string
): string {
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const safeSender = escapeHtml(senderName);
  const safeGroup = escapeHtml(groupName);
  const safeAppUrl = escapeHtml(appUrl);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
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
                ${safeGroup}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                Message from ${safeSender}
              </p>
              <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 28px; font-weight: 700;">
                ${safeSubject}
              </h2>

              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${safeMessage}
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${safeAppUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Open App
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #6B7280; font-size: 14px;">
                Sent by ${safeSender} via ${safeGroup}
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
function generateGroupEmailText(
  subject: string,
  message: string,
  senderName: string,
  groupName: string,
  appUrl: string
): string {
  let text = `${subject}\n\n`;
  text += `${message}\n\n`;
  text += `Open the app: ${appUrl}\n`;
  text += `\n---\nSent by ${senderName} via ${groupName}`;
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
    // Verify the caller's JWT
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
    const body: GroupEmailRequest = await req.json();

    if (!body.groupId || !body.subject || !body.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: groupId, subject, message' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the caller is a leader, leader-helper, or admin in this group
    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('group_id', body.groupId)
      .in('role', ['leader-helper', 'leader', 'admin'])
      .limit(1)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: only leaders of this group can send group emails' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch group name
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('name')
      .eq('id', body.groupId)
      .single();

    const groupName = group?.name || 'Group';

    // Fetch all group members: real users
    const { data: memberRows, error: membersError } = await supabaseAdmin
      .from('group_members')
      .select('user_id, profiles:user_id(email, full_name)')
      .eq('group_id', body.groupId)
      .neq('user_id', user.id);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      throw new Error('Failed to fetch group members');
    }

    // Fetch placeholder members
    const { data: placeholderRows } = await supabaseAdmin
      .from('group_members')
      .select('placeholder_id, placeholder_profiles:placeholder_id(email, full_name)')
      .eq('group_id', body.groupId)
      .not('placeholder_id', 'is', null);

    // Build recipient list
    const recipients: Array<{ email: string; name: string | null }> = [];

    if (memberRows) {
      for (const row of memberRows) {
        const profile = (row as any).profiles;
        if (profile?.email) {
          recipients.push({
            email: profile.email,
            name: profile.full_name || null,
          });
        }
      }
    }

    if (placeholderRows) {
      for (const row of placeholderRows) {
        const placeholder = (row as any).placeholder_profiles;
        if (placeholder?.email) {
          recipients.push({
            email: placeholder.email,
            name: placeholder.full_name || null,
          });
        }
      }
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No group members with email addresses to send to' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get sender profile
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

    const fromEmail = senderEmail || defaultFromEmail;
    const appUrl = Deno.env.get('APP_URL') || 'https://leader-app.netlify.app';

    const htmlContent = generateGroupEmailHtml(body.subject, body.message, senderName, groupName, appUrl);
    const textContent = generateGroupEmailText(body.subject, body.message, senderName, groupName, appUrl);

    // Build personalizations for each recipient
    const personalizations = recipients.map((recipient) => ({
      to: [
        {
          email: recipient.email,
          name: recipient.name || undefined,
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
        subject: `${groupName}: ${body.subject}`,
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
        message: `Email sent to ${recipients.length} recipient(s)`,
        recipientCount: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending group email:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to send group email',
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
