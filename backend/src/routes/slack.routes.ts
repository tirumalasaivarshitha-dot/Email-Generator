import { Router } from 'express';
import { connectSlack, slackCallback, disconnectSlack } from '../controllers/slack.controller';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

router.get('/connect', ensureAuthenticated, connectSlack);
router.get('/callback', slackCallback);
router.delete('/disconnect', ensureAuthenticated, disconnectSlack);

export default router;
