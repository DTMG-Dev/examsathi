import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getDashboardData } from '../controllers/dashboard.controller.js';

const router = Router();

// GET /api/dashboard — single aggregated payload for the student dashboard
router.get('/', protect, getDashboardData);

export default router;
