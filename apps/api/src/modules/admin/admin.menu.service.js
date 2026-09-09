import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';
import { serializeCategory } from '../category/category.serializer.js';
import { serializeDish } from '../dish/dish.serializer.js';
import { serializeAdminMenu } from '../menu/menu.serializer.js';

function optionalString(value, max = 2000) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > max) throw new AppError(`Value must be at most ${max} characters`, 400);
  return text;
}

function requiredString(value, label, { min = 1, max = 120 } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length < min) throw new AppError(`${label} is required`, 400);
  if (text.length > max) throw new AppError(`${label} must be at most ${max} characters`, 400);
  return text;
}

function parseStringArray(value, label) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  throw new AppError(`${label} must be an array or comma-separated string`, 400);
}

function parsePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new AppError('Price must be a valid number ≥ 0', 400);
  }
  if (price > 999999.99) {
    throw new AppError('Price is too large', 400);
  }
  return Math.round(price * 100) / 100;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return Boolean(value);
}

async function getMenuOwned(menuId, restaurantId) {
  const id = validateCuid(menuId, 'menuId');
  const menu = await prisma.menu.findFirst({
    where: { id, restaurantId },
  });
  if (!menu) throw new AppError('Menu not found', 404);
  return menu;
}

async function getCategoryOwned(categoryId, restaurantId) {
  const id = validateCuid(categoryId, 'categoryId');
  const category = await prisma.category.findFirst({
    where: { id, menu: { restaurantId } },
    include: { menu: { select: { id: true, restaurantId: true } } },
  });
  if (!category) throw new AppError('Category not found', 404);
  return category;
}

async function getDishOwned(dishId, restaurantId) {
  const id = validateCuid(dishId, 'dishId');
  const dish = await prisma.dish.findFirst({
    where: { id, category: { menu: { restaurantId } } },
    include: {
      category: {
        select: { id: true, menuId: true, menu: { select: { restaurantId: true } } },
      },
    },
  });
  if (!dish) throw new AppError('Dish not found', 404);
  return dish;
}

function menuInclude() {
  return {
    categories: {
      orderBy: { displayOrder: 'asc' },
      include: {
        dishes: { orderBy: { displayOrder: 'asc' } },
      },
    },
    _count: { select: { categories: true } },
  };
}

export async function listAdminMenus(restaurantId) {
  const menus = await prisma.menu.findMany({
    where: { restaurantId },
    include: menuInclude(),
    orderBy: [{ isPublished: 'desc' }, { updatedAt: 'desc' }],
  });
  return { menus: menus.map(serializeAdminMenu) };
}

export async function getAdminMenu(restaurantId, menuId) {
  await getMenuOwned(menuId, restaurantId);
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: menuInclude(),
  });
  return { menu: serializeAdminMenu(menu) };
}

export async function createAdminMenu(restaurantId, body = {}) {
  const name = requiredString(body.name, 'Menu name');
  const description = optionalString(body.description, 2000);

  const menu = await prisma.menu.create({
    data: {
      restaurantId,
      name,
      description,
      isPublished: false,
    },
    include: menuInclude(),
  });

  return { menu: serializeAdminMenu(menu) };
}

export async function updateAdminMenu(restaurantId, menuId, body = {}) {
  await getMenuOwned(menuId, restaurantId);
  const data = {};
  if (body.name !== undefined) data.name = requiredString(body.name, 'Menu name');
  if (body.description !== undefined) data.description = optionalString(body.description, 2000);
  if (Object.keys(data).length === 0) throw new AppError('No changes provided', 400);

  const menu = await prisma.menu.update({
    where: { id: menuId },
    data,
    include: menuInclude(),
  });
  return { menu: serializeAdminMenu(menu) };
}

export async function setAdminMenuPublished(restaurantId, menuId, isPublished) {
  await getMenuOwned(menuId, restaurantId);

  const menu = await prisma.$transaction(async (tx) => {
    if (isPublished) {
      await tx.menu.updateMany({
        where: { restaurantId, NOT: { id: menuId } },
        data: { isPublished: false },
      });
    }

    return tx.menu.update({
      where: { id: menuId },
      data: { isPublished: Boolean(isPublished) },
      include: menuInclude(),
    });
  });

  return { menu: serializeAdminMenu(menu) };
}

export async function deleteAdminMenu(restaurantId, menuId) {
  const menu = await getMenuOwned(menuId, restaurantId);
  if (menu.isPublished) {
    throw new AppError('Unpublish the menu before deleting it', 400);
  }
  await prisma.menu.delete({ where: { id: menuId } });
  return { ok: true, id: menuId };
}

export async function createAdminCategory(restaurantId, menuId, body = {}) {
  await getMenuOwned(menuId, restaurantId);
  const name = requiredString(body.name, 'Category name');
  const description = optionalString(body.description, 1000);

  const maxOrder = await prisma.category.aggregate({
    where: { menuId },
    _max: { displayOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      menuId,
      name,
      description,
      isEnabled: body.isEnabled === undefined ? true : parseBoolean(body.isEnabled, true),
      displayOrder: (maxOrder._max.displayOrder || 0) + 1,
    },
    include: { dishes: true },
  });

  return { category: serializeCategory(category) };
}

export async function updateAdminCategory(restaurantId, categoryId, body = {}) {
  await getCategoryOwned(categoryId, restaurantId);
  const data = {};
  if (body.name !== undefined) data.name = requiredString(body.name, 'Category name');
  if (body.description !== undefined) data.description = optionalString(body.description, 1000);
  if (body.isEnabled !== undefined) data.isEnabled = parseBoolean(body.isEnabled, true);
  if (Object.keys(data).length === 0) throw new AppError('No changes provided', 400);

  const category = await prisma.category.update({
    where: { id: categoryId },
    data,
    include: { dishes: { orderBy: { displayOrder: 'asc' } } },
  });
  return { category: serializeCategory(category) };
}

export async function deleteAdminCategory(restaurantId, categoryId) {
  await getCategoryOwned(categoryId, restaurantId);
  await prisma.category.delete({ where: { id: categoryId } });
  return { ok: true, id: categoryId };
}

export async function reorderAdminCategories(restaurantId, menuId, orderedIds = []) {
  await getMenuOwned(menuId, restaurantId);
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new AppError('orderedIds must be a non-empty array', 400);
  }

  const ids = orderedIds.map((id) => validateCuid(id, 'categoryId'));
  const existing = await prisma.category.findMany({
    where: { menuId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));
  if (ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    throw new AppError('orderedIds must include every category for this menu exactly once', 400);
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.category.update({
        where: { id },
        data: { displayOrder: index + 1 },
      }),
    ),
  );

  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: menuInclude(),
  });
  return { menu: serializeAdminMenu(menu) };
}

export async function createAdminDish(restaurantId, categoryId, body = {}) {
  await getCategoryOwned(categoryId, restaurantId);

  const name = requiredString(body.name, 'Dish name');
  const description =
    body.description == null || String(body.description).trim() === ''
      ? '—'
      : requiredString(body.description, 'Description', { min: 1, max: 2000 });
  const price = parsePrice(body.price ?? 0);
  const imageUrl = optionalString(body.imageUrl, 1000);
  const ingredients = parseStringArray(body.ingredients, 'ingredients');
  const dietaryTags = parseStringArray(body.dietaryTags, 'dietary tags');
  const isAvailable = body.isAvailable === undefined ? true : parseBoolean(body.isAvailable, true);

  const maxOrder = await prisma.dish.aggregate({
    where: { categoryId },
    _max: { displayOrder: true },
  });

  const dish = await prisma.dish.create({
    data: {
      categoryId,
      name,
      description,
      price,
      imageUrl,
      ingredients,
      dietaryTags,
      isAvailable,
      displayOrder: (maxOrder._max.displayOrder || 0) + 1,
    },
  });

  return { dish: serializeDish(dish) };
}

export async function updateAdminDish(restaurantId, dishId, body = {}) {
  const existing = await getDishOwned(dishId, restaurantId);
  const data = {};

  if (body.name !== undefined) data.name = requiredString(body.name, 'Dish name');
  if (body.description !== undefined) {
    data.description =
      String(body.description).trim() === ''
        ? '—'
        : requiredString(body.description, 'Description', { min: 1, max: 2000 });
  }
  if (body.price !== undefined) data.price = parsePrice(body.price);
  if (body.imageUrl !== undefined) data.imageUrl = optionalString(body.imageUrl, 1000);
  if (body.ingredients !== undefined) data.ingredients = parseStringArray(body.ingredients, 'ingredients');
  if (body.dietaryTags !== undefined) data.dietaryTags = parseStringArray(body.dietaryTags, 'dietary tags');
  if (body.isAvailable !== undefined) data.isAvailable = parseBoolean(body.isAvailable, true);

  if (body.categoryId !== undefined && body.categoryId !== existing.categoryId) {
    const nextCategory = await getCategoryOwned(body.categoryId, restaurantId);
    data.categoryId = nextCategory.id;
    const maxOrder = await prisma.dish.aggregate({
      where: { categoryId: nextCategory.id },
      _max: { displayOrder: true },
    });
    data.displayOrder = (maxOrder._max.displayOrder || 0) + 1;
  }

  if (Object.keys(data).length === 0) throw new AppError('No changes provided', 400);

  const dish = await prisma.dish.update({
    where: { id: dishId },
    data,
  });
  return { dish: serializeDish(dish) };
}

export async function deleteAdminDish(restaurantId, dishId) {
  await getDishOwned(dishId, restaurantId);
  await prisma.dish.delete({ where: { id: dishId } });
  return { ok: true, id: dishId };
}

export async function reorderAdminDishes(restaurantId, categoryId, orderedIds = []) {
  await getCategoryOwned(categoryId, restaurantId);
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new AppError('orderedIds must be a non-empty array', 400);
  }

  const ids = orderedIds.map((id) => validateCuid(id, 'dishId'));
  const existing = await prisma.dish.findMany({
    where: { categoryId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));
  if (ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    throw new AppError('orderedIds must include every dish in this category exactly once', 400);
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.dish.update({
        where: { id },
        data: { displayOrder: index + 1 },
      }),
    ),
  );

  const dishes = await prisma.dish.findMany({
    where: { categoryId },
    orderBy: { displayOrder: 'asc' },
  });
  return { dishes: dishes.map(serializeDish) };
}

export async function listAdminDishes(restaurantId, query = {}) {
  const where = {
    category: { menu: { restaurantId } },
  };
  if (query.categoryId) {
    await getCategoryOwned(query.categoryId, restaurantId);
    where.categoryId = validateCuid(query.categoryId, 'categoryId');
  }
  if (query.menuId) {
    await getMenuOwned(query.menuId, restaurantId);
    where.category = { menuId: validateCuid(query.menuId, 'menuId') };
  }

  const dishes = await prisma.dish.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, menuId: true } },
    },
    orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
  });

  return {
    dishes: dishes.map((dish) => ({
      ...serializeDish(dish),
      categoryId: dish.categoryId,
      categoryName: dish.category?.name || null,
      menuId: dish.category?.menuId || null,
    })),
  };
}
