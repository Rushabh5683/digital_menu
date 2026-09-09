# Analytics calculation layer

Raw `AnalyticsEvent` rows are the source of truth. Reports are computed synchronously from PostgreSQL (no Redis / workers).

## Endpoints

All accept optional `?from=ISO&to=ISO`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/analytics/overview/:restaurantId` | Global KPIs + highlights |
| GET | `/api/analytics/categories/:restaurantId` | Section metrics |
| GET | `/api/analytics/dishes/:restaurantId` | Dish metrics + high-attention/low-selection |
| GET | `/api/analytics/trends/:restaurantId` | Daily trend buckets |

## Section metrics

From `CATEGORY_VIEWED` / `CATEGORY_ATTENTION`:

- total views
- unique sessions
- total attention seconds (`metadata.durationMs` sum)
- average attention seconds (per sessions with attention)
- % of menu sessions reaching the category

## Dish metrics

From `DISH_VIEWED` / `DISH_ATTENTION` / `DISH_SELECTED`:

- total views, unique sessions
- total / average attention seconds
- selection count
- selection rate = selections / unique viewed sessions

## High attention / low selection

Among dishes with attention:

- attention ≥ max(3s, cohort average × 1.25)
- selection rate ≤ cohort average × 0.75

## Consideration intelligence (overview extensions)

| Metric | Source events | Notes |
|--------|---------------|-------|
| Search demand | `SEARCH_PERFORMED` | Curated report: top 5 (≥2 searches/sessions), zero-result gaps, summary KPIs |
| Filter demand | `FILTER_APPLIED` | `metadata.filterId`, separate from search |
| Information metrics | `DISH_INFO_VIEWED` | `metadata.sections[]` when drawer opens |
| Menu exits | `MENU_EXITED` | Exit count, rate, browse-without-selection |
| Comparison pairs | `DISH_COMPARISON` | Curated report: top 5 pairs (≥2 comparisons/sessions), summary KPIs |
| Hidden gems | dish + category metrics | Strong attention in sections with ≤40% reach |

## Insight thresholds (minimum evidence)

| Insight | Minimum |
|---------|---------|
| Search demand | 2 searches for top term, or 3 total |
| Filter demand | 2 filter applications |
| Comparison | 2 comparisons or 2 sessions |
| Hidden gem | 5s avg attention, 2 views, section reach ≤40% |
| Information | 2 section views or 3 total info opens |

See also `docs/INSIGHTS.md`.

## Tests

```bash
npm run test:metrics --workspace=@digital-menu/api
npm run test:reports --workspace=@digital-menu/api
```
