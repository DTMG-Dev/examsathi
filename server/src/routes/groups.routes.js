import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createGroup,
  joinGroup,
  getMyGroups,
  getGroupDetail,
  createChallenge,
  submitChallenge,
  getLeaderboard,
} from '../controllers/groups.controller.js';

const router = Router();

// All group routes require authentication
router.use(protect);

router.post('/',                             createGroup);      // POST /api/groups
router.post('/join',                         joinGroup);        // POST /api/groups/join
router.get('/',                              getMyGroups);      // GET  /api/groups
router.get('/:id',                           getGroupDetail);   // GET  /api/groups/:id
router.post('/:id/challenge',                createChallenge);  // POST /api/groups/:id/challenge
router.post('/:id/challenge/:cId/submit',    submitChallenge);  // POST /api/groups/:id/challenge/:cId/submit
router.get('/:id/leaderboard',               getLeaderboard);   // GET  /api/groups/:id/leaderboard

export default router;
