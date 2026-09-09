import { serializeCategory } from '../category/category.serializer.js';
import { serializeRestaurantSummary } from '../restaurant/restaurant.serializer.js';

export function serializeMenu(menu, { publicView = false } = {}) {
  let categories = (menu.categories ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (publicView) {
    categories = categories.filter((category) => category.isEnabled !== false);
  }

  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    isPublished: Boolean(menu.isPublished),
    categories: categories.map((category) =>
      // Guest menu keeps unavailable dishes visible (dimmed “resting”) — do not strip them.
      serializeCategory(category, { includeDisabledDishes: true }),
    ),
  };
}

export function serializeMenuResponse(restaurant, menu) {
  return {
    restaurant: serializeRestaurantSummary(restaurant),
    menu: serializeMenu(menu, { publicView: true }),
  };
}

export function serializeAdminMenu(menu) {
  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    isPublished: Boolean(menu.isPublished),
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
    categoryCount: menu._count?.categories ?? menu.categories?.length ?? 0,
    dishCount:
      menu._count?.dishes ??
      (menu.categories || []).reduce((sum, category) => sum + (category.dishes?.length || 0), 0),
    categories: (menu.categories || [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((category) => serializeCategory(category, { includeDisabledDishes: true })),
  };
}
