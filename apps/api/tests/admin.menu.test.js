import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('restaurant admin menu APIs enforce ownership', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'MenuOwn!234';
  const passwordHash = await hashPassword(password);

  const restaurantA = await prisma.restaurant.create({
    data: {
      name: `Menu A ${suffix}`,
      slug: `menu-a-${suffix}`,
      status: 'ACTIVE',
      email: `menu-a-${suffix}@example.com`,
    },
  });

  const restaurantB = await prisma.restaurant.create({
    data: {
      name: `Menu B ${suffix}`,
      slug: `menu-b-${suffix}`,
      status: 'ACTIVE',
      email: `menu-b-${suffix}@example.com`,
    },
  });

  const adminA = await prisma.user.create({
    data: {
      name: 'Admin A',
      email: `menu-admin-a-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurantA.id,
    },
  });

  const menuB = await prisma.menu.create({
    data: {
      restaurantId: restaurantB.id,
      name: 'Foreign menu',
      isPublished: true,
    },
  });

  const categoryB = await prisma.category.create({
    data: {
      menuId: menuB.id,
      name: 'Foreign category',
      displayOrder: 1,
      isEnabled: true,
    },
  });

  const dishB = await prisma.dish.create({
    data: {
      categoryId: categoryB.id,
      name: 'Foreign dish',
      description: 'Should not be editable by A',
      price: 100,
      displayOrder: 1,
      isAvailable: true,
    },
  });

  t.after(async () => {
    await prisma.dish.deleteMany({ where: { id: dishB.id } });
    await prisma.category.deleteMany({ where: { id: categoryB.id } });
    await prisma.menu.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.user.deleteMany({ where: { id: adminA.id } });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantA.id, restaurantB.id] } },
    });
  });

  const login = await api.post('/api/auth/login', {
    body: { email: adminA.email, password },
  });
  assert.equal(login.status, 200);
  const cookie = `${env.authCookieName}=${readCookie(login.getSetCookie(), env.authCookieName)}`;

  await t.test('creates menu, category, dish for own restaurant', async () => {
    const created = await api.post('/api/admin/menus', {
      cookie,
      body: { name: 'Dinner', description: 'Evening' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.menu.name, 'Dinner');
    assert.equal(created.body.menu.isPublished, false);

    const category = await api.post(`/api/admin/menus/${created.body.menu.id}/categories`, {
      cookie,
      body: { name: 'Starters' },
    });
    assert.equal(category.status, 201);
    assert.equal(category.body.category.isEnabled, true);

    const dish = await api.post(`/api/admin/categories/${category.body.category.id}/dishes`, {
      cookie,
      body: {
        name: 'Soup',
        description: 'Tomato',
        price: 180,
        dietaryTags: ['Vegetarian'],
        ingredients: ['Tomato'],
      },
    });
    assert.equal(dish.status, 201);
    assert.equal(dish.body.dish.price, 180);

    const published = await api.post(`/api/admin/menus/${created.body.menu.id}/publish`, {
      cookie,
      body: {},
    });
    assert.equal(published.status, 200);
    assert.equal(published.body.menu.isPublished, true);

    const publicMenu = await api.get(`/api/restaurants/${restaurantA.slug}/menu`);
    assert.equal(publicMenu.status, 200);
    assert.equal(publicMenu.body.menu.id, created.body.menu.id);
    assert.equal(publicMenu.body.menu.categories[0].name, 'Starters');
    assert.equal(publicMenu.body.menu.categories[0].dishes[0].name, 'Soup');
  });

  await t.test('cannot read or mutate another restaurant menu entities', async () => {
    const getDenied = await api.get(`/api/admin/menus/${menuB.id}`, { cookie });
    assert.equal(getDenied.status, 404);

    const patchMenu = await api.patch(`/api/admin/menus/${menuB.id}`, {
      cookie,
      body: { name: 'Hacked' },
    });
    assert.equal(patchMenu.status, 404);

    const patchCategory = await api.patch(`/api/admin/categories/${categoryB.id}`, {
      cookie,
      body: { name: 'Hacked' },
    });
    assert.equal(patchCategory.status, 404);

    const patchDish = await api.patch(`/api/admin/dishes/${dishB.id}`, {
      cookie,
      body: { price: 1 },
    });
    assert.equal(patchDish.status, 404);

    const deleteDish = await api.delete(`/api/admin/dishes/${dishB.id}`, { cookie });
    assert.equal(deleteDish.status, 404);

    const stillThere = await prisma.dish.findUnique({ where: { id: dishB.id } });
    assert.ok(stillThere);
    assert.equal(Number(stillThere.price), 100);
  });

  await t.test('disabled category and unavailable dish are hidden from public menu', async () => {
    const menus = await api.get('/api/admin/menus', { cookie });
    assert.equal(menus.status, 200);
    const ownMenu = menus.body.menus.find((menu) => menu.isPublished);
    assert.ok(ownMenu);

    const categoryId = ownMenu.categories[0].id;
    const dishId = ownMenu.categories[0].dishes[0].id;

    await api.patch(`/api/admin/dishes/${dishId}`, {
      cookie,
      body: { isAvailable: false },
    });

    let publicMenu = await api.get(`/api/restaurants/${restaurantA.slug}/menu`);
    assert.equal(publicMenu.status, 200);
    assert.equal(publicMenu.body.menu.categories[0].dishes.length, 0);

    await api.patch(`/api/admin/dishes/${dishId}`, {
      cookie,
      body: { isAvailable: true },
    });
    await api.patch(`/api/admin/categories/${categoryId}`, {
      cookie,
      body: { isEnabled: false },
    });

    publicMenu = await api.get(`/api/restaurants/${restaurantA.slug}/menu`);
    assert.equal(publicMenu.status, 200);
    assert.equal(publicMenu.body.menu.categories.length, 0);
  });
});
