import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Protects a route by verifying the JWT access token from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
        code: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token expired',
        code: 401,
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid access token',
      code: 401,
    });
  }
}

/**
 * Role-based access control middleware.
 * Must be used after protect().
 *
 * @param {...string} roles - Allowed roles (e.g. 'student', 'institute_admin', 'super_admin')
 * @returns {import('express').RequestHandler}
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        code: 401,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden: insufficient permissions',
        code: 403,
      });
    }

    next();
  };
}

/**
 * Re-authentication guard for financial/sensitive routes.
 * Expects an X-Reauth-Token header with a freshly issued JWT (≤5 min old).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireReAuth(req, res, next) {
  const reAuthToken = req.headers['x-reauth-token'];

  if (!reAuthToken) {
    return res.status(403).json({
      success: false,
      error: 'Re-authentication required for this action',
      code: 403,
    });
  }

  try {
    const decoded = jwt.verify(reAuthToken, config.jwt.secret);
    const tokenAgeMs = Date.now() - decoded.iat * 1000;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    if (tokenAgeMs > FIVE_MINUTES_MS) {
      return res.status(403).json({
        success: false,
        error: 'Re-auth token has expired. Please authenticate again.',
        code: 403,
      });
    }

    next();
  } catch {
    return res.status(403).json({
      success: false,
      error: 'Invalid re-auth token',
      code: 403,
    });
  }
}
