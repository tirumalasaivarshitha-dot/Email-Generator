import { Router } from 'express';
import { getSenders, createSender } from '../controllers/sender.controller';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

router.use(ensureAuthenticated);
router.get('/', getSenders);
router.post('/', createSender);

export default router;
