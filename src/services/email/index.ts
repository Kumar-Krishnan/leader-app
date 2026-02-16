import { EmailService } from './types';
import { SupabaseEmailService } from './supabaseEmailService';

export const emailService: EmailService = new SupabaseEmailService();
export type { EmailService, SendMeetingEmailParams, SendInviteEmailParams, SendGroupEmailParams } from './types';
