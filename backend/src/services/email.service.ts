import crypto from 'crypto';
import { emailJobRepository } from '../repositories/emailJob.repository';
import { senderRepository } from '../repositories/sender.repository';
import { emailQueue, QUEUE_NAME } from '../queues/email.queue';
import { elasticsearchService } from './elasticsearch.service';
import { AppError } from '../utils/appError';
import { prisma } from '../config/prisma';

export class EmailService {
  parseEmailList(content: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = content.match(emailRegex) || [];
    const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
    return uniqueEmails;
  }

  async scheduleEmails(params: {
    userId: string;
    senderId?: string;
    subject: string;
    body: string;
    recipients: string[];
    startTime: string; // ISO string
    delayBetweenEmails?: number; // ms
    hourlyLimit?: number;
  }) {
    const { userId, senderId, subject, body, recipients, startTime, delayBetweenEmails, hourlyLimit } = params;

    if (!subject || !subject.trim()) {
      throw new AppError('Subject is required', 400);
    }
    if (!body || !body.trim()) {
      throw new AppError('Email body is required', 400);
    }
    if (!recipients || recipients.length === 0) {
      throw new AppError('At least one recipient email address is required', 400);
    }

    // Resolve Sender
    let targetSender;
    if (senderId) {
      targetSender = await senderRepository.findById(senderId);
    }
    if (!targetSender) {
      targetSender = await senderRepository.findDefaultSender(userId);
    }
    if (!targetSender) {
      throw new AppError('Sender profile not found', 400);
    }

    const baseStartTime = new Date(startTime);
    if (isNaN(baseStartTime.getTime())) {
      throw new AppError('Invalid start time provided', 400);
    }

    const delayMs = delayBetweenEmails ?? 2000;
    const effectiveHourlyLimit = Math.max(1, hourlyLimit ?? Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 200));
    const preparedJobs = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipientEmail = recipients[i].trim().toLowerCase();
      // Calculate scheduledAt with cumulative delay
      const scheduledAt = new Date(baseStartTime.getTime() + i * delayMs);
      
      // Deterministic idempotency key
      const hashInput = `${userId}:${targetSender.id}:${recipientEmail}:${subject.trim()}:${scheduledAt.toISOString()}`;
      const idempotencyKey = crypto.createHash('sha256').update(hashInput).digest('hex');

      preparedJobs.push({
        userId,
        senderId: targetSender.id,
        recipientEmail,
        subject: subject.trim(),
        body: body.trim(),
        scheduledAt,
        idempotencyKey,
        hourlyLimit: effectiveHourlyLimit
      });
    }

    const createdJobs = [];
    for (const jobData of preparedJobs) {
      const existing = await emailJobRepository.findByIdempotencyKey(jobData.idempotencyKey);
      if (existing) {
        createdJobs.push(existing);
        continue;
      }

      const newJob = await prisma.emailJob.create({
        data: {
          userId: jobData.userId,
          senderId: jobData.senderId,
          recipientEmail: jobData.recipientEmail,
          subject: jobData.subject,
          body: jobData.body,
          scheduledAt: jobData.scheduledAt,
          hourlyLimit: jobData.hourlyLimit,
          idempotencyKey: jobData.idempotencyKey,
          status: 'scheduled'
        },
        include: { sender: true }
      });

      // Calculate initial delay for BullMQ
      const now = Date.now();
      const initialDelay = Math.max(0, newJob.scheduledAt.getTime() - now);
      const bullmqJobId = `job_${newJob.idempotencyKey}`;

      // Add delayed job to BullMQ
      await emailQueue.add(
        QUEUE_NAME,
        { emailJobId: newJob.id },
        {
          delay: initialDelay,
          jobId: bullmqJobId
        }
      );

      await emailJobRepository.updateBullMQJobId(newJob.id, bullmqJobId);

      // Index in Elasticsearch
      await elasticsearchService.indexEmailJob({
        id: newJob.id,
        userId: newJob.userId,
        senderEmail: newJob.sender.email,
        recipientEmail: newJob.recipientEmail,
        subject: newJob.subject,
        body: newJob.body,
        status: newJob.status,
        scheduledAt: newJob.scheduledAt,
        createdAt: newJob.createdAt
      });

      createdJobs.push(newJob);
    }

    return {
      scheduledCount: createdJobs.length,
      jobs: createdJobs
    };
  }

  async getScheduledEmails(userId: string) {
    return emailJobRepository.findByUserIdAndStatus(userId, [
      'scheduled',
      'processing',
      'rate_limited'
    ]);
  }

  async getSentEmails(userId: string) {
    return emailJobRepository.findByUserIdAndStatus(userId, [
      'sent',
      'failed'
    ]);
  }

  async searchEmails(userId: string, query?: string, statusFilter?: string) {
    // 1. Try Elasticsearch
    const esHits = await elasticsearchService.searchEmailJobs(userId, query, statusFilter);
    if (esHits !== null) {
      return esHits;
    }

    // 2. Fallback to Database query
    const whereClause: any = { userId };
    if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter;
    }
    if (query && query.trim()) {
      const q = query.trim();
      whereClause.OR = [
        { recipientEmail: { contains: q } },
        { subject: { contains: q } },
        { body: { contains: q } }
      ];
    }

    const jobs = await prisma.emailJob.findMany({
      where: whereClause,
      include: { sender: true },
      orderBy: { scheduledAt: 'desc' }
    });

    return jobs.map((job) => ({
      id: job.id,
      userId: job.userId,
      senderEmail: job.sender.email,
      recipientEmail: job.recipientEmail,
      subject: job.subject,
      body: job.body,
      status: job.status,
      scheduledAt: job.scheduledAt.toISOString(),
      sentAt: job.sentAt ? job.sentAt.toISOString() : null,
      createdAt: job.createdAt.toISOString()
    }));
  }

  async getEmailById(id: string, userId: string) {
    const job = await emailJobRepository.findById(id);
    if (!job || job.userId !== userId) {
      throw new AppError('Email job not found', 404);
    }
    return job;
  }
}

export const emailService = new EmailService();
