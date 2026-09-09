import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';
import { serializeDish } from './dish.serializer.js';

export async function getDishById(dishId) {
  const id = validateCuid(dishId, 'dishId');

  const dish = await prisma.dish.findUnique({
    where: { id },
  });

  if (!dish) {
    throw new AppError('Dish not found', 404);
  }

  return serializeDish(dish);
}
