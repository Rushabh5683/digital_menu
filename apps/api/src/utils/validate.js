import { AppError } from '../middleware/errorHandler.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug) {
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new AppError('Restaurant slug is required', 400);
  }

  const normalized = slug.trim().toLowerCase();

  if (normalized.length < 2 || normalized.length > 80) {
    throw new AppError('Restaurant slug must be between 2 and 80 characters', 400);
  }

  if (!SLUG_PATTERN.test(normalized)) {
    throw new AppError(
      'Invalid restaurant slug. Use lowercase letters, numbers, and hyphens only.',
      400,
    );
  }

  return normalized;
}

export function validateCuid(value, fieldName = 'id') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  const id = value.trim();

  // Prisma cuid() values are lowercase alphanumeric, typically 25 chars.
  if (!/^[a-z0-9]{20,30}$/.test(id)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return id;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateAnonymousSessionId(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError('anonymousSessionId is required', 400);
  }

  const id = value.trim();

  if (!UUID_PATTERN.test(id)) {
    throw new AppError('anonymousSessionId must be a valid UUID', 400);
  }

  return id.toLowerCase();
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
