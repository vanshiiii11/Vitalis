import { Router } from 'express';
import { initiateOAuth, oauthCallback, getCalendarStatus } from '../controllers/calendar.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.get('/auth', requireAuth, initiateOAuth);
router.get('/oauth/callback', oauthCallback);
router.get('/status', requireAuth, getCalendarStatus);
export default router;
