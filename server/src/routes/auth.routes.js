import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// ── Validation rule sets ──────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+91[0-9]{10}$/)
    .withMessage('Phone must be a valid Indian number in format +91XXXXXXXXXX'),

  body('targetExam')
    .optional()
    .isIn(['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'])
    .withMessage('Target exam must be one of: NEET, JEE, UPSC, CAT, SSC'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+91[0-9]{10}$/)
    .withMessage('Phone must be a valid Indian number in format +91XXXXXXXXXX'),

  body('targetExam')
    .optional()
    .isIn(['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'])
    .withMessage('Target exam must be one of: NEET, JEE, UPSC, CAT, SSC'),

  body('examDate')
    .optional()
    .isISO8601().withMessage('Exam date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Exam date must be in the future');
      }
      return true;
    }),

  body('dailyStudyHours')
    .optional()
    .isFloat({ min: 0.5, max: 16 })
    .withMessage('Daily study hours must be between 0.5 and 16'),

  body('preferredLanguage')
    .optional()
    .isIn(['en', 'hi', 'te', 'ta'])
    .withMessage('Language must be one of: en, hi, te, ta'),
];

const changePasswordValidation = [
  body('oldPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number'),

  body('confirmNewPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/auth/register — strict auth rate limit (5 req/15min)
router.post('/register', authLimiter, registerValidation, register);

// POST /api/auth/login — strict auth rate limit
router.post('/login', authLimiter, loginValidation, login);

// GET /api/auth/me — protected
router.get('/me', protect, getMe);

// PUT /api/auth/profile — protected
router.put('/profile', protect, updateProfileValidation, updateProfile);

// PUT /api/auth/password — protected
router.put('/password', protect, changePasswordValidation, changePassword);

export default router;
