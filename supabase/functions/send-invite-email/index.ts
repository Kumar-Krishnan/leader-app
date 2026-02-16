/**
 * Send Invite Email Edge Function
 *
 * Sends an invitation email to a new placeholder member via SendGrid.
 * Only group leaders, leader-helpers, and admins can send invites.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface InviteEmailRequest {
  groupId: string;
  inviteeName: string;
  inviteeEmail: string;
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
 * Generate HTML email content for invite
 */
function generateInviteHtml(inviteeName: string, senderName: string, groupName: string, appUrl: string): string {
  const safeName = escapeHtml(inviteeName);
  const safeSender = escapeHtml(senderName);
  const safeGroup = escapeHtml(groupName);
  const safeAppUrl = escapeHtml(appUrl);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to join ${safeGroup}</title>
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
                You're invited
              </p>
              <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 28px; font-weight: 700;">
                Join ${safeGroup}
              </h2>

              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${safeName}, ${safeSender} has invited you to join <strong>${safeGroup}</strong>. Click below to get started.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${safeAppUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Join ${safeGroup}
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
function generateInviteText(inviteeName: string, senderName: string, groupName: string, appUrl: string): string {
  let text = `Hi ${inviteeName},\n\n`;
  text += `${senderName} has invited you to join ${groupName}.\n\n`;
  text += `Get started here: ${appUrl}\n`;
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
    const body: InviteEmailRequest = await req.json();

    if (!body.groupId || !body.inviteeEmail || !body.inviteeName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: groupId, inviteeName, inviteeEmail' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the caller is a leader-helper, leader, or admin in this group
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
        JSON.stringify({ error: 'Permission denied: only leaders of this group can send invite emails' }),
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

    const fromEmail = senderEmail || defaultFromEmail;
    const appUrl = Deno.env.get('APP_URL') || 'https://leader-app.netlify.app';

    const htmlContent = generateInviteHtml(body.inviteeName, senderName, groupName, appUrl);
    const textContent = generateInviteText(body.inviteeName, senderName, groupName, appUrl);

    // SendGrid API request
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
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
                email: body.inviteeEmail,
                name: body.inviteeName,
              },
            ],
          },
        ],
        from: {
          email: fromEmail,
          name: senderName,
        },
        subject: `You've been invited to join ${groupName}`,
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
        message: `Invite email sent to ${body.inviteeEmail}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending invite email:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to send invite email',
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
