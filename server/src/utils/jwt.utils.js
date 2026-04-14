import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Generates a signed JWT access token (7-day expiry).
 * @param {{ userId: string, email: string, role: string }} payload
 * @returns {string} Signed JWT access token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Generates a signed JWT refresh token (14-day expiry).
 * @param {{ userId: string, email: string, role: string }} payload
 * @returns {string} Signed JWT refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * Generates both access and refresh tokens from a User document.
 * @param {import('../models/User.model.js').default} user
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function generateTokenPair(user) {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verifies and decodes a JWT access token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {{ userId: string, email: string, role: string, iat: number, exp: number }}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/**
 * Verifies and decodes a JWT refresh token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {{ userId: string, email: string, role: string, iat: number, exp: number }}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}
