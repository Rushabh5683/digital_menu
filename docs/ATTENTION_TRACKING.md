# Customer Attention & Consideration Tracking

Core product feature — **not** a generic scroll tracker.

## Goal

Determine which menu **sections** and **dishes** customers spent meaningful time exploring.

## Event types

| Type | When |
|------|------|
| `MENU_OPENED` | Menu page ready with a server session |
| `CATEGORY_VIEWED` | Category becomes the active visible section |
| `CATEGORY_ATTENTION` | Closed dwell segment ≥ 1s for a category |
| `DISH_VIEWED` | Dish becomes the active visible card |
| `DISH_ATTENTION` | Closed dwell segment ≥ 1s for a dish |
| `SEARCH_PERFORMED` | Debounced search (≥2 chars) |
| `DISH_INFO_VIEWED` | Dish detail drawer opens (with `metadata.sections`) |
| `DISH_COMPARISON` | Second dish detail within 5 min of a prior detail (same session) |
| `DISH_SELECTED` | Customer taps Select |
| `MENU_EXITED` | Leave menu / pagehide (once per visit) |

## Attention strategy

- IntersectionObserver with meaningful visibility (~45%+)
- **Exclusive winner** per namespace (`category`, `dish`): highest score wins
- Score = `intersectionRatio * 0.65 + centerProximity * 0.35`
- Only one category and one dish accumulate time at once → no inflated multi-visible totals
- Fast scrolls produce views maybe, but attention only if dwell ≥ `MIN_ATTENTION_MS` (1000)
- Timers pause while the tab is hidden
- Revisits accumulate additional attention segments

## Frontend modules

`apps/web/src/features/analytics/`

- `eventTypes.js` — constants
- `session.js` — session bridge
- `eventQueue.js` — async batched queue
- `visibilityTracker.js` — exclusive IO tracker
- `analytics.js` — public API
- `useCategoryAttention.js` / `useDishAttention.js` — hooks

Debug in development (or force):

```js
localStorage.setItem('dm:analytics:debug', '1')
```

Production does not spam logs unless that flag is set.

## Backend

`POST /api/analytics/events`

```json
{
  "sessionId": "<Session.id>",
  "restaurantId": "<Restaurant.id>",
  "events": [
    {
      "eventType": "CATEGORY_ATTENTION",
      "categoryId": "...",
      "dishId": null,
      "timestamp": "ISO-8601",
      "metadata": { "durationMs": 46000 }
    }
  ]
}
```

Validates session ownership, event types, category/dish IDs, timestamps; writes `AnalyticsEvent` rows.

## Manual test checklist

1. Scroll down slowly through Main Course / Biryani  
2. Scroll up  
3. Revisit a section (extra attention should accumulate)  
4. Flick-scroll quickly (little/no attention)  
5. Multiple dishes visible — only the centered/most-visible one times  
6. Search “biryani”  
7. Open dish details  
8. Select a dish  
9. Navigate away / close tab  

Then inspect PostgreSQL:

```sql
SELECT "eventType", COUNT(*) FROM "AnalyticsEvent" GROUP BY 1 ORDER BY 2 DESC;
SELECT "eventType", metadata, timestamp FROM "AnalyticsEvent" ORDER BY timestamp DESC LIMIT 30;
```
