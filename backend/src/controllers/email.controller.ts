import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import { AppError } from '../utils/appError';

export const scheduleEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    let recipientEmails: string[] = [];

    // Parse uploaded CSV/Text file if present
    if (req.file) {
      const fileContent = req.file.buffer.toString('utf-8');
      recipientEmails = emailService.parseEmailList(fileContent);
    } else if (req.body.recipientEmails) {
      if (typeof req.body.recipientEmails === 'string') {
        recipientEmails = emailService.parseEmailList(req.body.recipientEmails);
      } else if (Array.isArray(req.body.recipientEmails)) {
        recipientEmails = req.body.recipientEmails;
      }
    }

    if (!recipientEmails || recipientEmails.length === 0) {
      throw new AppError('No valid recipient emails detected in request or file', 400);
    }

    const result = await emailService.scheduleEmails({
      userId,
      senderId: req.body.senderId,
      subject: req.body.subject,
      body: req.body.body,
      recipients: recipientEmails,
      startTime: req.body.startTime || new Date().toISOString(),
      delayBetweenEmails: req.body.delayBetweenEmails ? parseInt(req.body.delayBetweenEmails, 10) : undefined,
      hourlyLimit: req.body.hourlyLimit ? parseInt(req.body.hourlyLimit, 10) : undefined
    });

    return res.status(201).json({
      success: true,
      message: `Successfully scheduled ${result.scheduledCount} email job(s)`,
      scheduledCount: result.scheduledCount,
      detectedRecipientsCount: recipientEmails.length,
      jobs: result.jobs
    });
  } catch (err) {
    next(err);
  }
};

export const parseRecipientsFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('File upload missing', 400);
    }
    const fileContent = req.file.buffer.toString('utf-8');
    const validEmails = emailService.parseEmailList(fileContent);

    return res.json({
      success: true,
      count: validEmails.length,
      emails: validEmails
    });
  } catch (err) {
    next(err);
  }
};

export const getScheduledEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const jobs = await emailService.getScheduledEmails(userId);
    return res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    next(err);
  }
};

export const getSentEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const jobs = await emailService.getSentEmails(userId);
    return res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    next(err);
  }
};

export const searchEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const query = req.query.q as string | undefined;
    const status = req.query.status as string | undefined;

    const results = await emailService.searchEmails(userId, query, status);
    return res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    next(err);
  }
};

export const getEmailById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const { id } = req.params;
    const job = await emailService.getEmailById(id, userId);
    return res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};
