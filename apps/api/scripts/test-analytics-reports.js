import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const API = process.env.API_BASE_URL || 'http://localhost:4000';
const SLUG = 'saffron-court';

async function request(method, path, body, cookie) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${API}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json, response };
}

function readAuthCookie(response) {
  const raw =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
  for (const entry of raw) {
    const part = String(entry).split(';')[0];
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === 'dm_session') {
      return part.slice(eq + 1);
    }
  }
  return null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: SLUG } });
  assert(restaurant, 'restaurant missing — run seed');

  const menu = await prisma.menu.findFirst({
    where: { restaurantId: restaurant.id, isPublished: true },
    include: {
      categories: { include: { dishes: true }, orderBy: { displayOrder: 'asc' } },
    },
  });
  const mainCourse = menu.categories.find((c) => c.name === 'Main Course');
  const biryani = menu.categories.find((c) => c.name === 'Biryani');
  const chickenBiryani = biryani.dishes.find((d) => d.name === 'Chicken Biryani');
  const butterChicken = mainCourse.dishes.find((d) => d.name === 'Butter Chicken');

  const anonymousSessionId = randomUUID();
  const started = await request('POST', '/api/sessions/start', {
    restaurantSlug: SLUG,
    anonymousSessionId,
  });
  assert(started.status === 201 || started.status === 200, 'session start failed');
  const sessionId = started.json.session.id;

  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - 3 * 60 * 1000);
  await prisma.session.update({
    where: { id: sessionId },
    data: { startedAt, endedAt },
  });

  const ingest = await request('POST', '/api/analytics/events', {
    sessionId,
    restaurantId: restaurant.id,
    events: [
      { eventType: 'MENU_OPENED', timestamp: startedAt.toISOString() },
      {
        eventType: 'CATEGORY_VIEWED',
        categoryId: mainCourse.id,
        timestamp: startedAt.toISOString(),
      },
      {
        eventType: 'CATEGORY_ATTENTION',
        categoryId: mainCourse.id,
        timestamp: startedAt.toISOString(),
        metadata: { durationMs: 46000 },
      },
      {
        eventType: 'CATEGORY_VIEWED',
        categoryId: biryani.id,
        timestamp: startedAt.toISOString(),
      },
      {
        eventType: 'CATEGORY_ATTENTION',
        categoryId: biryani.id,
        timestamp: startedAt.toISOString(),
        metadata: { durationMs: 38000 },
      },
      {
        eventType: 'DISH_VIEWED',
        categoryId: biryani.id,
        dishId: chickenBiryani.id,
        timestamp: startedAt.toISOString(),
      },
      {
        eventType: 'DISH_ATTENTION',
        categoryId: biryani.id,
        dishId: chickenBiryani.id,
        timestamp: startedAt.toISOString(),
        metadata: { durationMs: 30000 },
      },
      {
        eventType: 'DISH_VIEWED',
        categoryId: mainCourse.id,
        dishId: butterChicken.id,
        timestamp: startedAt.toISOString(),
      },
      {
        eventType: 'DISH_ATTENTION',
        categoryId: mainCourse.id,
        dishId: butterChicken.id,
        timestamp: startedAt.toISOString(),
        metadata: { durationMs: 8000 },
      },
      {
        eventType: 'DISH_SELECTED',
        categoryId: mainCourse.id,
        dishId: butterChicken.id,
        timestamp: startedAt.toISOString(),
      },
      {
        eventType: 'MENU_EXITED',
        timestamp: endedAt.toISOString(),
      },
    ],
  });
  assert(ingest.status === 201, `ingest failed ${ingest.status}`);

  const login = await request('POST', '/api/auth/login', {
    email: 'admin@saffroncourt.local',
    password: 'RestaurantAdmin!23',
  });
  assert(login.status === 200, 'restaurant admin login failed — run db:seed');
  const token = readAuthCookie(login.response);
  assert(token, 'missing auth cookie');
  const cookie = `dm_session=${token}`;

  const overview = await request('GET', `/api/analytics/overview/${restaurant.id}`, null, cookie);
  assert(overview.status === 200, 'overview failed');
  assert(overview.json.totalMenuSessions >= 1, 'expected sessions');
  assert(overview.json.highestAttentionCategory?.name, 'missing highest attention category');
  assert(overview.json.averageSessionDurationSeconds != null, 'missing avg session duration');
  console.log('overview highest attention category:', overview.json.highestAttentionCategory.name);
  console.log('overview highest attention dish:', overview.json.highestAttentionDish?.name);

  const categories = await request(
    'GET',
    `/api/analytics/categories/${restaurant.id}`,
    null,
    cookie,
  );
  assert(categories.status === 200, 'categories failed');
  const mainRow = categories.json.categories.find((row) => row.name === 'Main Course');
  assert(mainRow.totalAttentionSeconds >= 46, 'main course attention missing');
  assert(mainRow.averageAttentionSeconds > 0, 'main course avg attention');
  console.log('Main Course attention s:', mainRow.totalAttentionSeconds);

  const dishes = await request('GET', `/api/analytics/dishes/${restaurant.id}`, null, cookie);
  assert(dishes.status === 200, 'dishes failed');
  const biryaniDish = dishes.json.dishes.find((row) => row.name === 'Chicken Biryani');
  assert(biryaniDish.totalAttentionSeconds >= 30, 'biryani attention missing');
  assert(typeof biryaniDish.selectionRate === 'number', 'selection rate missing');
  console.log('Chicken Biryani selectionRate:', biryaniDish.selectionRate);

  const trends = await request(
    'GET',
    `/api/analytics/trends/${restaurant.id}?from=${encodeURIComponent(startedAt.toISOString())}&to=${encodeURIComponent(endedAt.toISOString())}`,
    null,
    cookie,
  );
  assert(trends.status === 200, 'trends failed');
  assert(Array.isArray(trends.json.daily), 'daily trends missing');
  assert(trends.json.daily.length >= 1, 'expected trend buckets');

  const badRange = await request(
    'GET',
    `/api/analytics/overview/${restaurant.id}?from=2026-08-30&to=2026-08-01`,
    null,
    cookie,
  );
  assert(badRange.status === 400, 'expected invalid range 400');

  const missing = await request(
    'GET',
    '/api/analytics/overview/notarealcuidxxxxxxxxxx',
    null,
    cookie,
  );
  assert(missing.status === 400 || missing.status === 404, 'expected invalid restaurant');

  console.log('\nAnalytics report API tests passed.');
}

main()
  .catch((error) => {
    console.error('\nFAILED:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
