/**
 * Deterministic insight rules.
 * Pure functions over analytics snapshots — no external AI.
 * Swap or wrap with an AI provider later via insight.service.js.
 */

function formatSeconds(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const seconds = Math.round(Number(value));
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${minutes} min` : `${minutes} min ${rem} sec`;
}

function insight({
  type,
  title,
  description,
  severity = 'info',
  relatedCategory = null,
  relatedDish = null,
  suggestedAction = null,
  evidence = null,
}) {
  return {
    id: type,
    type,
    title,
    description,
    severity,
    relatedCategory,
    relatedDish,
    suggestedAction,
    evidence,
    provider: 'rules',
  };
}

/**
 * Rule 1: Highest attention category
 */
export function ruleHighestAttentionCategory(ctx) {
  const { categories, totalMenuSessions } = ctx;
  if (totalMenuSessions < 1) return null;

  const ranked = [...categories]
    .filter((category) => category.averageAttentionSeconds > 0)
    .sort((a, b) => b.averageAttentionSeconds - a.averageAttentionSeconds);

  if (ranked.length === 0) return null;

  const top = ranked[0];
  const second = ranked[1];

  // Need a meaningful lead when peers exist.
  if (second && top.averageAttentionSeconds < second.averageAttentionSeconds * 1.15) {
    return null;
  }

  if (top.averageAttentionSeconds < 5 && totalMenuSessions < 3) {
    return null;
  }

  return insight({
    type: 'highest_attention_category',
    title: `${top.name} receives the highest customer attention`,
    description: `Guests spend about ${formatSeconds(top.averageAttentionSeconds)} on average in ${top.name}, more than any other menu section.`,
    severity: 'positive',
    relatedCategory: { id: top.categoryId, name: top.name },
    suggestedAction: `Feature ${top.name} more prominently on the digital menu and table talkers.`,
    evidence: {
      averageAttentionSeconds: top.averageAttentionSeconds,
      totalAttentionSeconds: top.totalAttentionSeconds,
      uniqueSessions: top.uniqueSessions,
    },
  });
}

/**
 * Rule 2: High attention / low selection
 */
export function ruleHighAttentionLowSelection(ctx) {
  const dish = ctx.highAttentionLowSelection?.[0];
  if (!dish) return null;

  return insight({
    type: 'high_attention_low_selection',
    title: `${dish.name} receives high attention but relatively low selection`,
    description: `Customers linger for about ${formatSeconds(dish.averageAttentionSeconds)} on average, yet only ${Math.round((dish.selectionRate || 0) * 100)}% of viewers select it. They may need more information before deciding.`,
    severity: 'warning',
    relatedDish: { id: dish.dishId, name: dish.name },
    relatedCategory: dish.categoryId
      ? { id: dish.categoryId, name: dish.categoryName || null }
      : null,
    suggestedAction:
      'Add clearer ingredients, portion details, or dietary notes on the dish detail screen.',
    evidence: {
      averageAttentionSeconds: dish.averageAttentionSeconds,
      selectionRate: dish.selectionRate,
      selectionCount: dish.selectionCount,
      totalViews: dish.totalViews,
    },
  });
}

/**
 * Rule 3: High views / low selection
 */
export function ruleHighViewsLowSelection(ctx) {
  const dishes = ctx.dishes || [];
  const viewed = dishes.filter((dish) => dish.totalViews >= 3 || dish.uniqueSessions >= 2);
  if (viewed.length < 2) return null;

  const avgViews =
    viewed.reduce((sum, dish) => sum + dish.totalViews, 0) / viewed.length;
  const avgSelectionRate =
    viewed.reduce((sum, dish) => sum + (dish.selectionRate || 0), 0) / viewed.length;

  const candidates = viewed
    .filter(
      (dish) =>
        dish.totalViews >= Math.max(3, avgViews * 1.25) &&
        dish.selectionRate <= avgSelectionRate * 0.6,
    )
    .sort(
      (a, b) =>
        b.totalViews - a.totalViews || a.selectionRate - b.selectionRate,
    );

  // Avoid duplicating the attention/selection insight for the same dish.
  const skipId = ctx.highAttentionLowSelection?.[0]?.dishId;
  const dish = candidates.find((item) => item.dishId !== skipId) || null;
  if (!dish) return null;

  return insight({
    type: 'high_views_low_selection',
    title: `${dish.name} is viewed often but rarely selected`,
    description: `${dish.totalViews} views with only a ${Math.round((dish.selectionRate || 0) * 100)}% selection rate. Interest is there, but conversion is weak.`,
    severity: 'warning',
    relatedDish: { id: dish.dishId, name: dish.name },
    relatedCategory: dish.categoryId
      ? { id: dish.categoryId, name: dish.categoryName || null }
      : null,
    suggestedAction:
      'Review pricing, photo quality, and the first lines of the dish description.',
    evidence: {
      totalViews: dish.totalViews,
      selectionRate: dish.selectionRate,
      selectionCount: dish.selectionCount,
      cohortAverageViews: Math.round(avgViews * 10) / 10,
      cohortAverageSelectionRate: Math.round(avgSelectionRate * 1000) / 1000,
    },
  });
}

/**
 * Rule 4: Strong search demand
 */
export function ruleStrongSearchDemand(ctx) {
  const searches = ctx.searchDemand || [];
  if (!searches.length) return null;

  const top = searches[0];
  const totalSearches = searches.reduce((sum, row) => sum + row.count, 0);

  if (top.count < 2 && totalSearches < 3) return null;
  if (top.count < 2) return null;

  const share = totalSearches > 0 ? top.count / totalSearches : 0;
  if (share < 0.25 && top.count < 3) return null;

  return insight({
    type: 'strong_search_demand',
    title: `Customers are frequently searching for “${top.query}”`,
    description: `“${top.query}” appears in ${top.count} searches (${Math.round(share * 100)}% of search activity). This signals unmet or hard-to-find demand on the menu.`,
    severity: 'info',
    relatedCategory: null,
    relatedDish: null,
    suggestedAction:
      'Make matching dishes easier to find with clearer tags, filters, or section naming.',
    evidence: {
      query: top.query,
      count: top.count,
      totalSearches,
      share: Math.round(share * 1000) / 1000,
    },
  });
}

/**
 * Rule 5: Possible menu friction
 */
export function rulePossibleMenuFriction(ctx) {
  const { categories, totalMenuSessions, dishes } = ctx;
  if (totalMenuSessions < 2 || categories.length < 2) return null;

  const lowReach = [...categories]
    .filter((category) => category.totalViews > 0 || category.uniqueSessions > 0)
    .sort((a, b) => a.percentSessionsReaching - b.percentSessionsReaching)[0];

  const highAttention = [...categories]
    .filter((category) => category.averageAttentionSeconds > 0)
    .sort((a, b) => b.averageAttentionSeconds - a.averageAttentionSeconds)[0];

  // Friction: a later/secondary section is rarely reached while overall traffic exists.
  if (
    lowReach &&
    highAttention &&
    lowReach.categoryId !== highAttention.categoryId &&
    lowReach.percentSessionsReaching <= 35 &&
    highAttention.percentSessionsReaching >= 50
  ) {
    return insight({
      type: 'possible_menu_friction',
      title: `Possible menu friction around ${lowReach.name}`,
      description: `Only ${Math.round(lowReach.percentSessionsReaching)}% of sessions reach ${lowReach.name}, while ${highAttention.name} draws most of the attention. Guests may leave before discovering this section.`,
      severity: 'warning',
      relatedCategory: { id: lowReach.categoryId, name: lowReach.name },
      suggestedAction: `Add a quick jump link to ${lowReach.name} near the top of the menu, or surface a signature dish from that section earlier.`,
      evidence: {
        lowReachPercent: lowReach.percentSessionsReaching,
        highReachCategory: highAttention.name,
        highReachPercent: highAttention.percentSessionsReaching,
      },
    });
  }

  // Alternate friction: many dish views, almost no selections overall.
  const totalViews = dishes.reduce((sum, dish) => sum + dish.totalViews, 0);
  const totalSelections = dishes.reduce((sum, dish) => sum + dish.selectionCount, 0);
  if (totalViews >= 8 && totalSelections === 0) {
    return insight({
      type: 'possible_menu_friction',
      title: 'Guests browse dishes but do not select anything',
      description:
        'There is solid dish viewing activity with no selections recorded. The menu may be missing a clear next step, or guests need more confidence before choosing.',
      severity: 'critical',
      suggestedAction:
        'Strengthen the Select call-to-action and ensure dish details answer common questions (spice level, portion, allergens).',
      evidence: { totalViews, totalSelections, totalMenuSessions },
    });
  }

  return null;
}

/**
 * Rule 6: High attention + frequently ordered (real orders)
 */
export function ruleHighAttentionHighOrders(ctx) {
  const dish = ctx.highAttentionHighOrders?.[0];
  if (!dish) return null;
  if ((dish.orderedQuantity || 0) < 1) return null;

  return insight({
    type: 'high_attention_high_orders',
    title: `${dish.name} receives high customer attention and is frequently ordered`,
    description: `Guests spend about ${formatSeconds(dish.averageAttentionSeconds)} on average with ${dish.name}, and it has been ordered ${dish.orderedQuantity} time${dish.orderedQuantity === 1 ? '' : 's'} in this period.`,
    severity: 'positive',
    relatedDish: { id: dish.dishId, name: dish.name },
    relatedCategory: dish.categoryId
      ? { id: dish.categoryId, name: dish.categoryName || null }
      : null,
    suggestedAction: `Keep ${dish.name} well stocked and consider featuring it as a signature dish.`,
    evidence: {
      averageAttentionSeconds: dish.averageAttentionSeconds,
      orderedQuantity: dish.orderedQuantity,
      orderRate: dish.orderRate,
      totalViews: dish.totalViews,
    },
  });
}

/**
 * Rule 7: High attention but low real orders
 */
export function ruleHighAttentionLowOrders(ctx) {
  const dish = ctx.highAttentionLowOrders?.[0];
  if (!dish) return null;

  // Avoid duplicating the high-attention / low-selection card for the same dish.
  const skipIds = new Set(
    [ctx.highAttentionLowSelection?.[0]?.dishId, ctx.highAttentionHighOrders?.[0]?.dishId].filter(
      Boolean,
    ),
  );
  if (skipIds.has(dish.dishId)) return null;

  return insight({
    type: 'high_attention_low_orders',
    title: `${dish.name} draws attention but converts weakly into orders`,
    description: `Average attention is about ${formatSeconds(dish.averageAttentionSeconds)}, yet only ${Math.round((dish.orderRate || 0) * 100)}% of interested guests end up ordering it (${dish.orderedQuantity || 0} units sold).`,
    severity: 'warning',
    relatedDish: { id: dish.dishId, name: dish.name },
    relatedCategory: dish.categoryId
      ? { id: dish.categoryId, name: dish.categoryName || null }
      : null,
    suggestedAction:
      'Check pricing, portion cues, and photo quality — interest is there, but checkout conversion is soft.',
    evidence: {
      averageAttentionSeconds: dish.averageAttentionSeconds,
      orderedQuantity: dish.orderedQuantity,
      orderRate: dish.orderRate,
      selectionRate: dish.selectionRate,
      totalViews: dish.totalViews,
    },
  });
}

/**
 * Rule 8: Guests spend significant time exploring a section (category)
 * Softened copy matching "Customers are spending significant time exploring Biryani."
 */
export function ruleDeepCategoryExploration(ctx) {
  const { categories, totalMenuSessions } = ctx;
  if (totalMenuSessions < 1) return null;

  // Prefer a category that isn't already the "highest attention" insight if that one was weak.
  const ranked = [...categories]
    .filter(
      (category) =>
        (category.averageAttentionSeconds || 0) >= 8 &&
        (category.uniqueSessions || 0) >= 1,
    )
    .sort((a, b) => b.totalAttentionSeconds - a.totalAttentionSeconds);

  const top = ranked[0];
  if (!top) return null;

  // Skip if we already said this is the highest-attention category with similar evidence.
  if (
    ctx.highestAttentionCategoryId &&
    ctx.highestAttentionCategoryId === top.categoryId &&
    top.averageAttentionSeconds < 12
  ) {
    return null;
  }

  return insight({
    type: 'deep_category_exploration',
    title: `Customers are spending significant time exploring ${top.name}`,
    description: `${top.name} has about ${formatSeconds(top.totalAttentionSeconds)} of combined attention across ${top.uniqueSessions} guest${top.uniqueSessions === 1 ? '' : 's'} (avg ${formatSeconds(top.averageAttentionSeconds)}).`,
    severity: 'info',
    relatedCategory: { id: top.categoryId, name: top.name },
    suggestedAction: `Ensure hero dishes in ${top.name} are easy to order and well photographed.`,
    evidence: {
      averageAttentionSeconds: top.averageAttentionSeconds,
      totalAttentionSeconds: top.totalAttentionSeconds,
      uniqueSessions: top.uniqueSessions,
    },
  });
}

/**
 * Rule 9: Hidden gem — strong dish engagement in a lower-reach section
 */
export function ruleHiddenGem(ctx) {
  const gem = ctx.hiddenGems?.[0];
  if (!gem) return null;
  if ((gem.totalViews || 0) < 2 && ctx.totalMenuSessions < 3) return null;

  return insight({
    type: 'hidden_gem',
    title: `${gem.name} may be a hidden gem`,
    description: `Guests spend about ${formatSeconds(gem.averageAttentionSeconds)} on ${gem.name}, but only ${Math.round(gem.categoryReachPercent || 0)}% of sessions reach its section.`,
    severity: 'positive',
    relatedDish: { id: gem.dishId, name: gem.name },
    relatedCategory: gem.categoryId ? { id: gem.categoryId, name: null } : null,
    suggestedAction:
      'Surface this dish earlier in the menu or feature it in a more visible section.',
    evidence: {
      averageAttentionSeconds: gem.averageAttentionSeconds,
      totalViews: gem.totalViews,
      categoryReachPercent: gem.categoryReachPercent,
      selectionRate: gem.selectionRate,
    },
  });
}

/**
 * Rule 10: Frequently requested information
 */
export function ruleFrequentlyRequestedInformation(ctx) {
  const metrics = ctx.informationMetrics;
  if (!metrics?.topSections?.length) return null;

  const top = metrics.topSections[0];
  if (top.count < 2 && (metrics.totalInfoViews || 0) < 3) return null;

  const topDish = metrics.topDishes?.[0];

  return insight({
    type: 'frequently_requested_information',
    title: 'Customers frequently seek more dish information',
    description: topDish
      ? `Information views are common — especially "${top.section.replace(/_/g, ' ')}" (${top.count} times). ${topDish.name} leads dish detail opens.`
      : `Guests often open dish details for "${top.section.replace(/_/g, ' ')}" (${top.count} times).`,
    severity: 'info',
    relatedDish: topDish ? { id: topDish.dishId, name: topDish.name } : null,
    suggestedAction:
      'Ensure descriptions, ingredients, and dietary tags are clear on the menu cards themselves.',
    evidence: {
      section: top.section,
      sectionCount: top.count,
      totalInfoViews: metrics.totalInfoViews,
      topDish: topDish?.name || null,
    },
  });
}

/**
 * Rule 11: Frequently compared dishes
 */
export function ruleFrequentlyCompared(ctx) {
  const pairs = ctx.comparisonPairs || [];
  if (!pairs.length) return null;

  const top = pairs[0];
  if (top.count < 2 && top.uniqueSessions < 2) return null;

  return insight({
    type: 'frequently_compared',
    title: `${top.dishAName} and ${top.dishBName} are often compared`,
    description: `Guests opened both dishes for consideration ${top.count} time${top.count === 1 ? '' : 's'} across ${top.uniqueSessions} session${top.uniqueSessions === 1 ? '' : 's'}.`,
    severity: 'info',
    relatedDish: { id: top.dishAId, name: top.dishAName },
    suggestedAction:
      'Make differences (price, spice, portion, ingredients) obvious on both dish cards.',
    evidence: {
      dishAId: top.dishAId,
      dishBId: top.dishBId,
      dishAName: top.dishAName,
      dishBName: top.dishBName,
      count: top.count,
      uniqueSessions: top.uniqueSessions,
    },
  });
}

/**
 * Rule 12: Filter demand signal
 */
export function ruleFilterDemand(ctx) {
  const filters = ctx.filterDemand || [];
  if (!filters.length) return null;

  const top = filters[0];
  if (top.count < 2) return null;

  return insight({
    type: 'filter_demand',
    title: `Guests frequently filter for “${top.filterId}”`,
    description: `The ${top.filterId} filter was applied ${top.count} times across ${top.uniqueSessions} session${top.uniqueSessions === 1 ? '' : 's'}. This may signal strong preference or discoverability needs.`,
    severity: 'info',
    suggestedAction:
      'Tag matching dishes clearly and consider a dedicated section if demand stays high.',
    evidence: {
      filterId: top.filterId,
      count: top.count,
      uniqueSessions: top.uniqueSessions,
    },
  });
}

export const INSIGHT_RULES = [
  ruleHighestAttentionCategory,
  ruleHighAttentionLowSelection,
  ruleHighViewsLowSelection,
  ruleStrongSearchDemand,
  ruleFilterDemand,
  rulePossibleMenuFriction,
  ruleHiddenGem,
  ruleFrequentlyRequestedInformation,
  ruleFrequentlyCompared,
  ruleDeepCategoryExploration,
  ruleHighAttentionHighOrders,
  ruleHighAttentionLowOrders,
];

/**
 * Run all rules; drop nulls; keep deterministic order.
 */
export function evaluateInsightRules(ctx) {
  return INSIGHT_RULES.map((rule) => rule(ctx)).filter(Boolean);
}
