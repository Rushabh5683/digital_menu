import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { serializeRestaurant } from './restaurant.serializer.js';

export async function getRestaurantBySlug(slug) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
  });

  if (!restaurant || restaurant.status !== 'ACTIVE') {
    throw new AppError('Restaurant not found', 404);
  }

  return serializeRestaurant(restaurant, { publicView: true });
}

export async function findRestaurantRecordBySlug(slug) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
  });

  if (!restaurant || restaurant.status !== 'ACTIVE') {
    throw new AppError('Restaurant not found', 404);
  }

  return restaurant;
}
