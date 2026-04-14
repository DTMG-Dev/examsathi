import { validationResult } from 'express-validator';
import { User } from '../models/index.js';
import { generateTokenPair } from '../utils/jwt.utils.js';
import { logger } from '../utils/logger.js';

/**
 * Formats express-validator errors into a simple string array.
 * @param {import('express-validator').Result} result
 * @returns {string[]}
 */
function extractValidationErrors(result) {
  return result.array().map((e) => e.msg);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers a new student account.
 * Creates the user, generates a token pair, and returns the user + tokens.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: extractValidationErrors(errors),
        code: 400,
      });
    }

    const { name, email, password, phone, targetExam } = req.body;

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists',
        code: 409,
      });
    }

    // Create user — password is auto-hashed by the pre-save hook
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      ...(phone && { phone }),
      ...(targetExam && { targetExam }),
    });

    // Generate token pair
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Persist refresh token and login timestamp (skip full validation for speed)
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save({ validateModifiedOnly: true });

    logger.info(`New user registered: ${user.email} [${user._id}]`);

    return res.status(201).json({
      success: true,
      data: {
        user, // toJSON transform strips password automatically
        accessToken,
        refreshToken,
      },
      message: 'Account created successfully. Welcome to ExamSathi!',
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates a user with email + password.
 * Returns a token pair and the user object on success.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: extractValidationErrors(errors),
        code: 400,
      });
    }

    const { email, password } = req.body;

    // Explicitly select password (field is select: false by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password +refreshToken',
    );

    // Use a generic error message to prevent email enumeration attacks
    const INVALID_CREDS = 'Invalid email or password';

    if (!user) {
      return res.status(401).json({ success: false, error: INVALID_CREDS, code: 401 });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact support.',
        code: 403,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: INVALID_CREDS, code: 401 });
    }

    // Generate fresh token pair (refresh token rotation)
    const { accessToken, refreshToken } = generateTokenPair(user);

    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save({ validateModifiedOnly: true });

    logger.info(`User logged in: ${user.email} [${user._id}]`);

    return res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full profile of the currently authenticated user.
 * req.user is populated by the protect() middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId)
      .populate('instituteId', 'name logo brandColor')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 404,
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
      message: 'User profile fetched successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile  (protected)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the authenticated user's profile fields.
 * Only the allowed fields below can be updated via this endpoint.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: extractValidationErrors(errors),
        code: 400,
      });
    }

    // Whitelist — only these fields can be changed here
    const ALLOWED = [
      'name',
      'phone',
      'targetExam',
      'examDate',
      'dailyStudyHours',
      'preferredLanguage',
    ];

    const updates = {};
    ALLOWED.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
        code: 400,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found', code: 404 });
    }

    return res.status(200).json({
      success: true,
      data: { user },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/password  (protected)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Changes the authenticated user's password.
 * Requires the correct current password before allowing the change.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function changePassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: extractValidationErrors(errors),
        code: 400,
      });
    }

    const { oldPassword, newPassword } = req.body;

    // Re-fetch user with password field
    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found', code: 404 });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 401,
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from the current password',
        code: 400,
      });
    }

    // Assign new password — pre-save hook will hash it
    user.password = newPassword;
    // Invalidate all existing refresh tokens on password change
    user.refreshToken = undefined;
    await user.save({ validateModifiedOnly: true });

    logger.info(`Password changed for user: ${user.email} [${user._id}]`);

    return res.status(200).json({
      success: true,
      data: {},
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    next(error);
  }
}
