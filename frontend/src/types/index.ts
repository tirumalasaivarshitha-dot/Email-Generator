export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  slackConnected?: boolean;
  slackTeamName?: string | null;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
}

export type EmailJobStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'rate_limited';

export interface EmailJob {
  id: string;
  userId: string;
  senderId: string;
  sender?: Sender | { email: string; name: string };
  senderEmail?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailJobStatus;
  idempotencyKey: string;
  bullmqJobId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface SchedulePayload {
  senderId?: string;
  subject: string;
  body: string;
  recipientEmails?: string[];
  file?: File;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}
