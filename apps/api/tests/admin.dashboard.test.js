import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('restaurant admin dashboard is scoped to auth restaurant', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'AdminDash!234';
  const passwordHash = await hashPassword(password);

  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Admin Dash ${suffix}`,
      slug: `admin-dash-${suffix}`,
      status: 'ACTIVE',
      email: `dash-${suffix}@example.com`,
    },
  });

  const other = await prisma.restaurant.create({
    data: {
      name: `Other Dash ${suffix}`,
      slug: `other-dash-${suffix}`,
      status: 'ACTIVE',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Dash Admin',
      email: `dash-admin-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurant.id,
    },
  });

  t.after(async () => {
    await prisma.order.deleteMany({
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
  const token = readCookie(login.getSetCookie(), env.authCookieName);
  const cookie = `${env.authCookieName}=${token}`;

  await t.test('dashboard returns auth restaurant only', async () => {
    const res = await api.get('/api/admin/dashboard', { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.restaurant.id, restaurant.id);
    assert.equal(res.body.restaurant.slug, restaurant.slug);
    assert.equal(typeof res.body.kpis.ordersToday, 'number');
    assert.equal(typeof res.body.kpis.menuSessions, 'number');
    assert.ok(Array.isArray(res.body.recentOrders));
    assert.ok(Array.isArray(res.body.insights));
  });

  await t.test('super admin cannot use restaurant admin dashboard', async () => {
    const superHash = await hashPassword(password);
    const superUser = await prisma.user.create({
      data: {
        name: 'Super',
        email: `super-dash-${suffix}@example.com`,
        passwordHash: superHash,
        role: 'SUPER_ADMIN',
      },
    });

    t.after(async () => {
      await prisma.user.deleteMany({ where: { id: superUser.id } });
    });

    const superLogin = await api.post('/api/auth/login', {
      body: { email: superUser.email, password },
    });
    const superCookie = `${env.authCookieName}=${readCookie(superLogin.getSetCookie(), env.authCookieName)}`;
    const denied = await api.get('/api/admin/dashboard', { cookie: superCookie });
    assert.equal(denied.status, 403);
  });
});
