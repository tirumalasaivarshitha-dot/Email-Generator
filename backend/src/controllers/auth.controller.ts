import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { userService } from '../services/user.service';
import { env } from '../config/env';
import { AppError } from '../utils/appError';

export const googleLogin = (req: Request, res: Response, next: NextFunction) => {
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === 'mock_google_client_id') {
    // If real credentials are not set, inform or provide dev login link
    return res.redirect(`${env.BACKEND_URL}/auth/dev-login`);
  }

  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};

export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', {
    failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed`,
    successRedirect: `${env.FRONTEND_URL}/dashboard`
  })(req, res, next);
};

export const devLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getDevOrCreateUser();
    if (!user) {
      return next(new AppError('Failed to create dev user', 500));
    }
    req.login(user, (err) => {
      if (err) return next(err);
      return res.redirect(`${env.FRONTEND_URL}/dashboard`);
    });
  } catch (err) {
    next(err);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, user: null });
    }
    const user = await userService.getUserProfile((req.user as any).id);
    return res.json({
      success: true,
      user: {
        id: user.id,
        googleId: user.googleId,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        slackConnected: !!user.slackConnection,
        slackTeamName: user.slackConnection?.teamName || null
      }
    });
  } catch (err) {
    next(err);
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully' });
    });
  });
};
