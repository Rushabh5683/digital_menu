import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';
import { serializeCategory } from './category.serializer.js';

export async function getCategoryById(categoryId) {
  const id = validateCuid(categoryId, 'categoryId');

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      dishes: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return serializeCategory(category);
}
