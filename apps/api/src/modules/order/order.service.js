import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateAnonymousSessionId, validateCuid, validateSlug } from '../../utils/validate.js';
import { resolveRestaurantTable } from '../admin/admin.qr.service.js';
import {
  assertBusinessDayEditable,
  assertOrderDayEditable,
  businessDateToLocalNoon,
} from '../admin/admin.dayend.service.js';
import { findRestaurantRecordBySlug } from '../restaurant/restaurant.service.js';
import { computeExclusiveGst, money, taxFieldsFromCompute } from './orderTax.js';

export const OrderStatuses = {
  PLACED: 'PLACED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

const ORDER_STATUS_SET = new Set(Object.values(OrderStatuses));

const MAX_LINE_QTY = 20;
const MAX_CART_LINES = 40;

/** Allowed staff status transitions — simplified service path for now. */
const STATUS_TRANSITIONS = {
  // Happy path: Received (PLACED) → Completed
  PLACED: new Set(['COMPLETED', 'READY', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
  // Legacy mid-states can still finish if any tickets remain there
  ACCEPTED: new Set(['COMPLETED', 'READY', 'PREPARING', 'CANCELLED', 'REJECTED']),
  PREPARING: new Set(['COMPLETED', 'READY', 'CANCELLED']),
  READY: new Set(['COMPLETED', 'CANCELLED']),
  COMPLETED: new Set(),
  REJECTED: new Set(),
  CANCELLED: new Set(),
};

function parseQuantity(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) {
    throw new AppError(`Quantity must be a whole number from 1 to ${MAX_LINE_QTY}`, 400);
  }
  return qty;
}

function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isCreatedToday(value) {
  if (!value) return false;
  return new Date(value).getTime() >= startOfLocalDay().getTime();
}

function shortOrderNo(orderNumber) {
  const raw = String(orderNumber || '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  const seq = parts[parts.length - 1];
  if (/^\d+$/.test(seq)) return seq.replace(/^0+(?=\d)/, '') || seq;
  return raw;
}

/**
 * Per restaurant, per local calendar day: ORD-YYYYMMDD-0001, 0002, …
 * Display UI shows the trailing sequence (#1, #2), which resets each day.
 */
async function nextOrderNumber(restaurantId, dayKey = localDayKey()) {
  const day = dayKey || localDayKey();
  const prefix = `ORD-${day}-`;

  const latest = await prisma.order.findFirst({
    where: {
      restaurantId,
      orderNumber: { startsWith: prefix },
    },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let next = 1;
  if (latest?.orderNumber) {
    const parts = String(latest.orderNumber).split('-');
    const seq = Number(parts[parts.length - 1]);
    if (Number.isInteger(seq) && seq >= 1) next = seq + 1;
  }

  return `${prefix}${String(next).padStart(4, '0')}`;
}

const orderInclude = {
  table: { select: { id: true, tableNumber: true, name: true } },
  items: { orderBy: { dishNameSnapshot: 'asc' } },
  restaurant: { select: { id: true, name: true, slug: true } },
  appreciationShares: {
    include: { captain: { select: { id: true, name: true } } },
  },
};

const SINGLE_PAYMENT_METHODS = new Set([
  'CASH',
  'CARD',
  'UPI_GPAY',
  'UPI_PHONEPE',
  'UPI_OTHER',
  'OTHER',
]);

function money2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function parsePaymentSplits(rawSplits, orderTotal) {
  if (!Array.isArray(rawSplits) || rawSplits.length < 2) {
    throw new AppError('Part payment needs at least two payment lines', 400);
  }
  if (rawSplits.length > 6) {
    throw new AppError('Part payment supports at most 6 lines', 400);
  }

  const splits = rawSplits.map((row, index) => {
    const method = String(row?.method || '').trim().toUpperCase();
    if (!SINGLE_PAYMENT_METHODS.has(method)) {
      throw new AppError(`Invalid payment method on part-payment line ${index + 1}`, 400);
    }
    const amount = money2(row?.amount);
    if (!(amount > 0)) {
      throw new AppError(`Part-payment line ${index + 1} amount must be greater than 0`, 400);
    }
    const note =
      typeof row?.note === 'string' && row.note.trim()
        ? row.note.trim().slice(0, 120)
        : null;
    if ((method === 'OTHER' || method === 'UPI_OTHER') && note) {
      return { method, amount, note };
    }
    return { method, amount };
  });

  const sum = money2(splits.reduce((acc, row) => acc + row.amount, 0));
  if (Math.abs(sum - money2(orderTotal)) > 0.05) {
    throw new AppError(
      `Part payment lines must add up to the bill total (${money2(orderTotal)})`,
      400,
    );
  }

  return splits;
}

function parseAppreciationCaptains(rawIds) {
  if (!Array.isArray(rawIds)) return [];
  const ids = [];
  const seen = new Set();
  for (const raw of rawIds) {
    const id = validateCuid(String(raw || ''), 'captainUserId');
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function splitAppreciationAmount(totalAmount, captainIds) {
  const total = money2(totalAmount);
  const n = captainIds.length;
  if (n < 1 || !(total > 0)) return [];

  const base = money2(Math.floor((total * 100) / n) / 100);
  const shares = captainIds.map((captainUserId) => ({
    captainUserId,
    amount: base,
  }));
  const allocated = money2(base * n);
  const remainder = money2(total - allocated);
  if (remainder !== 0) {
    shares[0].amount = money2(shares[0].amount + remainder);
  }
  return shares;
}

export function serializeOrder(order) {
  return {
    id: order.id,
    restaurantId: order.restaurantId,
    restaurant: order.restaurant
      ? {
          id: order.restaurant.id,
          name: order.restaurant.name,
          slug: order.restaurant.slug,
        }
      : undefined,
    tableId: order.tableId,
    tableNumber: order.table?.tableNumber ?? null,
    tableLabel:
      order.table?.tableNumber != null
        ? `Table ${String(order.table.tableNumber).padStart(2, '0')}`
        : null,
    sessionId: order.sessionId ?? null,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: Number(order.subtotal),
    cgstRate: Number(order.cgstRate ?? 0),
    sgstRate: Number(order.sgstRate ?? 0),
    cgstAmount: Number(order.cgstAmount ?? 0),
    sgstAmount: Number(order.sgstAmount ?? 0),
    taxAmount: Number(order.taxAmount ?? 0),
    roundOffAmount: Number(order.roundOffAmount ?? 0),
    total: Number(order.total),
    customerNote: order.customerNote ?? null,
    billPrintedAt: order.billPrintedAt ?? null,
    paymentMethod: order.paymentMethod ?? null,
    paymentNote: order.paymentNote ?? null,
    paymentSplits: Array.isArray(order.paymentSplits) ? order.paymentSplits : null,
    staffAppreciationAmount: Number(order.staffAppreciationAmount ?? 0),
    appreciationShares: (order.appreciationShares || []).map((share) => ({
      id: share.id,
      captainUserId: share.captainUserId,
      amount: Number(share.amount),
      captainName: share.captain?.name ?? null,
    })),
    paidAt: order.paidAt ?? null,
    cancelReason: order.cancelReason ?? null,
    cancelledAt: order.cancelledAt ?? null,
    cancelledByUserId: order.cancelledByUserId ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    // Back-compat for earlier admin UI fields
    placedAt: order.createdAt,
    items: (order.items || []).map((item) => ({
      id: item.id,
      orderId: item.orderId,
      dishId: item.dishId,
      dishNameSnapshot: item.dishNameSnapshot,
      priceSnapshot: Number(item.priceSnapshot),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      imageUrl: item.imageUrl ?? null,
      // Back-compat aliases used by cart success screen
      dishName: item.dishNameSnapshot,
      unitPrice: Number(item.priceSnapshot),
      lineTotal: Number(item.subtotal),
    })),
  };
}

/**
 * Build priced line items from PostgreSQL dish rows.
 * Client-sent prices are ignored.
 */
async function buildPricedLines(restaurantId, rawItems = []) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError('Order must include at least one item', 400);
  }
  if (rawItems.length > MAX_CART_LINES) {
    throw new AppError(`Order cannot exceed ${MAX_CART_LINES} line items`, 400);
  }

  const qtyByDish = new Map();
  for (const raw of rawItems) {
    const dishId = validateCuid(raw.dishId, 'dishId');
    const quantity = parseQuantity(raw.quantity);
    qtyByDish.set(dishId, (qtyByDish.get(dishId) || 0) + quantity);
  }

  for (const quantity of qtyByDish.values()) {
    if (quantity > MAX_LINE_QTY) {
      throw new AppError(`Quantity for a dish cannot exceed ${MAX_LINE_QTY}`, 400);
    }
  }

  const uniqueIds = [...qtyByDish.keys()];
  const dishes = await prisma.dish.findMany({
    where: {
      id: { in: uniqueIds },
      category: {
        isEnabled: true,
        menu: {
          restaurantId,
          isPublished: true,
        },
      },
    },
  });

  if (dishes.length !== uniqueIds.length) {
    throw new AppError('One or more dishes are invalid for this restaurant', 400);
  }

  const unavailable = dishes.filter((dish) => !dish.isAvailable);
  if (unavailable.length > 0) {
    throw new AppError(
      `Unavailable: ${unavailable.map((dish) => dish.name).join(', ')}`,
      400,
    );
  }

  const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));
  const lines = [];
  let subtotal = 0;

  for (const [dishId, quantity] of qtyByDish.entries()) {
    const dish = dishMap.get(dishId);
    const priceSnapshot = money(dish.price);
    const lineSubtotal = money(priceSnapshot * quantity);
    subtotal += lineSubtotal;
    lines.push({
      dishId: dish.id,
      dishNameSnapshot: dish.name,
      priceSnapshot,
      quantity,
      subtotal: lineSubtotal,
      imageUrl: dish.imageUrl,
    });
  }

  subtotal = money(subtotal);
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { gstEnabled: true, cgstRate: true, sgstRate: true },
  });
  const tax = computeExclusiveGst(subtotal, restaurant || {});

  return {
    lines,
    subtotal,
    ...taxFieldsFromCompute(tax),
  };
}

const ACTIVE_CUSTOMER_STATUSES = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'];
const OPEN_ORDER_STATUSES = ACTIVE_CUSTOMER_STATUSES;

async function findOpenOrderForTable(restaurantId, tableId) {
  return prisma.order.findFirst({
    where: {
      restaurantId,
      tableId,
      status: { in: OPEN_ORDER_STATUSES },
    },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Same-calendar-day open tickets can continue.
 * Empty tickets left from a previous day are discarded so today's first bill can be #1.
 * Prior-day tickets with items must be settled/cancelled first (never silently continued).
 */
async function resolveContinuableOpenOrder(restaurantId, tableId) {
  const existing = await findOpenOrderForTable(restaurantId, tableId);
  if (!existing) return null;

  if (isCreatedToday(existing.createdAt)) {
    return existing;
  }

  const itemCount =
    existing.items?.length ??
    (await prisma.orderItem.count({ where: { orderId: existing.id } }));

  if (itemCount < 1) {
    await prisma.order.delete({ where: { id: existing.id } });
    return null;
  }

  throw new AppError(
    `Table still has unpaid order #${shortOrderNo(existing.orderNumber)} from a previous day. Settle or cancel it on Live Orders before starting today's orders.`,
    409,
    {
      code: 'PRIOR_DAY_OPEN_ORDER',
      openOrder: serializeOrder(existing),
    },
  );
}

async function resolveCustomerSessionOptional(restaurant, anonymousSessionIdRaw) {
  if (!anonymousSessionIdRaw) return null;
  const anonymousSessionId = validateAnonymousSessionId(anonymousSessionIdRaw);
  return prisma.session.findUnique({
    where: {
      restaurantId_anonymousSessionId: {
        restaurantId: restaurant.id,
        anonymousSessionId,
      },
    },
  });
}

/**
 * POST /api/orders — customer create.
 * Restaurant is resolved from slug (never from a free-typed restaurantId).
 * Table must belong to that restaurant. Prices come from DB only.
 * Blocks a second order while the table still has an open (non-completed) ticket.
 */
export async function createOrder(body = {}) {
  // Ignore any client-provided restaurantId / price fields.
  const restaurantSlug = validateSlug(body.restaurantSlug);
  const restaurant = await findRestaurantRecordBySlug(restaurantSlug);

  if (restaurant.status !== 'ACTIVE') {
    throw new AppError('This restaurant is not accepting orders', 403);
  }

  const table = await resolveRestaurantTable(restaurant.id, {
    tableNumber: body.tableNumber,
    tableId: body.tableId,
  });
  if (!table) {
    throw new AppError('A valid table is required to place an order', 400);
  }
  if (table.restaurantId !== restaurant.id) {
    throw new AppError('Table does not belong to this restaurant', 403);
  }

  // Orders must stay tied to the anonymous menu session (analytics + customer "My Order").
  let session = null;
  if (body.sessionId) {
    const sessionId = validateCuid(body.sessionId, 'sessionId');
    session = await prisma.session.findFirst({
      where: { id: sessionId, restaurantId: restaurant.id },
    });
  } else if (body.anonymousSessionId) {
    const anonymousSessionId = validateAnonymousSessionId(body.anonymousSessionId);
    session = await prisma.session.findUnique({
      where: {
        restaurantId_anonymousSessionId: {
          restaurantId: restaurant.id,
          anonymousSessionId,
        },
      },
    });
  } else {
    throw new AppError('Session is required to place an order', 400);
  }
  if (!session) {
    throw new AppError('Session not found. Reopen the menu and try again.', 400);
  }

  if (session.tableId && session.tableId !== table.id) {
    throw new AppError('Session is bound to a different table', 403);
  }

  // Validate dishes / prices first so bad carts fail with 400 even if a ticket is open.
  const priced = await buildPricedLines(restaurant.id, body.items);
  const { lines, subtotal, total, cgstRate, sgstRate, cgstAmount, sgstAmount, taxAmount } =
    priced;

  const openOrder = await resolveContinuableOpenOrder(restaurant.id, table.id);
  if (openOrder) {
    throw new AppError(
      'This table already has an open order. Add items to it instead of placing a new one.',
      409,
      {
        code: 'OPEN_ORDER_EXISTS',
        openOrder: serializeOrder(openOrder),
      },
    );
  }

  const orderNumber = await nextOrderNumber(restaurant.id);
  const note =
    typeof body.customerNote === 'string' && body.customerNote.trim()
      ? body.customerNote.trim().slice(0, 500)
      : null;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        sessionId: session?.id ?? null,
        orderNumber,
        status: OrderStatuses.PLACED,
        subtotal,
        cgstRate,
        sgstRate,
        cgstAmount,
        sgstAmount,
        taxAmount,
        total,
        customerNote: note,
        items: { create: lines },
      },
      include: orderInclude,
    });

    if (session && session.tableId !== table.id) {
      await tx.session.update({
        where: { id: session.id },
        data: { tableId: table.id },
      });
    }

    return created;
  });

  return { order: serializeOrder(order) };
}

/** @deprecated alias — prefer createOrder / POST /api/orders */
export async function placeCustomerOrder(body) {
  return createOrder(body);
}

/**
 * Append items to an open order (same table ticket). Prices from DB only.
 * Merges quantity when the same dish is already on the ticket.
 * Requires a valid anonymous session bound to the order's restaurant + table.
 */
export async function addItemsToOrder(orderId, body = {}) {
  const id = validateCuid(orderId, 'orderId');
  const restaurantSlug = validateSlug(body.restaurantSlug);
  const restaurant = await findRestaurantRecordBySlug(restaurantSlug);

  if (restaurant.status !== 'ACTIVE') {
    throw new AppError('This restaurant is not accepting orders', 403);
  }

  if (!body.anonymousSessionId) {
    throw new AppError('Session is required to update an order', 400);
  }

  const session = await resolveCustomerSessionOptional(restaurant, body.anonymousSessionId);
  if (!session) {
    throw new AppError('Session not found. Reopen the menu and try again.', 400);
  }

  const table = await resolveRestaurantTable(restaurant.id, {
    tableNumber: body.tableNumber,
    tableId: body.tableId,
  });
  if (!table) {
    throw new AppError('A valid table is required', 400);
  }

  await assertSessionMayActOnTable(session, table);

  const existing = await prisma.order.findFirst({
    where: {
      id,
      restaurantId: restaurant.id,
    },
    include: { items: true },
  });
  if (!existing) throw new AppError('Order not found', 404);

  if (!OPEN_ORDER_STATUSES.includes(existing.status)) {
    throw new AppError('This order is closed. Place a new order instead.', 400);
  }

  if (existing.tableId !== table.id) {
    throw new AppError('Order does not belong to this table', 403);
  }

  // Guests must not keep feeding yesterday's unpaid ticket (Live Orders is day-scoped).
  if (!isCreatedToday(existing.createdAt)) {
    const full = await prisma.order.findFirst({
      where: { id: existing.id },
      include: orderInclude,
    });
    throw new AppError(
      `Table still has unpaid order #${shortOrderNo(existing.orderNumber)} from a previous day. Ask staff to settle or cancel it before ordering.`,
      409,
      {
        code: 'PRIOR_DAY_OPEN_ORDER',
        openOrder: serializeOrder(full || existing),
      },
    );
  }

  const { lines } = await buildPricedLines(restaurant.id, body.items);

  const order = await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const prior = existing.items.find((item) => item.dishId === line.dishId);
      if (prior) {
        const quantity = prior.quantity + line.quantity;
        if (quantity > MAX_LINE_QTY) {
          throw new AppError(
            `Quantity for ${line.dishNameSnapshot} cannot exceed ${MAX_LINE_QTY}`,
            400,
          );
        }
        const priceSnapshot = money(line.priceSnapshot);
        await tx.orderItem.update({
          where: { id: prior.id },
          data: {
            quantity,
            priceSnapshot,
            dishNameSnapshot: line.dishNameSnapshot,
            subtotal: money(priceSnapshot * quantity),
            imageUrl: line.imageUrl,
          },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId: existing.id,
            ...line,
          },
        });
      }
    }

    if (existing.sessionId !== session.id) {
      await tx.order.update({
        where: { id: existing.id },
        data: { sessionId: session.id },
      });
    }

    if (session.tableId !== table.id) {
      await tx.session.update({
        where: { id: session.id },
        data: { tableId: table.id },
      });
    }

    const items = await tx.orderItem.findMany({ where: { orderId: existing.id } });
    const subtotal = money(items.reduce((sum, item) => sum + Number(item.subtotal), 0));
    const tax = computeExclusiveGst(subtotal, restaurant);

    return tx.order.update({
      where: { id: existing.id },
      data: { subtotal, ...taxFieldsFromCompute(tax) },
      include: orderInclude,
    });
  });

  return { order: serializeOrder(order), added: true };
}

/**
 * Session may act on a table only when unbound or already bound to that table.
 * Prevents a session from table A mutating table B's ticket.
 */
async function assertSessionMayActOnTable(session, table) {
  if (session.tableId && session.tableId !== table.id) {
    throw new AppError('Session is bound to a different table', 403);
  }
}

/**
 * Restore open order for a table (survives cleared tab / new anonymous session).
 * Requires anonymousSessionId. Session must belong to this restaurant and may only
 * claim the open ticket for its bound table (or bind once if unbound).
 */
export async function getOpenOrderForTable({
  restaurantSlug,
  tableNumber,
  tableId,
  anonymousSessionId,
} = {}) {
  if (!anonymousSessionId) {
    throw new AppError('Session is required to restore an order', 400);
  }

  const slug = validateSlug(restaurantSlug);
  const restaurant = await findRestaurantRecordBySlug(slug);
  const session = await resolveCustomerSessionOptional(restaurant, anonymousSessionId);
  if (!session) {
    throw new AppError('Session not found. Reopen the menu and try again.', 400);
  }

  const table = await resolveRestaurantTable(restaurant.id, { tableNumber, tableId });
  if (!table) {
    throw new AppError('A valid table is required', 400);
  }

  await assertSessionMayActOnTable(session, table);

  if (session.tableId !== table.id) {
    await prisma.session.update({
      where: { id: session.id },
      data: { tableId: table.id },
    });
  }

  // Same-day only: discard empty prior-day tickets; never restore prior-day bills with items.
  let order;
  try {
    order = await resolveContinuableOpenOrder(restaurant.id, table.id);
  } catch (error) {
    if (error instanceof AppError && error.details?.code === 'PRIOR_DAY_OPEN_ORDER') {
      throw error;
    }
    throw error;
  }
  if (!order) {
    return { order: null };
  }

  if (order.sessionId !== session.id) {
    order = await prisma.order.update({
      where: { id: order.id },
      data: { sessionId: session.id },
      include: orderInclude,
    });
  }

  return { order: serializeOrder(order) };
}

export async function getOrderById(orderId, { restaurantId = null } = {}) {
  const id = validateCuid(orderId, 'orderId');
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!order) throw new AppError('Order not found', 404);
  if (restaurantId && order.restaurantId !== restaurantId) {
    throw new AppError('Order not found', 404);
  }
  return { order: serializeOrder(order) };
}

async function resolveCustomerSession(restaurantSlug, anonymousSessionIdRaw) {
  const slug = validateSlug(restaurantSlug);
  const anonymousSessionId = validateAnonymousSessionId(anonymousSessionIdRaw);
  const restaurant = await findRestaurantRecordBySlug(slug);
  const session = await prisma.session.findUnique({
    where: {
      restaurantId_anonymousSessionId: {
        restaurantId: restaurant.id,
        anonymousSessionId,
      },
    },
  });
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  return { restaurant, session };
}

/**
 * Customer: fetch one order owned by this session, or open on the session's table.
 */
export async function getCustomerOrder(
  orderId,
  { restaurantSlug, anonymousSessionId } = {},
) {
  const id = validateCuid(orderId, 'orderId');
  const { restaurant, session } = await resolveCustomerSession(
    restaurantSlug,
    anonymousSessionId,
  );

  let order = await prisma.order.findFirst({
    where: {
      id,
      restaurantId: restaurant.id,
      sessionId: session.id,
    },
    include: orderInclude,
  });

  // Same-table companion / restore: session must already be bound to the order's table.
  if (!order && session.tableId) {
    order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
        tableId: session.tableId,
      },
      include: orderInclude,
    });
    if (order && order.sessionId !== session.id) {
      order = await prisma.order.update({
        where: { id: order.id },
        data: { sessionId: session.id },
        include: orderInclude,
      });
    }
  }

  if (!order) throw new AppError('Order not found', 404);
  return { order: serializeOrder(order) };
}

/**
 * Customer: open order for this session, or open order for the table (restore path).
 */
export async function getCustomerMyOrder({
  restaurantSlug,
  anonymousSessionId,
  tableNumber,
  tableId,
} = {}) {
  const { restaurant, session } = await resolveCustomerSession(
    restaurantSlug,
    anonymousSessionId,
  );

  if (tableNumber != null || tableId) {
    try {
      const open = await getOpenOrderForTable({
        restaurantSlug,
        tableNumber,
        tableId,
        anonymousSessionId,
      });
      if (open.order) return open;
    } catch (error) {
      // Prior-day unpaid tickets stay with staff — do not resume for guests.
      if (!(error instanceof AppError && error.details?.code === 'PRIOR_DAY_OPEN_ORDER')) {
        throw error;
      }
    }
  }

  const active = await prisma.order.findFirst({
    where: {
      restaurantId: restaurant.id,
      sessionId: session.id,
      status: { in: ACTIVE_CUSTOMER_STATUSES },
    },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });

  if (active && isCreatedToday(active.createdAt)) {
    return { order: serializeOrder(active) };
  }

  const latest = await prisma.order.findFirst({
    where: {
      restaurantId: restaurant.id,
      sessionId: session.id,
    },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });

  return { order: latest ? serializeOrder(latest) : null };
}

export async function listOrdersForRestaurant(restaurantId, query = {}) {
  const id = validateCuid(restaurantId, 'restaurantId');
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const status =
    typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  if (status && !ORDER_STATUS_SET.has(status)) {
    throw new AppError('Invalid order status filter', 400);
  }

  const take = Math.min(Math.max(Number(query.limit) || 50, 1), 100);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: id,
      ...(status ? { status } : {}),
    },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take,
  });

  return { orders: orders.map(serializeOrder) };
}

export async function updateOrderStatus(
  orderId,
  nextStatusRaw,
  {
    restaurantId = null,
    paymentMethod = null,
    paymentNote = null,
    paymentSplits = null,
    staffAppreciationAmount = null,
    appreciationCaptainIds = null,
    businessDate = null,
    cancelReason = null,
    adminPassword = null,
    actorUserId = null,
  } = {},
) {
  const id = validateCuid(orderId, 'orderId');
  const nextStatus = String(nextStatusRaw || '').trim().toUpperCase();
  if (!ORDER_STATUS_SET.has(nextStatus)) {
    throw new AppError('Invalid order status', 400);
  }

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw new AppError('Order not found', 404);
  if (restaurantId && existing.restaurantId !== restaurantId) {
    throw new AppError('Order not found', 404);
  }

  if (existing.status === nextStatus) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    return { order: serializeOrder(order) };
  }

  const allowed = STATUS_TRANSITIONS[existing.status] || new Set();
  if (!allowed.has(nextStatus)) {
    throw new AppError(
      `Cannot change status from ${existing.status} to ${nextStatus}`,
      400,
    );
  }

  const data = { status: nextStatus };
  let appreciationRows = [];
  let backdateStamp = null;

  if (nextStatus === OrderStatuses.CANCELLED) {
    const reason =
      typeof cancelReason === 'string' && cancelReason.trim()
        ? cancelReason.trim().slice(0, 500)
        : '';
    if (!reason) {
      throw new AppError('Cancel reason is required', 400);
    }

    const password = typeof adminPassword === 'string' ? adminPassword : '';
    if (!password) {
      throw new AppError('Admin password is required to cancel an order', 400);
    }
    if (!actorUserId) {
      throw new AppError('Only the restaurant admin can cancel orders', 403);
    }

    const adminUser = await prisma.user.findFirst({
      where: {
        id: actorUserId,
        restaurantId: existing.restaurantId,
        role: 'RESTAURANT_ADMIN',
        isActive: true,
      },
      select: { id: true, passwordHash: true },
    });
    if (!adminUser) {
      throw new AppError('Only the restaurant admin can cancel orders', 403);
    }

    const passwordOk = await bcrypt.compare(password, adminUser.passwordHash);
    if (!passwordOk) {
      throw new AppError('Incorrect password', 401, { code: 'INVALID_PASSWORD' });
    }

    await assertOrderDayEditable(existing.restaurantId, existing);

    data.cancelReason = reason;
    data.cancelledAt = new Date();
    data.cancelledByUserId = adminUser.id;
  }

  if (nextStatus === OrderStatuses.COMPLETED) {
    const itemCount = await prisma.orderItem.count({ where: { orderId: id } });
    if (itemCount < 1) {
      throw new AppError('Add at least one item before completing the order', 400);
    }

    if (businessDate) {
      const ymd = await assertBusinessDayEditable(existing.restaurantId, businessDate);
      backdateStamp = businessDateToLocalNoon(ymd);
      const dayKey = ymd.replace(/-/g, '');
      // Retarget order number + timestamps onto the unlocked business date.
      data.orderNumber = await nextOrderNumber(existing.restaurantId, dayKey);
      data.createdAt = backdateStamp;
    } else {
      await assertOrderDayEditable(existing.restaurantId, existing);
    }

    const method = String(paymentMethod || '').trim().toUpperCase();
    const paidAt = backdateStamp || new Date();
    const hasPartSplits = Array.isArray(paymentSplits) && paymentSplits.length >= 2;
    const treatAsPart =
      method === 'PART' || (hasPartSplits && !SINGLE_PAYMENT_METHODS.has(method));

    if (treatAsPart) {
      const splits = parsePaymentSplits(paymentSplits, existing.total);
      data.paymentMethod = 'PART';
      data.paymentSplits = splits;
      data.paymentNote = null;
      data.paidAt = paidAt;
    } else {
      if (!SINGLE_PAYMENT_METHODS.has(method)) {
        throw new AppError(
          'Payment method is required when completing an order (CASH, CARD, UPI_GPAY, UPI_PHONEPE, UPI_OTHER, OTHER, PART)',
          400,
        );
      }
      data.paymentMethod = method;
      data.paymentSplits = null;
      data.paidAt = paidAt;
      if (method === 'OTHER' || method === 'UPI_OTHER') {
        const note =
          typeof paymentNote === 'string' && paymentNote.trim()
            ? paymentNote.trim().slice(0, 120)
            : null;
        data.paymentNote = note;
      } else {
        data.paymentNote = null;
      }
    }

    const appreciationTotal = money2(staffAppreciationAmount);
    if (appreciationTotal < 0) {
      throw new AppError('Staff appreciation cannot be negative', 400);
    }
    if (appreciationTotal > 100000) {
      throw new AppError('Staff appreciation amount is too large', 400);
    }

    const captainIds = parseAppreciationCaptains(appreciationCaptainIds || []);
    if (appreciationTotal > 0 && captainIds.length < 1) {
      throw new AppError('Select at least one captain for staff appreciation', 400);
    }
    if (appreciationTotal === 0 && captainIds.length > 0) {
      throw new AppError('Enter a staff appreciation amount for the selected captains', 400);
    }

    if (appreciationTotal > 0) {
      const captains = await prisma.user.findMany({
        where: {
          id: { in: captainIds },
          restaurantId: existing.restaurantId,
          role: 'RESTAURANT_CAPTAIN',
          isActive: true,
        },
        select: { id: true },
      });
      if (captains.length !== captainIds.length) {
        throw new AppError('One or more selected captains are invalid', 400);
      }
      appreciationRows = splitAppreciationAmount(appreciationTotal, captainIds);
    }

    data.staffAppreciationAmount = appreciationTotal;
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data,
      include: orderInclude,
    });

    if (nextStatus === OrderStatuses.COMPLETED) {
      await tx.orderAppreciationShare.deleteMany({ where: { orderId: id } });
      if (appreciationRows.length > 0) {
        await tx.orderAppreciationShare.createMany({
          data: appreciationRows.map((row) => ({
            orderId: id,
            captainUserId: row.captainUserId,
            amount: row.amount,
          })),
        });
      }
      return tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });
    }

    return updated;
  });

  return { order: serializeOrder(order) };
}

/**
 * Restaurant admin: open a walk-in ticket on a free table (no guest QR required).
 * If the table already has an open order, returns that ticket instead.
 * Optional businessDate (unlocked past day) stamps createdAt + order # onto that date.
 */
export async function adminStartOrderForTable(
  restaurantId,
  { tableId = null, tableNumber = null, businessDate = null } = {},
) {
  const rid = validateCuid(restaurantId, 'restaurantId');
  const table = await resolveRestaurantTable(rid, { tableId, tableNumber });
  if (!table) {
    throw new AppError('A valid table is required', 400);
  }
  if (table.isActive === false) {
    throw new AppError('This table is inactive', 400);
  }

  const existing = await resolveContinuableOpenOrder(rid, table.id);
  if (existing) {
    return { order: serializeOrder(existing), created: false };
  }

  let stamp = null;
  let dayKey = localDayKey();
  if (businessDate) {
    const ymd = await assertBusinessDayEditable(rid, businessDate);
    stamp = businessDateToLocalNoon(ymd);
    dayKey = ymd.replace(/-/g, '');
  }

  const orderNumber = await nextOrderNumber(rid, dayKey);
  const order = await prisma.order.create({
    data: {
      restaurantId: rid,
      tableId: table.id,
      sessionId: null,
      orderNumber,
      status: OrderStatuses.PLACED,
      subtotal: 0,
      cgstRate: 0,
      sgstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      taxAmount: 0,
      roundOffAmount: 0,
      total: 0,
      customerNote: null,
      ...(stamp ? { createdAt: stamp, updatedAt: stamp } : {}),
    },
    include: orderInclude,
  });

  return { order: serializeOrder(order), created: true };
}

/**
 * Correct payment method on a settled bill (e.g. Cash → GPay).
 * Blocked while that business day is Day-End locked.
 */
export async function updateOrderPayment(
  orderId,
  {
    restaurantId = null,
    paymentMethod = null,
    paymentNote = null,
    paymentSplits = null,
  } = {},
) {
  const id = validateCuid(orderId, 'orderId');
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw new AppError('Order not found', 404);
  if (restaurantId && existing.restaurantId !== restaurantId) {
    throw new AppError('Order not found', 404);
  }
  if (existing.status !== OrderStatuses.COMPLETED) {
    throw new AppError('Only completed bills can have payment method edited', 400);
  }

  await assertOrderDayEditable(existing.restaurantId, existing);

  const method = String(paymentMethod || '').trim().toUpperCase();
  const data = {};
  const hasPartSplits = Array.isArray(paymentSplits) && paymentSplits.length >= 2;
  const treatAsPart =
    method === 'PART' || (hasPartSplits && !SINGLE_PAYMENT_METHODS.has(method));

  if (treatAsPart) {
    const splits = parsePaymentSplits(paymentSplits, existing.total);
    data.paymentMethod = 'PART';
    data.paymentSplits = splits;
    data.paymentNote = null;
  } else {
    if (!SINGLE_PAYMENT_METHODS.has(method)) {
      throw new AppError(
        'Payment method must be CASH, CARD, UPI_GPAY, UPI_PHONEPE, UPI_OTHER, OTHER, or PART',
        400,
      );
    }
    data.paymentMethod = method;
    data.paymentSplits = null;
    if (method === 'OTHER' || method === 'UPI_OTHER') {
      data.paymentNote =
        typeof paymentNote === 'string' && paymentNote.trim()
          ? paymentNote.trim().slice(0, 120)
          : null;
    } else {
      data.paymentNote = null;
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data,
    include: orderInclude,
  });

  return { order: serializeOrder(order) };
}

async function loadEditableAdminOrder(restaurantId, orderId) {
  const id = validateCuid(orderId, 'orderId');
  const order = await prisma.order.findFirst({
    where: { id, restaurantId },
    include: { items: true },
  });
  if (!order) throw new AppError('Order not found', 404);
  if (!OPEN_ORDER_STATUSES.includes(order.status)) {
    throw new AppError('Closed orders cannot be edited', 400);
  }
  return order;
}

async function recalcAndReturnOrder(tx, orderId, restaurantId) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const subtotal = money(items.reduce((sum, item) => sum + Number(item.subtotal), 0));
  const restaurant = await tx.restaurant.findUnique({
    where: { id: restaurantId },
    select: { gstEnabled: true, cgstRate: true, sgstRate: true },
  });
  const tax = computeExclusiveGst(subtotal, restaurant || {});
  return tx.order.update({
    where: { id: orderId },
    data: { subtotal, ...taxFieldsFromCompute(tax) },
    include: orderInclude,
  });
}

/**
 * Restaurant admin: append menu dishes to an open order (server prices only).
 */
export async function adminAddItemsToOrder(restaurantId, orderId, rawItems = []) {
  const existing = await loadEditableAdminOrder(restaurantId, orderId);
  const { lines } = await buildPricedLines(restaurantId, rawItems);

  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.orderItem.findMany({ where: { orderId: existing.id } });

    for (const line of lines) {
      const prior = current.find((item) => item.dishId === line.dishId);
      if (prior) {
        const quantity = prior.quantity + line.quantity;
        if (quantity > MAX_LINE_QTY) {
          throw new AppError(
            `Quantity for ${line.dishNameSnapshot} cannot exceed ${MAX_LINE_QTY}`,
            400,
          );
        }
        const priceSnapshot = money(line.priceSnapshot);
        await tx.orderItem.update({
          where: { id: prior.id },
          data: {
            quantity,
            priceSnapshot,
            dishNameSnapshot: line.dishNameSnapshot,
            subtotal: money(priceSnapshot * quantity),
            imageUrl: line.imageUrl,
          },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId: existing.id,
            ...line,
          },
        });
      }
    }

    return recalcAndReturnOrder(tx, existing.id, restaurantId);
  });

  return { order: serializeOrder(order) };
}

/**
 * Restaurant admin: set line quantity (1–MAX). Use remove for deletion.
 */
export async function adminUpdateOrderItemQuantity(
  restaurantId,
  orderId,
  itemId,
  quantityRaw,
) {
  const existing = await loadEditableAdminOrder(restaurantId, orderId);
  const lineId = validateCuid(itemId, 'itemId');
  const quantity = parseQuantity(quantityRaw);

  const line = existing.items.find((item) => item.id === lineId);
  if (!line) throw new AppError('Order item not found', 404);

  const order = await prisma.$transaction(async (tx) => {
    const priceSnapshot = money(line.priceSnapshot);
    await tx.orderItem.update({
      where: { id: line.id },
      data: {
        quantity,
        subtotal: money(priceSnapshot * quantity),
      },
    });
    return recalcAndReturnOrder(tx, existing.id, restaurantId);
  });

  return { order: serializeOrder(order) };
}

/**
 * Restaurant admin: remove a line.
 * If the last item is removed, the empty open ticket is discarded so the table shows Free.
 */
export async function adminRemoveOrderItem(restaurantId, orderId, itemId) {
  const existing = await loadEditableAdminOrder(restaurantId, orderId);
  const lineId = validateCuid(itemId, 'itemId');

  const line = existing.items.find((item) => item.id === lineId);
  if (!line) throw new AppError('Order item not found', 404);

  const result = await prisma.$transaction(async (tx) => {
    await tx.orderItem.delete({ where: { id: line.id } });
    const remaining = await tx.orderItem.count({ where: { orderId: existing.id } });
    if (remaining === 0) {
      await tx.order.delete({ where: { id: existing.id } });
      return null;
    }
    return recalcAndReturnOrder(tx, existing.id, restaurantId);
  });

  if (!result) {
    return { order: null, deleted: true };
  }
  return { order: serializeOrder(result), deleted: false };
}

/**
 * Discard an open walk-in ticket that still has no items (table returns to Free).
 */
export async function adminDiscardEmptyOrder(restaurantId, orderId) {
  const id = validateCuid(orderId, 'orderId');
  const existing = await prisma.order.findFirst({
    where: { id, restaurantId },
    include: { _count: { select: { items: true } } },
  });
  if (!existing) throw new AppError('Order not found', 404);
  if (!OPEN_ORDER_STATUSES.includes(existing.status)) {
    throw new AppError('Only open orders can be discarded', 400);
  }
  if ((existing._count?.items || 0) > 0) {
    throw new AppError('Order still has items. Remove them first or complete the bill.', 400);
  }

  await prisma.order.delete({ where: { id: existing.id } });
  return { ok: true, deleted: true, id: existing.id };
}
