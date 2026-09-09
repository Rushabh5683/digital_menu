import { Router } from 'express';
import {
  asyncHandler,
  validateAnonymousSessionId,
  validateSlug,
} from '../../utils/validate.js';
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

sessionRouter.post(
  '/start',
  asyncHandler(async (req, res) => {
    const payload = readSessionPayload(req.body);
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
