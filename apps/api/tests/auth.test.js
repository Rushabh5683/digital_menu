import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('auth: login, me, logout, isolation, and invalid session', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);

  const restaurantA = await prisma.restaurant.create({
    data: {
      name: `Auth Test A ${suffix}`,
      slug: `auth-a-${suffix}`,
      description: 'Isolation restaurant A',
      status: 'ACTIVE',
    },
  });

  const restaurantB = await prisma.restaurant.create({
    data: {
      name: `Auth Test B ${suffix}`,
      slug: `auth-b-${suffix}`,
      description: 'Isolation restaurant B',
      status: 'ACTIVE',
    },
  });

  const password = 'TestPass!234';
  const passwordHash = await hashPassword(password);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Test Super',
      email: `super-${suffix}@example.com`,
      passwordHash,
      role: 'SUPER_ADMIN',
      restaurantId: null,
    },
  });

  const adminA = await prisma.user.create({
    data: {
      name: 'Admin A',
      email: `admin-a-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurantA.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Admin B',
      email: `admin-b-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurantB.id,
    },
  });

  await prisma.menu.create({
    data: {
      restaurantId: restaurantA.id,
      name: 'Test Menu',
      isPublished: true,
    },
  });

  t.after(async () => {
    await prisma.menu.deleteMany({ where: { restaurantId: restaurantA.id } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [superAdmin.email, adminA.email, `admin-b-${suffix}@example.com`],
        },
      },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantA.id, restaurantB.id] } },
    });
  });

  await t.test('rejects invalid credentials', async () => {
    const res = await api.post('/api/auth/login', {
      body: { email: adminA.email, password: 'wrong-password' },
    });
    assert.equal(res.status, 401);
  });

  await t.test('restaurant admin login sets httpOnly cookie and /me works', async () => {
    const loginRes = await api.post('/api/auth/login', {
      body: { email: adminA.email, password },
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.role, 'RESTAURANT_ADMIN');
    assert.equal(loginRes.body.user.restaurantId, restaurantA.id);

    const token = readCookie(loginRes.getSetCookie(), env.authCookieName);
    assert.ok(token, 'expected auth cookie');

    const meRes = await api.get('/api/auth/me', {
      cookie: `${env.authCookieName}=${token}`,
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, adminA.email);
  });

  await t.test('super admin can list restaurants', async () => {
    const loginRes = await api.post('/api/auth/login', {
      body: { email: superAdmin.email, password },
    });
    const token = readCookie(loginRes.getSetCookie(), env.authCookieName);

    const res = await api.get('/api/super/restaurants?pageSize=50', {
      cookie: `${env.authCookieName}=${token}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.restaurants));
    assert.ok(
      res.body.restaurants.some((row) => row.id === restaurantA.id) ||
        (await api.get(
          `/api/super/restaurants?search=${encodeURIComponent(restaurantA.slug)}`,
          { cookie: `${env.authCookieName}=${token}` },
        )).body.restaurants?.some((row) => row.id === restaurantA.id),
    );
  });

  await t.test('restaurant admin cannot access another restaurant analytics', async () => {
    const loginRes = await api.post('/api/auth/login', {
      body: { email: adminA.email, password },
    });
    const token = readCookie(loginRes.getSetCookie(), env.authCookieName);
    const cookie = `${env.authCookieName}=${token}`;

    const denied = await api.get(`/api/analytics/overview/${restaurantB.id}`, { cookie });
    assert.equal(denied.status, 403);

    const allowed = await api.get(`/api/analytics/overview/${restaurantA.id}`, { cookie });
    assert.equal(allowed.status, 200);
  });

  await t.test('restaurant admin cannot call super routes', async () => {
    const loginRes = await api.post('/api/auth/login', {
      body: { email: adminA.email, password },
    });
    const token = readCookie(loginRes.getSetCookie(), env.authCookieName);

    const res = await api.get('/api/super/restaurants', {
      cookie: `${env.authCookieName}=${token}`,
    });
    assert.equal(res.status, 403);
  });

  await t.test('unauthenticated analytics access is rejected', async () => {
    const res = await api.get(`/api/analytics/overview/${restaurantA.id}`);
    assert.equal(res.status, 401);
  });

  await t.test('invalid token is rejected', async () => {
    const res = await api.get('/api/auth/me', {
      cookie: `${env.authCookieName}=not-a-real-token`,
    });
    assert.equal(res.status, 401);
  });

  await t.test('expired token is rejected', async () => {
    const dead = jwt.sign(
      {
        sub: adminA.id,
        role: adminA.role,
        restaurantId: adminA.restaurantId,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      env.jwtSecret,
    );

    const res = await api.get('/api/auth/me', {
      cookie: `${env.authCookieName}=${dead}`,
    });
    assert.equal(res.status, 401);
  });

  await t.test('logout clears cookie', async () => {
    const loginRes = await api.post('/api/auth/login', {
      body: { email: adminA.email, password },
    });
    const token = readCookie(loginRes.getSetCookie(), env.authCookieName);

    const logoutRes = await api.post('/api/auth/logout', {
      cookie: `${env.authCookieName}=${token}`,
      body: {},
    });
    assert.equal(logoutRes.status, 200);

    const cleared = readCookie(logoutRes.getSetCookie(), env.authCookieName);
    assert.ok(cleared === '' || cleared == null);

    const meRes = await api.get('/api/auth/me');
    assert.equal(meRes.status, 401);
  });

  await t.test('public menu remains accessible without auth', async () => {
    const res = await api.get(`/api/restaurants/${restaurantA.slug}/menu`);
    assert.equal(res.status, 200);
    assert.equal(res.body.restaurant.slug, restaurantA.slug);
  });
});
