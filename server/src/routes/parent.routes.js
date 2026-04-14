import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  linkChild,
  getMyChildren,
  getChildProgress,
  getWeeklyReport,
  getChildWeakAreas,
} from '../controllers/parent.controller.js';

const router = Router();

// All parent routes require authentication
router.use(protect);

router.post('/link-child',                 linkChild);
router.get('/children',                    getMyChildren);
router.get('/child/:id/progress',          getChildProgress);
router.get('/child/:id/weekly-report',     getWeeklyReport);
router.get('/child/:id/weak-areas',        getChildWeakAreas);

export default router;
