import { prisma } from '../config/prisma';

export class SenderRepository {
  async findById(id: string) {
    return prisma.sender.findUnique({
      where: { id }
    });
  }

  async findByUserId(userId: string) {
    return prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findDefaultSender(userId: string) {
    return prisma.sender.findFirst({
      where: { userId, isDefault: true }
    });
  }

  async create(data: {
    userId: string;
    name: string;
    email: string;
    host?: string;
    port?: number;
    smtpUser?: string;
    smtpPass?: string;
    isDefault?: boolean;
  }) {
    if (data.isDefault) {
      // Unset previous defaults
      await prisma.sender.updateMany({
        where: { userId: data.userId },
        data: { isDefault: false }
      });
    }

    return prisma.sender.create({
      data: {
        userId: data.userId,
        name: data.name,
        email: data.email,
        host: data.host,
        port: data.port,
        smtpUser: data.smtpUser,
        smtpPass: data.smtpPass,
        isDefault: data.isDefault ?? false
      }
    });
  }

  async ensureDefaultSender(userId: string, userEmail: string, userName: string) {
    const existing = await prisma.sender.findFirst({
      where: { userId }
    });

    if (existing) return existing;

    return prisma.sender.create({
      data: {
        userId,
        name: userName || 'Default Sender',
        email: userEmail,
        isDefault: true
      }
    });
  }
}

export const senderRepository = new SenderRepository();
