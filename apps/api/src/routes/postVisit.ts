import { Router } from 'express';
import { submitPostVisitNote, getPostVisitSummary } from '../controllers/postVisit.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles';
const router = Router();
router.post('/:appointmentId/notes', requireAuth, requireRole('DOCTOR'), submitPostVisitNote);
router.get('/:appointmentId/summary', requireAuth, getPostVisitSummary);
export default router;
