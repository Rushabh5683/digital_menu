# Anonymous customer sessions

## Purpose

Every customer who opens a restaurant digital menu gets an **anonymous session**.  
No login. No name, email, phone, or exact location.

Sessions are the join key for upcoming analytics events (`AnalyticsEvent.sessionId`).

## Identifiers

| ID | Where | Meaning |
|----|--------|---------|
| `anonymousSessionId` | Browser `sessionStorage` + `Session.anonymousSessionId` | Opaque UUID created on the client |
| `session.id` | PostgreSQL `Session.id` | Server row used as FK for analytics events |

## Client storage

- Key: `dm:anon-session:<restaurantSlug>`
- Context key: `dm:anon-session:ctx:<restaurantSlug>` (stores server `sessionId` + `restaurantId` for analytics)
- Mechanism: **`sessionStorage`**
  - Survives **refresh**
  - Survives **in-tab navigation** (menu ↔ home ↔ menu)
  - Cleared when the **browser tab/window closes** → new browser session gets a new UUID

No personal data is written to storage.

## Lifecycle

```
Open /menu/:slug
  → getOrCreateAnonymousSessionId(slug)
  → POST /api/sessions/start
  → upsert Session + session_start AnalyticsEvent (on create or resume after end)

Leave / unload / SPA navigate away (best-effort)
  → POST /api/sessions/end (sendBeacon or fetch keepalive)
  → set Session.endedAt + session_end AnalyticsEvent

Note: brief `visibilitychange` (app switch) does **not** end the session — only `pagehide` / leaving the menu route.
```

### Expected behaviors

| Action | Anonymous ID | Server session |
|--------|--------------|----------------|
| Refresh menu | Same UUID in `sessionStorage` | Same row; prior unload may `session_end`, then `session_start` with `reason: resumed` |
| Navigate within menu UI | Same | Same (still open) |
| Leave menu then return in same tab | Same | Resume: clear `endedAt`, emit `session_start` (`resumed`) |
| New browser tab / closed tab reopened | New UUID | New `Session` row + `session_start` (`created`) |

## API

### `POST /api/sessions/start`

```json
{
  "restaurantSlug": "saffron-court",
  "anonymousSessionId": "uuid"
}
```

Response: `{ session: { id, restaurantId, anonymousSessionId, startedAt, endedAt, created, resumed } }`

### `POST /api/sessions/end`

Same body. Marks `endedAt` when the session is still open.

Rejected if slug/UUID invalid. Never accepts PII fields.

## Frontend modules

- `apps/web/src/features/tracking/session.js` — ID + storage helpers
- `apps/web/src/features/tracking/useAnonymousSession.js` — React lifecycle hook
- `getAnalyticsSessionRef(slug)` — reusable ref for the analytics module

`MenuPage` calls `useAnonymousSession(restaurantSlug)` on load.

## Privacy rules

**Collected:** opaque IDs, restaurant scope, timestamps, `session_start` / `session_end` event types.

**Not collected:** name, email, phone, precise location, payment data, account credentials.
