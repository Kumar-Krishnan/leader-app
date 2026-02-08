export interface EmailRecipient {
  email: string;
  name: string | null;
}

export interface SendMeetingEmailParams {
  meetingId: string;
  title: string;
  description: string | null;
  customMessage: string | null;
  descriptionFirst: boolean;
  date: string;
  location: string | null;
  attendees: EmailRecipient[];
  senderName: string;
  senderEmail: string;
  groupName: string;
}

export interface EmailService {
  sendMeetingEmail(
    params: SendMeetingEmailParams
  ): Promise<{ success: boolean; error?: string }>;
}
