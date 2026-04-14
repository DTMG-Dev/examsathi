import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createInstitute,
  getInstituteStats,
  updateInstitute,
  createBatch,
  addStudents,
  assignTest,
  getBatchResults,
  generateReport,
} from '../controllers/institute.controller.js';

const router = Router();

// All institute routes require authentication
router.use(protect);

router.post('/',                           createInstitute);   // POST /api/institute
router.get('/stats',                       getInstituteStats); // GET  /api/institute/stats
router.patch('/',                          updateInstitute);   // PATCH /api/institute
router.post('/batch',                      createBatch);       // POST /api/institute/batch
router.post('/batch/:id/students',         addStudents);       // POST /api/institute/batch/:id/students
router.post('/batch/:id/assign-test',      assignTest);        // POST /api/institute/batch/:id/assign-test
router.get('/batch/:id/results',           getBatchResults);   // GET  /api/institute/batch/:id/results
router.get('/report',                      generateReport);    // GET  /api/institute/report

export default router;
