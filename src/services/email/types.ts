export interface SendMeetingEmailParams {
  meetingId: string;
  customMessage?: string | null;
  descriptionFirst?: boolean;
  customDescription?: string | null;
}

export interface EmailService {
  sendMeetingEmail(
    params: SendMeetingEmailParams
  ): Promise<{ success: boolean; error?: string }>;
}
