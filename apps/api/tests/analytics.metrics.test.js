import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildComparisonReport,
  buildConsiderationFunnel,
  buildOverviewSummary,
  buildSearchDemandReport,
  calculateAverageSessionDurationSeconds,
  calculateCategoryMetrics,
  calculateComparisonPairs,
  calculateDailyTrends,
  calculateDishMetrics,
  calculateFilterDemand,
  calculateInformationMetrics,
  calculateMenuExitMetrics,
  calculateSearchDemand,
  findHiddenGems,
  findHighAttentionLowSelection,
  mergeDishOrderMetrics,
  msToSeconds,
  pickHighestBy,
  readDurationMs,
} from '../src/modules/analytics/analytics.metrics.js';

describe('analytics.metrics', () => {
  it('converts duration metadata to seconds', () => {
    assert.equal(msToSeconds(46000), 46);
    assert.equal(readDurationMs({ metadata: { durationMs: 38000 } }), 38000);
    assert.equal(readDurationMs({ metadata: {} }), 0);
  });

  it('calculates category views, attention, and reach %', () => {
    const categories = [
      { id: 'c1', name: 'Main Course', displayOrder: 1 },
      { id: 'c2', name: 'Biryani', displayOrder: 2 },
    ];

    const events = [
      { sessionId: 's1', categoryId: 'c1', eventType: 'CATEGORY_VIEWED' },
      { sessionId: 's2', categoryId: 'c1', eventType: 'CATEGORY_VIEWED' },
      {
        sessionId: 's1',
        categoryId: 'c1',
        eventType: 'CATEGORY_ATTENTION',
        metadata: { durationMs: 46000 },
      },
      {
        sessionId: 's2',
        categoryId: 'c1',
        eventType: 'CATEGORY_ATTENTION',
        metadata: { durationMs: 20000 },
      },
      { sessionId: 's1', categoryId: 'c2', eventType: 'CATEGORY_VIEWED' },
      {
        sessionId: 's1',
        categoryId: 'c2',
        eventType: 'CATEGORY_ATTENTION',
        metadata: { durationMs: 10000 },
      },
    ];

    const metrics = calculateCategoryMetrics({
      categories,
      events,
      totalMenuSessions: 4,
    });

    const main = metrics.find((row) => row.categoryId === 'c1');
    assert.equal(main.totalViews, 2);
    assert.equal(main.uniqueSessions, 2);
    assert.equal(main.totalAttentionSeconds, 66);
    assert.equal(main.averageAttentionSeconds, 33);
    assert.equal(main.percentSessionsReaching, 50);
  });

  it('calculates dish selection rate from viewed sessions', () => {
    const dishes = [{ id: 'd1', categoryId: 'c1', name: 'Chicken Biryani', price: 380 }];
    const events = [
      { sessionId: 's1', dishId: 'd1', eventType: 'DISH_VIEWED' },
      { sessionId: 's2', dishId: 'd1', eventType: 'DISH_VIEWED' },
      { sessionId: 's3', dishId: 'd1', eventType: 'DISH_VIEWED' },
      {
        sessionId: 's1',
        dishId: 'd1',
        eventType: 'DISH_ATTENTION',
        metadata: { durationMs: 30000 },
      },
      {
        sessionId: 's2',
        dishId: 'd1',
        eventType: 'DISH_ATTENTION',
        metadata: { durationMs: 20000 },
      },
      { sessionId: 's1', dishId: 'd1', eventType: 'DISH_SELECTED' },
    ];

    const [dish] = calculateDishMetrics({ dishes, events });
    assert.equal(dish.totalViews, 3);
    assert.equal(dish.selectionCount, 1);
    assert.equal(dish.averageAttentionSeconds, 25);
    assert.equal(dish.selectionRate, 0.333);
  });

  it('flags high attention / low selection dishes relative to cohort', () => {
    const dishes = [
      {
        dishId: 'hot',
        categoryId: 'c1',
        name: 'Chicken Biryani',
        averageAttentionSeconds: 40,
        selectionRate: 0.1,
        selectionCount: 1,
        totalViews: 10,
        uniqueSessions: 8,
      },
      {
        dishId: 'normal',
        categoryId: 'c1',
        name: 'Dal Makhani',
        averageAttentionSeconds: 20,
        selectionRate: 0.5,
        selectionCount: 5,
        totalViews: 10,
        uniqueSessions: 8,
      },
      {
        dishId: 'ignored',
        categoryId: 'c1',
        name: 'Water',
        averageAttentionSeconds: 0,
        selectionRate: 0,
        selectionCount: 0,
        totalViews: 0,
        uniqueSessions: 0,
      },
    ];

    const result = findHighAttentionLowSelection(dishes, {
      attentionFloorSeconds: 3,
      attentionMultiplier: 1.25,
      selectionMultiplier: 0.75,
    });

    assert.ok(result.cohort.averageAttentionSeconds > 0);
    assert.equal(result.dishes.length, 1);
    assert.equal(result.dishes[0].dishId, 'hot');
    assert.equal(result.dishes[0].name, 'Chicken Biryani');
  });

  it('picks highest attention category for overview', () => {
    const categories = [
      { categoryId: 'c1', name: 'Starters', averageAttentionSeconds: 17, totalViews: 10 },
      { categoryId: 'c2', name: 'Main Course', averageAttentionSeconds: 46, totalViews: 8 },
    ];
    const dishes = [
      {
        dishId: 'd1',
        name: 'Butter Chicken',
        averageAttentionSeconds: 12,
        selectionCount: 2,
        selectionRate: 0.4,
        totalAttentionSeconds: 24,
      },
      {
        dishId: 'd2',
        name: 'Chicken Biryani',
        averageAttentionSeconds: 38,
        selectionCount: 1,
        selectionRate: 0.1,
        totalAttentionSeconds: 76,
      },
    ];

    const overview = buildOverviewSummary({
      totalMenuSessions: 10,
      averageSessionDurationSeconds: 120,
      categories,
      dishes,
      highAttentionLowSelection: { dishes: [], cohort: {} },
    });

    assert.equal(overview.highestAttentionCategory.name, 'Main Course');
    assert.equal(overview.highestViewedCategory.name, 'Starters');
    assert.equal(overview.highestAttentionDish.name, 'Chicken Biryani');
    assert.equal(overview.mostSelectedDish.name, 'Butter Chicken');
    assert.equal(pickHighestBy(categories, 'averageAttentionSeconds').name, 'Main Course');
  });

  it('averages completed session durations', () => {
    const average = calculateAverageSessionDurationSeconds([
      {
        startedAt: new Date('2026-08-29T10:00:00.000Z'),
        endedAt: new Date('2026-08-29T10:02:00.000Z'),
      },
      {
        startedAt: new Date('2026-08-29T11:00:00.000Z'),
        endedAt: new Date('2026-08-29T11:01:00.000Z'),
      },
      {
        startedAt: new Date('2026-08-29T12:00:00.000Z'),
        endedAt: null,
      },
    ]);
    assert.equal(average, 90);
  });

  it('builds daily trend buckets including attention seconds', () => {
    const trends = calculateDailyTrends(
      [
        {
          sessionId: 's1',
          eventType: 'CATEGORY_VIEWED',
          timestamp: '2026-08-28T10:00:00.000Z',
        },
        {
          sessionId: 's1',
          eventType: 'CATEGORY_ATTENTION',
          timestamp: '2026-08-28T10:01:00.000Z',
          metadata: { durationMs: 10000 },
        },
        {
          sessionId: 's2',
          eventType: 'DISH_SELECTED',
          timestamp: '2026-08-29T12:00:00.000Z',
        },
      ],
      {
        from: new Date('2026-08-28T00:00:00.000Z'),
        to: new Date('2026-08-29T00:00:00.000Z'),
      },
    );

    assert.equal(trends.length, 2);
    assert.equal(trends[0].date, '2026-08-28');
    assert.equal(trends[0].attentionSeconds, 10);
    assert.equal(trends[0].sessions, 1);
    assert.equal(trends[1].selections, 1);
  });

  it('merges ordered quantity and order rate from PostgreSQL order lines', () => {
    const dishes = [
      {
        dishId: 'd1',
        name: 'Chicken Biryani',
        totalViews: 4,
        uniqueSessions: 4,
        averageAttentionSeconds: 12,
        selectionCount: 2,
        selectionRate: 0.5,
        totalAttentionSeconds: 48,
      },
    ];
    const merged = mergeDishOrderMetrics(dishes, [
      { dishId: 'd1', quantity: 2, orderId: 'o1', sessionId: 's1' },
      { dishId: 'd1', quantity: 1, orderId: 'o2', sessionId: 's2' },
    ]);
    assert.equal(merged[0].orderedQuantity, 3);
    assert.equal(merged[0].orderCount, 2);
    assert.equal(merged[0].orderRate, 0.5);
  });

  it('builds attention → consideration → selection → order funnel', () => {
    const funnel = buildConsiderationFunnel({
      totalMenuSessions: 5,
      events: [
        { sessionId: 's1', eventType: 'MENU_OPENED' },
        { sessionId: 's2', eventType: 'MENU_OPENED' },
        { sessionId: 's3', eventType: 'MENU_OPENED' },
        { sessionId: 's1', eventType: 'DISH_VIEWED' },
        { sessionId: 's2', eventType: 'DISH_INFO_VIEWED' },
        { sessionId: 's1', eventType: 'DISH_SELECTED' },
      ],
      orders: [
        { id: 'o1', sessionId: 's1', total: 500 },
      ],
    });

    assert.equal(funnel.stages[0].key, 'attention');
    assert.ok(funnel.stages[0].count >= 3);
    assert.equal(funnel.stages[1].count, 2);
    assert.equal(funnel.stages[2].count, 1);
    assert.equal(funnel.stages[3].count, 1);
    assert.equal(funnel.totals.orders, 1);
  });

  it('calculates search demand from SEARCH_PERFORMED queries', () => {
    const demand = calculateSearchDemand([
      { sessionId: 's1', eventType: 'SEARCH_PERFORMED', metadata: { query: 'Biryani' } },
      { sessionId: 's2', eventType: 'SEARCH_PERFORMED', metadata: { query: 'biryani' } },
      { sessionId: 's1', eventType: 'SEARCH_PERFORMED', metadata: { query: 'veg' } },
      { sessionId: 's3', eventType: 'SEARCH_PERFORMED', metadata: { query: 'a' } },
    ]);

    assert.equal(demand[0].query, 'biryani');
    assert.equal(demand[0].count, 2);
    assert.equal(demand[0].uniqueSessions, 2);
    assert.equal(demand[1].query, 'veg');
  });

  it('builds curated search demand report with summary, top terms, and gaps', () => {
    const report = buildSearchDemandReport([
      { sessionId: 's1', eventType: 'SEARCH_PERFORMED', metadata: { query: 'biryani', resultCount: 3 } },
      { sessionId: 's2', eventType: 'SEARCH_PERFORMED', metadata: { query: 'Biryani', resultCount: 2 } },
      { sessionId: 's3', eventType: 'SEARCH_PERFORMED', metadata: { query: 'biryani', resultCount: 1 } },
      { sessionId: 's1', eventType: 'SEARCH_PERFORMED', metadata: { query: 'veg', resultCount: 5 } },
      { sessionId: 's6', eventType: 'SEARCH_PERFORMED', metadata: { query: 'veg', resultCount: 2 } },
      { sessionId: 's4', eventType: 'SEARCH_PERFORMED', metadata: { query: 'sushi', resultCount: 0, zeroResults: true } },
      { sessionId: 's5', eventType: 'SEARCH_PERFORMED', metadata: { query: 'pasta', resultCount: 1 } },
    ]);

    assert.equal(report.summary.totalSearches, 7);
    assert.equal(report.summary.searchSessions, 6);
    assert.equal(report.summary.topTerm.query, 'biryani');
    assert.equal(report.topSearches.length, 2);
    assert.equal(report.topSearches[0].query, 'biryani');
    assert.equal(report.zeroResultSearches.length, 1);
    assert.equal(report.zeroResultSearches[0].query, 'sushi');
    assert.equal(report.otherCount, 1);
    assert.equal(report.otherSearches[0].query, 'pasta');
    assert.ok(report.summary.zeroResultRate > 0);
  });

  it('calculates filter demand from FILTER_APPLIED events', () => {
    const demand = calculateFilterDemand([
      { sessionId: 's1', eventType: 'FILTER_APPLIED', metadata: { filterId: 'vegetarian' } },
      { sessionId: 's2', eventType: 'FILTER_APPLIED', metadata: { filterId: 'Vegetarian' } },
      { sessionId: 's1', eventType: 'FILTER_APPLIED', metadata: { filterId: 'spicy' } },
    ]);

    assert.equal(demand[0].filterId, 'vegetarian');
    assert.equal(demand[0].count, 2);
    assert.equal(demand[0].uniqueSessions, 2);
  });

  it('calculates information metrics with section breakdown', () => {
    const metrics = calculateInformationMetrics(
      [
        {
          sessionId: 's1',
          dishId: 'd1',
          eventType: 'DISH_INFO_VIEWED',
          metadata: { sections: ['description', 'ingredients'] },
        },
        {
          sessionId: 's2',
          dishId: 'd1',
          eventType: 'DISH_INFO_VIEWED',
          metadata: { sections: ['description'] },
        },
        { sessionId: 's3', dishId: 'd2', eventType: 'DISH_INFO_VIEWED', metadata: {} },
      ],
      [
        { id: 'd1', name: 'Butter Chicken' },
        { id: 'd2', name: 'Naan' },
      ],
    );

    assert.equal(metrics.totalInfoViews, 3);
    assert.equal(metrics.topSections[0].section, 'description');
    assert.equal(metrics.topSections[0].count, 2);
    assert.equal(metrics.topDishes[0].name, 'Butter Chicken');
    assert.equal(metrics.topDishes[0].count, 2);
  });

  it('calculates menu exit metrics and browse-without-selection', () => {
    const metrics = calculateMenuExitMetrics(
      [
        { sessionId: 's1', eventType: 'MENU_EXITED' },
        { sessionId: 's2', eventType: 'MENU_EXITED' },
        { sessionId: 's1', eventType: 'DISH_SELECTED' },
      ],
      4,
    );

    assert.equal(metrics.menuExitCount, 2);
    assert.equal(metrics.menuExitRate, 0.5);
    assert.equal(metrics.exitsWithoutSelection, 1);
    assert.equal(metrics.browseWithoutSelectionRate, 0.5);
  });

  it('calculates comparison pairs from DISH_COMPARISON events', () => {
    const pairs = calculateComparisonPairs(
      [
        {
          sessionId: 's1',
          dishId: 'd2',
          eventType: 'DISH_COMPARISON',
          metadata: { previousDishId: 'd1' },
        },
        {
          sessionId: 's2',
          dishId: 'd1',
          eventType: 'DISH_COMPARISON',
          metadata: { previousDishId: 'd2' },
        },
      ],
      [
        { id: 'd1', name: 'Butter Chicken' },
        { id: 'd2', name: 'Chicken Biryani' },
      ],
    );

    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].count, 2);
    assert.equal(pairs[0].uniqueSessions, 2);
    assert.equal(pairs[0].dishAName, 'Butter Chicken');
    assert.equal(pairs[0].dishBName, 'Chicken Biryani');
  });

  it('builds curated comparison report with summary and top pairs', () => {
    const dishes = [
      { id: 'd1', name: 'Butter Chicken' },
      { id: 'd2', name: 'Chicken Biryani' },
      { id: 'd3', name: 'Paneer Tikka' },
      { id: 'd4', name: 'Malai Kofta' },
    ];
    const events = [
      { sessionId: 's1', dishId: 'd2', eventType: 'DISH_COMPARISON', metadata: { previousDishId: 'd1' } },
      { sessionId: 's2', dishId: 'd2', eventType: 'DISH_COMPARISON', metadata: { previousDishId: 'd1' } },
      { sessionId: 's3', dishId: 'd2', eventType: 'DISH_COMPARISON', metadata: { previousDishId: 'd1' } },
      { sessionId: 's4', dishId: 'd4', eventType: 'DISH_COMPARISON', metadata: { previousDishId: 'd3' } },
      { sessionId: 's5', dishId: 'd4', eventType: 'DISH_COMPARISON', metadata: { previousDishId: 'd3' } },
      { sessionId: 's6', dishId: 'd2', eventType: 'DISH_COMPARISON', metadata: { previousDishId: 'd1' } },
      { sessionId: 's7', dishId: 'd3', eventType: 'DISH_COMPARISON', metadata: { previousDishId: 'd4' } },
    ];

    const report = buildComparisonReport(events, dishes);

    assert.equal(report.summary.totalComparisons, 7);
    assert.equal(report.summary.comparisonSessions, 7);
    assert.equal(report.summary.uniquePairs, 2);
    assert.equal(report.summary.topPair.dishAName, 'Butter Chicken');
    assert.equal(report.topPairs.length, 2);
    assert.equal(report.topPairs[0].count, 4);
    assert.equal(report.otherCount, 0);
  });

  it('finds hidden gems in low-reach sections', () => {
    const gems = findHiddenGems(
      [
        {
          dishId: 'd1',
          name: 'Paneer Tikka',
          categoryId: 'c1',
          averageAttentionSeconds: 8,
          totalViews: 4,
          selectionRate: 0.2,
        },
        {
          dishId: 'd2',
          name: 'Butter Chicken',
          categoryId: 'c2',
          averageAttentionSeconds: 12,
          totalViews: 10,
          selectionRate: 0.5,
        },
      ],
      [
        { categoryId: 'c1', percentSessionsReaching: 25 },
        { categoryId: 'c2', percentSessionsReaching: 85 },
      ],
    );

    assert.equal(gems.length, 1);
    assert.equal(gems[0].name, 'Paneer Tikka');
    assert.equal(gems[0].categoryReachPercent, 25);
  });
});
