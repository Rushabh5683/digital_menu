# Digital Menu + Customer Attention Intelligence — Architecture

**Document status:** Design only — no application code yet  
**Scope:** Polished DEMO / MVP vertical slice  
**Stack:** JavaScript everywhere (React + Vite frontend, Node + Express + Prisma backend, PostgreSQL)

---

## 1. Product Flow

### 1.1 Demo story (2–3 minutes)

```
Restaurant QR / entry URL
        ↓
Customer opens anonymous digital menu (mobile-first)
        ↓
Customer browses sections (e.g. Starters → Main Course → Biryani)
        ↓
Meaningful visibility → attention timing starts / accumulates
        ↓
Customer opens a dish, searches, views info, compares, selects or exits
        ↓
Tracking layer batches anonymous AnalyticsEvents → Express API → PostgreSQL
        ↓
Restaurant opens dashboard (desktop-first)
        ↓
API aggregates events → metrics + insights (real DB data, not hardcoded)
        ↓
Dashboard shows attention by section/dish + actionable insight copy
```

### 1.2 Actors

| Actor | Auth | Primary surface |
|-------|------|-----------------|
| Customer | None — anonymous `sessionId` | Mobile menu (`/m/:restaurantSlug`) |
| Restaurant staff | Simple demo login (single restaurant) | Dashboard (`/dashboard`) |
| Demo operator | Seed / simulate script | Local tooling |

### 1.3 Core product loop

1. **Menu presentation** — restaurant publishes categories and dishes.
2. **Attention capture** — Intersection Observer–based meaningful visibility, not pixel scroll tracking.
3. **Behaviour events** — views, attention ticks, searches, info views, comparisons, selections, exits.
4. **Aggregation** — server-side metrics from stored events.
5. **Insights** — rules that turn metrics into short, partner-ready statements.

### 1.4 Privacy (demo)

- No customer accounts, names, emails, phones, or precise location.
- Identity = opaque `sessionId` (UUID) stored in `sessionStorage`.
- Events are behavioural, not personally identifiable.

---

## 2. Frontend Architecture

### 2.1 Application shape

Single React SPA (Vite), two major experiences behind React Router:

| Route prefix | Audience | Layout |
|--------------|----------|--------|
| `/` | Entry / QR landing | Marketing-light entry → menu |
| `/m/:restaurantSlug` | Customer | Mobile-first menu shell |
| `/m/:restaurantSlug/dish/:dishId` | Customer | Dish detail |
| `/dashboard/*` | Restaurant | SaaS dashboard shell |
| `/demo` (optional) | Operator | Seed / simulate controls |

### 2.2 Libraries (as specified)

- **React + Vite + JavaScript** (no TypeScript)
- **Tailwind CSS** — styling
- **React Router** — navigation
- **TanStack Query** — server state (menu, dashboard metrics, insights)
- **Recharts** — dashboard charts
- **Lucide React** — icons

### 2.3 Frontend module boundaries

```
src/
  app/                 # Router, providers, layout shells
  features/
    menu/              # Customer menu UI + dish detail
    tracking/          # Analytics client, observers, session
    dashboard/         # Restaurant views, charts, insight cards
    auth/              # Lightweight restaurant demo auth
  shared/              # UI primitives, hooks, utils, API client
```

### 2.4 Data fetching

- TanStack Query for all read APIs (`menu`, `metrics`, `insights`).
- Mutations / tracking POSTs go through the tracking module (not Query mutations for high-frequency ticks).
- Query keys scoped by `restaurantId` / date range.

### 2.5 UX principles for the demo

- **Customer:** premium restaurant menu, mobile-first, fast section jump, clear dish cards, search, dish detail with info expandable sections.
- **Restaurant:** desktop-optimized SaaS dashboard; attention hierarchy first; insights as first-class output, not buried under raw tables.

---

## 3. Backend Architecture

### 3.1 Style

**Modular monolith** — one Node.js + Express process, one PostgreSQL database, feature modules with clear boundaries. No microservices.

### 3.2 Process layout

```
HTTP (Express)
  ├── public routes          (menu read, tracking ingest)
  ├── restaurant routes      (auth + dashboard APIs)
  └── health                 (/health)
         ↓
  Feature modules
  ├── menu
  ├── tracking
  ├── analytics
  ├── insights
  └── auth
         ↓
  Prisma Client → PostgreSQL
```

### 3.3 Module responsibilities

| Module | Responsibility |
|--------|----------------|
| `menu` | Restaurant, categories, dishes, search index fields |
| `tracking` | Validate + persist `AnalyticsEvent` batches; session upsert |
| `analytics` | Aggregate events into section/dish metrics |
| `insights` | Derive insight records / DTO from metrics |
| `auth` | Demo restaurant login + session/JWT for dashboard |

### 3.4 API surface (initial)

**Public / customer**

- `GET /api/restaurants/:slug/menu` — categories + dishes
- `POST /api/tracking/events` — batch analytics events
- `POST /api/tracking/sessions` — create/refresh anonymous session metadata (device class, startedAt)

**Restaurant (authenticated)**

- `POST /api/auth/login`
- `GET /api/dashboard/overview`
- `GET /api/dashboard/sections`
- `GET /api/dashboard/dishes`
- `GET /api/dashboard/insights`
- `GET /api/dashboard/searches` (optional for demo)

**Operator (dev-only)**

- `POST /api/demo/simulate` — generate realistic event streams via same ingest path

### 3.5 Conventions

- JavaScript only (ES modules or CommonJS — pick one and stay consistent; prefer ESM with Vite alignment).
- Thin route handlers → service functions → Prisma.
- Zod or manual validation for event payloads (lightweight; no TypeScript).
- CORS configured for local Vite origin.

---

## 4. Database Architecture

### 4.1 Engine

PostgreSQL (local). Prisma as ORM / migrations.

### 4.2 Conceptual model

```
Restaurant
  └── Category (menu section)
        └── Dish
AnonymousSession
AnalyticsEvent  → restaurantId, sessionId, eventType, entity refs, payload, timestamps
(Optional materialized views / summary tables later — not required for first demo)
```

### 4.3 Core tables

#### `Restaurant`
- `id`, `slug`, `name`, `timezone`, `createdAt`

#### `Category` (menu section)
- `id`, `restaurantId`, `name`, `slug`, `sortOrder`
- Examples: Starters, Main Course, Biryani, Desserts

#### `Dish`
- `id`, `restaurantId`, `categoryId`, `name`, `description`, `price`, `imageUrl`, `isAvailable`, `sortOrder`
- Optional flags: `tags` (JSON), `hasNutrition`, `hasAllergens` for “information viewed” demos

#### `AnonymousSession`
- `id` (UUID, client-generated or server-issued)
- `restaurantId`
- `startedAt`, `lastSeenAt`, `endedAt` (nullable)
- `userAgent` (coarse), `viewportWidth` (optional)
- No PII

#### `AnalyticsEvent`
Source of truth for all behaviour. Dashboard numbers must derive from this table (or aggregations of it).

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `restaurantId` | Tenant scope |
| `sessionId` | Anonymous session |
| `eventType` | Enum-like string |
| `categoryId` | Nullable |
| `dishId` | Nullable |
| `occurredAt` | Client event time |
| `durationMs` | For attention segments |
| `payload` | JSONB — search query, info type, compare pair, exit reason, etc. |
| `createdAt` | Server ingest time |

#### Suggested `eventType` values

| eventType | Meaning |
|-----------|---------|
| `session_start` | Menu opened |
| `session_end` | Exit / tab close / idle timeout |
| `section_view` | Section crossed visibility threshold (count view once per entry) |
| `section_attention` | Closed attention segment with `durationMs` |
| `dish_view` | Dish card meaningfully visible or detail opened |
| `dish_attention` | Closed dish attention segment with `durationMs` |
| `dish_detail_open` | Navigated to / opened dish detail |
| `info_view` | Viewed nutrition / allergens / ingredients |
| `search` | Search query submitted or debounced commit |
| `compare` | Two (or more) dishes compared |
| `dish_select` | Add / select / “I’d order this” demo action |
| `menu_exit` | Explicit leave or session end with last context |

### 4.4 Indexing (demo-adequate)

- `(restaurantId, occurredAt)`
- `(restaurantId, eventType, occurredAt)`
- `(restaurantId, categoryId, eventType)`
- `(restaurantId, dishId, eventType)`
- `(sessionId, occurredAt)`
- GIN on `payload` only if search analytics need it later

### 4.5 Aggregation strategy (demo)

- **Phase 1:** Compute metrics on read with SQL/`GROUP BY` via Prisma `$queryRaw` or careful Prisma group queries.
- **Phase 2 (optional):** Nightly or on-demand summary tables — explicitly out of initial demo unless query latency forces it.

No Redis cache, no warehouse, no Kafka for the demo.

---

## 5. Tracking Architecture

### 5.1 Principle

**Meaningful visibility, not scroll pixels.**

A section or dish is “attended” when it meets an Intersection Observer threshold (e.g. ≥50–60% visible for ≥N ms). Timing accumulates across revisits within the session.

### 5.2 Client components

```
features/tracking/
  session.js              # getOrCreateSessionId()
  observerRegistry.js     # shared IntersectionObservers
  sectionAttention.js     # section enter/exit → timers
  dishAttention.js        # dish enter/exit → timers
  eventQueue.js           # buffer + flush
  track.js                # public API: trackSearch, trackSelect, ...
  visibilityHeartbeat.js  # pause on hidden tab; flush on pagehide
```

### 5.3 Attention algorithm (conceptual)

1. Element registers with IntersectionObserver (`threshold` + optional `rootMargin`).
2. On **enter meaningful visibility**: start timer for that entity; emit `*_view` once per continuous entry if needed.
3. On **leave meaningful visibility** or **page hide**: stop timer; if `durationMs >= minAttentionMs` (e.g. 800–1000ms), enqueue `*_attention` with duration.
4. On **re-enter**: new segment; durations accumulate in analytics (sum of segments).
5. On **session end**: flush queue; emit `session_end` / `menu_exit` with last section/dish context.

### 5.4 What we deliberately do *not* track

- Continuous scroll position streams
- Mouse coordinates / heatmaps
- Keystroke-level input (only committed search queries)
- Fingerprints beyond coarse UA / viewport for demo QA

### 5.5 Transport

- In-memory queue (array) on the client.
- Flush every ~5s, or when queue ≥ N events, or on `visibilitychange` / `pagehide` / route change.
- `POST /api/tracking/events` with `{ sessionId, restaurantId, events: [...] }`.
- Server validates, inserts in a transaction, updates `AnonymousSession.lastSeenAt`.

### 5.6 Reliability for demo

- `navigator.sendBeacon` or `fetchkeepalive` on unload where supported.
- Accept minor loss; prioritize correctness of stored events over perfect delivery.

---

## 6. Analytics Architecture

### 6.1 Pipeline

```
AnalyticsEvent (raw)
        ↓
Aggregation queries (per restaurant, optional date range)
        ↓
Metric DTOs (sections, dishes, searches)
        ↓
Insight rules engine
        ↓
Dashboard API responses
```

### 6.2 Section metrics

| Metric | Derivation |
|--------|------------|
| Views | Count `section_view` (or distinct entries) |
| Unique sessions | `COUNT(DISTINCT sessionId)` for section events |
| Total attention | `SUM(durationMs)` of `section_attention` |
| Average attention | Total attention / unique sessions (or sessions that viewed) |
| % sessions reaching section | Sessions with section activity / all sessions for restaurant |

### 6.3 Dish metrics

| Metric | Derivation |
|--------|------------|
| Views | `dish_view` / `dish_detail_open` counts (define one primary) |
| Unique sessions | Distinct sessions with dish activity |
| Attention / average attention | From `dish_attention` sums |
| Selections | Count `dish_select` |
| Selection rate | Selections / unique sessions that viewed (or views) |

### 6.4 Supporting signals

- **Search demand:** group `search` payload queries (normalize case/trim).
- **Info viewed:** count by `payload.infoType`.
- **Comparisons:** count `compare` events; optional pair frequency.
- **Exits:** last section/dish on `menu_exit` / `session_end`.

### 6.5 Insights (rule-based, no external AI)

Examples the demo must support:

1. **Highest attention section** — “Main Course receives the highest customer attention.”
2. **Highest viewed section**
3. **Highest attention dish**
4. **Most selected dish**
5. **High attention / low selection** — e.g. “Chicken Biryani receives high attention but relatively low selection.”
6. **Search demand** — when search volume is meaningful

Insight objects returned to the UI:

```json
{
  "id": "highest_attention_section",
  "severity": "high",
  "title": "Main Course leads attention",
  "body": "Main Course receives the highest customer attention (46s average).",
  "metricRefs": { "categoryId": "...", "avgAttentionMs": 46000 }
}
```

Rules live in `insights` module as plain functions over metric snapshots — deterministic and explainable to a business partner.

### 6.6 Demo data integrity

- Dashboard **must not** hardcode metric numbers.
- Seed SQL or `POST /api/demo/simulate` must write real `AnalyticsEvent` rows through the same ingest service used by the customer app.
- Optional: “Simulate browsing session” button that drives the client tracker or server-side event generator with realistic Main Course / Biryani bias for the live demo.

---

## 7. Dashboard Architecture

### 7.1 Information hierarchy (partner narrative)

1. **Hero insight** — one sentence: where attention concentrates.
2. **Section attention** — bar/horizontal chart (Recharts): avg or total attention by section.
3. **Dish attention & selection** — table or dual metric chart; highlight high-attention/low-selection.
4. **Secondary** — searches, exits, session volume (keep secondary so the 2–3 min story stays clear).

### 7.2 Views / routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview + top insight |
| `/dashboard/sections` | Section deep dive |
| `/dashboard/dishes` | Dish attention vs selection |
| `/dashboard/insights` | Full insight list |
| `/dashboard/live` (optional) | Recent sessions/events for wow-factor |

### 7.3 Frontend data flow

```
TanStack Query → GET /api/dashboard/* → charts + insight cards
```

No local fake analytics stores. Loading / empty / error states required so a live demo can show “browse menu → refresh dashboard.”

### 7.4 Visual language

- Modern SaaS dashboard, desktop-first, responsive.
- Attention is the primary visual metaphor (time, not vanity pageviews).
- Insights presented as readable business copy above charts.

---

## 8. Folder Structure

Proposed monorepo-style layout (single product repo):

```
Digital Menu/
├── ARCHITECTURE.md
├── README.md                 # later
├── package.json              # optional workspace root
├── apps/
│   └── web/                  # Vite + React SPA
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       └── src/
│           ├── main.jsx
│           ├── app/
│           │   ├── App.jsx
│           │   ├── router.jsx
│           │   └── providers.jsx
│           ├── features/
│           │   ├── menu/
│           │   ├── tracking/
│           │   ├── dashboard/
│           │   └── auth/
│           └── shared/
│               ├── api/
│               ├── ui/
│               └── lib/
└── server/                   # Express + Prisma modular monolith
    ├── package.json
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.js
    └── src/
        ├── index.js
        ├── app.js
        ├── config.js
        ├── modules/
        │   ├── menu/
        │   ├── tracking/
        │   ├── analytics/
        │   ├── insights/
        │   └── auth/
        ├── middleware/
        └── utils/
```

Alternative acceptable for speed: flat `client/` + `server/` at repo root (same module boundaries). Prefer clarity over tooling sophistication for the demo.

---

## 9. Development Phases

### Phase 0 — Architecture (this document)
- Agree boundaries, event model, demo story.
- **Stop here until next instruction.**

### Phase 1 — Foundation
- Scaffold Vite React app + Express server + Prisma schema + PostgreSQL connection.
- Seed one restaurant, categories (Starters, Main Course, Biryani, Desserts), dishes.
- Health check + menu read API + basic customer menu UI (no tracking yet).

### Phase 2 — Tracking vertical slice
- Anonymous session + Intersection Observer attention for sections and dishes.
- Event queue + ingest API + `AnalyticsEvent` persistence.
- Verify events in DB from real browser interaction.

### Phase 3 — Analytics + insights
- Aggregation queries for section/dish metrics.
- Insight rules (highest attention section; high attention / low selection dish).
- Dashboard overview wired to real APIs.

### Phase 4 — Demo polish
- Search / info view / select / exit events.
- Dish detail UX, QR-style entry, dashboard charts (Recharts).
- Simulate endpoint or script biased toward Main Course / Biryani for reliable live demos.
- Empty states, loading, responsive pass, seed reset instructions.

### Phase 5 — Hardening (only if time)
- Input validation, basic rate limiting on ingest, indexes tuning.
- Demo restaurant auth lock on dashboard.
- README with runbook for the 2–3 minute partner demo.

---

## 10. Intentionally Excluded from the Demo

| Excluded | Reason |
|----------|--------|
| TypeScript | Project constraint — JavaScript only |
| MongoDB | PostgreSQL is the system of record |
| Microservices / Kafka / Kubernetes | Overkill; modular monolith only |
| Redis / BullMQ | Not needed for demo latency or jobs |
| Elasticsearch / data warehouse | SQL aggregations suffice |
| Separate mobile app | Responsive web menu is enough |
| External AI APIs | Rule-based insights only |
| Real payment / POS integration | Out of scope |
| Real QR infrastructure / deep links at scale | Static entry URL / QR image for demo |
| Customer accounts / loyalty / PII | Privacy + scope |
| Pixel-perfect heatmaps / session replay | Conflicts with “meaningful visibility” principle |
| Multi-tenant billing / restaurant onboarding wizard | Single seeded restaurant |
| Push notifications, email campaigns | Not part of attention MVP |
| i18n / multi-currency complexity | Single locale/currency for demo |
| Advanced A/B testing platform | Not required |
| Exact cross-device identity graph | Anonymous sessions only |

---

## Appendix A — Demo success criteria

A partner walkthrough succeeds when:

1. Customer menu feels like a real restaurant experience.
2. Browsing Main Course / Biryani visibly drives attention metrics.
3. Dashboard numbers change based on real stored events.
4. At least one insight sentence matches the narrative (“Main Course receives the highest customer attention”).
5. Optional second insight shows consideration without conversion (“high attention, low selection”).

## Appendix B — Key design decisions

| Decision | Choice |
|----------|--------|
| Architecture | Modular monolith |
| Attention signal | Intersection Observer + min duration |
| Analytics source of truth | `AnalyticsEvent` rows |
| Insights | Deterministic rules, not LLM |
| Auth | None for customers; light demo auth for dashboard |
| Language | JavaScript only |

---

*End of architecture document. Awaiting next instruction before implementation.*
