export interface SendMeetingEmailParams {
  meetingId: string;
  customMessage?: string | null;
  descriptionFirst?: boolean;
  customDescription?: string | null;
}

export interface SendInviteEmailParams {
  groupId: string;
  inviteeName: string;
  inviteeEmail: string;
}

export interface SendGroupEmailParams {
  groupId: string;
  subject: string;
  message: string;
}

export interface EmailService {
  sendMeetingEmail(
    params: SendMeetingEmailParams
  ): Promise<{ success: boolean; error?: string }>;
  sendInviteEmail(
    params: SendInviteEmailParams
  ): Promise<{ success: boolean; error?: string }>;
  sendGroupEmail(
    params: SendGroupEmailParams
  ): Promise<{ success: boolean; error?: string; recipientCount?: number }>;
}
