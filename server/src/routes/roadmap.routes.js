import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  generateRoadmap,
  getRoadmap,
  updateTopicStatus,
  regenerateRoadmap,
} from '../controllers/roadmap.controller.js';

const router = Router();

router.use(protect);

router.post('/generate', generateRoadmap);          // POST /api/roadmap/generate
router.get('/', getRoadmap);                        // GET  /api/roadmap
router.put('/topic/:topicId', updateTopicStatus);   // PUT  /api/roadmap/topic/:topicId
router.post('/regenerate', regenerateRoadmap);      // POST /api/roadmap/regenerate

export default router;
