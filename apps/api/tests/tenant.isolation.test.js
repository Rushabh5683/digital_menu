import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

/**
 * Multi-tenant IDOR suite: Restaurant A admin must never read/mutate Restaurant B.
 * SUPER_ADMIN retains platform access. Customers stay session/table scoped.
 */
test('multi-tenant isolation: restaurant admin cannot access foreign tenant', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'TenantIso!234';
  const passwordHash = await hashPassword(password);

  const restaurantA = await prisma.restaurant.create({
    data: {
      name: `Iso A ${suffix}`,
      slug: `iso-a-${suffix}`,
      status: 'ACTIVE',
      email: `iso-a-${suffix}@example.com`,
      phone: '111',
      address: 'A Street',
    },
  });

  const restaurantB = await prisma.restaurant.create({
    data: {
      name: `Iso B ${suffix}`,
      slug: `iso-b-${suffix}`,
      status: 'ACTIVE',
      email: `iso-b-${suffix}@example.com`,
      phone: '222',
      address: 'B Street',
    },
  });

  const adminA = await prisma.user.create({
    data: {
      name: 'Iso Admin A',
      email: `iso-admin-a-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurantA.id,
    },
  });

  const adminB = await prisma.user.create({
    data: {
      name: 'Iso Admin B',
      email: `iso-admin-b-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurantB.id,
    },
  });

  const superUser = await prisma.user.create({
    data: {
      name: 'Iso Super',
      email: `iso-super-${suffix}@example.com`,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const menuB = await prisma.menu.create({
    data: {
      restaurantId: restaurantB.id,
      name: 'B Menu',
      isPublished: true,
    },
  });

  const categoryB = await prisma.category.create({
    data: {
      menuId: menuB.id,
      name: 'B Category',
      displayOrder: 1,
      isEnabled: true,
    },
  });

  const dishB = await prisma.dish.create({
    data: {
      categoryId: categoryB.id,
      name: 'B Dish',
      description: 'Foreign',
      price: 250,
      displayOrder: 1,
      isAvailable: true,
    },
  });

  const tableB = await prisma.diningTable.create({
    data: {
      restaurantId: restaurantB.id,
      tableNumber: 9,
      capacity: 4,
      isActive: true,
    },
  });

  const sessionB = await prisma.session.create({
    data: {
      restaurantId: restaurantB.id,
      anonymousSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      tableId: tableB.id,
    },
  });

  const orderB = await prisma.order.create({
    data: {
      restaurantId: restaurantB.id,
      tableId: tableB.id,
      sessionId: sessionB.id,
      orderNumber: `ISO-${suffix}`,
      status: 'PLACED',
      subtotal: 250,
      total: 250,
      items: {
        create: [
          {
            dishId: dishB.id,
            dishNameSnapshot: 'B Dish',
            priceSnapshot: 250,
            quantity: 1,
            subtotal: 250,
          },
        ],
      },
    },
  });

  t.after(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { restaurantId: { in: [restaurantA.id, restaurantB.id] } } },
    });
    await prisma.order.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.session.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.analyticsEvent.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.dish.deleteMany({ where: { id: dishB.id } });
    await prisma.category.deleteMany({ where: { id: categoryB.id } });
    await prisma.menu.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.diningTable.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminA.id, adminB.id, superUser.id] } },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantA.id, restaurantB.id] } },
    });
  });

  const loginA = await api.post('/api/auth/login', {
    body: { email: adminA.email, password },
  });
  assert.equal(loginA.status, 200);
  const cookieA = `${env.authCookieName}=${readCookie(loginA.getSetCookie(), env.authCookieName)}`;

  const loginSuper = await api.post('/api/auth/login', {
    body: { email: superUser.email, password },
  });
  assert.equal(loginSuper.status, 200);
  const cookieSuper = `${env.authCookieName}=${readCookie(loginSuper.getSetCookie(), env.authCookieName)}`;

  await t.test('admin A cannot read restaurant B via admin restaurant endpoint', async () => {
    const own = await api.get('/api/admin/restaurant', { cookie: cookieA });
    assert.equal(own.status, 200);
    assert.equal(own.body.restaurant.id, restaurantA.id);

    // Spoofing restaurantId in body must not retarget the update to B.
    const spoof = await api.patch('/api/admin/restaurant', {
      cookie: cookieA,
      body: { restaurantId: restaurantB.id, description: `iso-a-desc-${suffix}` },
    });
    assert.equal(spoof.status, 200);
    assert.equal(spoof.body.restaurant.id, restaurantA.id);
    assert.equal(spoof.body.restaurant.description, `iso-a-desc-${suffix}`);

    const bStill = await prisma.restaurant.findUnique({ where: { id: restaurantB.id } });
    assert.equal(bStill.name, restaurantB.name);
    assert.notEqual(bStill.description, `iso-a-desc-${suffix}`);
  });

  await t.test('admin A cannot modify restaurant B dish', async () => {
    const patch = await api.patch(`/api/admin/dishes/${dishB.id}`, {
      cookie: cookieA,
      body: { price: 1, name: 'Stolen' },
    });
    assert.equal(patch.status, 404);

    const still = await prisma.dish.findUnique({ where: { id: dishB.id } });
    assert.equal(Number(still.price), 250);
    assert.equal(still.name, 'B Dish');
  });

  await t.test('admin A cannot delete restaurant B table', async () => {
    const del = await api.delete(`/api/admin/tables/${tableB.id}`, { cookie: cookieA });
    assert.equal(del.status, 404);

    const still = await prisma.diningTable.findUnique({ where: { id: tableB.id } });
    assert.ok(still);
  });

  await t.test('admin A cannot read restaurant B order', async () => {
    const byId = await api.get(`/api/orders/${orderB.id}`, { cookie: cookieA });
    assert.equal(byId.status, 404);

    const listViaB = await api.get(`/api/restaurants/${restaurantB.id}/orders`, {
      cookie: cookieA,
    });
    assert.equal(listViaB.status, 403);

    const adminOrders = await api.get('/api/admin/orders', { cookie: cookieA });
    assert.equal(adminOrders.status, 200);
    const ids = (adminOrders.body.orders || []).map((o) => o.id);
    assert.ok(!ids.includes(orderB.id));
  });

  await t.test('admin A cannot read restaurant B analytics or insights', async () => {
    const overview = await api.get(`/api/analytics/overview/${restaurantB.id}`, {
      cookie: cookieA,
    });
    assert.equal(overview.status, 403);

    const dishes = await api.get(`/api/analytics/dishes/${restaurantB.id}`, {
      cookie: cookieA,
    });
    assert.equal(dishes.status, 403);

    const insights = await api.get(`/api/insights/${restaurantB.id}`, {
      cookie: cookieA,
    });
    assert.equal(insights.status, 403);

    // Own restaurant analytics still works.
    const ownOverview = await api.get(`/api/analytics/overview/${restaurantA.id}`, {
      cookie: cookieA,
    });
    assert.equal(ownOverview.status, 200);
  });

  await t.test('admin A cannot generate restaurant B QR', async () => {
    const qr = await api.post(`/api/admin/qr-codes/${tableB.id}/generate`, {
      cookie: cookieA,
      body: {},
    });
    assert.equal(qr.status, 404);

    const list = await api.get('/api/admin/qr-codes', { cookie: cookieA });
    assert.equal(list.status, 200);
    const tableIds = (list.body.tables || []).map((row) => row.id);
    assert.ok(!tableIds.includes(tableB.id));
  });

  await t.test('admin A cannot use superadmin platform APIs', async () => {
    const dash = await api.get('/api/superadmin/dashboard', { cookie: cookieA });
    assert.equal(dash.status, 403);

    const detail = await api.get(`/api/superadmin/restaurants/${restaurantB.id}`, {
      cookie: cookieA,
    });
    assert.equal(detail.status, 403);
  });

  await t.test('SUPER_ADMIN can read restaurant B platform resources', async () => {
    const detail = await api.get(`/api/superadmin/restaurants/${restaurantB.id}`, {
      cookie: cookieSuper,
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.restaurant.id, restaurantB.id);

    const overview = await api.get(`/api/analytics/overview/${restaurantB.id}`, {
      cookie: cookieSuper,
    });
    assert.equal(overview.status, 200);

    const order = await api.get(`/api/orders/${orderB.id}`, { cookie: cookieSuper });
    assert.equal(order.status, 200);
    assert.equal(order.body.order.id, orderB.id);
  });

  await t.test('public restaurant omits contact PII and inactive is hidden', async () => {
    const pub = await api.get(`/api/restaurants/${restaurantB.slug}`);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.restaurant.slug, restaurantB.slug);
    assert.equal(pub.body.restaurant.email, undefined);
    assert.equal(pub.body.restaurant.phone, undefined);
    assert.equal(pub.body.restaurant.address, undefined);

    await prisma.restaurant.update({
      where: { id: restaurantB.id },
      data: { status: 'INACTIVE' },
    });
    const hidden = await api.get(`/api/restaurants/${restaurantB.slug}`);
    assert.equal(hidden.status, 404);

    await prisma.restaurant.update({
      where: { id: restaurantB.id },
      data: { status: 'ACTIVE' },
    });
  });

  await t.test('customer cannot track foreign order without matching session/table', async () => {
    const foreignSession = await prisma.session.create({
      data: {
        restaurantId: restaurantB.id,
        anonymousSessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      },
    });

    const track = await api.get(
      `/api/orders/${orderB.id}/track?restaurantSlug=${encodeURIComponent(restaurantB.slug)}&anonymousSessionId=${encodeURIComponent(foreignSession.anonymousSessionId)}`,
    );
    assert.equal(track.status, 404);

    // Wrong restaurant slug with B's session id.
    const wrongSlug = await api.get(
      `/api/orders/${orderB.id}/track?restaurantSlug=${encodeURIComponent(restaurantA.slug)}&anonymousSessionId=${encodeURIComponent(sessionB.anonymousSessionId)}`,
    );
    assert.equal(wrongSlug.status, 404);
  });
});
