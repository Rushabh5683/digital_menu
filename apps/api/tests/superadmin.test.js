import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { createTestServer, readCookie } from './helpers/http.js';

test('superadmin restaurant APIs', async (t) => {
  const app = createApp();
  const server = createTestServer(app);
  const baseUrl = await server.listen();
  const api = server.client(baseUrl);

  t.after(async () => {
    await server.close();
  });

  const suffix = Date.now().toString(36);
  const password = 'SuperPass!234';
  const passwordHash = await hashPassword(password);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Platform Owner',
      email: `owner-${suffix}@example.com`,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const otherRestaurant = await prisma.restaurant.create({
    data: {
      name: `Other ${suffix}`,
      slug: `other-${suffix}`,
      status: 'ACTIVE',
    },
  });

  const restaurantAdmin = await prisma.user.create({
    data: {
      name: 'Other Admin',
      email: `other-admin-${suffix}@example.com`,
      passwordHash,
      role: 'RESTAURANT_ADMIN',
      restaurantId: otherRestaurant.id,
    },
  });

  t.after(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [superAdmin.email, restaurantAdmin.email, `admin-${suffix}@example.com`],
        },
      },
    });
    await prisma.menu.deleteMany({
      where: { restaurant: { slug: { startsWith: `phase2-${suffix}` } } },
    });
    await prisma.restaurant.deleteMany({
      where: {
        OR: [{ id: otherRestaurant.id }, { slug: { startsWith: `phase2-${suffix}` } }],
      },
    });
  });

  async function loginAs(email) {
    const res = await api.post('/api/auth/login', { body: { email, password } });
    assert.equal(res.status, 200);
    const token = readCookie(res.getSetCookie(), env.authCookieName);
    return `${env.authCookieName}=${token}`;
  }

  await t.test('restaurant admin cannot access superadmin APIs', async () => {
    const cookie = await loginAs(restaurantAdmin.email);
    const res = await api.get('/api/superadmin/dashboard', { cookie });
    assert.equal(res.status, 403);
  });

  await t.test('super admin can create, list, update status, and delete', async () => {
    const cookie = await loginAs(superAdmin.email);

    const created = await api.post('/api/superadmin/restaurants', {
      cookie,
      body: {
        name: `Phase2 Café ${suffix}`,
        slug: `phase2-${suffix}`,
        description: 'Test venue',
        email: `venue-${suffix}@example.com`,
        phone: '9999900000',
        address: 'Test Street',
        status: 'PENDING',
        adminName: 'Venue Admin',
        adminEmail: `admin-${suffix}@example.com`,
        temporaryPassword: 'TempPass!234',
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.restaurant.slug, `phase2-${suffix}`);
    assert.equal(created.body.restaurant.status, 'PENDING');
    assert.equal(created.body.restaurant.menuStatus, 'DRAFT');
    assert.equal(created.body.restaurant.admin.email, `admin-${suffix}@example.com`);

    const restaurantId = created.body.restaurant.id;

    const listed = await api.get('/api/superadmin/restaurants?search=phase2', { cookie });
    assert.equal(listed.status, 200);
    assert.ok(listed.body.restaurants.some((row) => row.id === restaurantId));

    const activated = await api.request('PATCH', `/api/superadmin/restaurants/${restaurantId}/status`, {
      cookie,
      body: { status: 'ACTIVE' },
    });
    assert.equal(activated.status, 200);
    assert.equal(activated.body.restaurant.status, 'ACTIVE');

    const dashboard = await api.get('/api/superadmin/dashboard', { cookie });
    assert.equal(dashboard.status, 200);
    assert.ok(dashboard.body.totals.restaurants >= 1);

    const deleted = await api.request('DELETE', `/api/superadmin/restaurants/${restaurantId}`, {
      cookie,
    });
    assert.equal(deleted.status, 200);
  });
});
