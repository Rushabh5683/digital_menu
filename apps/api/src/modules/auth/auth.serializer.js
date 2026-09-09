export function serializeAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId ?? null,
    isActive: user.isActive,
    restaurant: user.restaurant
      ? {
          id: user.restaurant.id,
          name: user.restaurant.name,
          slug: user.restaurant.slug,
          logoUrl: user.restaurant.logoUrl ?? null,
          status: user.restaurant.status ?? null,
        }
      : null,
  };
}
