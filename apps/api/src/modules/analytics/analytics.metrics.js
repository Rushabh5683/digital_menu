/**
 * Pure analytics calculations over AnalyticsEvent-shaped records.
 * Source of truth remains the event list — no hardcoded dashboard numbers.
 */

export function msToSeconds(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return 0;
  return Number(ms) / 1000;
}

export function round(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

export function readDurationMs(event) {
  const metadata = event?.metadata;
  if (!metadata || typeof metadata !== 'object') return 0;
  const value = Number(metadata.durationMs);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function uniqueSessionIds(events) {
  return new Set(events.map((event) => event.sessionId).filter(Boolean));
}

/**
 * Category / section metrics from raw events.
 */
export function calculateCategoryMetrics({
  categories,
  events,
  totalMenuSessions,
}) {
  const byCategory = new Map(categories.map((category) => [category.id, category]));

  return categories.map((category) => {
    const categoryEvents = events.filter((event) => event.categoryId === category.id);
    const viewEvents = categoryEvents.filter((event) => event.eventType === 'CATEGORY_VIEWED');
    const attentionEvents = categoryEvents.filter(
      (event) => event.eventType === 'CATEGORY_ATTENTION',
    );

    const totalViews = viewEvents.length;
    const uniqueSessions = uniqueSessionIds([...viewEvents, ...attentionEvents]).size;
    const attentionSessionIds = uniqueSessionIds(attentionEvents);
    const totalAttentionMs = attentionEvents.reduce(
      (sum, event) => sum + readDurationMs(event),
      0,
    );
    const totalAttentionSeconds = msToSeconds(totalAttentionMs);
    const averageAttentionSeconds =
      attentionSessionIds.size > 0
        ? totalAttentionSeconds / attentionSessionIds.size
        : 0;
    const percentSessionsReaching =
      totalMenuSessions > 0 ? (uniqueSessions / totalMenuSessions) * 100 : 0;

    return {
      categoryId: category.id,
      name: category.name,
      displayOrder: category.displayOrder,
      totalViews,
      uniqueSessions,
      totalAttentionSeconds: round(totalAttentionSeconds, 1),
      averageAttentionSeconds: round(averageAttentionSeconds, 1),
      percentSessionsReaching: round(percentSessionsReaching, 1),
      _exists: byCategory.has(category.id),
    };
  });
}

/**
 * Dish metrics from raw events.
 */
export function calculateDishMetrics({ dishes, events }) {
  return dishes.map((dish) => {
    const dishEvents = events.filter((event) => event.dishId === dish.id);
    const viewEvents = dishEvents.filter((event) => event.eventType === 'DISH_VIEWED');
    const attentionEvents = dishEvents.filter((event) => event.eventType === 'DISH_ATTENTION');
    const selectionEvents = dishEvents.filter((event) => event.eventType === 'DISH_SELECTED');

    const totalViews = viewEvents.length;
    const uniqueSessions = uniqueSessionIds([
      ...viewEvents,
      ...attentionEvents,
      ...selectionEvents,
    ]).size;
    const viewedSessionIds = uniqueSessionIds(viewEvents);
    const attentionSessionIds = uniqueSessionIds(attentionEvents);
    const selectionCount = selectionEvents.length;
    const totalAttentionMs = attentionEvents.reduce(
      (sum, event) => sum + readDurationMs(event),
      0,
    );
    const totalAttentionSeconds = msToSeconds(totalAttentionMs);
    const averageAttentionSeconds =
      attentionSessionIds.size > 0
        ? totalAttentionSeconds / attentionSessionIds.size
        : 0;
    const selectionRate =
      viewedSessionIds.size > 0 ? selectionCount / viewedSessionIds.size : 0;

    return {
      dishId: dish.id,
      categoryId: dish.categoryId,
      name: dish.name,
      price: dish.price != null ? Number(dish.price) : null,
      totalViews,
      uniqueSessions,
      totalAttentionSeconds: round(totalAttentionSeconds, 1),
      averageAttentionSeconds: round(averageAttentionSeconds, 1),
      selectionCount,
      selectionRate: round(selectionRate, 3),
    };
  });
}

/**
 * Dishes with meaningfully high attention and low selection.
 * Relative to cohort averages among dishes that received attention.
 */
export function findHighAttentionLowSelection(dishMetrics, options = {}) {
  const attentionFloor = options.attentionFloorSeconds ?? 3;
  const attentionMultiplier = options.attentionMultiplier ?? 1.25;
  const selectionMultiplier = options.selectionMultiplier ?? 0.75;
  const minViewedSessions = options.minViewedSessions ?? 1;

  const eligible = dishMetrics.filter(
    (dish) =>
      dish.averageAttentionSeconds > 0 &&
      dish.uniqueSessions >= minViewedSessions,
  );

  if (eligible.length === 0) {
    return {
      cohort: { averageAttentionSeconds: 0, averageSelectionRate: 0, sizeCount: 0 },
      dishes: [],
    };
  }

  const averageAttentionSeconds =
    eligible.reduce((sum, dish) => sum + dish.averageAttentionSeconds, 0) /
    eligible.length;
  const averageSelectionRate =
    eligible.reduce((sum, dish) => sum + dish.selectionRate, 0) / eligible.length;

  const dishes = eligible
    .filter(
      (dish) =>
        dish.averageAttentionSeconds >= Math.max(attentionFloor, averageAttentionSeconds * attentionMultiplier) &&
        dish.selectionRate <= averageSelectionRate * selectionMultiplier,
    )
    .sort(
      (a, b) =>
        b.averageAttentionSeconds - a.averageAttentionSeconds ||
        a.selectionRate - b.selectionRate,
    )
    .map((dish) => ({
      dishId: dish.dishId,
      categoryId: dish.categoryId,
      name: dish.name,
      averageAttentionSeconds: dish.averageAttentionSeconds,
      selectionRate: dish.selectionRate,
      selectionCount: dish.selectionCount,
      totalViews: dish.totalViews,
      reason: 'High attention relative to peers, but lower selection rate',
    }));

  return {
    cohort: {
      averageAttentionSeconds: round(averageAttentionSeconds, 1),
      averageSelectionRate: round(averageSelectionRate, 3),
      sizeCount: eligible.length,
    },
    dishes,
  };
}

export function pickHighestBy(items, field) {
  if (!items.length) return null;
  return items.reduce((best, item) => {
    if (!best) return item;
    const bestValue = Number(best[field]) || 0;
    const nextValue = Number(item[field]) || 0;
    return nextValue > bestValue ? item : best;
  }, null);
}

export function calculateAverageSessionDurationSeconds(sessions) {
  const durations = sessions
    .map((session) => {
      if (!session.startedAt || !session.endedAt) return null;
      const ms = new Date(session.endedAt) - new Date(session.startedAt);
      return ms > 0 ? msToSeconds(ms) : null;
    })
    .filter((value) => value != null);

  if (durations.length === 0) return null;
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return round(average, 1);
}

/**
 * Build daily trend buckets from events.
 */
export function calculateDailyTrends(events, { from, to } = {}) {
  const buckets = new Map();

  function ensure(day) {
    if (!buckets.has(day)) {
      buckets.set(day, {
        date: day,
        sessions: new Set(),
        categoryViews: 0,
        dishViews: 0,
        selections: 0,
        attentionSeconds: 0,
        searches: 0,
      });
    }
    return buckets.get(day);
  }

  for (const event of events) {
    const day = new Date(event.timestamp).toISOString().slice(0, 10);
    const bucket = ensure(day);
    bucket.sessions.add(event.sessionId);

    switch (event.eventType) {
      case 'CATEGORY_VIEWED':
        bucket.categoryViews += 1;
        break;
      case 'DISH_VIEWED':
        bucket.dishViews += 1;
        break;
      case 'DISH_SELECTED':
        bucket.selections += 1;
        break;
      case 'CATEGORY_ATTENTION':
      case 'DISH_ATTENTION':
        bucket.attentionSeconds += msToSeconds(readDurationMs(event));
        break;
      case 'SEARCH_PERFORMED':
        bucket.searches += 1;
        break;
      case 'DISH_INFO_VIEWED':
      case 'DISH_COMPARISON':
      case 'MENU_EXITED':
      case 'FILTER_APPLIED':
        break;
      case 'MENU_OPENED':
      case 'session_start':
        break;
      default:
        break;
    }
  }

  // Fill empty days in range for stable charts.
  if (from && to) {
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);
    while (cursor <= end) {
      ensure(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((bucket) => ({
      date: bucket.date,
      sessions: bucket.sessions.size,
      categoryViews: bucket.categoryViews,
      dishViews: bucket.dishViews,
      selections: bucket.selections,
      attentionSeconds: round(bucket.attentionSeconds, 1),
      searches: bucket.searches,
    }));
}

export function buildOverviewSummary({
  totalMenuSessions,
  averageSessionDurationSeconds,
  categories,
  dishes,
  highAttentionLowSelection,
  funnel = null,
  orderSummary = null,
  searchDemand = [],
  searchDemandReport = null,
  filterDemand = [],
  informationMetrics = null,
  menuExitMetrics = null,
  comparisonPairs = [],
  comparisonReport = null,
  hiddenGems = [],
  guestJourneyReport = null,
}) {
  const topAttentionCategory = pickHighestBy(categories, 'averageAttentionSeconds');
  const topViewedCategory = pickHighestBy(categories, 'totalViews');
  const topAttentionDish = pickHighestBy(dishes, 'averageAttentionSeconds');
  const mostSelectedDish = pickHighestBy(dishes, 'selectionCount');
  const mostOrderedDish = pickHighestBy(
    dishes.filter((dish) => (dish.orderedQuantity || 0) > 0),
    'orderedQuantity',
  );

  return {
    totalMenuSessions,
    averageSessionDurationSeconds,
    highestAttentionCategory: topAttentionCategory
      ? {
          categoryId: topAttentionCategory.categoryId,
          name: topAttentionCategory.name,
          averageAttentionSeconds: topAttentionCategory.averageAttentionSeconds,
          totalAttentionSeconds: topAttentionCategory.totalAttentionSeconds,
        }
      : null,
    highestViewedCategory: topViewedCategory
      ? {
          categoryId: topViewedCategory.categoryId,
          name: topViewedCategory.name,
          totalViews: topViewedCategory.totalViews,
          uniqueSessions: topViewedCategory.uniqueSessions,
        }
      : null,
    highestAttentionDish: topAttentionDish
      ? {
          dishId: topAttentionDish.dishId,
          name: topAttentionDish.name,
          averageAttentionSeconds: topAttentionDish.averageAttentionSeconds,
          totalAttentionSeconds: topAttentionDish.totalAttentionSeconds,
        }
      : null,
    mostSelectedDish: mostSelectedDish
      ? {
          dishId: mostSelectedDish.dishId,
          name: mostSelectedDish.name,
          selectionCount: mostSelectedDish.selectionCount,
          selectionRate: mostSelectedDish.selectionRate,
        }
      : null,
    mostOrderedDish: mostOrderedDish
      ? {
          dishId: mostOrderedDish.dishId,
          name: mostOrderedDish.name,
          orderedQuantity: mostOrderedDish.orderedQuantity,
          orderRate: mostOrderedDish.orderRate,
        }
      : null,
    highAttentionLowSelection: highAttentionLowSelection.dishes,
    highAttentionLowSelectionCohort: highAttentionLowSelection.cohort,
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
  };
}

/**
 * Merge PostgreSQL order line facts into dish attention metrics.
 * orderItems: [{ dishId, quantity, sessionId?, orderId }]
 */
export function mergeDishOrderMetrics(dishMetrics, orderItems = []) {
  const byDish = new Map();

  for (const item of orderItems) {
    if (!item?.dishId) continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    if (!byDish.has(item.dishId)) {
      byDish.set(item.dishId, {
        orderedQuantity: 0,
        orderLineCount: 0,
        orderIds: new Set(),
        orderingSessions: new Set(),
      });
    }
    const bucket = byDish.get(item.dishId);
    bucket.orderedQuantity += qty;
    bucket.orderLineCount += 1;
    if (item.orderId) bucket.orderIds.add(item.orderId);
    if (item.sessionId) bucket.orderingSessions.add(item.sessionId);
  }

  return dishMetrics.map((dish) => {
    const orders = byDish.get(dish.dishId);
    const orderedQuantity = orders?.orderedQuantity || 0;
    const orderingSessionCount = orders?.orderingSessions.size || 0;
    const viewedSessions = Math.max(dish.uniqueSessions || 0, 0);

    // Prefer session conversion; fall back to quantity vs views when sessions are sparse.
    let orderRate = 0;
    if (viewedSessions > 0 && orderingSessionCount > 0) {
      orderRate = orderingSessionCount / viewedSessions;
    } else if (dish.totalViews > 0 && orderedQuantity > 0) {
      orderRate = Math.min(1, orderedQuantity / dish.totalViews);
    }

    return {
      ...dish,
      orderedQuantity,
      orderCount: orders?.orderIds.size || 0,
      orderingSessionCount,
      orderRate: round(orderRate, 3),
    };
  });
}

/**
 * Dishes with strong attention that also convert to real orders.
 */
export function findHighAttentionHighOrders(dishMetrics, options = {}) {
  const attentionFloor = options.attentionFloorSeconds ?? 3;
  const minOrdered = options.minOrderedQuantity ?? 1;

  const eligible = dishMetrics.filter(
    (dish) =>
      (dish.averageAttentionSeconds || 0) >= attentionFloor &&
      (dish.orderedQuantity || 0) >= minOrdered &&
      (dish.totalViews || 0) >= 1,
  );

  if (eligible.length === 0) return [];

  const avgAttention =
    eligible.reduce((sum, dish) => sum + dish.averageAttentionSeconds, 0) / eligible.length;
  const avgOrdered =
    eligible.reduce((sum, dish) => sum + dish.orderedQuantity, 0) / eligible.length;

  return eligible
    .filter(
      (dish) =>
        dish.averageAttentionSeconds >= Math.max(attentionFloor, avgAttention * 1.1) &&
        dish.orderedQuantity >= Math.max(minOrdered, avgOrdered * 1.1),
    )
    .sort(
      (a, b) =>
        b.orderedQuantity - a.orderedQuantity ||
        b.averageAttentionSeconds - a.averageAttentionSeconds,
    )
    .slice(0, 5)
    .map((dish) => ({
      dishId: dish.dishId,
      name: dish.name,
      categoryId: dish.categoryId,
      averageAttentionSeconds: dish.averageAttentionSeconds,
      orderedQuantity: dish.orderedQuantity,
      orderRate: dish.orderRate,
      selectionCount: dish.selectionCount,
      totalViews: dish.totalViews,
    }));
}

/**
 * High attention / browsing interest but weak actual orders.
 */
export function findHighAttentionLowOrders(dishMetrics, options = {}) {
  const attentionFloor = options.attentionFloorSeconds ?? 3;
  const minViews = options.minViews ?? 2;

  const eligible = dishMetrics.filter(
    (dish) =>
      (dish.averageAttentionSeconds || 0) > 0 &&
      (dish.totalViews || 0) >= minViews,
  );
  if (eligible.length < 2) return [];

  const avgAttention =
    eligible.reduce((sum, dish) => sum + dish.averageAttentionSeconds, 0) / eligible.length;
  const avgOrderRate =
    eligible.reduce((sum, dish) => sum + (dish.orderRate || 0), 0) / eligible.length;

  return eligible
    .filter(
      (dish) =>
        dish.averageAttentionSeconds >= Math.max(attentionFloor, avgAttention * 1.25) &&
        dish.orderRate <= avgOrderRate * 0.7,
    )
    .sort(
      (a, b) =>
        b.averageAttentionSeconds - a.averageAttentionSeconds ||
        a.orderRate - b.orderRate,
    )
    .slice(0, 5)
    .map((dish) => ({
      dishId: dish.dishId,
      name: dish.name,
      categoryId: dish.categoryId,
      averageAttentionSeconds: dish.averageAttentionSeconds,
      orderedQuantity: dish.orderedQuantity,
      orderRate: dish.orderRate,
      selectionRate: dish.selectionRate,
      totalViews: dish.totalViews,
    }));
}

/**
 * Attention → Consideration → Selection → Order funnel from real events + orders.
 */
export function buildConsiderationFunnel({ events, orders = [], totalMenuSessions = 0 }) {
  const attentionSessions = uniqueSessionIds(
    events.filter(
      (event) =>
        event.eventType === 'DISH_ATTENTION' ||
        event.eventType === 'CATEGORY_ATTENTION' ||
        event.eventType === 'MENU_OPENED' ||
        event.eventType === 'session_start',
    ),
  );

  const considerationSessions = uniqueSessionIds(
    events.filter(
      (event) =>
        event.eventType === 'DISH_VIEWED' ||
        event.eventType === 'DISH_INFO_VIEWED' ||
        event.eventType === 'CATEGORY_VIEWED',
    ),
  );

  const selectionSessions = uniqueSessionIds(
    events.filter((event) => event.eventType === 'DISH_SELECTED'),
  );

  const orderSessions = new Set(
    orders.map((order) => order.sessionId).filter(Boolean),
  );
  const orderCount = orders.length;
  const orderStageCount = orderSessions.size > 0 ? orderSessions.size : orderCount;

  const attentionCount = Math.max(attentionSessions.size, totalMenuSessions);
  const considerationCount = considerationSessions.size;
  const selectionCount = selectionSessions.size;

  function rate(from, to) {
    if (!from || from <= 0) return null;
    return round(to / from, 3);
  }

  const stages = [
    {
      key: 'attention',
      label: 'Attention',
      description: 'Guests opening the menu and spending time on sections or dishes',
      count: attentionCount,
    },
    {
      key: 'consideration',
      label: 'Consideration',
      description: 'Guests viewing categories and dish details',
      count: considerationCount,
    },
    {
      key: 'selection',
      label: 'Selection',
      description: 'Guests explicitly selecting dishes of interest',
      count: selectionCount,
    },
    {
      key: 'order',
      label: 'Order',
      description: 'Guests placing a real order from the table',
      count: orderStageCount,
    },
  ];

  return {
    stages,
    conversions: {
      attentionToConsideration: rate(attentionCount, considerationCount),
      considerationToSelection: rate(considerationCount, selectionCount),
      selectionToOrder: rate(selectionCount, orderStageCount),
      attentionToOrder: rate(attentionCount, orderStageCount),
    },
    totals: {
      menuSessions: totalMenuSessions,
      orders: orderCount,
      orderSessions: orderSessions.size,
    },
  };
}

export function summarizeOrders(orderItems = [], orders = []) {
  const units = orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const revenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  return {
    orderCount: orders.length,
    unitsSold: units,
    revenue: round(revenue, 2),
  };
}

function isZeroResultSearch(metadata = {}) {
  if (metadata.zeroResults === true) return true;
  const resultCount = metadata.resultCount;
  return resultCount === 0;
}

/**
 * Aggregate SEARCH_PERFORMED events by normalized query.
 */
function aggregateSearchQueries(events) {
  const byQuery = new Map();
  const searchSessions = new Set();
  let totalSearchEvents = 0;
  let zeroResultEvents = 0;

  for (const event of events) {
    if (event.eventType !== 'SEARCH_PERFORMED') continue;
    const raw = event.metadata?.query;
    if (typeof raw !== 'string') continue;
    const query = raw.trim().toLowerCase();
    if (query.length < 2) continue;

    totalSearchEvents += 1;
    searchSessions.add(event.sessionId);

    const zeroResult = isZeroResultSearch(event.metadata);
    if (zeroResult) zeroResultEvents += 1;

    if (!byQuery.has(query)) {
      byQuery.set(query, {
        query,
        count: 0,
        uniqueSessions: new Set(),
        zeroResultCount: 0,
      });
    }

    const row = byQuery.get(query);
    row.count += 1;
    row.uniqueSessions.add(event.sessionId);
    if (zeroResult) row.zeroResultCount += 1;
  }

  const terms = [...byQuery.values()]
    .map((row) => ({
      query: row.query,
      count: row.count,
      uniqueSessions: row.uniqueSessions.size,
      zeroResultCount: row.zeroResultCount,
      hasZeroResults: row.zeroResultCount > 0,
    }))
    .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query));

  return { terms, totalSearchEvents, searchSessions: searchSessions.size, zeroResultEvents };
}

/**
 * Search term demand from SEARCH_PERFORMED events (query only, min 2 chars).
 */
export function calculateSearchDemand(events) {
  return aggregateSearchQueries(events).terms;
}

/**
 * Curated search demand for the dashboard (top terms, gaps, summary — not a raw log).
 */
export function buildSearchDemandReport(events, options = {}) {
  const {
    topLimit = 5,
    minCount = 2,
    minSessions = 2,
    otherPreviewLimit = 100,
  } = options;

  const { terms, totalSearchEvents, searchSessions, zeroResultEvents } =
    aggregateSearchQueries(events);

  const meetsThreshold = (row) => row.count >= minCount || row.uniqueSessions >= minSessions;

  const topSearches = terms.filter(meetsThreshold).slice(0, topLimit).map((row) => ({
    query: row.query,
    count: row.count,
    uniqueSessions: row.uniqueSessions,
    zeroResultCount: row.zeroResultCount,
    hasZeroResults: row.hasZeroResults,
    sharePercent:
      totalSearchEvents > 0 ? round((row.count / totalSearchEvents) * 100, 1) : null,
  }));

  const topQuerySet = new Set(topSearches.map((row) => row.query));

  const zeroResultSearches = terms
    .filter((row) => row.hasZeroResults && !topQuerySet.has(row.query))
    .sort(
      (a, b) =>
        b.zeroResultCount - a.zeroResultCount || b.count - a.count || a.query.localeCompare(b.query),
    )
    .map((row) => ({
      query: row.query,
      count: row.count,
      uniqueSessions: row.uniqueSessions,
      zeroResultCount: row.zeroResultCount,
    }));

  const shownQueries = new Set([
    ...topSearches.map((row) => row.query),
    ...zeroResultSearches.map((row) => row.query),
  ]);

  const otherPool = terms.filter((row) => !shownQueries.has(row.query));
  const otherCount = otherPool.length;

  const topTerm = terms[0] ?? null;

  return {
    summary: {
      totalSearches: totalSearchEvents,
      searchSessions,
      uniqueTerms: terms.length,
      topTerm: topTerm
        ? {
            query: topTerm.query,
            count: topTerm.count,
            sharePercent:
              totalSearchEvents > 0
                ? round((topTerm.count / totalSearchEvents) * 100, 1)
                : null,
          }
        : null,
      zeroResultSearches: zeroResultEvents,
      zeroResultRate:
        totalSearchEvents > 0 ? round(zeroResultEvents / totalSearchEvents, 3) : null,
    },
    topSearches,
    zeroResultSearches,
    otherSearches: otherPool.slice(0, otherPreviewLimit).map((row) => ({
      query: row.query,
      count: row.count,
      uniqueSessions: row.uniqueSessions,
    })),
    otherCount,
  };
}

/**
 * Filter demand from FILTER_APPLIED events.
 */
export function calculateFilterDemand(events) {
  const counts = new Map();
  const sessionByFilter = new Map();

  for (const event of events) {
    if (event.eventType !== 'FILTER_APPLIED') continue;
    const filterId = event.metadata?.filterId;
    if (!filterId) continue;
    const key = String(filterId).trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!sessionByFilter.has(key)) sessionByFilter.set(key, new Set());
    sessionByFilter.get(key).add(event.sessionId);
  }

  return [...counts.entries()]
    .map(([filterId, count]) => ({
      filterId,
      count,
      uniqueSessions: sessionByFilter.get(filterId)?.size ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.filterId.localeCompare(b.filterId));
}

/**
 * Information-seeking behaviour from DISH_INFO_VIEWED events.
 */
export function calculateInformationMetrics(events, dishes = []) {
  const dishNameById = new Map(dishes.map((d) => [d.id, d.name]));
  const byDish = new Map();
  const sectionCounts = new Map();
  let totalInfoViews = 0;

  for (const event of events) {
    if (event.eventType !== 'DISH_INFO_VIEWED') continue;
    totalInfoViews += 1;
    const dishId = event.dishId;
    if (!dishId) continue;
    byDish.set(dishId, (byDish.get(dishId) || 0) + 1);

    const sections = event.metadata?.sections;
    if (Array.isArray(sections) && sections.length > 0) {
      for (const section of sections) {
        const key = String(section).trim().toLowerCase();
        if (!key) continue;
        sectionCounts.set(key, (sectionCounts.get(key) || 0) + 1);
      }
    } else {
      sectionCounts.set('details', (sectionCounts.get('details') || 0) + 1);
    }
  }

  const topDishes = [...byDish.entries()]
    .map(([dishId, count]) => ({
      dishId,
      name: dishNameById.get(dishId) || 'Unknown dish',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topSections = [...sectionCounts.entries()]
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count);

  return { totalInfoViews, topDishes, topSections };
}

/**
 * Menu exit / browse-without-decision signals.
 */
export function calculateMenuExitMetrics(events, totalMenuSessions) {
  const exitSessions = uniqueSessionIds(
    events.filter((event) => event.eventType === 'MENU_EXITED'),
  );
  const selectionSessions = uniqueSessionIds(
    events.filter((event) => event.eventType === 'DISH_SELECTED'),
  );

  const exitCount = exitSessions.size;
  let exitsWithoutSelection = 0;
  for (const sessionId of exitSessions) {
    if (!selectionSessions.has(sessionId)) exitsWithoutSelection += 1;
  }

  return {
    menuExitCount: exitCount,
    menuExitRate: totalMenuSessions > 0 ? round(exitCount / totalMenuSessions, 3) : null,
    exitsWithoutSelection,
    browseWithoutSelectionRate:
      exitCount > 0 ? round(exitsWithoutSelection / exitCount, 3) : null,
  };
}

/**
 * Dish pairs from explicit DISH_COMPARISON events (behavioural consideration).
 */
function aggregateComparisonPairs(events, dishes = []) {
  const dishNameById = new Map(dishes.map((d) => [d.id, d.name]));
  const pairCounts = new Map();
  const pairSessions = new Map();
  const comparisonSessions = new Set();
  let totalComparisons = 0;

  for (const event of events) {
    if (event.eventType !== 'DISH_COMPARISON') continue;
    const a = event.metadata?.previousDishId || event.metadata?.dishAId;
    const b = event.dishId || event.metadata?.dishBId;
    if (!a || !b || a === b) continue;

    totalComparisons += 1;
    comparisonSessions.add(event.sessionId);

    const key = [a, b].sort().join('|');
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    if (!pairSessions.has(key)) pairSessions.set(key, new Set());
    pairSessions.get(key).add(event.sessionId);
  }

  const pairs = [...pairCounts.entries()]
    .map(([key, count]) => {
      const [dishAId, dishBId] = key.split('|');
      return {
        dishAId,
        dishBId,
        dishAName: dishNameById.get(dishAId) || 'Dish A',
        dishBName: dishNameById.get(dishBId) || 'Dish B',
        count,
        uniqueSessions: pairSessions.get(key)?.size ?? 0,
      };
    })
    .sort((a, b) => b.count - a.count || a.dishAName.localeCompare(b.dishAName));

  return { pairs, totalComparisons, comparisonSessions: comparisonSessions.size };
}

export function calculateComparisonPairs(events, dishes = []) {
  return aggregateComparisonPairs(events, dishes).pairs.slice(0, 15);
}

/**
 * Curated comparison report for the dashboard (top pairs + summary — not a raw log).
 */
export function buildComparisonReport(events, dishes = [], options = {}) {
  const { topLimit = 5, minCount = 2, minSessions = 2, otherPreviewLimit = 100 } = options;

  const { pairs, totalComparisons, comparisonSessions } = aggregateComparisonPairs(events, dishes);

  const meetsThreshold = (row) => row.count >= minCount || row.uniqueSessions >= minSessions;

  const topPairs = pairs.filter(meetsThreshold).slice(0, topLimit).map((row) => ({
    ...row,
    sharePercent:
      totalComparisons > 0 ? round((row.count / totalComparisons) * 100, 1) : null,
  }));

  const topPairKeys = new Set(topPairs.map((row) => [row.dishAId, row.dishBId].sort().join('|')));
  const otherPool = pairs.filter(
    (row) => !topPairKeys.has([row.dishAId, row.dishBId].sort().join('|')),
  );
  const otherCount = otherPool.length;

  const topPair = pairs[0] ?? null;

  return {
    summary: {
      totalComparisons,
      comparisonSessions,
      uniquePairs: pairs.length,
      topPair: topPair
        ? {
            dishAId: topPair.dishAId,
            dishBId: topPair.dishBId,
            dishAName: topPair.dishAName,
            dishBName: topPair.dishBName,
            count: topPair.count,
            uniqueSessions: topPair.uniqueSessions,
            sharePercent:
              totalComparisons > 0 ? round((topPair.count / totalComparisons) * 100, 1) : null,
          }
        : null,
    },
    topPairs,
    otherPairs: otherPool.slice(0, otherPreviewLimit),
    otherCount,
  };
}

/**
 * Dishes with strong engagement in lower-reach sections.
 */
export function findHiddenGems(dishMetrics, categoryMetrics, options = {}) {
  const minAttention = options.minAttentionSeconds ?? 5;
  const minViews = options.minViews ?? 2;
  const maxReachPercent = options.maxReachPercent ?? 40;

  return dishMetrics
    .filter(
      (dish) =>
        (dish.averageAttentionSeconds || 0) >= minAttention &&
        (dish.totalViews || 0) >= minViews,
    )
    .map((dish) => {
      const category = categoryMetrics.find((row) => row.categoryId === dish.categoryId);
      return {
        dishId: dish.dishId,
        name: dish.name,
        categoryId: dish.categoryId,
        averageAttentionSeconds: dish.averageAttentionSeconds,
        totalViews: dish.totalViews,
        selectionRate: dish.selectionRate,
        categoryReachPercent: category?.percentSessionsReaching ?? 100,
      };
    })
    .filter((dish) => dish.categoryReachPercent <= maxReachPercent)
    .sort(
      (a, b) =>
        b.averageAttentionSeconds - a.averageAttentionSeconds ||
        a.categoryReachPercent - b.categoryReachPercent,
    )
    .slice(0, 5);
}

/**
 * Guest journey / interactive guidance metrics (Help Me Choose, Concierge, mood, shortlist).
 */
export function buildGuestJourneyReport(events = []) {
  const counts = {
    preferenceSelected: 0,
    helpMeChooseStarted: 0,
    helpMeChooseCompleted: 0,
    assistantOpened: 0,
    assistantQuestions: 0,
    assistantRecommendationClicks: 0,
    shortlistAdds: 0,
    shortlistViews: 0,
    ingredientTaps: 0,
    explicitCompares: 0,
  };
  const moodCounts = new Map();
  const questionSamples = [];

  for (const event of events) {
    const type = event.eventType;
    const meta = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
    switch (type) {
      case "PREFERENCE_SELECTED":
        counts.preferenceSelected += 1;
        if (meta.mood) {
          moodCounts.set(meta.mood, (moodCounts.get(meta.mood) || 0) + 1);
        }
        break;
      case "HELP_ME_CHOOSE_STARTED":
        counts.helpMeChooseStarted += 1;
        break;
      case "HELP_ME_CHOOSE_COMPLETED":
        counts.helpMeChooseCompleted += 1;
        break;
      case "ASSISTANT_OPENED":
        counts.assistantOpened += 1;
        break;
      case "ASSISTANT_QUESTION_ASKED":
        counts.assistantQuestions += 1;
        if (meta.question && questionSamples.length < 8) {
          questionSamples.push(String(meta.question).slice(0, 120));
        }
        break;
      case "ASSISTANT_RECOMMENDATION_CLICKED":
        counts.assistantRecommendationClicks += 1;
        break;
      case "SHORTLIST_ITEM_ADDED":
        counts.shortlistAdds += 1;
        break;
      case "SHORTLIST_VIEWED":
        counts.shortlistViews += 1;
        break;
      case "INGREDIENT_TAPPED":
        counts.ingredientTaps += 1;
        break;
      case "DISH_COMPARED":
      case "COMPARISON_COMPLETED":
        counts.explicitCompares += 1;
        break;
      default:
        break;
    }
  }

  const topMoods = [...moodCounts.entries()]
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const guidanceCompletionRate =
    counts.helpMeChooseStarted > 0
      ? Math.round((counts.helpMeChooseCompleted / counts.helpMeChooseStarted) * 1000) / 10
      : null;

  return {
    ...counts,
    guidanceCompletionRate,
    topMoods,
    recentQuestions: questionSamples,
  };
}
