import { Router } from 'express';
import { AppError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  requireBoundRestaurantStaff,
  requireRestaurantAdminOnly,
} from '../../middleware/restaurantAdmin.js';
import {
  toPublicUploadUrl,
  uploadDishImageMiddleware,
  uploadLogoMiddleware,
} from '../../middleware/upload.js';
import { asyncHandler } from '../../utils/validate.js';
import { UserRoles } from '../auth/roles.js';
import {
  getAdminDashboard,
  getAdminRestaurant,
  getAdminSetupStatus,
  listAdminOrders,
  getAdminOrder,
  markAdminOrderBillPrinted,
  updateAdminOrderStatus,
  updateAdminOrderPayment,
  startAdminTableOrder,
  addAdminOrderItems,
  updateAdminOrderItem,
  deleteAdminOrderItem,
  discardAdminEmptyOrder,
  updateAdminRestaurant,
} from './admin.service.js';
import {
  createRestaurantCaptain,
  deactivateRestaurantCaptain,
  deleteRestaurantCaptain,
  listRestaurantCaptains,
  updateRestaurantCaptain,
} from './admin.captains.service.js';
import {
  getCaptainStaffAppreciation,
  getStaffAppreciation,
} from './admin.appreciation.service.js';
import {
  bulkCreateAdminCategories,
  createAdminCategory,
  createAdminDish,
  createAdminMenu,
  deleteAdminCategory,
  deleteAdminDish,
  deleteAdminMenu,
  getAdminMenu,
  listAdminDishes,
  listAdminMenus,
  reorderAdminCategories,
  reorderAdminDishes,
  setAdminMenuPublished,
  updateAdminCategory,
  updateAdminDish,
  updateAdminMenu,
} from './admin.menu.service.js';
import {
  bulkCreateAdminTables,
  createAdminTable,
  deleteAdminTable,
  getAdminTableQr,
  listAdminTables,
  setAdminTableActive,
  updateAdminTable,
} from './admin.tables.service.js';
import {
  generateAdminTableQr,
  generateAllAdminTableQrs,
  listAdminQrCodes,
} from './admin.qr.service.js';
import { getAdminSalesReport } from './admin.reports.service.js';
import { closeDayEnd, getDayEndStatus, unlockDayEnd } from './admin.dayend.service.js';
import { getQzCertificate, signQzRequest } from './admin.qz.service.js';

export const adminRouter = Router();

const adminOnly = [requireRestaurantAdminOnly];

adminRouter.use(requireAuth, requireBoundRestaurantStaff);

adminRouter.get(
  '/restaurant',
  asyncHandler(async (req, res) => {
    const restaurant = await getAdminRestaurant(req.restaurantId);
    res.json({ restaurant });
  }),
);

adminRouter.patch(
  '/restaurant',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const restaurant = await updateAdminRestaurant(req.restaurantId, req.body);
    res.json({ restaurant });
  }),
);

adminRouter.get(
  '/setup',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const setup = await getAdminSetupStatus(req.restaurantId);
    res.json({ setup });
  }),
);

adminRouter.get(
  '/reports/sales',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const report = await getAdminSalesReport(req.restaurantId, req.query);
    res.json({ report });
  }),
);

adminRouter.get(
  '/day-end',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const dayEnd = await getDayEndStatus(req.restaurantId, req.query);
    res.json({ dayEnd });
  }),
);

adminRouter.post(
  '/day-end/close',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await closeDayEnd(req.restaurantId, req.auth.userId, req.body || {});
    res.status(201).json(result);
  }),
);

adminRouter.post(
  '/day-end/unlock',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const dayEnd = await unlockDayEnd(req.restaurantId, req.auth.userId, req.body || {});
    res.json({ dayEnd });
  }),
);

adminRouter.get(
  '/captains',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await listRestaurantCaptains(req.restaurantId);
    res.json(result);
  }),
);

adminRouter.post(
  '/captains',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await createRestaurantCaptain(req.restaurantId, req.body || {});
    res.status(201).json(result);
  }),
);

adminRouter.patch(
  '/captains/:captainId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await updateRestaurantCaptain(
      req.restaurantId,
      req.params.captainId,
      req.body || {},
    );
    res.json(result);
  }),
);

adminRouter.post(
  '/captains/:captainId/deactivate',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await deactivateRestaurantCaptain(req.restaurantId, req.params.captainId);
    res.json(result);
  }),
);

adminRouter.delete(
  '/captains/:captainId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await deleteRestaurantCaptain(req.restaurantId, req.params.captainId);
    res.json(result);
  }),
);

adminRouter.get(
  '/staff-appreciation',
  asyncHandler(async (req, res) => {
    if (req.auth.role === UserRoles.RESTAURANT_CAPTAIN) {
      const result = await getCaptainStaffAppreciation(req.restaurantId, req.auth.userId);
      return res.json(result);
    }
    const result = await getStaffAppreciation(req.restaurantId);
    res.json(result);
  }),
);

adminRouter.post(
  '/uploads/logo',
  ...adminOnly,
  uploadLogoMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Logo image is required', 400);
    }

    const storedPath = `/uploads/logos/${req.file.filename}`;
    const logoUrl = toPublicUploadUrl(storedPath);
    res.status(201).json({
      ok: true,
      logoUrl: storedPath,
      publicUrl: logoUrl,
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  }),
);

adminRouter.get(
  '/dashboard',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const dashboard = await getAdminDashboard(req.restaurantId);
    res.json(dashboard);
  }),
);

adminRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const result = await listAdminOrders(req.restaurantId, req.query);
    res.json(result);
  }),
);

adminRouter.post(
  '/orders',
  asyncHandler(async (req, res) => {
    const result = await startAdminTableOrder(req.restaurantId, req.body || {});
    res.status(result.created ? 201 : 200).json(result);
  }),
);

adminRouter.get(
  '/orders/:orderId',
  asyncHandler(async (req, res) => {
    const result = await getAdminOrder(req.restaurantId, req.params.orderId);
    res.json(result);
  }),
);

adminRouter.patch(
  '/orders/:orderId/status',
  asyncHandler(async (req, res) => {
    const status = String(req.body?.status || '').trim().toUpperCase();
    if (
      req.auth.role === UserRoles.RESTAURANT_CAPTAIN &&
      (status === 'COMPLETED' || status === 'CANCELLED' || status === 'REJECTED')
    ) {
      throw new AppError(
        'Only the restaurant admin can settle, cancel, or reject orders',
        403,
      );
    }

    const result = await updateAdminOrderStatus(
      req.restaurantId,
      req.params.orderId,
      req.body?.status,
      {
        paymentMethod: req.body?.paymentMethod,
        paymentNote: req.body?.paymentNote,
        paymentSplits: req.body?.paymentSplits,
        staffAppreciationAmount: req.body?.staffAppreciationAmount,
        appreciationCaptainIds: req.body?.appreciationCaptainIds,
        businessDate: req.body?.businessDate,
      },
    );
    res.json(result);
  }),
);

adminRouter.patch(
  '/orders/:orderId/payment',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await updateAdminOrderPayment(
      req.restaurantId,
      req.params.orderId,
      {
        paymentMethod: req.body?.paymentMethod,
        paymentNote: req.body?.paymentNote,
        paymentSplits: req.body?.paymentSplits,
      },
    );
    res.json(result);
  }),
);

adminRouter.post(
  '/orders/:orderId/print',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await markAdminOrderBillPrinted(
      req.restaurantId,
      req.params.orderId,
    );
    res.json(result);
  }),
);

adminRouter.post(
  '/orders/:orderId/items',
  asyncHandler(async (req, res) => {
    const result = await addAdminOrderItems(
      req.restaurantId,
      req.params.orderId,
      req.body?.items,
    );
    res.status(201).json(result);
  }),
);

adminRouter.patch(
  '/orders/:orderId/items/:itemId',
  asyncHandler(async (req, res) => {
    const result = await updateAdminOrderItem(
      req.restaurantId,
      req.params.orderId,
      req.params.itemId,
      req.body?.quantity,
    );
    res.json(result);
  }),
);

adminRouter.delete(
  '/orders/:orderId/items/:itemId',
  asyncHandler(async (req, res) => {
    const result = await deleteAdminOrderItem(
      req.restaurantId,
      req.params.orderId,
      req.params.itemId,
    );
    res.json(result);
  }),
);

adminRouter.delete(
  '/orders/:orderId',
  asyncHandler(async (req, res) => {
    const result = await discardAdminEmptyOrder(req.restaurantId, req.params.orderId);
    res.json(result);
  }),
);

adminRouter.post(
  '/uploads/dish',
  ...adminOnly,
  uploadDishImageMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Dish image is required', 400);
    }

    const storedPath = `/uploads/dishes/${req.file.filename}`;
    res.status(201).json({
      ok: true,
      imageUrl: storedPath,
      publicUrl: toPublicUploadUrl(storedPath),
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  }),
);

adminRouter.get(
  '/menus',
  asyncHandler(async (req, res) => {
    const result = await listAdminMenus(req.restaurantId);
    res.json(result);
  }),
);

adminRouter.post(
  '/menus',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await createAdminMenu(req.restaurantId, req.body);
    res.status(201).json(result);
  }),
);

adminRouter.get(
  '/menus/:menuId',
  asyncHandler(async (req, res) => {
    const result = await getAdminMenu(req.restaurantId, req.params.menuId);
    res.json(result);
  }),
);

adminRouter.patch(
  '/menus/:menuId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await updateAdminMenu(req.restaurantId, req.params.menuId, req.body);
    res.json(result);
  }),
);

adminRouter.post(
  '/menus/:menuId/publish',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await setAdminMenuPublished(req.restaurantId, req.params.menuId, true);
    res.json(result);
  }),
);

adminRouter.post(
  '/menus/:menuId/unpublish',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await setAdminMenuPublished(req.restaurantId, req.params.menuId, false);
    res.json(result);
  }),
);

adminRouter.delete(
  '/menus/:menuId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await deleteAdminMenu(req.restaurantId, req.params.menuId);
    res.json(result);
  }),
);

adminRouter.post(
  '/menus/:menuId/categories',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await createAdminCategory(req.restaurantId, req.params.menuId, req.body);
    res.status(201).json(result);
  }),
);

adminRouter.post(
  '/menus/:menuId/categories/bulk',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await bulkCreateAdminCategories(
      req.restaurantId,
      req.params.menuId,
      req.body || {},
    );
    res.status(201).json(result);
  }),
);

adminRouter.post(
  '/menus/:menuId/categories/reorder',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await reorderAdminCategories(
      req.restaurantId,
      req.params.menuId,
      req.body?.orderedIds,
    );
    res.json(result);
  }),
);

adminRouter.patch(
  '/categories/:categoryId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await updateAdminCategory(req.restaurantId, req.params.categoryId, req.body);
    res.json(result);
  }),
);

adminRouter.delete(
  '/categories/:categoryId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await deleteAdminCategory(req.restaurantId, req.params.categoryId);
    res.json(result);
  }),
);

adminRouter.get(
  '/dishes',
  asyncHandler(async (req, res) => {
    const result = await listAdminDishes(req.restaurantId, req.query);
    res.json(result);
  }),
);

adminRouter.post(
  '/categories/:categoryId/dishes',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await createAdminDish(req.restaurantId, req.params.categoryId, req.body);
    res.status(201).json(result);
  }),
);

adminRouter.post(
  '/categories/:categoryId/dishes/reorder',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await reorderAdminDishes(
      req.restaurantId,
      req.params.categoryId,
      req.body?.orderedIds,
    );
    res.json(result);
  }),
);

adminRouter.patch(
  '/dishes/:dishId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await updateAdminDish(req.restaurantId, req.params.dishId, req.body);
    res.json(result);
  }),
);

adminRouter.delete(
  '/dishes/:dishId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await deleteAdminDish(req.restaurantId, req.params.dishId);
    res.json(result);
  }),
);

adminRouter.get(
  '/tables',
  asyncHandler(async (req, res) => {
    const result = await listAdminTables(req.restaurantId);
    res.json(result);
  }),
);

adminRouter.post(
  '/tables',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await createAdminTable(req.restaurantId, req.body);
    res.status(201).json(result);
  }),
);

adminRouter.post(
  '/tables/bulk',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await bulkCreateAdminTables(req.restaurantId, req.body);
    res.status(201).json(result);
  }),
);

adminRouter.patch(
  '/tables/:tableId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await updateAdminTable(req.restaurantId, req.params.tableId, req.body);
    res.json(result);
  }),
);

adminRouter.post(
  '/tables/:tableId/activate',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await setAdminTableActive(req.restaurantId, req.params.tableId, true);
    res.json(result);
  }),
);

adminRouter.post(
  '/tables/:tableId/deactivate',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await setAdminTableActive(req.restaurantId, req.params.tableId, false);
    res.json(result);
  }),
);

adminRouter.delete(
  '/tables/:tableId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await deleteAdminTable(req.restaurantId, req.params.tableId);
    res.json(result);
  }),
);

adminRouter.get(
  '/tables/:tableId/qr',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await getAdminTableQr(req.restaurantId, req.params.tableId);
    res.json(result);
  }),
);

adminRouter.get(
  '/qr-codes',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await listAdminQrCodes(req.restaurantId);
    res.json(result);
  }),
);

adminRouter.post(
  '/qr-codes/generate-all',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await generateAllAdminTableQrs(req.restaurantId);
    res.json(result);
  }),
);

adminRouter.post(
  '/qr-codes/:tableId/generate',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await generateAdminTableQr(req.restaurantId, req.params.tableId);
    res.json(result);
  }),
);

/** Public cert for QZ Tray silent printing (staff session required). */
adminRouter.get(
  '/qz/certificate',
  asyncHandler(async (_req, res) => {
    const certificate = getQzCertificate();
    res.type('text/plain').send(certificate);
  }),
);

/** Sign each QZ privileged call so Tray can remember Allow and stop prompting. */
adminRouter.post(
  '/qz/sign',
  asyncHandler(async (req, res) => {
    const requestPayload =
      typeof req.body?.request === 'string'
        ? req.body.request
        : typeof req.query?.request === 'string'
          ? req.query.request
          : '';
    const signature = signQzRequest(requestPayload);
    res.type('text/plain').send(signature);
  }),
);
