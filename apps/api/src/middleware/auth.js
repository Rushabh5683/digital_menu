import { AppError } from './errorHandler.js';
import { env } from '../config.js';
import { findUserRecordById } from '../modules/auth/auth.service.js';
import { serializeAuthUser } from '../modules/auth/auth.serializer.js';
import { UserRoles } from '../modules/auth/roles.js';
import { verifyAuthToken } from '../modules/auth/token.js';
import { prisma } from '../lib/prisma.js';
import { validateCuid, validateSlug } from '../utils/validate.js';

function readTokenFromRequest(req) {
  const cookieToken = req.cookies?.[env.authCookieName];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const bearer = header.slice(7).trim();
    if (bearer) return bearer;
  }

  return null;
}

/**
 * Requires a valid session (HTTP-only cookie or Bearer token).
 * Attaches req.auth = { userId, role, restaurantId, user }
 */
export async function requireAuth(req, res, next) {
  try {
    const token = readTokenFromRequest(req);
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyAuthToken(token);
    const userId = payload.sub;

    if (!userId || typeof userId !== 'string') {
      throw new AppError('Invalid session. Please sign in again.', 401);
    }

    const user = await findUserRecordById(userId);
    if (!user || !user.isActive) {
      throw new AppError('Session is no longer valid', 401);
    }

    // Role / restaurant binding may change after token issuance — trust DB.
    req.auth = {
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurantId ?? null,
      user: serializeAuthUser(user),
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Requires the authenticated user to have one of the listed roles.
 * Must run after requireAuth.
 */
export function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles);

  return (req, res, next) => {
    try {
      if (!req.auth?.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!allowed.has(req.auth.role)) {
        throw new AppError('You do not have permission to perform this action', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Ensures the authenticated user may access the target restaurant.
 *
 * SUPER_ADMIN: may pass restaurantId (params/query/body) or slug to select any restaurant.
 * RESTAURANT_ADMIN / RESTAURANT_CAPTAIN: restaurant scope is ALWAYS taken from the authenticated user.
 *   Client-supplied restaurantId / slug is ignored (prevents IDOR via URL/body spoofing).
 *
 * Sets req.restaurantAccess = { restaurantId, restaurant }
 */
export async function requireRestaurantAccess(req, res, next) {
  try {
    if (!req.auth?.user) {
      throw new AppError('Authentication required', 401);
    }

    if (
      req.auth.role === UserRoles.RESTAURANT_ADMIN ||
      req.auth.role === UserRoles.RESTAURANT_CAPTAIN
    ) {
      if (!req.auth.restaurantId) {
        throw new AppError('Account is not linked to a restaurant', 403);
      }

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: req.auth.restaurantId },
        select: { id: true, name: true, slug: true },
      });
      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }

      // Scope always comes from the authenticated user. If the client also sent a
      // restaurantId/slug that does not match, reject (IDOR attempt) instead of
      // silently substituting — callers must not appear to succeed against B.
      await assertClientRestaurantMatchesBound(req, restaurant);

      req.restaurantAccess = {
        restaurantId: restaurant.id,
        restaurant,
      };
      return next();
    }

    if (req.auth.role === UserRoles.SUPER_ADMIN) {
      const target = await resolveTargetRestaurant(req);
      if (!target) {
        throw new AppError('Restaurant context is required', 400);
      }

      req.restaurantAccess = {
        restaurantId: target.id,
        restaurant: target,
      };
      return next();
    }

    throw new AppError('You do not have permission to perform this action', 403);
  } catch (error) {
    next(error);
  }
}

/**
 * When a restaurant admin supplies a restaurantId/slug in the request, it must
 * match their bound restaurant. Missing client ids are fine (scope from auth).
 */
async function assertClientRestaurantMatchesBound(req, boundRestaurant) {
  const restaurantIdRaw =
    req.params.restaurantId || req.query.restaurantId || req.body?.restaurantId;

  if (restaurantIdRaw) {
    let restaurantId;
    try {
      restaurantId = validateCuid(String(restaurantIdRaw), 'restaurantId');
    } catch {
      throw new AppError('You do not have access to this restaurant', 403);
    }
    if (restaurantId !== boundRestaurant.id) {
      throw new AppError('You do not have access to this restaurant', 403);
    }
  }

  const slugRaw =
    req.params.slug ||
    req.params.restaurantSlug ||
    req.query.restaurantSlug ||
    req.body?.restaurantSlug;

  if (slugRaw) {
    let slug;
    try {
      slug = validateSlug(String(slugRaw));
    } catch {
      throw new AppError('You do not have access to this restaurant', 403);
    }
    if (slug !== boundRestaurant.slug) {
      throw new AppError('You do not have access to this restaurant', 403);
    }
  }
}

async function resolveTargetRestaurant(req) {
  const restaurantIdRaw =
    req.params.restaurantId || req.query.restaurantId || req.body?.restaurantId;

  if (restaurantIdRaw) {
    const restaurantId = validateCuid(String(restaurantIdRaw), 'restaurantId');
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, slug: true },
    });
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }
    return restaurant;
  }

  const slugRaw = req.params.slug || req.params.restaurantSlug;
  if (slugRaw) {
    const slug = validateSlug(String(slugRaw));
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }
    return restaurant;
  }

  return null;
}
