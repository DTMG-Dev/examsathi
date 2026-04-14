import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { financialLimiter } from '../middleware/rateLimiter.middleware.js';
import { config } from '../config/index.js';
import {
  getPlans,
  createOrder,
  verifyPayment,
  getSubscriptionStatus,
  cancelSubscription,
} from '../controllers/payment.controller.js';

const router = Router();

// Attach the Razorpay public key to app.locals so controllers can send it
// (done here once instead of importing config in every controller response)
router.use((_req, res, next) => {
  res.app.locals.razorpayKeyId = config.razorpay.keyId ?? '';
  next();
});

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/plans', getPlans);                          // GET  /api/payments/plans

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(protect);

router.post('/create-order',  financialLimiter, createOrder);        // POST /api/payments/create-order
router.post('/verify',        financialLimiter, verifyPayment);      // POST /api/payments/verify
router.get('/subscription',   getSubscriptionStatus);                // GET  /api/payments/subscription
router.post('/cancel',        cancelSubscription);                   // POST /api/payments/cancel

export default router;
