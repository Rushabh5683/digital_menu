import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { resolveRestaurantTable } from '../admin/admin.qr.service.js';
import { findRestaurantRecordBySlug } from '../restaurant/restaurant.service.js';
import { serializeSession } from './session.serializer.js';

async function recordSessionEvent({
  sessionId,
  restaurantId,
  eventType,
  metadata = undefined,
}) {
  return prisma.analyticsEvent.create({
    data: {
      sessionId,
      restaurantId,
      eventType,
      metadata: metadata ?? undefined,
    },
  });
}

/**
 * Create or resume an anonymous browsing session for a restaurant.
 * Optional tableNumber binds the visit to a dining table (QR / picker).
 * No PII is accepted or stored.
 */
export async function startAnonymousSession({
  restaurantSlug,
  anonymousSessionId,
  tableNumber,
  tableId,
}) {
  const restaurant = await findRestaurantRecordBySlug(restaurantSlug);

  let table = null;
  if (tableNumber != null || tableId) {
    table = await resolveRestaurantTable(restaurant.id, { tableNumber, tableId });
  }

  const sessionLookup = {
    restaurantId_anonymousSessionId: {
      restaurantId: restaurant.id,
      anonymousSessionId,
    },
  };

  let existing = await prisma.session.findUnique({
    where: sessionLookup,
  });

  if (!existing) {
    try {
      const session = await prisma.session.create({
        data: {
          restaurantId: restaurant.id,
          anonymousSessionId,
          tableId: table?.id ?? null,
        },
        include: {
          table: { select: { id: true, tableNumber: true, name: true } },
        },
      });

      await recordSessionEvent({
        sessionId: session.id,
        restaurantId: restaurant.id,
        eventType: 'session_start',
        metadata: {
          reason: 'created',
          tableNumber: table?.tableNumber ?? null,
        },
      });

      return serializeSession(session, { created: true, resumed: false });
    } catch (error) {
      // React StrictMode / parallel /start calls can race on create.
      if (error?.code !== 'P2002') throw error;
      existing = await prisma.session.findUnique({ where: sessionLookup });
      if (!existing) throw error;
    }
  }

  const wasEnded = Boolean(existing.endedAt);
  // Once bound to a table, do not allow rebinding to a different table via /start
  // (prevents session hopping between tables to claim other tickets).
  if (table && existing.tableId && existing.tableId !== table.id) {
    throw new AppError('Session is bound to a different table', 403);
  }
  const shouldBindTable = Boolean(table && !existing.tableId);

  const session = await prisma.session.update({
    where: { id: existing.id },
    data: {
      ...(wasEnded ? { endedAt: null } : {}),
      ...(shouldBindTable ? { tableId: table.id } : {}),
    },
    include: {
      table: { select: { id: true, tableNumber: true, name: true } },
    },
  });

  if (wasEnded) {
    await recordSessionEvent({
      sessionId: session.id,
      restaurantId: restaurant.id,
      eventType: 'session_start',
      metadata: {
        reason: 'resumed',
        tableNumber: session.table?.tableNumber ?? null,
      },
    });
  } else if (shouldBindTable) {
    await recordSessionEvent({
      sessionId: session.id,
      restaurantId: restaurant.id,
      eventType: 'session_table_bound',
      metadata: { tableNumber: table.tableNumber },
    });
  }

  return serializeSession(session, { created: false, resumed: wasEnded });
}

/**
 * Mark a session ended when the customer leaves (best-effort).
 */
export async function endAnonymousSession({ restaurantSlug, anonymousSessionId }) {
  const restaurant = await findRestaurantRecordBySlug(restaurantSlug);

  const existing = await prisma.session.findUnique({
    where: {
      restaurantId_anonymousSessionId: {
        restaurantId: restaurant.id,
        anonymousSessionId,
      },
    },
    include: {
      table: { select: { id: true, tableNumber: true, name: true } },
    },
  });

  if (!existing) {
    throw new AppError('Session not found', 404);
  }

  if (existing.endedAt) {
    return serializeSession(existing, { created: false, resumed: false });
  }

  const session = await prisma.session.update({
    where: { id: existing.id },
    data: { endedAt: new Date() },
    include: {
      table: { select: { id: true, tableNumber: true, name: true } },
    },
  });

  await recordSessionEvent({
    sessionId: session.id,
    restaurantId: restaurant.id,
    eventType: 'session_end',
    metadata: { reason: 'client_end' },
  });

  return serializeSession(session, { created: false, resumed: false });
}
