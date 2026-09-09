import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createTestServer } from './helpers/http.js';

function cuidLike(suffix) {
  // 25-char lowercase alphanumeric (Prisma cuid shape)
  return `c${String(suffix).padStart(24, 'x')}`.slice(0, 25);
}

test('analytics ingest rejects cross-restaurant ids and duplicates clientEventId', async (t) => {
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
      name: `Analytics A ${suffix}`,
      slug: `analytics-a-${suffix}`,
      status: 'ACTIVE',
      email: `a-${suffix}@example.com`,
      phone: '1',
      address: 'A',
    },
  });
  const restaurantB = await prisma.restaurant.create({
    data: {
      name: `Analytics B ${suffix}`,
      slug: `analytics-b-${suffix}`,
      status: 'ACTIVE',
      email: `b-${suffix}@example.com`,
      phone: '2',
      address: 'B',
    },
  });

  const menuA = await prisma.menu.create({
    data: {
      restaurantId: restaurantA.id,
      name: 'Menu A',
      isPublished: true,
    },
  });
  const categoryA = await prisma.category.create({
    data: {
      menuId: menuA.id,
      name: 'Starters',
      displayOrder: 1,
    },
  });
  const dishA = await prisma.dish.create({
    data: {
      categoryId: categoryA.id,
      name: 'Soup A',
      description: 'Test soup A',
      price: 100,
      isAvailable: true,
      displayOrder: 1,
    },
  });

  const menuB = await prisma.menu.create({
    data: {
      restaurantId: restaurantB.id,
      name: 'Menu B',
      isPublished: true,
    },
  });
  const categoryB = await prisma.category.create({
    data: {
      menuId: menuB.id,
      name: 'Starters',
      displayOrder: 1,
    },
  });
  const dishB = await prisma.dish.create({
    data: {
      categoryId: categoryB.id,
      name: 'Soup B',
      description: 'Test soup B',
      price: 120,
      isAvailable: true,
      displayOrder: 1,
    },
  });

  const sessionA = await prisma.session.create({
    data: {
      restaurantId: restaurantA.id,
      anonymousSessionId: randomUUID(),
    },
  });

  t.after(async () => {
    await prisma.analyticsEvent.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.session.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.dish.deleteMany({
      where: { category: { menu: { restaurantId: { in: [restaurantA.id, restaurantB.id] } } } },
    });
    await prisma.category.deleteMany({
      where: { menu: { restaurantId: { in: [restaurantA.id, restaurantB.id] } } },
    });
    await prisma.menu.deleteMany({
      where: { restaurantId: { in: [restaurantA.id, restaurantB.id] } },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantA.id, restaurantB.id] } },
    });
  });

  await t.test('rejects mismatched restaurantId vs session', async () => {
    const res = await api.post('/api/analytics/events', {
      body: {
        sessionId: sessionA.id,
        restaurantId: restaurantB.id,
        events: [{ eventType: 'MENU_OPENED', timestamp: new Date().toISOString() }],
      },
    });
    assert.equal(res.status, 403);
  });

  await t.test('rejects dish from another restaurant', async () => {
    const res = await api.post('/api/analytics/events', {
      body: {
        sessionId: sessionA.id,
        restaurantId: restaurantA.id,
        events: [
          {
            eventType: 'DISH_VIEWED',
            dishId: dishB.id,
            categoryId: categoryB.id,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
    assert.equal(res.status, 400);
  });

  await t.test('rejects missing session', async () => {
    const res = await api.post('/api/analytics/events', {
      body: {
        sessionId: cuidLike(`miss${suffix}`),
        restaurantId: restaurantA.id,
        events: [{ eventType: 'MENU_OPENED', timestamp: new Date().toISOString() }],
      },
    });
    assert.ok(res.status === 404 || res.status === 400);
  });

  await t.test('accepts valid event and skips duplicate clientEventId', async () => {
    const clientEventId = randomUUID();
    const first = await api.post('/api/analytics/events', {
      body: {
        sessionId: sessionA.id,
        restaurantId: restaurantA.id,
        events: [
          {
            eventType: 'DISH_VIEWED',
            dishId: dishA.id,
            categoryId: categoryA.id,
            clientEventId,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.accepted, 1);

    const second = await api.post('/api/analytics/events', {
      body: {
        sessionId: sessionA.id,
        restaurantId: restaurantA.id,
        events: [
          {
            eventType: 'DISH_VIEWED',
            dishId: dishA.id,
            categoryId: categoryA.id,
            clientEventId,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.accepted, 0);
    assert.equal(second.body.duplicatesSkipped, 1);

    const count = await prisma.analyticsEvent.count({
      where: { clientEventId },
    });
    assert.equal(count, 1);
  });
});
