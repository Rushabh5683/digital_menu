import { Router } from 'express';
import { requireAuth, requireRestaurantAccess } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/validate.js';
import {
  getAnalyticsOverview,
  getAnalyticsTrends,
  getAttentionOrderFunnel,
  getCategoryAnalytics,
  getDishAnalytics,
} from './analytics.reports.js';
import { ingestAnalyticsEvents, validateEventsPayload } from './analytics.service.js';

export const analyticsRouter = Router();

const protectRestaurantAnalytics = [requireAuth, requireRestaurantAccess];

// Public: anonymous customer event ingest
analyticsRouter.post(
  '/events',
  asyncHandler(async (req, res) => {
    const payload = validateEventsPayload(req.body);
    const result = await ingestAnalyticsEvents(payload);
    res.status(201).json({
      ok: true,
      ...result,
    });
  }),
);

// Protected: restaurant-scoped reports
analyticsRouter.get(
  '/overview/:restaurantId',
  ...protectRestaurantAnalytics,
  asyncHandler(async (req, res) => {
    const overview = await getAnalyticsOverview(req.restaurantAccess.restaurantId, req.query);
    res.json(overview);
  }),
);

analyticsRouter.get(
  '/categories/:restaurantId',
  ...protectRestaurantAnalytics,
  asyncHandler(async (req, res) => {
    const report = await getCategoryAnalytics(req.restaurantAccess.restaurantId, req.query);
    res.json(report);
  }),
);

analyticsRouter.get(
  '/dishes/:restaurantId',
  ...protectRestaurantAnalytics,
  asyncHandler(async (req, res) => {
    const report = await getDishAnalytics(req.restaurantAccess.restaurantId, req.query);
    res.json(report);
  }),
);

analyticsRouter.get(
  '/funnel/:restaurantId',
  ...protectRestaurantAnalytics,
  asyncHandler(async (req, res) => {
    const report = await getAttentionOrderFunnel(req.restaurantAccess.restaurantId, req.query);
    res.json(report);
  }),
);

analyticsRouter.get(
  '/trends/:restaurantId',
  ...protectRestaurantAnalytics,
  asyncHandler(async (req, res) => {
    const report = await getAnalyticsTrends(req.restaurantAccess.restaurantId, req.query);
    res.json(report);
  }),
);
