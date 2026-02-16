import { supabase } from '../../lib/supabase';
import { EmailService, SendMeetingEmailParams, SendInviteEmailParams, SendGroupEmailParams } from './types';

export class SupabaseEmailService implements EmailService {
  async sendMeetingEmail(
    params: SendMeetingEmailParams
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke(
      'send-meeting-email',
      { body: params }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  }

  async sendInviteEmail(
    params: SendInviteEmailParams
  ): Promise<{ success: boolean; error?: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    console.log('[sendInviteEmail] token:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');

    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    console.log('[sendInviteEmail] url:', url);
    console.log('[sendInviteEmail] anonKey prefix:', anonKey?.substring(0, 20));

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey!,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    const text = await resp.text();
    console.log('[sendInviteEmail] status:', resp.status, 'body:', text);

    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${text}` };
    }

    const data = JSON.parse(text);
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  }

  async sendGroupEmail(
    params: SendGroupEmailParams
  ): Promise<{ success: boolean; error?: string; recipientCount?: number }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-group-email`;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey!,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${text}` };
    }

    const data = JSON.parse(text);
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true, recipientCount: data?.recipientCount };
  }
}
