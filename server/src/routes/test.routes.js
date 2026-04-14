import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  startTest,
  submitAnswer,
  finishTest,
  getTestHistory,
  getTestDetail,
} from '../controllers/test.controller.js';

const router = Router();

// All test routes require authentication
router.use(protect);

router.post('/start', startTest);             // POST /api/tests/start
router.get('/history', getTestHistory);       // GET  /api/tests/history  ← before /:id
router.put('/:id/answer', submitAnswer);      // PUT  /api/tests/:id/answer
router.post('/:id/finish', finishTest);       // POST /api/tests/:id/finish
router.get('/:id', getTestDetail);            // GET  /api/tests/:id

export default router;
