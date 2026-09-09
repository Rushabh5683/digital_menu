import { AppError } from './errorHandler.js';
import { UserRoles, isRestaurantStaffRole } from '../modules/auth/roles.js';

/**
 * Ensures the caller is restaurant staff (admin or captain) bound to a restaurant.
 * Sets req.restaurantId exclusively from the authenticated user.
 */
export function requireBoundRestaurantStaff(req, res, next) {
  try {
    if (!req.auth?.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!isRestaurantStaffRole(req.auth.role)) {
      throw new AppError('Restaurant staff access required', 403);
    }

    if (!req.auth.restaurantId) {
      throw new AppError('Account is not linked to a restaurant', 403);
    }

    req.restaurantId = req.auth.restaurantId;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Restaurant admin only (not captains). Use after requireBoundRestaurantStaff
 * or requireAuth when the route must stay owner-only.
 */
export function requireRestaurantAdminOnly(req, res, next) {
  try {
    if (!req.auth?.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.auth.role !== UserRoles.RESTAURANT_ADMIN) {
      throw new AppError('Only the restaurant admin can perform this action', 403);
    }

    if (!req.auth.restaurantId) {
      throw new AppError('Restaurant admin is not linked to a restaurant', 403);
    }

    req.restaurantId = req.auth.restaurantId;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * @deprecated Prefer requireBoundRestaurantStaff + requireRestaurantAdminOnly.
 * Kept for call sites that still expect admin-only binding.
 */
export function requireBoundRestaurantAdmin(req, res, next) {
  return requireRestaurantAdminOnly(req, res, next);
}
