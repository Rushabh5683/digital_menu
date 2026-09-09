import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';
import {
  buildConsiderationFunnel,
  buildOverviewSummary,
  calculateAverageSessionDurationSeconds,
  calculateCategoryMetrics,
  buildComparisonReport,
  calculateComparisonPairs,
  calculateDailyTrends,
  calculateDishMetrics,
  calculateFilterDemand,
  calculateInformationMetrics,
  calculateMenuExitMetrics,
  buildSearchDemandReport,
  calculateSearchDemand,
  findHighAttentionHighOrders,
  findHighAttentionLowOrders,
  findHighAttentionLowSelection,
  findHiddenGems,
  mergeDishOrderMetrics,
  summarizeOrders,
  buildGuestJourneyReport,
} from './analytics.metrics.js';

function parseDateParam(value, label) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${label} date`, 400);
  }
  return date;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

/**
 * Resolve dashboard time window.
 * Strategy: UTC calendar days for presets; explicit ISO from/to when provided.
 * Presets: today | 7d | 30d | all (or omitted).
 */
export function parseDateRange(query = {}) {
  const fromExplicit = parseDateParam(query.from, 'from');
  const toExplicit = parseDateParam(query.to, 'to');

  if (fromExplicit || toExplicit) {
    if (fromExplicit && toExplicit && fromExplicit > toExplicit) {
      throw new AppError('"from" must be before "to"', 400);
    }
    return { from: fromExplicit, to: toExplicit };
  }

  const range = String(query.range || '').trim().toLowerCase();
  if (!range || range === 'all') {
    return { from: null, to: null };
  }

  const now = new Date();
  if (range === 'today') {
    return { from: startOfUtcDay(now), to: endOfUtcDay(now) };
  }

  if (range === '7d' || range === '30d') {
    const days = range === '7d' ? 6 : 29;
    const from = startOfUtcDay(now);
    from.setUTCDate(from.getUTCDate() - days);
    return { from, to: endOfUtcDay(now) };
  }

  throw new AppError('Invalid range preset. Use today, 7d, 30d, or all.', 400);
}

function eventTimestampFilter(from, to) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

async function assertRestaurant(restaurantId) {
  const id = validateCuid(restaurantId, 'restaurantId');
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  return restaurant;
}

async function loadMenuCatalog(restaurantId) {
  const menu = await prisma.menu.findFirst({
    where: { restaurantId, isPublished: true },
    orderBy: { updatedAt: 'desc' },
    include: {
      categories: {
        orderBy: { displayOrder: 'asc' },
        include: {
          dishes: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    },
  });

  const categories = menu?.categories ?? [];
  const dishes = categories.flatMap((category) =>
    category.dishes.map((dish) => ({
      ...dish,
      categoryName: category.name,
    })),
  );

  return { menu, categories, dishes };
}

async function loadEvents(restaurantId, from, to) {
  const timestamp = eventTimestampFilter(from, to);
  return prisma.analyticsEvent.findMany({
    where: {
      restaurantId,
      ...(timestamp ? { timestamp } : {}),
    },
    select: {
      id: true,
      sessionId: true,
      eventType: true,
      categoryId: true,
      dishId: true,
      metadata: true,
      timestamp: true,
    },
    orderBy: { timestamp: 'asc' },
  });
}

async function loadSessions(restaurantId, from, to) {
  return prisma.session.findMany({
    where: {
      restaurantId,
      ...(from || to
        ? {
            startedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
    },
  });
}

const COUNTED_ORDER_STATUSES = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];

/**
 * Load real orders + line items for attention→order joining.
 * Excludes rejected / cancelled tickets.
 */
async function loadOrdersWithItems(restaurantId, from, to) {
  const createdAt =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: { in: COUNTED_ORDER_STATUSES },
      ...(createdAt ? { createdAt } : {}),
    },
    select: {
      id: true,
      sessionId: true,
      status: true,
      total: true,
      createdAt: true,
      items: {
        select: {
          dishId: true,
          quantity: true,
          dishNameSnapshot: true,
          orderId: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const orderItems = orders.flatMap((order) =>
    order.items.map((item) => ({
      dishId: item.dishId,
      quantity: item.quantity,
      dishNameSnapshot: item.dishNameSnapshot,
      orderId: order.id,
      sessionId: order.sessionId,
    })),
  );

  return {
    orders: orders.map((order) => ({
      id: order.id,
      sessionId: order.sessionId,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt,
    })),
    orderItems,
  };
}

function countMenuSessions(events, sessions) {
  const fromEvents = new Set(
    events
      .filter((event) => event.eventType === 'MENU_OPENED' || event.eventType === 'session_start')
      .map((event) => event.sessionId),
  );

  if (fromEvents.size > 0) {
    return fromEvents.size;
  }

  return sessions.length;
}

function stripInternalFields(items) {
  return items.map(({ _exists, ...rest }) => rest);
}

export async function getCategoryAnalytics(restaurantId, query = {}) {
  const restaurant = await assertRestaurant(restaurantId);
  const { from, to } = parseDateRange(query);
  const [{ categories }, events, sessions] = await Promise.all([
    loadMenuCatalog(restaurant.id),
    loadEvents(restaurant.id, from, to),
    loadSessions(restaurant.id, from, to),
  ]);

  const totalMenuSessions = countMenuSessions(events, sessions);
  const metrics = calculateCategoryMetrics({
    categories,
    events,
    totalMenuSessions,
  });

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    range: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    totalMenuSessions,
    categories: stripInternalFields(metrics),
  };
}

export async function getDishAnalytics(restaurantId, query = {}) {
  const restaurant = await assertRestaurant(restaurantId);
  const { from, to } = parseDateRange(query);
  const [{ dishes, categories }, events, { orderItems }] = await Promise.all([
    loadMenuCatalog(restaurant.id),
    loadEvents(restaurant.id, from, to),
    loadOrdersWithItems(restaurant.id, from, to),
  ]);

  const baseMetrics = calculateDishMetrics({ dishes, events });
  const metrics = mergeDishOrderMetrics(baseMetrics, orderItems);
  const highAttentionLowSelection = findHighAttentionLowSelection(metrics);
  const highAttentionHighOrders = findHighAttentionHighOrders(metrics);
  const highAttentionLowOrders = findHighAttentionLowOrders(metrics);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  const withCategory = (list) =>
    list.map((dish) => ({
      ...dish,
      categoryName: categoryNameById.get(dish.categoryId) ?? dish.categoryName ?? null,
    }));

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    range: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    dishes: withCategory(metrics),
    highAttentionLowSelection: withCategory(highAttentionLowSelection.dishes),
    highAttentionLowSelectionCohort: highAttentionLowSelection.cohort,
    highAttentionHighOrders: withCategory(highAttentionHighOrders),
    highAttentionLowOrders: withCategory(highAttentionLowOrders),
  };
}

export async function getAnalyticsOverview(restaurantId, query = {}) {
  const restaurant = await assertRestaurant(restaurantId);
  const { from, to } = parseDateRange(query);
  const [{ categories, dishes }, events, sessions, { orders, orderItems }] = await Promise.all([
    loadMenuCatalog(restaurant.id),
    loadEvents(restaurant.id, from, to),
    loadSessions(restaurant.id, from, to),
    loadOrdersWithItems(restaurant.id, from, to),
  ]);

  const totalMenuSessions = countMenuSessions(events, sessions);
  const categoryMetrics = calculateCategoryMetrics({
    categories,
    events,
    totalMenuSessions,
  });
  const dishMetrics = mergeDishOrderMetrics(
    calculateDishMetrics({ dishes, events }),
    orderItems,
  );
  const highAttentionLowSelection = findHighAttentionLowSelection(dishMetrics);
  const averageSessionDurationSeconds = calculateAverageSessionDurationSeconds(sessions);
  const funnel = buildConsiderationFunnel({
    events,
    orders,
    totalMenuSessions,
  });
  const orderSummary = summarizeOrders(orderItems, orders);

  const searchDemand = calculateSearchDemand(events);
  const searchDemandReport = buildSearchDemandReport(events);
  const filterDemand = calculateFilterDemand(events);
  const informationMetrics = calculateInformationMetrics(events, dishes);
  const menuExitMetrics = calculateMenuExitMetrics(events, totalMenuSessions);
  const comparisonPairs = calculateComparisonPairs(events, dishes);
  const comparisonReport = buildComparisonReport(events, dishes);
  const hiddenGems = findHiddenGems(dishMetrics, categoryMetrics);
  const guestJourneyReport = buildGuestJourneyReport(events);

  const summary = buildOverviewSummary({
    totalMenuSessions,
    averageSessionDurationSeconds,
    categories: categoryMetrics,
    dishes: dishMetrics,
    highAttentionLowSelection,
    funnel,
    orderSummary,
    searchDemand,
    searchDemandReport,
    filterDemand,
    informationMetrics,
    menuExitMetrics,
    comparisonPairs,
    comparisonReport,
    hiddenGems,
    guestJourneyReport,
  });

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    range: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    ...summary,
  };
}

/**
 * Dedicated funnel + attention vs selection vs order comparison payload.
 */
export async function getAttentionOrderFunnel(restaurantId, query = {}) {
  const restaurant = await assertRestaurant(restaurantId);
  const { from, to } = parseDateRange(query);
  const [{ dishes, categories }, events, sessions, { orders, orderItems }] = await Promise.all([
    loadMenuCatalog(restaurant.id),
    loadEvents(restaurant.id, from, to),
    loadSessions(restaurant.id, from, to),
    loadOrdersWithItems(restaurant.id, from, to),
  ]);

  const totalMenuSessions = countMenuSessions(events, sessions);
  const dishMetrics = mergeDishOrderMetrics(
    calculateDishMetrics({ dishes, events }),
    orderItems,
  );
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const funnel = buildConsiderationFunnel({
    events,
    orders,
    totalMenuSessions,
  });

  const comparison = dishMetrics
    .filter(
      (dish) =>
        dish.totalViews > 0 ||
        dish.selectionCount > 0 ||
        dish.orderedQuantity > 0 ||
        dish.totalAttentionSeconds > 0,
    )
    .map((dish) => ({
      dishId: dish.dishId,
      name: dish.name,
      categoryId: dish.categoryId,
      categoryName: categoryNameById.get(dish.categoryId) ?? null,
      views: dish.totalViews,
      averageAttentionSeconds: dish.averageAttentionSeconds,
      selections: dish.selectionCount,
      selectionRate: dish.selectionRate,
      orderedQuantity: dish.orderedQuantity,
      orderRate: dish.orderRate,
    }))
    .sort(
      (a, b) =>
        b.orderedQuantity - a.orderedQuantity ||
        b.averageAttentionSeconds - a.averageAttentionSeconds ||
        b.views - a.views,
    );

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    range: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    funnel,
    orderSummary: summarizeOrders(orderItems, orders),
    comparison,
    highAttentionHighOrders: findHighAttentionHighOrders(dishMetrics),
    highAttentionLowOrders: findHighAttentionLowOrders(dishMetrics),
  };
}

export async function getAnalyticsTrends(restaurantId, query = {}) {
  const restaurant = await assertRestaurant(restaurantId);
  const { from, to } = parseDateRange(query);
  const events = await loadEvents(restaurant.id, from, to);

  const rangeFrom = from || (events[0] ? new Date(events[0].timestamp) : null);
  const rangeTo = to || (events.length ? new Date(events[events.length - 1].timestamp) : null);

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    range: {
      from: rangeFrom?.toISOString() ?? null,
      to: rangeTo?.toISOString() ?? null,
    },
    daily: calculateDailyTrends(events, { from: rangeFrom, to: rangeTo }),
  };
}
