import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('restaurant admin table APIs enforce ownership and uniqueness', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'TableOwn!234';
  const passwordHash = await hashPassword(password);

  const restaurantA = await prisma.restaurant.create({
    data: {
      name: `Tables A ${suffix}`,
      slug: `tables-a-${suffix}`,
      status: 'ACTIVE',
      email: `tables-a-${suffix}@example.com`,
    },
  });

  const restaurantB = await prisma.restaurant.create({
    data: {
      name: `Tables B ${suffix}`,
      slug: `tables-b-${suffix}`,
      status: 'ACTIVE',
      email: `tables-b-${suffix}@example.com`,
    },
  });

  const adminA = await prisma.user.create({
    data: {
      name: 'Tables Admin A',
      email: `tables-admin-a-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurantA.id,
    },
  });

  const foreignTable = await prisma.diningTable.create({
    data: {
      restaurantId: restaurantB.id,
      tableNumber: 7,
      capacity: 4,
      isActive: true,
    },
  });

  t.after(async () => {
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

  await t.test('creates table and rejects duplicate numbers', async () => {
    const created = await api.post('/api/admin/tables', {
      cookie,
      body: { tableNumber: 1, capacity: 4, name: 'Window' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.table.tableNumber, 1);
    assert.equal(created.body.table.label, 'Table 01');
    assert.equal(created.body.table.capacity, 4);
    assert.match(created.body.table.menuUrl, /table=1/);

    const dup = await api.post('/api/admin/tables', {
      cookie,
      body: { tableNumber: 1 },
    });
    assert.equal(dup.status, 409);
  });

  await t.test('bulk create skips existing numbers', async () => {
    const bulk = await api.post('/api/admin/tables/bulk', {
      cookie,
      body: { from: 1, to: 3, capacity: 2 },
    });
    assert.equal(bulk.status, 201);
    assert.equal(bulk.body.createdCount, 2);
    assert.deepEqual(bulk.body.skipped, [1]);
  });

  await t.test('cannot mutate another restaurant table', async () => {
    const patch = await api.patch(`/api/admin/tables/${foreignTable.id}`, {
      cookie,
      body: { capacity: 99 },
    });
    assert.equal(patch.status, 404);

    const del = await api.delete(`/api/admin/tables/${foreignTable.id}`, { cookie });
    assert.equal(del.status, 404);

    const qr = await api.get(`/api/admin/tables/${foreignTable.id}/qr`, { cookie });
    assert.equal(qr.status, 404);

    const still = await prisma.diningTable.findUnique({ where: { id: foreignTable.id } });
    assert.ok(still);
    assert.equal(still.capacity, 4);
  });

  await t.test('activate/deactivate and QR payload', async () => {
    const list = await api.get('/api/admin/tables', { cookie });
    assert.equal(list.status, 200);
    const table = list.body.tables.find((row) => row.tableNumber === 2);
    assert.ok(table);

    const off = await api.post(`/api/admin/tables/${table.id}/deactivate`, {
      cookie,
      body: {},
    });
    assert.equal(off.status, 200);
    assert.equal(off.body.table.isActive, false);

    const qr = await api.get(`/api/admin/tables/${table.id}/qr`, { cookie });
    assert.equal(qr.status, 200);
    assert.ok(qr.body.dataUrl.startsWith('data:image/png;base64,'));
    assert.match(qr.body.menuUrl, new RegExp(`/menu/${restaurantA.slug}`));
    assert.match(qr.body.menuUrl, /table=2/);
  });
});
