# Deterministic Insight Engine

No external AI API. Insights are produced by rule functions over real analytics.

## Endpoint

`GET /api/insights/:restaurantId`

Optional: `?from=ISO&to=ISO`

Response shape:

```json
{
  "provider": "rules",
  "count": 2,
  "insights": [
    {
      "id": "highest_attention_category",
      "type": "highest_attention_category",
      "title": "Main Course receives the highest customer attention",
      "description": "...",
      "severity": "positive",
      "relatedCategory": { "id": "...", "name": "Main Course" },
      "relatedDish": null,
      "suggestedAction": "...",
      "evidence": {},
      "provider": "rules"
    }
  ]
}
```

## Rules

| Type | When it fires |
|------|----------------|
| `highest_attention_category` | Clear section attention leader |
| `high_attention_low_selection` | Dish attention high, selection weak |
| `high_views_low_selection` | Dish views high, selection weak |
| `strong_search_demand` | Repeated search queries |
| `filter_demand` | Repeated dietary filter use |
| `possible_menu_friction` | Low-reach section or browse-without-select pattern |
| `hidden_gem` | Strong dish in low-reach section |
| `frequently_requested_information` | Repeated detail opens by section |
| `frequently_compared` | Dish pairs from DISH_COMPARISON events |
| `deep_category_exploration` | ≥8s avg attention in a section |
| `high_attention_high_orders` | (secondary) Strong attention + orders |
| `high_attention_low_orders` | (secondary) Strong attention, weak orders |

Rules only emit when thresholds are met — empty list is valid.

## Extending / replacing with AI later

`insight.service.js` → `generateInsightsFromContext(ctx)` is the seam.

Keep the same insight object shape and swap the implementation for an AI provider without changing routes or the dashboard.
