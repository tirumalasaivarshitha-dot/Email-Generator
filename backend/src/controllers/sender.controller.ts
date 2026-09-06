import { Request, Response, NextFunction } from 'express';
import { senderRepository } from '../repositories/sender.repository';

export const getSenders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const senders = await senderRepository.findByUserId(userId);
    return res.json({ success: true, data: senders });
  } catch (err) {
    next(err);
  }
};

export const createSender = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const { name, email, host, port, smtpUser, smtpPass, isDefault } = req.body;

    const sender = await senderRepository.create({
      userId,
      name,
      email,
      host,
      port: port ? parseInt(port, 10) : undefined,
      smtpUser,
      smtpPass,
      isDefault: Boolean(isDefault)
    });

    return res.status(201).json({ success: true, data: sender });
  } catch (err) {
    next(err);
  }
};
