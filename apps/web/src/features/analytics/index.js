export { EventTypes, MIN_ATTENTION_MS, MIN_VIEW_MS, MEANINGFUL_VISIBILITY_RATIO } from './eventTypes.js';
export {
  initAnalytics,
  shutdownAnalytics,
  markMenuOpened,
  trackSearch,
  trackMenuDiscovery,
  commitMenuDiscovery,
  trackFilterApplied,
  trackFilterCleared,
  trackCategoryNavTap,
  trackDishInfoViewed,
  trackDishSelection,
  trackExperienceEvent,
  flushAnalytics,
  registerCategoryElement,
  registerDishElement,
  getAnalyticsDebugState,
} from './analytics.js';
export { useCategoryAttention, useCategoryAttentionCallback } from './useCategoryAttention.js';
export { useDishAttention, useDishAttentionCallback } from './useDishAttention.js';
export { requireAnalyticsSession, getAnalyticsSessionRef } from './session.js';
