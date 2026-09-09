import { Router } from 'express';
import { requireAuth, requireRestaurantAccess, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { asyncHandler } from '../../utils/validate.js';
import { UserRoles } from '../auth/roles.js';
import {
  addItemsToOrder,
  createOrder,
  getCustomerMyOrder,
  getCustomerOrder,
  getOpenOrderForTable,
  getOrderById,
  listOrdersForRestaurant,
  updateOrderStatus,
} from './order.service.js';

export const orderRouter = Router();

/**
 * Customer place order (public).
 * Body: { restaurantSlug, tableNumber|tableId, anonymousSessionId, items: [{ dishId, quantity }] }
 * Prices from the client are ignored.
 * 409 if the table already has an open order.
 */
orderRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = await createOrder(req.body);
    res.status(201).json(result);
  }),
);

/** Back-compat alias used by the cart UI. */
orderRouter.post(
  '/place',
  asyncHandler(async (req, res) => {
    const result = await createOrder(req.body);
    res.status(201).json(result);
  }),
);

/**
 * Customer: open order for this table (restore after cleared tab).
 * Query: restaurantSlug, tableNumber|tableId, anonymousSessionId (required)
 */
orderRouter.get(
  '/open',
  asyncHandler(async (req, res) => {
    const result = await getOpenOrderForTable({
      restaurantSlug: req.query.restaurantSlug,
      tableNumber: req.query.tableNumber,
      tableId: req.query.tableId,
      anonymousSessionId: req.query.anonymousSessionId,
    });
    res.json(result);
  }),
);

/**
 * Customer: current / latest order for this anonymous session (+ table restore).
 * Query: restaurantSlug, anonymousSessionId, tableNumber?
 */
orderRouter.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const result = await getCustomerMyOrder({
      restaurantSlug: req.query.restaurantSlug,
      anonymousSessionId: req.query.anonymousSessionId,
      tableNumber: req.query.tableNumber,
      tableId: req.query.tableId,
    });
    res.json(result);
  }),
);

/**
 * Customer: add items to an open order.
 */
orderRouter.post(
  '/:orderId/items',
  asyncHandler(async (req, res) => {
    const result = await addItemsToOrder(req.params.orderId, req.body);
    res.json(result);
  }),
);

/**
 * Customer: poll a specific order (must match anonymous session).
 * Query: restaurantSlug, anonymousSessionId
 */
orderRouter.get(
  '/:orderId/track',
  asyncHandler(async (req, res) => {
    const result = await getCustomerOrder(req.params.orderId, {
      restaurantSlug: req.query.restaurantSlug,
      anonymousSessionId: req.query.anonymousSessionId,
    });
    res.json(result);
  }),
);

/**
 * Staff: get one order.
 * Restaurant admins may only read their own restaurant's orders.
 */
orderRouter.get(
  '/:orderId',
  requireAuth,
  requireRole(UserRoles.SUPER_ADMIN, UserRoles.RESTAURANT_ADMIN),
  asyncHandler(async (req, res) => {
    const scopeRestaurantId =
      req.auth.role === UserRoles.RESTAURANT_ADMIN ? req.auth.restaurantId : null;

    if (req.auth.role === UserRoles.RESTAURANT_ADMIN && !scopeRestaurantId) {
      throw new AppError('Restaurant admin is not linked to a restaurant', 403);
    }

    const result = await getOrderById(req.params.orderId, {
      restaurantId: scopeRestaurantId,
    });
    res.json(result);
  }),
);

/**
 * Staff: update kitchen status.
 */
orderRouter.patch(
  '/:orderId/status',
  requireAuth,
  requireRole(UserRoles.SUPER_ADMIN, UserRoles.RESTAURANT_ADMIN),
  asyncHandler(async (req, res) => {
    const scopeRestaurantId =
      req.auth.role === UserRoles.RESTAURANT_ADMIN ? req.auth.restaurantId : null;

    if (req.auth.role === UserRoles.RESTAURANT_ADMIN && !scopeRestaurantId) {
      throw new AppError('Restaurant admin is not linked to a restaurant', 403);
    }

    const status = req.body?.status;
    const result = await updateOrderStatus(req.params.orderId, status, {
      restaurantId: scopeRestaurantId,
    });
    res.json(result);
  }),
);

/**
 * Mounted under /api/restaurants/:restaurantId/orders
 */
export const restaurantOrdersRouter = Router({ mergeParams: true });

restaurantOrdersRouter.get(
  '/',
  requireAuth,
  requireRole(UserRoles.SUPER_ADMIN, UserRoles.RESTAURANT_ADMIN),
  requireRestaurantAccess,
  asyncHandler(async (req, res) => {
    const result = await listOrdersForRestaurant(req.restaurantAccess.restaurantId, req.query);
    res.json(result);
  }),
);
