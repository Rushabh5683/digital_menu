import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import { UserRoles, isRestaurantStaffRole } from '../auth/roles.js';
import {
  asyncHandler,
  validateAnonymousSessionId,
  validateSlug,
} from '../../utils/validate.js';
import { findRestaurantRecordBySlug } from '../restaurant/restaurant.service.js';
import { endAnonymousSession, startAnonymousSession } from './session.service.js';

export const sessionRouter = Router();

function readSessionPayload(body = {}) {
  const restaurantSlug = validateSlug(body.restaurantSlug);
  const anonymousSessionId = validateAnonymousSessionId(body.anonymousSessionId);
  const payload = { restaurantSlug, anonymousSessionId };

  if (body.tableNumber != null && body.tableNumber !== '') {
    payload.tableNumber = body.tableNumber;
  }
  if (body.tableId) {
    payload.tableId = body.tableId;
  }

  return payload;
}

function isStaffPreviewAuth(auth, restaurant) {
  if (!auth?.user || !restaurant) return false;
  if (auth.role === UserRoles.SUPER_ADMIN) return true;
  if (!isRestaurantStaffRole(auth.role)) return false;
  return auth.restaurantId === restaurant.id;
}

sessionRouter.post(
  '/start',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const payload = readSessionPayload(req.body);

    // Signed-in restaurant admin / captain / super admin must not create guest sessions.
    if (req.auth?.user) {
      const restaurant = await findRestaurantRecordBySlug(payload.restaurantSlug);
      if (isStaffPreviewAuth(req.auth, restaurant)) {
        return res.status(200).json({
          session: {
            id: null,
            restaurantId: restaurant.id,
            anonymousSessionId: payload.anonymousSessionId,
            tableId: null,
            tableNumber: null,
            tableLabel: null,
            startedAt: null,
            endedAt: null,
            created: false,
            resumed: false,
            preview: true,
          },
        });
      }
    }

    const session = await startAnonymousSession(payload);
    res.status(session.created ? 201 : 200).json({ session });
  }),
);

sessionRouter.post(
  '/end',
  asyncHandler(async (req, res) => {
    const payload = readSessionPayload(req.body);
    const session = await endAnonymousSession(payload);
    res.json({ session });
  }),
);
