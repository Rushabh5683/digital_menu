import { toPublicUploadUrl } from '../../middleware/upload.js';

export function serializeDish(dish) {
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    price: Number(dish.price),
    isTaxApplicable: dish.isTaxApplicable !== false,
    imageUrl: toPublicUploadUrl(dish.imageUrl),
    ingredients: dish.ingredients ?? [],
    dietaryTags: dish.dietaryTags ?? [],
    displayOrder: dish.displayOrder,
    isAvailable: dish.isAvailable,
  };
}
