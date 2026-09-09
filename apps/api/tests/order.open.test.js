import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createTestServer } from './helpers/http.js';

test('one open order per table + add items + restore by table', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);

  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Open R ${suffix}`,
      slug: `open-r-${suffix}`,
      status: 'ACTIVE',
    },
  });

  const menu = await prisma.menu.create({
    data: { restaurantId: restaurant.id, name: 'Main', isPublished: true },
  });
  const category = await prisma.category.create({
    data: { menuId: menu.id, name: 'Mains', displayOrder: 1, isEnabled: true },
  });
  const dishA = await prisma.dish.create({
    data: {
      categoryId: category.id,
      name: 'Biryani',
      description: 'A',
      price: 300,
      isAvailable: true,
      displayOrder: 1,
    },
  });
  const dishB = await prisma.dish.create({
    data: {
      categoryId: category.id,
      name: 'Naan',
      description: 'B',
      price: 50,
      isAvailable: true,
      displayOrder: 2,
    },
  });
  const table = await prisma.diningTable.create({
    data: { restaurantId: restaurant.id, tableNumber: 12, isActive: true },
  });

  const sessionA = await prisma.session.create({
    data: {
      restaurantId: restaurant.id,
      anonymousSessionId: '77777777-7777-4777-8777-777777777777',
      tableId: table.id,
    },
  });

  t.after(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { restaurantId: restaurant.id } },
    });
    await prisma.order.deleteMany({ where: { restaurantId: restaurant.id } });
    await prisma.session.deleteMany({ where: { restaurantId: restaurant.id } });
    await prisma.dish.deleteMany({ where: { categoryId: category.id } });
    await prisma.category.deleteMany({ where: { id: category.id } });
    await prisma.menu.deleteMany({ where: { id: menu.id } });
    await prisma.diningTable.deleteMany({ where: { id: table.id } });
    await prisma.restaurant.deleteMany({ where: { id: restaurant.id } });
  });

  let orderId;

  await t.test('places first order', async () => {
    const res = await api.post('/api/orders', {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: sessionA.anonymousSessionId,
        tableNumber: 12,
        items: [{ dishId: dishA.id, quantity: 1 }],
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.total, 300);
    orderId = res.body.order.id;
  });

  await t.test('blocks a second new order on the same table', async () => {
    const res = await api.post('/api/orders', {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: sessionA.anonymousSessionId,
        tableNumber: 12,
        items: [{ dishId: dishB.id, quantity: 2 }],
      },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.details?.code, 'OPEN_ORDER_EXISTS');
    assert.equal(res.body.details?.openOrder?.id, orderId);
  });

  await t.test('adds items to the open order and merges totals', async () => {
    const res = await api.post(`/api/orders/${orderId}/items`, {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: sessionA.anonymousSessionId,
        tableNumber: 12,
        items: [
          { dishId: dishB.id, quantity: 2 },
          { dishId: dishA.id, quantity: 1 },
        ],
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.added, true);
    assert.equal(res.body.order.id, orderId);
    assert.equal(res.body.order.total, 700); // Biryani×2 (600) + Naan×2 (100)
    const biryani = res.body.order.items.find((i) => i.dishNameSnapshot === 'Biryani');
    assert.equal(biryani.quantity, 2);
    const naan = res.body.order.items.find((i) => i.dishNameSnapshot === 'Naan');
    assert.equal(naan.quantity, 2);
  });

  await t.test('restores open order by table after a new anonymous session', async () => {
    const sessionB = await prisma.session.create({
      data: {
        restaurantId: restaurant.id,
        anonymousSessionId: '88888888-8888-4888-8888-888888888888',
        tableId: table.id,
      },
    });

    const open = await api.get(
      `/api/orders/open?restaurantSlug=${encodeURIComponent(restaurant.slug)}&tableNumber=12&anonymousSessionId=${encodeURIComponent(sessionB.anonymousSessionId)}`,
    );
    assert.equal(open.status, 200);
    assert.equal(open.body.order.id, orderId);
    assert.equal(open.body.order.sessionId, sessionB.id);
  });

  await t.test('allows a new order after the open one is completed', async () => {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });

    const res = await api.post('/api/orders', {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: sessionA.anonymousSessionId,
        tableNumber: 12,
        items: [{ dishId: dishB.id, quantity: 1 }],
      },
    });
    assert.equal(res.status, 201);
    assert.notEqual(res.body.order.id, orderId);
    assert.equal(res.body.order.total, 50);
  });
});
