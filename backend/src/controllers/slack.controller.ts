import { Request, Response, NextFunction } from 'express';
import { slackService } from '../services/slack.service';
import { env } from '../config/env';

export const connectSlack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const url = await slackService.getConnectUrl(userId);
    return res.redirect(url);
  } catch (err) {
    next(err);
  }
};

export const slackCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
    }
    const userId = (state as string) || (req.user as any)?.id;
    await slackService.handleCallback(code as string, userId);

    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err) {
    console.error('[SlackController] Callback error:', err);
    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
  }
};

export const disconnectSlack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    await slackService.disconnect(userId);
    return res.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (err) {
    next(err);
  }
};
