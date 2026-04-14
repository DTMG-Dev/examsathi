import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

/**
 * Builds the standard rate-limit error response body.
 * @param {string} message
 */
const limitResponse = (message) => ({
  success: false,
  error: message,
  code: 429,
});

/**
 * Global limiter — 100 requests per 15 minutes for all routes.
 */
export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.global.windowMs,
  max: config.rateLimit.global.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitResponse('Too many requests. Please try again after 15 minutes.'),
});

/**
 * Auth limiter — 5 requests per 15 minutes for /api/auth/* routes.
 * Protects against brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitResponse(
    'Too many authentication attempts. Please try again after 15 minutes.',
  ),
});

/**
 * Financial limiter — 10 requests per 15 minutes for /api/payments/* routes.
 */
export const financialLimiter = rateLimit({
  windowMs: config.rateLimit.financial.windowMs,
  max: config.rateLimit.financial.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitResponse(
    'Too many payment requests. Please try again after 15 minutes.',
  ),
});
