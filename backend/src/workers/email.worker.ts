import { Worker, Job } from 'bullmq';
import { QUEUE_NAME, emailQueue } from '../queues/email.queue';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';
import { emailJobRepository } from '../repositories/emailJob.repository';
import { mailerService } from '../services/mailer.service';
import { rateLimiterService } from '../services/rateLimiter.service';
import { slackService } from '../services/slack.service';
import { elasticsearchService } from '../services/elasticsearch.service';

interface EmailJobData {
  emailJobId: string;
}

export const startEmailWorker = () => {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailJobId } = job.data;
      console.log(`[Worker Job ${job.id}] Processing emailJobId: ${emailJobId}`);

      // 1. Load job from DB
      const dbJob = await emailJobRepository.findById(emailJobId);
      if (!dbJob) {
        console.warn(`[Worker Job ${job.id}] Job ${emailJobId} not found in database. Skipping.`);
        return;
      }

      // 2. Idempotency Check: Exit if already sent
      if (dbJob.status === 'sent' || dbJob.sentAt) {
        console.log(`[Worker Job ${job.id}] Email ${emailJobId} already sent. Idempotency guard triggered.`);
        return;
      }

      // 3. Distributed Rate Limiter Check
      const effectiveHourlyLimit = dbJob.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;
      const rateLimitResult = await rateLimiterService.checkAndIncrement(
        dbJob.senderId,
        effectiveHourlyLimit
      );

      if (!rateLimitResult.allowed) {
        console.warn(
          `[Worker Job ${job.id}] Rate limit exceeded for sender ${dbJob.sender.email} (${rateLimitResult.currentCount}/${env.MAX_EMAILS_PER_HOUR_PER_SENDER}). Rescheduling in ${Math.round(rateLimitResult.nextWindowDelayMs / 1000)}s.`
        );

        const newScheduledAt = new Date(Date.now() + rateLimitResult.nextWindowDelayMs);

        // Update status in DB
        const updatedJob = await emailJobRepository.updateStatus(dbJob.id, 'rate_limited', {
          scheduledAt: newScheduledAt
        });

        // Sync with Elasticsearch
        await elasticsearchService.indexEmailJob({
          id: updatedJob.id,
          userId: updatedJob.userId,
          senderEmail: updatedJob.sender.email,
          recipientEmail: updatedJob.recipientEmail,
          subject: updatedJob.subject,
          body: updatedJob.body,
          status: updatedJob.status,
          scheduledAt: updatedJob.scheduledAt,
          sentAt: updatedJob.sentAt,
          createdAt: updatedJob.createdAt
        });

        // Trigger Slack notification
        await slackService.notifyRateLimitReached({
          userId: dbJob.userId,
          senderId: dbJob.senderId,
          senderEmail: dbJob.sender.email,
          hourlyLimit: effectiveHourlyLimit
        });

        // Reschedule in BullMQ with delayed job
        await emailQueue.add(
          QUEUE_NAME,
          { emailJobId: dbJob.id },
          {
            delay: rateLimitResult.nextWindowDelayMs,
            jobId: `delayed_${dbJob.id}_${Date.now()}`
          }
        );

        return;
      }

      // 4. Update status to processing
      await emailJobRepository.updateStatus(dbJob.id, 'processing');

      try {
        // 5. Send email via SMTP
        const sendResult = await mailerService.sendMail({
          fromName: dbJob.sender.name,
          fromEmail: dbJob.sender.email,
          to: dbJob.recipientEmail,
          subject: dbJob.subject,
          body: dbJob.body
        });

        const sentTime = new Date();
        const finalJob = await emailJobRepository.updateStatus(dbJob.id, 'sent', {
          sentAt: sentTime
        });

        // 6. Update Elasticsearch
        await elasticsearchService.indexEmailJob({
          id: finalJob.id,
          userId: finalJob.userId,
          senderEmail: finalJob.sender.email,
          recipientEmail: finalJob.recipientEmail,
          subject: finalJob.subject,
          body: finalJob.body,
          status: finalJob.status,
          scheduledAt: finalJob.scheduledAt,
          sentAt: finalJob.sentAt,
          createdAt: finalJob.createdAt
        });

        console.log(`[Worker Job ${job.id}] Successfully sent email to ${dbJob.recipientEmail}. MessageId: ${sendResult.messageId}`);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to send email via SMTP';
        console.error(`[Worker Job ${job.id}] Error sending email:`, errorMessage);

        const failedJob = await emailJobRepository.updateStatus(dbJob.id, 'failed', {
          errorMessage
        });

        await elasticsearchService.indexEmailJob({
          id: failedJob.id,
          userId: failedJob.userId,
          senderEmail: failedJob.sender.email,
          recipientEmail: failedJob.recipientEmail,
          subject: failedJob.subject,
          body: failedJob.body,
          status: failedJob.status,
          scheduledAt: failedJob.scheduledAt,
          sentAt: failedJob.sentAt,
          createdAt: failedJob.createdAt
        });

        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: env.WORKER_CONCURRENCY
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log(`[EmailWorker] Worker initialized with CONCURRENCY = ${env.WORKER_CONCURRENCY}`);
  return worker;
};
