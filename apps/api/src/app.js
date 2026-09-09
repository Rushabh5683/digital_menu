import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { env } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { UPLOADS_ROOT } from './middleware/upload.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { insightsRouter } from './modules/insights/insight.routes.js';
import { orderRouter, restaurantOrdersRouter } from './modules/order/order.routes.js';
import { restaurantRouter } from './modules/restaurant/restaurant.routes.js';
import { sessionRouter } from './modules/session/session.routes.js';
import { superAdminRouter } from './modules/super/super.routes.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin) || origin === env.corsOrigin) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/uploads', express.static(UPLOADS_ROOT));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/superadmin', superAdminRouter);
  app.use('/api/super', superAdminRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api/restaurants', restaurantRouter);
  app.use('/api/sessions', sessionRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/restaurants/:restaurantId/orders', restaurantOrdersRouter);

  app.use('/api/analytics', analyticsRouter);
  app.use('/api/insights', insightsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
