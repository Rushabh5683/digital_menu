import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';

export const ALLOWED_EVENT_TYPES = new Set([
  'MENU_OPENED',
  'CATEGORY_VIEWED',
  'CATEGORY_ATTENTION',
  'CATEGORY_NAV_TAP',
  'DISH_VIEWED',
  'DISH_ATTENTION',
  'SEARCH_PERFORMED',
  'ZERO_RESULT_SEARCH',
  'SEARCH_RECOVERY_CLICKED',
  'FILTER_APPLIED',
  'FILTER_CLEARED',
  'DISH_INFO_VIEWED',
  'DISH_COMPARISON',
  'DISH_COMPARED',
  'COMPARISON_COMPLETED',
  'DISH_SELECTED',
  'MENU_EXITED',
  'PREFERENCE_SELECTED',
  'HELP_ME_CHOOSE_STARTED',
  'HELP_ME_CHOOSE_COMPLETED',
  'ASSISTANT_OPENED',
  'ASSISTANT_QUESTION_ASKED',
  'ASSISTANT_RECOMMENDATION_CLICKED',
  'SHORTLIST_ITEM_ADDED',
  'SHORTLIST_ITEM_REMOVED',
  'SHORTLIST_VIEWED',
  'INGREDIENT_TAPPED',
  // session lifecycle (also written by session module)
  'session_start',
  'session_end',
  'session_table_bound',
]);

const ATTENTION_EVENT_TYPES = new Set(['CATEGORY_ATTENTION', 'DISH_ATTENTION']);

const MAX_BATCH = 100;
/** Reject impossible single-segment dwell (heartbeats are ~4s; long idle flushes still capped). */
const MAX_DURATION_MS = 2 * 60 * 60 * 1000;
const CLIENT_EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseTimestamp(value) {
  if (value == null || value === '') return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid event timestamp', 400);
  }
  const now = Date.now();
  // Reject timestamps more than 24h in the future or 7 days in the past.
  if (date.getTime() > now + 24 * 60 * 60 * 1000) {
    throw new AppError('Event timestamp is too far in the future', 400);
  }
  if (date.getTime() < now - 7 * 24 * 60 * 60 * 1000) {
    throw new AppError('Event timestamp is too old', 400);
  }
  return date;
}

function normalizeMetadata(metadata) {
  if (metadata == null) return undefined;
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new AppError('Event metadata must be an object', 400);
  }
  return metadata;
}

function normalizeClientEventId(raw, index) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string' || !CLIENT_EVENT_ID_PATTERN.test(raw.trim())) {
    throw new AppError(`events[${index}] has invalid clientEventId`, 400);
  }
  return raw.trim().toLowerCase();
}

function sanitizeDurationMetadata(eventType, metadata, index) {
  if (!metadata || typeof metadata !== 'object') {
    if (ATTENTION_EVENT_TYPES.has(eventType)) {
      throw new AppError(`events[${index}] attention events require metadata.durationMs`, 400);
    }
    return metadata;
  }

  if (!Object.prototype.hasOwnProperty.call(metadata, 'durationMs')) {
    if (ATTENTION_EVENT_TYPES.has(eventType)) {
      throw new AppError(`events[${index}] attention events require metadata.durationMs`, 400);
    }
    return metadata;
  }

  const durationMs = Number(metadata.durationMs);
  if (!Number.isFinite(durationMs)) {
    throw new AppError(`events[${index}] metadata.durationMs must be a number`, 400);
  }
  if (durationMs < 0) {
    throw new AppError(`events[${index}] metadata.durationMs cannot be negative`, 400);
  }
  if (durationMs > MAX_DURATION_MS) {
    throw new AppError(`events[${index}] metadata.durationMs exceeds maximum`, 400);
  }

  return { ...metadata, durationMs };
}

function validateSearchMetadata(metadata, index) {
  if (!metadata || typeof metadata !== 'object') return metadata;
  const next = { ...metadata };
  if (next.query != null) {
    if (typeof next.query !== 'string') {
      throw new AppError(`events[${index}] metadata.query must be a string`, 400);
    }
    const trimmed = next.query.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      throw new AppError(`events[${index}] metadata.query must be at least 2 characters`, 400);
    }
    next.query = trimmed.length > 0 ? trimmed.slice(0, 80) : null;
  }
  return next;
}

function validateInfoMetadata(metadata, index) {
  if (!metadata || typeof metadata !== 'object') return metadata;
  const next = { ...metadata };
  if (next.sections != null) {
    if (!Array.isArray(next.sections)) {
      throw new AppError(`events[${index}] metadata.sections must be an array`, 400);
    }
    next.sections = next.sections
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
  }
  return next;
}

function validateComparisonMetadata(metadata, index, dishId) {
  if (!metadata || typeof metadata !== 'object') {
    throw new AppError(`events[${index}] DISH_COMPARISON requires metadata`, 400);
  }
  const previousDishId = metadata.previousDishId ?? metadata.dishAId;
  if (!previousDishId) {
    throw new AppError(`events[${index}] DISH_COMPARISON requires metadata.previousDishId`, 400);
  }
  validateCuid(previousDishId, `events[${index}].metadata.previousDishId`);
  if (previousDishId === dishId) {
    throw new AppError(`events[${index}] DISH_COMPARISON cannot compare a dish with itself`, 400);
  }
  return {
    ...metadata,
    previousDishId,
    dishBId: dishId,
    dishAId: previousDishId,
  };
}

function validateEventMetadata(eventType, metadata, index, dishId) {
  let next = metadata;
  if (eventType === 'SEARCH_PERFORMED') {
    next = validateSearchMetadata(next, index);
  } else if (eventType === 'DISH_INFO_VIEWED') {
    next = validateInfoMetadata(next, index);
  } else if (eventType === 'DISH_COMPARISON') {
    next = validateComparisonMetadata(next, index, dishId);
  }
  return next;
}

export function validateEventsPayload(body = {}) {
  const sessionId = validateCuid(body.sessionId, 'sessionId');
  const restaurantId = validateCuid(body.restaurantId, 'restaurantId');

  if (!Array.isArray(body.events)) {
    throw new AppError('events must be an array', 400);
  }

  if (body.events.length === 0) {
    throw new AppError('events array is empty', 400);
  }

  if (body.events.length > MAX_BATCH) {
    throw new AppError(`events batch exceeds max size of ${MAX_BATCH}`, 400);
  }

  const seenClientIds = new Set();

  const events = body.events.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new AppError(`events[${index}] must be an object`, 400);
    }

    if (!ALLOWED_EVENT_TYPES.has(raw.eventType)) {
      throw new AppError(`events[${index}] has invalid eventType`, 400, {
        eventType: raw.eventType,
      });
    }

    let categoryId = null;
    let dishId = null;

    if (raw.categoryId != null && raw.categoryId !== '') {
      categoryId = validateCuid(raw.categoryId, `events[${index}].categoryId`);
    }

    if (raw.dishId != null && raw.dishId !== '') {
      dishId = validateCuid(raw.dishId, `events[${index}].dishId`);
    }

    const clientEventId = normalizeClientEventId(raw.clientEventId ?? raw.eventId, index);
    if (clientEventId) {
      if (seenClientIds.has(clientEventId)) {
        // Same batch: keep first occurrence only (caller filters later).
        return {
          skipDuplicateInBatch: true,
          clientEventId,
        };
      }
      seenClientIds.add(clientEventId);
    }

    let metadata = sanitizeDurationMetadata(
      raw.eventType,
      normalizeMetadata(raw.metadata),
      index,
    );
    metadata = validateEventMetadata(raw.eventType, metadata, index, dishId);

    if (raw.eventType === 'DISH_COMPARISON' && !dishId) {
      throw new AppError(`events[${index}] DISH_COMPARISON requires dishId`, 400);
    }

    if (raw.eventType === 'DISH_INFO_VIEWED' && !dishId) {
      throw new AppError(`events[${index}] DISH_INFO_VIEWED requires dishId`, 400);
    }

    return {
      eventType: raw.eventType,
      categoryId,
      dishId,
      clientEventId,
      timestamp: parseTimestamp(raw.timestamp),
      metadata,
    };
  });

  return {
    sessionId,
    restaurantId,
    events: events.filter((event) => !event.skipDuplicateInBatch),
  };
}

export async function ingestAnalyticsEvents({ sessionId, restaurantId, events }) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (session.restaurantId !== restaurantId) {
    throw new AppError('Session does not belong to this restaurant', 403);
  }

  const categoryIds = [
    ...new Set(events.map((event) => event.categoryId).filter(Boolean)),
  ];
  const dishIds = [...new Set(events.map((event) => event.dishId).filter(Boolean))];

  if (categoryIds.length > 0) {
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        menu: { restaurantId },
      },
      select: { id: true },
    });
    const valid = new Set(categories.map((row) => row.id));
    for (const id of categoryIds) {
      if (!valid.has(id)) {
        throw new AppError('Invalid categoryId for restaurant', 400, { categoryId: id });
      }
    }
  }

  if (dishIds.length > 0) {
    const dishes = await prisma.dish.findMany({
      where: {
        id: { in: dishIds },
        category: { menu: { restaurantId } },
      },
      select: { id: true },
    });
    const valid = new Set(dishes.map((row) => row.id));
    for (const id of dishIds) {
      if (!valid.has(id)) {
        throw new AppError('Invalid dishId for restaurant', 400, { dishId: id });
      }
    }
  }

  const clientEventIds = events.map((event) => event.clientEventId).filter(Boolean);
  let existingIds = new Set();
  if (clientEventIds.length > 0) {
    const existing = await prisma.analyticsEvent.findMany({
      where: { clientEventId: { in: clientEventIds } },
      select: { clientEventId: true },
    });
    existingIds = new Set(existing.map((row) => row.clientEventId));
  }

  const toInsert = events.filter(
    (event) => !event.clientEventId || !existingIds.has(event.clientEventId),
  );

  if (toInsert.length === 0) {
    return {
      accepted: 0,
      duplicatesSkipped: events.length,
      sessionId,
      restaurantId,
    };
  }

  const result = await prisma.analyticsEvent.createMany({
    data: toInsert.map((event) => ({
      sessionId,
      restaurantId,
      eventType: event.eventType,
      categoryId: event.categoryId,
      dishId: event.dishId,
      clientEventId: event.clientEventId,
      metadata: event.metadata,
      timestamp: event.timestamp,
    })),
    skipDuplicates: true,
  });

  return {
    accepted: result.count,
    duplicatesSkipped: events.length - result.count,
    sessionId,
    restaurantId,
  };
}
