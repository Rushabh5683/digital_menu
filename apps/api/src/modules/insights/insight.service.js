import { prisma } from '../../lib/prisma.js';
import { calculateSearchDemand } from '../analytics/analytics.metrics.js';
import {
  getAnalyticsOverview,
  getCategoryAnalytics,
  getDishAnalytics,
  parseDateRange,
} from '../analytics/analytics.reports.js';
import { evaluateInsightRules } from './insight.rules.js';

/**
 * Aggregate search queries from SEARCH_PERFORMED events.
 */
export async function loadSearchDemand(restaurantId, from, to) {
  const timestamp =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  const events = await prisma.analyticsEvent.findMany({
    where: {
      restaurantId,
      eventType: 'SEARCH_PERFORMED',
      ...(timestamp ? { timestamp } : {}),
    },
    select: { sessionId: true, metadata: true },
  });

  return calculateSearchDemand(events);
}

function attachCategoryNames(dishes, categories) {
  const names = new Map(categories.map((category) => [category.categoryId, category.name]));
  return dishes.map((dish) => ({
    ...dish,
    categoryName: dish.categoryName || names.get(dish.categoryId) || null,
  }));
}

/**
 * Insight Engine entry point.
 *
 * Architecture note:
 * Today this uses deterministic rules (`provider: "rules"`).
 * Later, replace or augment `generateInsightsFromContext` with an AI provider
 * that returns the same insight shape — routes and dashboard stay unchanged.
 */
export async function generateInsightsFromContext(ctx) {
  return evaluateInsightRules(ctx);
}

export async function getRestaurantInsights(restaurantId, query = {}) {
  const { from, to } = parseDateRange(query);
  const rangeQuery = {
    ...(from ? { from: from.toISOString() } : {}),
    ...(to ? { to: to.toISOString() } : {}),
  };

  const [overview, categoryReport, dishReport, searchDemand] = await Promise.all([
    getAnalyticsOverview(restaurantId, rangeQuery),
    getCategoryAnalytics(restaurantId, rangeQuery),
    getDishAnalytics(restaurantId, rangeQuery),
    loadSearchDemand(restaurantId, from, to),
  ]);

  const categories = categoryReport.categories || [];
  const dishes = attachCategoryNames(dishReport.dishes || [], categories);
  const highAttentionLowSelection = attachCategoryNames(
    dishReport.highAttentionLowSelection || [],
    categories,
  );

  const context = {
    restaurant: overview.restaurant,
    totalMenuSessions: overview.totalMenuSessions || 0,
    averageSessionDurationSeconds: overview.averageSessionDurationSeconds,
    categories,
    dishes,
    highAttentionLowSelection,
    highAttentionHighOrders: attachCategoryNames(
      dishReport.highAttentionHighOrders || [],
      categories,
    ),
    highAttentionLowOrders: attachCategoryNames(
      dishReport.highAttentionLowOrders || [],
      categories,
    ),
    highestAttentionCategoryId: overview.highestAttentionCategory?.categoryId || null,
    searchDemand: overview.searchDemand || searchDemand,
    filterDemand: overview.filterDemand || [],
    informationMetrics: overview.informationMetrics || null,
    menuExitMetrics: overview.menuExitMetrics || null,
    comparisonPairs: overview.comparisonPairs || [],
    hiddenGems: overview.hiddenGems || [],
    funnel: overview.funnel || null,
    orderSummary: overview.orderSummary || null,
    range: overview.range,
  };

  const insights = await generateInsightsFromContext(context);

  return {
    restaurant: overview.restaurant,
    range: overview.range,
    provider: 'rules',
    generatedAt: new Date().toISOString(),
    count: insights.length,
    insights,
  };
}
