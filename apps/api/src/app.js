
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createRequire } from 'node:module';
import fs from 'node:fs';
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

const require = createRequire(import.meta.url);
const archiverModule = require('archiver');
const archiver =
  typeof archiverModule === 'function'
    ? archiverModule
    : typeof archiverModule.default === 'function'
      ? archiverModule.default
      : typeof archiverModule.default?.default === 'function'
        ? archiverModule.default.default
        : null;

export function createApp() {
  const app = express();

  // TEMPORARY: Download a ZIP backup of uploaded files.
  app.get('/download-uploads-backup', (req, res) => {
    const token = req.headers.authorization;
    const expectedToken = process.env.UPLOADS_EXPORT_TOKEN;
    const uploadsDir = UPLOADS_ROOT;

    if (!expectedToken || token !== `Bearer ${expectedToken}`) {
      return res.status(401).send('Unauthorized');
    }

    if (!archiver) {
      console.error('Archiver module does not expose a callable function.');
      return res.status(500).send('ZIP library configuration error');
    }

    try {
      if (!fs.existsSync(uploadsDir)) {
        return res.status(404).send('Uploads directory not found');
      }

      if (!fs.statSync(uploadsDir).isDirectory()) {
        return res.status(500).send('Uploads path is not a directory');
      }
    } catch (err) {
      console.error('Could not access uploads directory:', err);
      return res.status(500).send('Could not access uploads directory');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="railway-uploads-backup.zip"'
    );
    res.setHeader('Cache-Control', 'no-store');

    let archive;

    try {
      archive = archiver('zip', { zlib: { level: 1 } });
    } catch (err) {
      console.error('Could not initialize ZIP archive:', err);
      return res.status(500).send('Could not create ZIP archive');
    }

    archive.on('warning', (err) => {
      console.warn('Uploads backup warning:', err);
    });

    archive.on('error', (err) => {
      console.error('Uploads backup failed:', err);
      if (!res.destroyed) {
        res.destroy(err);
      }
    });

    res.on('close', () => {
      if (!res.writableEnded) {
        archive.abort();
      }
    });

    archive.pipe(res);
    archive.directory(uploadsDir, false);
    archive.finalize().catch((err) => {
      console.error('Could not finalize uploads archive:', err);
      if (!res.destroyed) {
        res.destroy(err);
      }
    });
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          env.corsOrigins.includes(origin) ||
          origin === env.corsOrigin
        ) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    })
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
