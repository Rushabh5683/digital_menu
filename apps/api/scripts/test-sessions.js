/**
 * Integration tests for anonymous session start/end against the live API + DB.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const API = process.env.API_BASE_URL || 'http://localhost:4000';
const SLUG = 'saffron-court';

async function request(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { status: response.status, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const anonymousSessionId = randomUUID();

  console.log('1) start → create');
  const created = await request('/api/sessions/start', {
    restaurantSlug: SLUG,
    anonymousSessionId,
  });
  assert(created.status === 201, `expected 201, got ${created.status}`);
  assert(created.json.session.created === true, 'created flag');
  assert(created.json.session.anonymousSessionId === anonymousSessionId, 'anon id mismatch');
  const sessionId = created.json.session.id;
  console.log('   session', sessionId);

  console.log('2) start again while open → same session, not created');
  const again = await request('/api/sessions/start', {
    restaurantSlug: SLUG,
    anonymousSessionId,
  });
  assert(again.status === 200, `expected 200, got ${again.status}`);
  assert(again.json.session.id === sessionId, 'should reuse session');
  assert(again.json.session.created === false, 'should not mark created');
  assert(again.json.session.resumed === false, 'should not mark resumed');

  console.log('3) end session');
  const ended = await request('/api/sessions/end', {
    restaurantSlug: SLUG,
    anonymousSessionId,
  });
  assert(ended.status === 200, `expected 200, got ${ended.status}`);
  assert(ended.json.session.endedAt, 'endedAt missing');

  console.log('4) start after end → resume');
  const resumed = await request('/api/sessions/start', {
    restaurantSlug: SLUG,
    anonymousSessionId,
  });
  assert(resumed.status === 200, `expected 200, got ${resumed.status}`);
  assert(resumed.json.session.id === sessionId, 'resume should keep same session row');
  assert(resumed.json.session.resumed === true, 'resumed flag');
  assert(resumed.json.session.endedAt === null, 'endedAt should clear');

  console.log('5) new browser session (new UUID) → new row');
  const otherId = randomUUID();
  const other = await request('/api/sessions/start', {
    restaurantSlug: SLUG,
    anonymousSessionId: otherId,
  });
  assert(other.status === 201, 'new uuid should create');
  assert(other.json.session.id !== sessionId, 'new session id expected');

  console.log('6) invalid payload');
  const bad = await request('/api/sessions/start', {
    restaurantSlug: SLUG,
    anonymousSessionId: 'not-a-uuid',
  });
  assert(bad.status === 400, `expected 400, got ${bad.status}`);

  console.log('7) DB events');
  const starts = await prisma.analyticsEvent.count({
    where: { sessionId, eventType: 'session_start' },
  });
  const ends = await prisma.analyticsEvent.count({
    where: { sessionId, eventType: 'session_end' },
  });
  assert(starts >= 2, `expected >=2 session_start, got ${starts}`);
  assert(ends >= 1, `expected >=1 session_end, got ${ends}`);
  console.log(`   session_start=${starts}, session_end=${ends}`);

  console.log('\nAll anonymous session tests passed.');
}

main()
  .catch((error) => {
    console.error('\nFAILED:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
