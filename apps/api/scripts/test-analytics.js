import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const API = process.env.API_BASE_URL || 'http://localhost:4000';
const SLUG = 'saffron-court';

async function post(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: SLUG } });
  assert(restaurant, 'seed restaurant missing');

  const menu = await prisma.menu.findFirst({
    where: { restaurantId: restaurant.id, isPublished: true },
    include: {
      categories: {
        include: { dishes: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
  assert(menu, 'published menu missing');

  const biryani = menu.categories.find((c) => c.name === 'Biryani');
  const main = menu.categories.find((c) => c.name === 'Main Course');
  assert(biryani && main, 'expected Biryani and Main Course');
  const dish = biryani.dishes[0];

  const anonymousSessionId = randomUUID();
  const started = await post('/api/sessions/start', {
    restaurantSlug: SLUG,
    anonymousSessionId,
  });
  assert(started.status === 201 || started.status === 200, 'session start failed');
  const sessionId = started.json.session.id;

  const ingest = await post('/api/analytics/events', {
    sessionId,
    restaurantId: restaurant.id,
    events: [
      { eventType: 'MENU_OPENED', timestamp: new Date().toISOString() },
      {
        eventType: 'CATEGORY_VIEWED',
        categoryId: main.id,
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'CATEGORY_ATTENTION',
        categoryId: main.id,
        timestamp: new Date().toISOString(),
        metadata: { durationMs: 46000 },
      },
      {
        eventType: 'CATEGORY_VIEWED',
        categoryId: biryani.id,
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'CATEGORY_ATTENTION',
        categoryId: biryani.id,
        timestamp: new Date().toISOString(),
        metadata: { durationMs: 38000 },
      },
      {
        eventType: 'DISH_VIEWED',
        categoryId: biryani.id,
        dishId: dish.id,
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'DISH_ATTENTION',
        categoryId: biryani.id,
        dishId: dish.id,
        timestamp: new Date().toISOString(),
        metadata: { durationMs: 12000 },
      },
      {
        eventType: 'SEARCH_PERFORMED',
        timestamp: new Date().toISOString(),
        metadata: { query: 'biryani', resultCount: 7 },
      },
      {
        eventType: 'DISH_INFO_VIEWED',
        categoryId: biryani.id,
        dishId: dish.id,
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'DISH_SELECTED',
        categoryId: biryani.id,
        dishId: dish.id,
        timestamp: new Date().toISOString(),
        metadata: { name: dish.name, price: Number(dish.price) },
      },
      {
        eventType: 'MENU_EXITED',
        timestamp: new Date().toISOString(),
        metadata: { reason: 'test' },
      },
    ],
  });

  assert(ingest.status === 201, `ingest failed: ${ingest.status} ${JSON.stringify(ingest.json)}`);
  assert(ingest.json.accepted === 11, `expected 11 accepted, got ${ingest.json.accepted}`);

  const bad = await post('/api/analytics/events', {
    sessionId,
    restaurantId: restaurant.id,
    events: [{ eventType: 'SCROLL_PIXEL', timestamp: new Date().toISOString() }],
  });
  assert(bad.status === 400, 'invalid eventType should 400');

  const counts = await prisma.analyticsEvent.groupBy({
    by: ['eventType'],
    where: { sessionId },
    _count: { _all: true },
  });

  console.log('Accepted events for session', sessionId);
  for (const row of counts.sort((a, b) => a.eventType.localeCompare(b.eventType))) {
    console.log(`  ${row.eventType}: ${row._count._all}`);
  }

  const attention = await prisma.analyticsEvent.findMany({
    where: { sessionId, eventType: { in: ['CATEGORY_ATTENTION', 'DISH_ATTENTION'] } },
    orderBy: { timestamp: 'asc' },
  });
  console.log('Attention metadata:');
  for (const event of attention) {
    console.log(`  ${event.eventType}`, event.metadata);
  }

  console.log('\nAnalytics ingest tests passed.');
}

main()
  .catch((error) => {
    console.error('\nFAILED:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
