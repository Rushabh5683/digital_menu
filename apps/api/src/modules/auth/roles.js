export const UserRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  RESTAURANT_ADMIN: 'RESTAURANT_ADMIN',
  RESTAURANT_CAPTAIN: 'RESTAURANT_CAPTAIN',
};

export const ROLE_VALUES = new Set(Object.values(UserRoles));

/** Restaurant-scoped staff who share one restaurantId (admin + captain). */
export function isRestaurantStaffRole(role) {
  return role === UserRoles.RESTAURANT_ADMIN || role === UserRoles.RESTAURANT_CAPTAIN;
}
