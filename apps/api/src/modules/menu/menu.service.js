import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getMostSelectedDishesForMenu } from '../analytics/analytics.popular.js';
import { findRestaurantRecordBySlug } from '../restaurant/restaurant.service.js';
import { serializeMenuResponse } from './menu.serializer.js';

export async function getPublishedMenuByRestaurantSlug(slug) {
  const restaurant = await findRestaurantRecordBySlug(slug);

  if (restaurant.status && restaurant.status !== 'ACTIVE') {
    throw new AppError('This restaurant menu is currently unavailable', 404);
  }

  const menu = await prisma.menu.findFirst({
    where: {
      restaurantId: restaurant.id,
      isPublished: true,
    },
    include: {
      categories: {
        where: { isEnabled: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          dishes: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!menu) {
    throw new AppError('No published menu found for this restaurant', 404);
  }

  const guestFavourites = await getMostSelectedDishesForMenu(restaurant.id, menu, {
    limit: 3,
  });

  return {
    ...serializeMenuResponse(restaurant, menu),
    guestFavourites,
  };
}
