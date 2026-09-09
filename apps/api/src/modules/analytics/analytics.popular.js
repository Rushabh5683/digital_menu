import { prisma } from '../../lib/prisma.js';
import { serializeDish } from '../dish/dish.serializer.js';

/**
 * Public guest-favourites: most DISH_SELECTED events (all-time by default).
 * Only returns dishes that are still on the published available menu.
 */
export async function getMostSelectedDishesForMenu(
  restaurantId,
  menu,
  { limit = 3, from = null, to = null } = {},
) {
  const cap = Math.min(Math.max(1, Number(limit) || 3), 8);

  const availableById = new Map();
  for (const category of menu?.categories || []) {
    for (const dish of category.dishes || []) {
      if (dish?.id && dish.isAvailable !== false) {
        availableById.set(dish.id, { dish, categoryId: category.id });
      }
    }
  }

  if (availableById.size === 0) return [];

  const timestamp =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  const grouped = await prisma.analyticsEvent.groupBy({
    by: ['dishId'],
    where: {
      restaurantId,
      eventType: 'DISH_SELECTED',
      dishId: { in: [...availableById.keys()] },
      ...(timestamp ? { timestamp } : {}),
    },
    _count: { _all: true },
    orderBy: { _count: { dishId: 'desc' } },
    take: Math.min(40, availableById.size),
  });

  const picks = [];
  for (const row of grouped) {
    if (!row.dishId) continue;
    const hit = availableById.get(row.dishId);
    if (!hit) continue;
    picks.push({
      ...serializeDish(hit.dish),
      categoryId: hit.categoryId,
      selectionCount: row._count._all,
    });
    if (picks.length >= cap) break;
  }

  return picks;
}
