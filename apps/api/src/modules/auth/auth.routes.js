import { Router } from 'express';
import { env } from '../../config.js';
import { asyncHandler } from '../../utils/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  getUserById,
  loginWithPassword,
  validateLoginPayload,
} from './auth.service.js';
import { clearAuthCookieOptions, getAuthCookieOptions } from './token.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const credentials = validateLoginPayload(req.body);
    const result = await loginWithPassword(credentials);

    res.cookie(env.authCookieName, result.token, getAuthCookieOptions());

    res.json({
      ok: true,
      user: result.user,
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    res.clearCookie(env.authCookieName, clearAuthCookieOptions());
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
