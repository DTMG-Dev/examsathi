import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.middleware.js';
import {
  generateQuestions,
  getQuestions,
  getPYQs,
} from '../controllers/questions.controller.js';

const router = Router();

/**
 * AI generation limiter — 20 req / 15 min per IP.
 * Tighter than the global limiter because each call may hit the Claude API.
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many AI generation requests. Please wait 15 minutes.',
    code: 429,
  },
});

// POST /api/questions/generate — AI-powered MCQ generation
router.post('/generate', protect, aiLimiter, generateQuestions);

// GET /api/questions — list / filter questions
router.get('/', protect, getQuestions);

// GET /api/questions/pyq — previous year questions
router.get('/pyq', protect, getPYQs);

export default router;
