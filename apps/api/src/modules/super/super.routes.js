import { Router } from 'express';
import { AppError } from '../../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { uploadLogoMiddleware } from '../../middleware/upload.js';
import { asyncHandler, validateCuid } from '../../utils/validate.js';
import { UserRoles } from '../auth/roles.js';
import { getAdminSalesReport } from '../admin/admin.reports.service.js';
import { getOrderById } from '../order/order.service.js';
import {
  createSuperRestaurant,
  deleteSuperRestaurant,
  getSuperDashboard,
  getSuperRestaurantById,
  listSuperRestaurants,
  updateSuperRestaurant,
  updateSuperRestaurantAdmin,
  updateSuperRestaurantStatus,
  validateCreateRestaurantPayload,
  validateUpdateRestaurantPayload,
} from './super.service.js';

export const superAdminRouter = Router();

superAdminRouter.use(requireAuth, requireRole(UserRoles.SUPER_ADMIN));

superAdminRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const dashboard = await getSuperDashboard();
    res.json(dashboard);
  }),
);

superAdminRouter.post(
  '/uploads/logo',
  uploadLogoMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Logo image is required', 400);
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    res.status(201).json({
      ok: true,
      logoUrl,
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  }),
);

superAdminRouter.get(
  '/restaurants',
  asyncHandler(async (req, res) => {
    const result = await listSuperRestaurants(req.query);
    res.json(result);
  }),
);

superAdminRouter.post(
  '/restaurants',
  asyncHandler(async (req, res) => {
    const payload = validateCreateRestaurantPayload(req.body);
    const restaurant = await createSuperRestaurant(payload);
    res.status(201).json({ restaurant });
  }),
);

superAdminRouter.get(
  '/restaurants/:id',
  asyncHandler(async (req, res) => {
    const restaurant = await getSuperRestaurantById(req.params.id);
    res.json({ restaurant });
  }),
);

superAdminRouter.get(
  '/restaurants/:id/reports/sales',
  asyncHandler(async (req, res) => {
    const restaurantId = validateCuid(req.params.id, 'restaurantId');
    const report = await getAdminSalesReport(restaurantId, req.query);
    res.json({ report });
  }),
);

superAdminRouter.get(
  '/restaurants/:id/orders/:orderId',
  asyncHandler(async (req, res) => {
    const restaurantId = validateCuid(req.params.id, 'restaurantId');
    const result = await getOrderById(req.params.orderId, { restaurantId });
    res.json(result);
  }),
);

superAdminRouter.patch(
  '/restaurants/:id',
  asyncHandler(async (req, res) => {
    const data = validateUpdateRestaurantPayload(req.body);
    const restaurant = await updateSuperRestaurant(req.params.id, data);
    res.json({ restaurant });
  }),
);

superAdminRouter.patch(
  '/restaurants/:id/status',
  asyncHandler(async (req, res) => {
    const restaurant = await updateSuperRestaurantStatus(req.params.id, req.body?.status);
    res.json({ restaurant });
  }),
);

superAdminRouter.patch(
  '/restaurants/:id/admin',
  asyncHandler(async (req, res) => {
    const restaurant = await updateSuperRestaurantAdmin(req.params.id, req.body);
    res.json({ restaurant });
  }),
);

superAdminRouter.delete(
  '/restaurants/:id',
  asyncHandler(async (req, res) => {
    const result = await deleteSuperRestaurant(req.params.id);
    res.json(result);
  }),
);
