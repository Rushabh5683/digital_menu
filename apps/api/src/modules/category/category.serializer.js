import { serializeDish } from '../dish/dish.serializer.js';

export function serializeCategory(category, { includeDisabledDishes = true } = {}) {
  let dishes = (category.dishes ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (!includeDisabledDishes) {
    dishes = dishes.filter((dish) => dish.isAvailable !== false);
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    displayOrder: category.displayOrder,
    isEnabled: category.isEnabled !== false,
    dishes: dishes.map(serializeDish),
  };
}
