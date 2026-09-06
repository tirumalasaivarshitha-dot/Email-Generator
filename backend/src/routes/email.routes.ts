import { Router } from 'express';
import multer from 'multer';
import {
  scheduleEmails,
  parseRecipientsFile,
  getScheduledEmails,
  getSentEmails,
  searchEmails,
  getEmailById
} from '../controllers/email.controller';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = Router();

router.use(ensureAuthenticated);

router.post('/schedule', upload.single('file'), scheduleEmails);
router.post('/parse-file', upload.single('file'), parseRecipientsFile);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/search', searchEmails);
router.get('/:id', getEmailById);

export default router;
