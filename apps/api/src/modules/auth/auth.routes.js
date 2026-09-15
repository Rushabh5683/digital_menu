import { Router } from 'express';
import { env } from '../../config.js';
import { asyncHandler } from '../../utils/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  getUserById,
  loginWithPassword,
  validateLoginPayload,
} from './auth.service.js';
import {
  clearAuthCookieOptions,
  clearRefreshCookieOptions,
  getAuthCookieOptions,
  getRefreshCookieOptions,
} from './token.js';
import {
  revokeRefreshToken,
  rotateRefreshSession,
} from './refreshToken.service.js';

export const authRouter = Router();

function requestMeta(req) {
  return {
    userAgent: req.get('user-agent') || null,
    ip: req.ip || req.socket?.remoteAddress || null,
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(env.authCookieName, accessToken, getAuthCookieOptions());
  res.cookie(env.refreshCookieName, refreshToken, getRefreshCookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie(env.authCookieName, clearAuthCookieOptions());
  res.clearCookie(env.refreshCookieName, clearRefreshCookieOptions());
}

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const credentials = validateLoginPayload(req.body);
    const result = await loginWithPassword(credentials, requestMeta(req));

    setAuthCookies(res, {
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });

    res.json({
      ok: true,
      user: result.user,
    });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[env.refreshCookieName];
    const result = await rotateRefreshSession(raw, requestMeta(req));

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    res.json({
      ok: true,
      user: result.user,
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[env.refreshCookieName];
    await revokeRefreshToken(raw);
    clearAuthCookies(res);
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Re-fetch to keep restaurant join fresh.
    const user = await getUserById(req.auth.userId);
    res.json({ user });
  }),
);
