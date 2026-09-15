import jwt from 'jsonwebtoken';
import { env } from '../../config.js';
import { AppError } from '../../middleware/errorHandler.js';

export function parseExpiryMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value * 1000;
  }

  if (typeof value !== 'string') {
    return 8 * 60 * 60 * 1000;
  }

  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) {
    return 8 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function cookieBase() {
  const secure = env.cookieSecure || env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure,
    // Cross-origin web (Vercel) + API (Railway) needs None + Secure.
    // Same-origin / local tunnel can keep Lax.
    sameSite: secure ? 'none' : 'lax',
    path: '/',
  };
}

export function signAuthToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    restaurantId: user.restaurantId ?? null,
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Session expired. Please sign in again.', 401);
    }
    throw new AppError('Invalid session. Please sign in again.', 401);
  }
}

export function getAuthCookieOptions() {
  return {
    ...cookieBase(),
    maxAge: parseExpiryMs(env.jwtExpiresIn),
  };
}

export function getRefreshCookieOptions() {
  return {
    ...cookieBase(),
    maxAge: parseExpiryMs(env.refreshExpiresIn),
  };
}

export function clearAuthCookieOptions() {
  return cookieBase();
}

export function clearRefreshCookieOptions() {
  return cookieBase();
}
