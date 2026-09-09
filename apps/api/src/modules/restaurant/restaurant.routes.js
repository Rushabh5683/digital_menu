import { Router } from 'express';
import { asyncHandler, validateSlug } from '../../utils/validate.js';
import { listPublicRestaurantTables } from '../admin/admin.qr.service.js';
import { getPublishedMenuByRestaurantSlug } from '../menu/menu.service.js';
import { getRestaurantBySlug } from './restaurant.service.js';

export const restaurantRouter = Router();

restaurantRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = validateSlug(req.params.slug);
    const restaurant = await getRestaurantBySlug(slug);
    res.json({ restaurant });
  }),
);

restaurantRouter.get(
  '/:slug/menu',
  asyncHandler(async (req, res) => {
    const slug = validateSlug(req.params.slug);
    const payload = await getPublishedMenuByRestaurantSlug(slug);
    res.json(payload);
  }),
);

restaurantRouter.get(
  '/:slug/tables',
  asyncHandler(async (req, res) => {
    const slug = validateSlug(req.params.slug);
    const payload = await listPublicRestaurantTables(slug);
    res.json(payload);
  }),
);
