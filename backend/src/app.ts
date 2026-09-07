import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import path from 'path';

import { env } from './config/env';
import { configurePassport } from './config/passport';
import { errorHandler } from './middleware/errorHandler';
import { ensureAuthenticated } from './middleware/authMiddleware';

import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import senderRoutes from './routes/sender.routes';
import { setupBullBoard } from './config/bullBoard';

const app = express();

app.set('trust proxy', 1);

// Enable CORS with credentials for frontend
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session configuration
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  })
);

// Initialize Passport Authentication
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Email Scheduler API',
    timestamp: new Date().toISOString()
  });
});

// Bull Board Queues Monitoring Dashboard
app.use('/admin/queues', ensureAuthenticated, setupBullBoard());

// API Routes
app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/senders', senderRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
