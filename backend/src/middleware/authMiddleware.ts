import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Development bypass if configured or session has user
  if (req.user) {
    return next();
  }

  return next(new AppError('Unauthorized - Please login first', 401));
};
