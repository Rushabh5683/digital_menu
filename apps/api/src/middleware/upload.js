import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { env } from '../config.js';
import { AppError } from './errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = env.uploadsDir
  ? path.resolve(env.uploadsDir)
  : path.resolve(__dirname, '../../uploads');
export const LOGO_UPLOAD_DIR = path.join(UPLOADS_ROOT, 'logos');
export const DISH_UPLOAD_DIR = path.join(UPLOADS_ROOT, 'dishes');

/** Turn /uploads/... into an absolute URL when PUBLIC_API_URL is set (split-host deploy). */
export function toPublicUploadUrl(relativePath) {
  const rel = String(relativePath || '').trim();
  if (!rel) return rel;
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = env.publicApiUrl;
  if (!base) return rel.startsWith('/') ? rel : `/${rel}`;
  const pathPart = rel.startsWith('/') ? rel : `/${rel}`;
  return `${base}${pathPart}`;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

ensureDir(LOGO_UPLOAD_DIR);
ensureDir(DISH_UPLOAD_DIR);

function mimeToExt(mime) {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}

function createImageUploader({ destDir, filenamePrefix, fieldName, label }) {
  const storage = multer.diskStorage({
    destination(_req, _file, cb) {
      ensureDir(destDir);
      cb(null, destDir);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
        ? ext
        : mimeToExt(file.mimetype);
      const name = `${filenamePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;
      cb(null, name);
    },
  });

  function fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new AppError(`${label} must be a JPG, PNG, WEBP, or GIF image`, 400));
      return;
    }
    cb(null, true);
  }

  const uploader = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  });

  return function uploadMiddleware(req, res, next) {
    uploader.single(fieldName)(req, res, (err) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new AppError(`${label} must be 5 MB or smaller`, 400));
          return;
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          next(new AppError(`Unexpected upload field. Use field name "${fieldName}".`, 400));
          return;
        }
        next(new AppError(err.message || 'Upload failed', 400));
        return;
      }

      next(err);
    });
  };
}

export const LOGO_MAX_BYTES = MAX_IMAGE_BYTES;
export const DISH_IMAGE_MAX_BYTES = MAX_IMAGE_BYTES;

/**
 * Multer wrapper that maps size/type errors into AppError.
 */
export const uploadLogoMiddleware = createImageUploader({
  destDir: LOGO_UPLOAD_DIR,
  filenamePrefix: 'logo',
  fieldName: 'logo',
  label: 'Logo',
});

export const uploadDishImageMiddleware = createImageUploader({
  destDir: DISH_UPLOAD_DIR,
  filenamePrefix: 'dish',
  fieldName: 'image',
  label: 'Dish image',
});
