import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateInsightRules } from '../src/modules/insights/insight.rules.js';

describe('insight.rules', () => {
  it('emits highest attention category when there is a clear leader', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 10,
      categories: [
        {
          categoryId: 'c1',
          name: 'Main Course',
          averageAttentionSeconds: 46,
          totalAttentionSeconds: 460,
          uniqueSessions: 8,
          percentSessionsReaching: 80,
          totalViews: 12,
        },
        {
          categoryId: 'c2',
          name: 'Starters',
          averageAttentionSeconds: 17,
          totalAttentionSeconds: 70,
          uniqueSessions: 5,
          percentSessionsReaching: 50,
          totalViews: 8,
        },
      ],
      dishes: [],
      highAttentionLowSelection: [],
      searchDemand: [],
    });

    const hit = insights.find((row) => row.type === 'highest_attention_category');
    assert.ok(hit);
    assert.match(hit.title, /Main Course receives the highest customer attention/);
    assert.equal(hit.severity, 'positive');
    assert.equal(hit.relatedCategory.name, 'Main Course');
    assert.ok(hit.suggestedAction);
  });

  it('emits high attention / low selection with actionable copy', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 8,
      categories: [],
      dishes: [],
      highAttentionLowSelection: [
        {
          dishId: 'd1',
          categoryId: 'c2',
          categoryName: 'Biryani',
          name: 'Chicken Biryani',
          averageAttentionSeconds: 38,
          selectionRate: 0.1,
          selectionCount: 1,
          totalViews: 10,
        },
      ],
      searchDemand: [],
    });

    const hit = insights.find((row) => row.type === 'high_attention_low_selection');
    assert.ok(hit);
    assert.match(hit.title, /Chicken Biryani receives high attention but relatively low selection/);
    assert.match(hit.description, /more information before deciding/i);
    assert.equal(hit.severity, 'warning');
    assert.equal(hit.relatedDish.name, 'Chicken Biryani');
  });

  it('emits strong search demand for frequent queries', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 5,
      categories: [],
      dishes: [],
      highAttentionLowSelection: [],
      searchDemand: [
        { query: 'vegetarian', count: 5 },
        { query: 'spicy', count: 1 },
      ],
    });

    const hit = insights.find((row) => row.type === 'strong_search_demand');
    assert.ok(hit);
    assert.match(hit.title, /vegetarian/i);
    assert.equal(hit.severity, 'info');
  });

  it('does not emit meaningless insights without supporting data', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 0,
      categories: [],
      dishes: [],
      highAttentionLowSelection: [],
      searchDemand: [],
    });
    assert.equal(insights.length, 0);
  });

  it('detects possible menu friction from low-reach sections', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 12,
      categories: [
        {
          categoryId: 'c1',
          name: 'Main Course',
          averageAttentionSeconds: 40,
          percentSessionsReaching: 90,
          totalViews: 20,
          uniqueSessions: 10,
        },
        {
          categoryId: 'c2',
          name: 'Desserts',
          averageAttentionSeconds: 8,
          percentSessionsReaching: 20,
          totalViews: 3,
          uniqueSessions: 2,
        },
      ],
      dishes: [
        { dishId: 'd1', name: 'X', totalViews: 4, selectionCount: 1, selectionRate: 0.2, uniqueSessions: 3 },
      ],
      highAttentionLowSelection: [],
      searchDemand: [],
    });

    const hit = insights.find((row) => row.type === 'possible_menu_friction');
    assert.ok(hit);
    assert.match(hit.title, /Desserts/);
    assert.equal(hit.severity, 'warning');
  });

  it('emits hidden gem insight for strong dish in low-reach section', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 10,
      categories: [],
      dishes: [],
      highAttentionLowSelection: [],
      searchDemand: [],
      hiddenGems: [
        {
          dishId: 'd1',
          name: 'Paneer Tikka',
          categoryId: 'c1',
          averageAttentionSeconds: 8,
          totalViews: 4,
          selectionRate: 0.2,
          categoryReachPercent: 25,
        },
      ],
    });

    const hit = insights.find((row) => row.type === 'hidden_gem');
    assert.ok(hit);
    assert.match(hit.title, /Paneer Tikka/);
    assert.equal(hit.severity, 'positive');
  });

  it('emits frequently compared insight for repeated dish pairs', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 8,
      categories: [],
      dishes: [],
      highAttentionLowSelection: [],
      searchDemand: [],
      comparisonPairs: [
        {
          dishAId: 'd1',
          dishBId: 'd2',
          dishAName: 'Butter Chicken',
          dishBName: 'Chicken Biryani',
          count: 3,
          uniqueSessions: 2,
        },
      ],
    });

    const hit = insights.find((row) => row.type === 'frequently_compared');
    assert.ok(hit);
    assert.match(hit.title, /Butter Chicken/);
    assert.match(hit.title, /Chicken Biryani/);
  });

  it('emits filter demand insight for repeated filter use', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 6,
      categories: [],
      dishes: [],
      highAttentionLowSelection: [],
      searchDemand: [],
      filterDemand: [{ filterId: 'vegetarian', count: 4, uniqueSessions: 3 }],
    });

    const hit = insights.find((row) => row.type === 'filter_demand');
    assert.ok(hit);
    assert.match(hit.title, /vegetarian/i);
  });

  it('emits frequently requested information insight', () => {
    const insights = evaluateInsightRules({
      totalMenuSessions: 5,
      categories: [],
      dishes: [],
      highAttentionLowSelection: [],
      searchDemand: [],
      informationMetrics: {
        totalInfoViews: 5,
        topSections: [{ section: 'ingredients', count: 3 }],
        topDishes: [{ dishId: 'd1', name: 'Butter Chicken', count: 2 }],
      },
    });

    const hit = insights.find((row) => row.type === 'frequently_requested_information');
    assert.ok(hit);
    assert.match(hit.description, /ingredients/i);
  });
});
