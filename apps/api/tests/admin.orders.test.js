import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('admin orders board returns items and status updates stay scoped', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'BoardOwn!234';
  const passwordHash = await hashPassword(password);

  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Board R ${suffix}`,
      slug: `board-r-${suffix}`,
      status: 'ACTIVE',
    },
  });

  const other = await prisma.restaurant.create({
    data: {
      name: `Board Other ${suffix}`,
      slug: `board-other-${suffix}`,
      status: 'ACTIVE',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Board Admin',
      email: `board-admin-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurant.id,
    },
  });

  const menu = await prisma.menu.create({
    data: { restaurantId: restaurant.id, name: 'Main', isPublished: true },
  });
  const category = await prisma.category.create({
    data: { menuId: menu.id, name: 'Mains', displayOrder: 1, isEnabled: true },
  });
  const dish = await prisma.dish.create({
    data: {
      categoryId: category.id,
      name: 'Board Biryani',
      description: 'Test',
      price: 310,
      isAvailable: true,
      displayOrder: 1,
    },
  });
  const table = await prisma.diningTable.create({
    data: { restaurantId: restaurant.id, tableNumber: 12, isActive: true },
  });
  const session = await prisma.session.create({
    data: {
      restaurantId: restaurant.id,
      anonymousSessionId: '66666666-6666-4666-8666-666666666666',
      tableId: table.id,
    },
  });

  const foreignOrder = await prisma.order.create({
    data: {
      restaurantId: other.id,
      tableId: (
        await prisma.diningTable.create({
          data: { restaurantId: other.id, tableNumber: 1, isActive: true },
        })
      ).id,
      orderNumber: `ORD-FOREIGN-${suffix}`,
      status: 'PLACED',
      subtotal: 10,
      total: 10,
      items: {
        create: [
          {
            dishNameSnapshot: 'Secret',
            priceSnapshot: 10,
            quantity: 1,
            subtotal: 10,
          },
        ],
      },
    },
  });

  t.after(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { restaurantId: { in: [restaurant.id, other.id] } } },
    });
    await prisma.order.deleteMany({
      where: { restaurantId: { in: [restaurant.id, other.id] } },
    });
    await prisma.session.deleteMany({ where: { restaurantId: restaurant.id } });
    await prisma.dish.deleteMany({ where: { id: dish.id } });
    await prisma.category.deleteMany({ where: { id: category.id } });
    await prisma.menu.deleteMany({ where: { id: menu.id } });
    await prisma.diningTable.deleteMany({
      where: { restaurantId: { in: [restaurant.id, other.id] } },
    });
    await prisma.user.deleteMany({ where: { id: admin.id } });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurant.id, other.id] } },
    });
  });

  const login = await api.post('/api/auth/login', {
    body: { email: admin.email, password },
  });
  assert.equal(login.status, 200);
  const cookie = `${env.authCookieName}=${readCookie(login.getSetCookie(), env.authCookieName)}`;

  const placed = await api.post('/api/orders', {
    body: {
      restaurantSlug: restaurant.slug,
      anonymousSessionId: session.anonymousSessionId,
      tableNumber: 12,
      items: [{ dishId: dish.id, quantity: 2 }],
    },
  });
  assert.equal(placed.status, 201);
  const orderId = placed.body.order.id;

  const board = await api.get('/api/admin/orders?date=all', { cookie });
  assert.equal(board.status, 200);
  assert.equal(board.body.restaurant.id, restaurant.id);
  assert.ok(board.body.orders.every((order) => order.id !== foreignOrder.id));
  const mine = board.body.orders.find((order) => order.id === orderId);
  assert.ok(mine);
  assert.equal(mine.tableNumber, 12);
  assert.equal(mine.items.length, 1);
  assert.equal(mine.items[0].dishNameSnapshot, 'Board Biryani');
  assert.equal(mine.items[0].quantity, 2);
  assert.equal(mine.total, 620);

  const accepted = await api.patch(`/api/admin/orders/${orderId}/status`, {
    cookie,
    body: { status: 'COMPLETED' },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.order.status, 'COMPLETED');

  const steal = await api.patch(`/api/admin/orders/${foreignOrder.id}/status`, {
    cookie,
    body: { status: 'COMPLETED' },
  });
  assert.equal(steal.status, 404);
});
