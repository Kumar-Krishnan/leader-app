import { supabase } from '../../lib/supabase';
import { EmailService, SendMeetingEmailParams } from './types';

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
}
