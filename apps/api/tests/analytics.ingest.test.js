import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALLOWED_EVENT_TYPES,
  validateEventsPayload,
} from '../src/modules/analytics/analytics.service.js';
import { parseDateRange } from '../src/modules/analytics/analytics.reports.js';
import { AppError } from '../src/middleware/errorHandler.js';

const SESSION_ID = 'clxxxxxxxxxxxxxxxxxxx1';
const RESTAURANT_ID = 'clxxxxxxxxxxxxxxxxxxx2';
const CATEGORY_ID = 'clxxxxxxxxxxxxxxxxxxx3';
const DISH_ID = 'clxxxxxxxxxxxxxxxxxxx4';
const DISH_ID_B = 'clxxxxxxxxxxxxxxxxxxx5';
const EVENT_UUID = '550e8400-e29b-41d4-a716-446655440000';

function baseBody(events) {
  return {
    sessionId: SESSION_ID,
    restaurantId: RESTAURANT_ID,
    events,
  };
}

describe('validateEventsPayload', () => {
  it('accepts a valid MENU_OPENED event', () => {
    const result = validateEventsPayload(
      baseBody([
        {
          eventType: 'MENU_OPENED',
          clientEventId: EVENT_UUID,
          timestamp: new Date().toISOString(),
          metadata: { path: '/m/demo' },
        },
      ]),
    );
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].eventType, 'MENU_OPENED');
    assert.equal(result.events[0].clientEventId, EVENT_UUID);
  });

  it('rejects unknown event types', () => {
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([{ eventType: 'FAKE_METRIC', timestamp: new Date().toISOString() }]),
        ),
      (error) => error instanceof AppError && error.statusCode === 400,
    );
  });

  it('rejects empty event type / empty batch', () => {
    assert.throws(
      () => validateEventsPayload({ sessionId: SESSION_ID, restaurantId: RESTAURANT_ID, events: [] }),
      (error) => error instanceof AppError && /empty/i.test(error.message),
    );
  });

  it('rejects invalid session/restaurant ids', () => {
    assert.throws(
      () =>
        validateEventsPayload({
          sessionId: 'not-a-cuid',
          restaurantId: RESTAURANT_ID,
          events: [{ eventType: 'MENU_OPENED' }],
        }),
      (error) => error instanceof AppError && error.statusCode === 400,
    );
  });

  it('rejects negative durationMs', () => {
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([
            {
              eventType: 'DISH_ATTENTION',
              dishId: DISH_ID,
              categoryId: CATEGORY_ID,
              metadata: { durationMs: -5 },
            },
          ]),
        ),
      (error) => error instanceof AppError && /negative/i.test(error.message),
    );
  });

  it('rejects attention events without durationMs', () => {
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([
            {
              eventType: 'CATEGORY_ATTENTION',
              categoryId: CATEGORY_ID,
              metadata: {},
            },
          ]),
        ),
      (error) => error instanceof AppError && /durationMs/i.test(error.message),
    );
  });

  it('rejects impossible durationMs', () => {
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([
            {
              eventType: 'CATEGORY_ATTENTION',
              categoryId: CATEGORY_ID,
              metadata: { durationMs: 9 * 60 * 60 * 1000 },
            },
          ]),
        ),
      (error) => error instanceof AppError && /maximum/i.test(error.message),
    );
  });

  it('rejects future timestamps beyond 24h', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([{ eventType: 'MENU_OPENED', timestamp: future }]),
        ),
      (error) => error instanceof AppError && /future/i.test(error.message),
    );
  });

  it('dedupes duplicate clientEventId within the same batch', () => {
    const result = validateEventsPayload(
      baseBody([
        {
          eventType: 'DISH_VIEWED',
          dishId: DISH_ID,
          clientEventId: EVENT_UUID,
        },
        {
          eventType: 'DISH_VIEWED',
          dishId: DISH_ID,
          clientEventId: EVENT_UUID,
        },
      ]),
    );
    assert.equal(result.events.length, 1);
  });

  it('includes session lifecycle types in the allowlist', () => {
    assert.equal(ALLOWED_EVENT_TYPES.has('session_start'), true);
    assert.equal(ALLOWED_EVENT_TYPES.has('session_table_bound'), true);
    assert.equal(ALLOWED_EVENT_TYPES.has('DISH_COMPARISON'), true);
  });

  it('accepts DISH_INFO_VIEWED with sections metadata', () => {
    const result = validateEventsPayload(
      baseBody([
        {
          eventType: 'DISH_INFO_VIEWED',
          dishId: DISH_ID,
          metadata: { sections: ['description', 'ingredients'] },
        },
      ]),
    );
    assert.deepEqual(result.events[0].metadata.sections, ['description', 'ingredients']);
  });

  it('rejects DISH_INFO_VIEWED without dishId', () => {
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([{ eventType: 'DISH_INFO_VIEWED', metadata: { sections: ['description'] } }]),
        ),
      (error) => error instanceof AppError && /dishId/i.test(error.message),
    );
  });

  it('accepts DISH_COMPARISON with previousDishId', () => {
    const result = validateEventsPayload(
      baseBody([
        {
          eventType: 'DISH_COMPARISON',
          dishId: DISH_ID,
          metadata: { previousDishId: DISH_ID_B },
        },
      ]),
    );
    assert.equal(result.events[0].eventType, 'DISH_COMPARISON');
    assert.equal(result.events[0].metadata.previousDishId, DISH_ID_B);
    assert.equal(result.events[0].metadata.dishBId, DISH_ID);
  });

  it('rejects DISH_COMPARISON comparing a dish with itself', () => {
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([
            {
              eventType: 'DISH_COMPARISON',
              dishId: DISH_ID,
              metadata: { previousDishId: DISH_ID },
            },
          ]),
        ),
      (error) => error instanceof AppError && /itself/i.test(error.message),
    );
  });

  it('rejects SEARCH_PERFORMED with query shorter than 2 characters', () => {
    assert.throws(
      () =>
        validateEventsPayload(
          baseBody([
            {
              eventType: 'SEARCH_PERFORMED',
              metadata: { query: 'a' },
            },
          ]),
        ),
      (error) => error instanceof AppError && /2 characters/i.test(error.message),
    );
  });
});

describe('parseDateRange', () => {
  it('returns null bounds for all / empty', () => {
    assert.deepEqual(parseDateRange({}), { from: null, to: null });
    assert.deepEqual(parseDateRange({ range: 'all' }), { from: null, to: null });
  });

  it('resolves range=30d to a UTC window', () => {
    const { from, to } = parseDateRange({ range: '30d' });
    assert.ok(from instanceof Date);
    assert.ok(to instanceof Date);
    assert.ok(from < to);
    const spanDays = (to - from) / (24 * 60 * 60 * 1000);
    assert.ok(spanDays >= 29 && spanDays <= 31);
  });

  it('prefers explicit from/to over range', () => {
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2026-01-07T23:59:59.999Z';
    const result = parseDateRange({ range: '30d', from, to });
    assert.equal(result.from.toISOString(), from);
    assert.equal(result.to.toISOString(), to);
  });

  it('rejects inverted from/to', () => {
    assert.throws(
      () =>
        parseDateRange({
          from: '2026-02-01T00:00:00.000Z',
          to: '2026-01-01T00:00:00.000Z',
        }),
      (error) => error instanceof AppError,
    );
  });
});
