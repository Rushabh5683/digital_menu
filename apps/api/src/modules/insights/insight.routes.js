import { Router } from 'express';
import { requireAuth, requireRestaurantAccess } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/validate.js';
import { getRestaurantInsights } from './insight.service.js';

export const insightsRouter = Router();

insightsRouter.get(
  '/:restaurantId',
  requireAuth,
  requireRestaurantAccess,
  asyncHandler(async (req, res) => {
    const result = await getRestaurantInsights(req.restaurantAccess.restaurantId, req.query);
    res.json(result);
  }),
);
