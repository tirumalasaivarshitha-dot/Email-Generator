import { User as PrismaUser, Sender as PrismaSender, EmailJob as PrismaEmailJob } from '@prisma/client';

export type User = PrismaUser;
export type Sender = PrismaSender;
export type EmailJob = PrismaEmailJob;

export interface ScheduleEmailInput {
  senderId?: string;
  senderEmail?: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  subject: string;
  body: string;
  recipientEmails: string[];
  scheduledAt: string; // ISO string
  delayBetweenEmails?: number; // ms
  hourlyLimit?: number;
}

export interface SearchQueryInput {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}
