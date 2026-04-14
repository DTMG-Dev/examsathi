import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getWeakAreas,
  getDueReviews,
  startWeakAreaTest,
  getWeakAreaInsights,
} from '../controllers/weakArea.controller.js';

const router = Router();

// All weak-area routes require authentication
router.use(protect);

router.get('/',              getWeakAreas);        // GET  /api/weak-areas
router.get('/due-reviews',   getDueReviews);       // GET  /api/weak-areas/due-reviews
router.post('/start-practice', startWeakAreaTest); // POST /api/weak-areas/start-practice
router.get('/insights',      getWeakAreaInsights); // GET  /api/weak-areas/insights

export default router;
