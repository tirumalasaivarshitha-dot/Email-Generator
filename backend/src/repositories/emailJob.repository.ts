import { prisma } from '../config/prisma';

export type EmailJobStatusType = 'scheduled' | 'processing' | 'sent' | 'failed' | 'rate_limited';

export class EmailJobRepository {
  async findById(id: string) {
    return prisma.emailJob.findUnique({
      where: { id },
      include: { sender: true, user: true }
    });
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return prisma.emailJob.findUnique({
      where: { idempotencyKey }
    });
  }

  async findByUserIdAndStatus(userId: string, statuses: string[]) {
    return prisma.emailJob.findMany({
      where: {
        userId,
        status: { in: statuses }
      },
      include: { sender: true },
      orderBy: { scheduledAt: 'desc' }
    });
  }

  async createMany(jobs: {
    userId: string;
    senderId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    hourlyLimit?: number | null;
    idempotencyKey: string;
  }[]) {
    const createdJobs = [];
    for (const job of jobs) {
      const created = await prisma.emailJob.create({
        data: {
          userId: job.userId,
          senderId: job.senderId,
          recipientEmail: job.recipientEmail,
          subject: job.subject,
          body: job.body,
          scheduledAt: job.scheduledAt,
          hourlyLimit: job.hourlyLimit ?? null,
          idempotencyKey: job.idempotencyKey,
          status: 'scheduled'
        },
        include: { sender: true }
      });
      createdJobs.push(created);
    }
    return createdJobs;
  }

  async updateBullMQJobId(id: string, bullmqJobId: string) {
    return prisma.emailJob.update({
      where: { id },
      data: { bullmqJobId }
    });
  }

  async updateStatus(id: string, status: string, details?: {
    sentAt?: Date;
    errorMessage?: string;
    scheduledAt?: Date;
  }) {
    return prisma.emailJob.update({
      where: { id },
      data: {
        status,
        ...(details?.sentAt !== undefined && { sentAt: details.sentAt }),
        ...(details?.errorMessage !== undefined && { errorMessage: details.errorMessage }),
        ...(details?.scheduledAt !== undefined && { scheduledAt: details.scheduledAt })
      },
      include: { sender: true, user: true }
    });
  }
}

export const emailJobRepository = new EmailJobRepository();
