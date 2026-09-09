import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('Phase 10 ordering backend: create, price safety, auth, status', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'OrderOwn!234';
  const passwordHash = await hashPassword(password);

  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Orders R ${suffix}`,
      slug: `orders-r-${suffix}`,
      status: 'ACTIVE',
      email: `orders-${suffix}@example.com`,
    },
  });

  const other = await prisma.restaurant.create({
    data: {
      name: `Orders Other ${suffix}`,
      slug: `orders-other-${suffix}`,
      status: 'ACTIVE',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Orders Admin',
      email: `orders-admin-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurant.id,
    },
  });

  const otherAdmin = await prisma.user.create({
    data: {
      name: 'Other Admin',
      email: `orders-other-admin-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: other.id,
    },
  });

  const menu = await prisma.menu.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Main',
      isPublished: true,
    },
  });

  const category = await prisma.category.create({
    data: {
      menuId: menu.id,
      name: 'Mains',
      displayOrder: 1,
      isEnabled: true,
    },
  });

  const dish = await prisma.dish.create({
    data: {
      categoryId: category.id,
      name: 'Test Curry',
      description: 'Spicy',
      price: 250,
      isAvailable: true,
      displayOrder: 1,
    },
  });

  const unavailable = await prisma.dish.create({
    data: {
      categoryId: category.id,
      name: 'Sold Out',
      description: 'N/A',
      price: 100,
      isAvailable: false,
      displayOrder: 2,
    },
  });

  const table = await prisma.diningTable.create({
    data: {
      restaurantId: restaurant.id,
      tableNumber: 3,
      isActive: true,
    },
  });

  const foreignTable = await prisma.diningTable.create({
    data: {
      restaurantId: other.id,
      tableNumber: 9,
      isActive: true,
    },
  });

  const session = await prisma.session.create({
    data: {
      restaurantId: restaurant.id,
      anonymousSessionId: '44444444-4444-4444-8444-444444444444',
      tableId: table.id,
    },
  });

  t.after(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { restaurantId: { in: [restaurant.id, other.id] } } },
    });
    await prisma.order.deleteMany({
      where: { restaurantId: { in: [restaurant.id, other.id] } },
    });
    await prisma.session.deleteMany({
      where: { restaurantId: { in: [restaurant.id, other.id] } },
    });
    await prisma.dish.deleteMany({ where: { categoryId: category.id } });
    await prisma.category.deleteMany({ where: { id: category.id } });
    await prisma.menu.deleteMany({ where: { id: menu.id } });
    await prisma.diningTable.deleteMany({
      where: { restaurantId: { in: [restaurant.id, other.id] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, otherAdmin.id] } } });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurant.id, other.id] } },
    });
  });

  const login = await api.post('/api/auth/login', {
    body: { email: admin.email, password },
  });
  assert.equal(login.status, 200);
  const cookie = `${env.authCookieName}=${readCookie(login.getSetCookie(), env.authCookieName)}`;

  const otherLogin = await api.post('/api/auth/login', {
    body: { email: otherAdmin.email, password },
  });
  assert.equal(otherLogin.status, 200);
  const otherCookie = `${env.authCookieName}=${readCookie(otherLogin.getSetCookie(), env.authCookieName)}`;

  let createdOrderId = null;

  await t.test('POST /api/orders creates order with server-side prices', async () => {
    const res = await api.post('/api/orders', {
      body: {
        restaurantSlug: restaurant.slug,
        restaurantId: other.id, // must be ignored
        anonymousSessionId: session.anonymousSessionId,
        tableNumber: 3,
        items: [
          {
            dishId: dish.id,
            quantity: 2,
            price: 1,
            unitPrice: 1,
            priceSnapshot: 1,
          },
        ],
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.status, 'PLACED');
    assert.equal(res.body.order.subtotal, 500);
    assert.equal(res.body.order.total, 500);
    assert.equal(res.body.order.restaurantId, restaurant.id);
    assert.equal(res.body.order.tableNumber, 3);
    assert.match(res.body.order.orderNumber, /^ORD-\d{8}-\d{4}$/);
    assert.equal(res.body.order.items.length, 1);
    assert.equal(res.body.order.items[0].dishNameSnapshot, 'Test Curry');
    assert.equal(res.body.order.items[0].priceSnapshot, 250);
    assert.equal(res.body.order.items[0].quantity, 2);
    assert.equal(res.body.order.items[0].subtotal, 500);
    createdOrderId = res.body.order.id;
  });

  await t.test('keeps historical snapshots after dish price change', async () => {
    await prisma.dish.update({
      where: { id: dish.id },
      data: { price: 999 },
    });

    const res = await api.get(`/api/orders/${createdOrderId}`, { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.order.items[0].priceSnapshot, 250);
    assert.equal(res.body.order.total, 500);

    await prisma.dish.update({
      where: { id: dish.id },
      data: { price: 250 },
    });
  });

  await t.test('rejects unavailable dishes', async () => {
    const res = await api.post('/api/orders', {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: session.anonymousSessionId,
        tableNumber: 3,
        items: [{ dishId: unavailable.id, quantity: 1 }],
      },
    });
    assert.equal(res.status, 400);
  });

  await t.test('rejects foreign restaurant dishes', async () => {
    const foreignMenu = await prisma.menu.create({
      data: { restaurantId: other.id, name: 'X', isPublished: true },
    });
    const foreignCategory = await prisma.category.create({
      data: { menuId: foreignMenu.id, name: 'X', displayOrder: 1, isEnabled: true },
    });
    const foreignDish = await prisma.dish.create({
      data: {
        categoryId: foreignCategory.id,
        name: 'Alien',
        description: 'Nope',
        price: 10,
        isAvailable: true,
        displayOrder: 1,
      },
    });

    t.after(async () => {
      await prisma.dish.deleteMany({ where: { id: foreignDish.id } });
      await prisma.category.deleteMany({ where: { id: foreignCategory.id } });
      await prisma.menu.deleteMany({ where: { id: foreignMenu.id } });
    });

    const res = await api.post('/api/orders', {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: session.anonymousSessionId,
        tableNumber: 3,
        items: [{ dishId: foreignDish.id, quantity: 1 }],
      },
    });
    assert.equal(res.status, 400);
  });

  await t.test('rejects another restaurant table', async () => {
    const res = await api.post('/api/orders', {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: session.anonymousSessionId,
        tableId: foreignTable.id,
        items: [{ dishId: dish.id, quantity: 1 }],
      },
    });
    assert.equal(res.status, 400);
  });

  await t.test('GET /api/orders/:id requires auth and ownership', async () => {
    const anon = await api.get(`/api/orders/${createdOrderId}`);
    assert.equal(anon.status, 401);

    const foreign = await api.get(`/api/orders/${createdOrderId}`, { cookie: otherCookie });
    assert.equal(foreign.status, 404);

    const ok = await api.get(`/api/orders/${createdOrderId}`, { cookie });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.order.id, createdOrderId);
  });

  await t.test('GET /api/restaurants/:id/orders lists for owner only', async () => {
    const forbidden = await api.get(`/api/restaurants/${restaurant.id}/orders`, {
      cookie: otherCookie,
    });
    assert.equal(forbidden.status, 403);

    const list = await api.get(`/api/restaurants/${restaurant.id}/orders`, { cookie });
    assert.equal(list.status, 200);
    assert.ok(list.body.orders.some((order) => order.id === createdOrderId));
  });

  await t.test('PATCH /api/orders/:id/status enforces transitions and ownership', async () => {
    const foreign = await api.patch(`/api/orders/${createdOrderId}/status`, {
      cookie: otherCookie,
      body: { status: 'COMPLETED' },
    });
    assert.equal(foreign.status, 404);

    const badJump = await api.patch(`/api/orders/${createdOrderId}/status`, {
      cookie,
      body: { status: 'PREPARING' },
    });
    assert.equal(badJump.status, 400);

    const completed = await api.patch(`/api/orders/${createdOrderId}/status`, {
      cookie,
      body: { status: 'COMPLETED' },
    });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.order.status, 'COMPLETED');
  });

  await t.test('/place alias still works', async () => {
    const res = await api.post('/api/orders/place', {
      body: {
        restaurantSlug: restaurant.slug,
        anonymousSessionId: session.anonymousSessionId,
        tableNumber: 3,
        items: [{ dishId: dish.id, quantity: 1 }],
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.total, 250);
  });

  await t.test('customer can track own order via session; others cannot', async () => {
    const latest = await api.get(
      `/api/orders/mine?restaurantSlug=${encodeURIComponent(restaurant.slug)}&anonymousSessionId=${encodeURIComponent(session.anonymousSessionId)}`,
    );
    assert.equal(latest.status, 200);
    const trackId = latest.body.order.id;

    const track = await api.get(
      `/api/orders/${trackId}/track?restaurantSlug=${encodeURIComponent(restaurant.slug)}&anonymousSessionId=${encodeURIComponent(session.anonymousSessionId)}`,
    );
    assert.equal(track.status, 200);
    assert.equal(track.body.order.id, trackId);

    const mine = await api.get(
      `/api/orders/mine?restaurantSlug=${encodeURIComponent(restaurant.slug)}&anonymousSessionId=${encodeURIComponent(session.anonymousSessionId)}`,
    );
    assert.equal(mine.status, 200);
    assert.ok(mine.body.order);
    assert.equal(mine.body.order.sessionId, session.id);

    // Same-table companion sessions may poll the open ticket (shared dining).
    const companionSession = await prisma.session.create({
      data: {
        restaurantId: restaurant.id,
        anonymousSessionId: '55555555-5555-4555-8555-555555555555',
        tableId: table.id,
      },
    });

    // Unbound / other-table sessions must not track by order id alone.
    const foreignSession = await prisma.session.create({
      data: {
        restaurantId: restaurant.id,
        anonymousSessionId: '66666666-6666-4666-8666-666666666666',
      },
    });
    const otherTable = await prisma.diningTable.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: 99,
        isActive: true,
      },
    });
    const otherTableSession = await prisma.session.create({
      data: {
        restaurantId: restaurant.id,
        anonymousSessionId: '77777777-7777-4777-8777-777777777771',
        tableId: otherTable.id,
      },
    });

    t.after(async () => {
      await prisma.session.deleteMany({
        where: {
          id: { in: [companionSession.id, foreignSession.id, otherTableSession.id] },
        },
      });
      await prisma.diningTable.deleteMany({ where: { id: otherTable.id } });
    });

    const companion = await api.get(
      `/api/orders/${trackId}/track?restaurantSlug=${encodeURIComponent(restaurant.slug)}&anonymousSessionId=${encodeURIComponent(companionSession.anonymousSessionId)}`,
    );
    assert.equal(companion.status, 200);
    assert.equal(companion.body.order.id, trackId);

    const deniedUnbound = await api.get(
      `/api/orders/${trackId}/track?restaurantSlug=${encodeURIComponent(restaurant.slug)}&anonymousSessionId=${encodeURIComponent(foreignSession.anonymousSessionId)}`,
    );
    assert.equal(deniedUnbound.status, 404);

    const deniedOtherTable = await api.get(
      `/api/orders/${trackId}/track?restaurantSlug=${encodeURIComponent(restaurant.slug)}&anonymousSessionId=${encodeURIComponent(otherTableSession.anonymousSessionId)}`,
    );
    assert.equal(deniedOtherTable.status, 404);
  });
});
