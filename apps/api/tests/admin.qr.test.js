import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('table QR codes are restaurant-scoped and bind sessions', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'QrOwn!23456';
  const passwordHash = await hashPassword(password);

  const restaurantA = await prisma.restaurant.create({
    data: {
      name: `QR A ${suffix}`,
      slug: `qr-a-${suffix}`,
      status: 'ACTIVE',
      email: `qr-a-${suffix}@example.com`,
    },
  });

  const restaurantB = await prisma.restaurant.create({
    data: {
      name: `QR B ${suffix}`,
      slug: `qr-b-${suffix}`,
      status: 'ACTIVE',
      email: `qr-b-${suffix}@example.com`,
    },
  });

  const adminA = await prisma.user.create({
    data: {
      name: 'QR Admin A',
      email: `qr-admin-a-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurantA.id,
    },
  });

  const tableA = await prisma.diningTable.create({
    data: {
      restaurantId: restaurantA.id,
      tableNumber: 12,
      capacity: 4,
      isActive: true,
    },
  });

  const tableB = await prisma.diningTable.create({
    data: {
      restaurantId: restaurantB.id,
      tableNumber: 12,
      capacity: 2,
      isActive: true,
    },
  });

  t.after(async () => {
    await prisma.session.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.diningTable.deleteMany({
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

  await t.test('generate QR encodes own restaurant slug and table number only', async () => {
    const qr = await api.post(`/api/admin/qr-codes/${tableA.id}/generate`, {
      cookie,
      body: {},
    });
    assert.equal(qr.status, 200);
    assert.match(qr.body.menuUrl, new RegExp(`/menu/${restaurantA.slug}\\?table=12`));
    assert.doesNotMatch(qr.body.menuUrl, /tableId=/);
    assert.ok(qr.body.dataUrl.startsWith('data:image/png;base64,'));
    assert.equal(qr.body.table.qrStatus, 'ready');
    assert.ok(qr.body.table.qrGeneratedAt);
  });

  await t.test('cannot generate QR for another restaurant table', async () => {
    const denied = await api.post(`/api/admin/qr-codes/${tableB.id}/generate`, {
      cookie,
      body: {},
    });
    assert.equal(denied.status, 404);
  });

  await t.test('session start binds table for matching restaurant only', async () => {
    const start = await api.post('/api/sessions/start', {
      body: {
        restaurantSlug: restaurantA.slug,
        anonymousSessionId: '11111111-1111-4111-8111-111111111111',
        tableNumber: 12,
      },
    });
    assert.ok([200, 201].includes(start.status), `unexpected status ${start.status}: ${JSON.stringify(start.body)}`);
    assert.equal(start.body.session.tableNumber, 12);
    assert.equal(start.body.session.tableId, tableA.id);

    const cross = await api.post('/api/sessions/start', {
      body: {
        restaurantSlug: restaurantA.slug,
        anonymousSessionId: '22222222-2222-4222-8222-222222222222',
        tableId: tableB.id,
      },
    });
    assert.ok([200, 201].includes(cross.status));
    assert.equal(cross.body.session.tableId, null);
  });

  await t.test('public tables list returns active tables only', async () => {
    const list = await api.get(`/api/restaurants/${restaurantA.slug}/tables`);
    assert.equal(list.status, 200);
    assert.equal(list.body.tables.length, 1);
    assert.equal(list.body.tables[0].tableNumber, 12);
  });
});
