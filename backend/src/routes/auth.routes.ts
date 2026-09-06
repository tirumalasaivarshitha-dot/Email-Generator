import { Router } from 'express';
import { googleLogin, googleCallback, devLogin, getCurrentUser, logout } from '../controllers/auth.controller';

const router = Router();

router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);
router.get('/dev-login', devLogin);
router.get('/me', getCurrentUser);
router.post('/logout', logout);

export default router;
