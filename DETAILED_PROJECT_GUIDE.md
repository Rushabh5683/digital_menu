# Digital Menu + Customer Attention Intelligence  
## Complete Project Detail Guide

**Document purpose:** Explain everything built so far, how each part works, and the full product flow from customer browse → database events → restaurant insights.

**Product idea in one line:**  
A restaurant digital menu that anonymously measures *what customers meaningfully pay attention to*, then turns that behaviour into actionable restaurant insights.

---

## 1. What this product is (and is not)

### It is
- A **Customer Attention & Consideration Tracking** system
- Mobile-first **digital menu** for guests (QR-style entry)
- Desktop-first **restaurant dashboard** for operators
- Event-driven analytics stored in **PostgreSQL**
- Deterministic **insight engine** (rules, not ChatGPT/external AI)

### It is not
- A generic scroll-pixel heatmap
- A login/loyalty/customer CRM
- A POS / payment system
- Microservices / Redis / Kafka / warehouse setup

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| Language | **JavaScript only** (no TypeScript) |
| Frontend | React, Vite, Tailwind CSS, React Router, TanStack Query, Recharts, Lucide |
| Backend | Node.js, Express, Prisma |
| Database | PostgreSQL |
| Tracking | Browser Intersection Observer + custom analytics module |
| Architecture | Modular monolith (one web app, one API, one DB) |

---

## 3. Repository structure

```
Digital Menu/
├── ARCHITECTURE.md              # Original architecture plan
├── README.md                    # Setup & run instructions
├── DETAILED_PROJECT_GUIDE.md    # This file
├── docs/
│   ├── SESSION.md               # Anonymous session behaviour
│   ├── ATTENTION_TRACKING.md    # Attention tracking design
│   ├── ANALYTICS_CALCULATIONS.md# Metrics formulas & report APIs
│   └── INSIGHTS.md              # Insight engine rules
├── apps/
│   ├── web/                     # React customer + dashboard UI
│   └── api/                     # Express + Prisma backend
└── package.json                 # npm workspaces root
```

### Frontend (`apps/web`)

```
src/
  app/                 # Router, providers, shared shell layout
  pages/               # Home, Health
  features/
    menu/              # Customer digital menu UI
    tracking/          # Anonymous session helpers + hook
    analytics/         # Attention tracking (IO, queue, events)
    dashboard/         # Restaurant admin dashboard
  shared/api/          # Central API client
```

### Backend (`apps/api`)

```
src/
  modules/
    health/            # GET /api/health
    restaurant/        # Restaurant + menu read APIs
    menu/              # Menu assembly / serializers
    category/          # Category helpers
    dish/              # Dish helpers
    session/           # Anonymous session start/end
    analytics/         # Event ingest + metric reports
    insights/          # Deterministic insight engine
  middleware/          # Central error handling
  utils/               # Validation helpers
prisma/
  schema.prisma        # Data model
  seed.js              # Saffron Court demo restaurant
```

---

## 4. Database model (source of truth)

### Entities

| Model | Role |
|-------|------|
| **Restaurant** | Tenant (e.g. Saffron Court) |
| **Menu** | Published menu belonging to a restaurant |
| **Category** | Menu section (Starters, Main Course, Biryani, …) |
| **Dish** | Items inside a category |
| **Session** | Anonymous browsing visit |
| **AnalyticsEvent** | Every behavioural signal (source of truth for dashboard) |

### Relations (simplified)

```
Restaurant
  ├── Menu(s)
  │     └── Category(s)
  │           └── Dish(es)
  ├── Session(s)
  └── AnalyticsEvent(s)  → linked to Session, optional Category/Dish
```

### Seeded demo data

**Restaurant:** Saffron Court (`slug: saffron-court`)

**Categories & dish counts:**
- Starters — 7
- Main Course — 8
- Biryani — 7
- Desserts — 6
- Beverages — 7  
**Total: 35 dishes** with realistic names, prices, ingredients, dietary tags, images.

---

## 5. End-to-end product flow

This is the most important section.

```
┌──────────────────┐
│ 1. Customer opens│
│ /menu/saffron-…  │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 2. Anonymous     │  sessionStorage UUID
│    session start │  → POST /api/sessions/start
└────────┬─────────┘  → Session row + session_start event
         ▼
┌──────────────────┐
│ 3. Menu loads    │  GET /api/restaurants/:slug/menu
│    from Postgres │  (restaurant + categories + dishes)
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 4. Customer      │  IntersectionObserver
│    browses       │  meaningful visibility ≠ scroll pixels
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 5. Tracking layer│  views, attention dwell, search,
│    queues events │  dish info, selection, exit
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 6. Batch ingest  │  POST /api/analytics/events
│    to PostgreSQL │  AnalyticsEvent rows
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 7. Restaurant    │  /admin/saffron-court
│    opens dashboard│
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 8. Calculations  │  GET /api/analytics/*
│    from events   │  section/dish/overview/trends
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 9. Insights      │  GET /api/insights/:restaurantId
│    (rule engine) │  business-friendly recommendations
└──────────────────┘
```

### Partner demo story (2–3 minutes)

1. Restaurant has a digital menu.  
2. Customer opens it (no login).  
3. Customer spends time on **Main Course / Biryani**.  
4. Customer opens a dish, maybe searches, maybe selects.  
5. Events are stored anonymously.  
6. Restaurant opens the dashboard.  
7. Dashboard shows where attention went.  
8. Insights explain what it means (e.g. “Main Course receives the highest customer attention”).

---

## 6. What was built — module by module

### 6.1 Foundation

- Monorepo with `apps/web` + `apps/api`
- Vite React app + Express API
- Prisma + PostgreSQL connection
- Env examples, CORS, centralized errors
- Health check: `GET /api/health`
- README + npm scripts (`dev`, `db:seed`, etc.)

### 6.2 Menu API (backend)

**Endpoints:**
- `GET /api/restaurants/:slug`
- `GET /api/restaurants/:slug/menu`

**Behaviour:**
- Returns restaurant + published menu with nested categories → dishes
- Validates slug format
- 404 if restaurant missing or no published menu
- Frontend-friendly serializers (`logo` instead of `logoUrl`, numeric prices)

### 6.3 Customer Digital Menu (frontend)

**Route:** `/menu/:restaurantSlug`

**Built UI:**
1. Restaurant header (logo, name, description)
2. Search bar
3. Sticky category navigation
4. Category sections with stable DOM ids
5. Dish cards (image, name, description, price, tags, View Details)
6. Dish detail drawer (ingredients, dietary info, Select)
7. Loading / empty search / error states
8. Mobile sticky bottom bar

**Data:** Always from API/Postgres — **never hardcoded menu items in React**.

### 6.4 Anonymous sessions

**Goal:** Every menu visit has an anonymous identity for analytics.

| Piece | Detail |
|-------|--------|
| Client ID | UUID in `sessionStorage` (`dm:anon-session:<slug>`) |
| Server row | `Session` with `anonymousSessionId` |
| Start | `POST /api/sessions/start` |
| End | `POST /api/sessions/end` (best-effort on leave) |
| Privacy | No name, email, phone, precise location |

**Survives:** page refresh, in-tab navigation  
**New ID:** new browser tab/window after close  

Docs: `docs/SESSION.md`

### 6.5 Attention & Consideration Tracking (core product)

**Frontend module:** `apps/web/src/features/analytics/`

| File | Role |
|------|------|
| `eventTypes.js` | Event type constants |
| `session.js` | Bridge to anonymous session context |
| `eventQueue.js` | Async batched queue (non-blocking) |
| `visibilityTracker.js` | Exclusive IntersectionObserver strategy |
| `analytics.js` | Public tracking API |
| `useCategoryAttention.js` | Hook for sections |
| `useDishAttention.js` | Hook for dishes |

**Event types tracked:**

| Event | Meaning |
|-------|---------|
| `MENU_OPENED` | Menu ready with server session |
| `CATEGORY_VIEWED` | Section became active/visible |
| `CATEGORY_ATTENTION` | Closed dwell segment (≥ ~1s) for a section |
| `DISH_VIEWED` | Dish card became active/visible |
| `DISH_ATTENTION` | Closed dwell segment for a dish |
| `SEARCH_PERFORMED` | Debounced search |
| `DISH_INFO_VIEWED` | Dish detail opened |
| `DISH_SELECTED` | Customer tapped Select |
| `MENU_EXITED` | Left menu / pagehide |

**Attention rules (important):**
- Not every scroll pixel
- Meaningful visibility threshold (~45%)
- Only **one category** and **one dish** accumulate time at once (exclusive “winner” by visibility + center proximity)
- Fast flick-scroll usually creates little/no attention
- Revisits accumulate additional attention segments
- Timers pause when tab is hidden

**Backend ingest:**
- `POST /api/analytics/events`
- Validates session ownership, event types, category/dish IDs
- Writes `AnalyticsEvent` rows

Docs: `docs/ATTENTION_TRACKING.md`

### 6.6 Analytics calculation layer

Raw events → synchronous SQL/JS aggregations (no Redis/workers).

**Endpoints:**
- `GET /api/analytics/overview/:restaurantId`
- `GET /api/analytics/categories/:restaurantId`
- `GET /api/analytics/dishes/:restaurantId`
- `GET /api/analytics/trends/:restaurantId`

Optional query: `?from=ISO&to=ISO`

**Section metrics:**
- total views
- unique sessions
- total attention seconds
- average attention seconds
- % of sessions reaching section

**Dish metrics:**
- views, unique sessions
- total/avg attention
- selection count
- selection rate

**Global overview:**
- total menu sessions
- average session duration
- highest attention category / dish
- most selected dish
- high attention / low selection list

Docs: `docs/ANALYTICS_CALCULATIONS.md`

### 6.7 Restaurant Dashboard

**Route:** `/admin/:restaurantSlug`  
Desktop-first SaaS-style UI.

**Screens / widgets:**
1. Overview cards (sessions, avg time, top section, top dish)
2. Recharts horizontal bar chart — avg attention by category
3. Section attention table
4. Dish attention table
5. High attention / low selection panel
6. Customer insights panel (from Insight API)
7. Date range selector (Today / 7d / 30d / All time)
8. Loading, empty, error states

**Critical rule:** All numbers come from live APIs backed by PostgreSQL events — **no fake dashboard constants**.

### 6.8 Deterministic Insight Engine

**Module:** `apps/api/src/modules/insights/`

| File | Role |
|------|------|
| `insight.rules.js` | Pure business rules |
| `insight.service.js` | Loads metrics + evaluates rules |
| `insight.routes.js` | HTTP endpoint |

**Endpoint:** `GET /api/insights/:restaurantId`

**Rules currently implemented:**

1. **Highest attention category**  
   e.g. “Main Course receives the highest customer attention.”

2. **High attention / low selection**  
   e.g. “Chicken Biryani receives high attention but relatively low selection…”

3. **High views / low selection**

4. **Strong search demand**  
   e.g. frequent searches for “vegetarian”

5. **Possible menu friction**  
   e.g. section rarely reached, or browse-without-select pattern

**Insight object fields:**
- `type`, `title`, `description`, `severity`
- `relatedCategory`, `relatedDish`
- `suggestedAction`
- `evidence`
- `provider: "rules"` (seam for future AI provider)

Insights only appear when data thresholds are met.

Docs: `docs/INSIGHTS.md`

---

## 7. Main API map

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | API + DB health |
| GET | `/api/restaurants/:slug` | Restaurant profile |
| GET | `/api/restaurants/:slug/menu` | Full published menu |
| POST | `/api/sessions/start` | Create/resume anonymous session |
| POST | `/api/sessions/end` | End session |
| POST | `/api/analytics/events` | Ingest behaviour events |
| GET | `/api/analytics/overview/:restaurantId` | KPI overview |
| GET | `/api/analytics/categories/:restaurantId` | Section metrics |
| GET | `/api/analytics/dishes/:restaurantId` | Dish metrics |
| GET | `/api/analytics/trends/:restaurantId` | Daily trends |
| GET | `/api/insights/:restaurantId` | Deterministic insights |

---

## 8. Main frontend routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/` | Anyone | Entry links |
| `/health` | Dev | API health UI |
| `/menu/:restaurantSlug` | Customer | Digital menu + tracking |
| `/admin/:restaurantSlug` | Restaurant | Attention dashboard |

**Demo URLs (local):**
- Menu: http://localhost:5173/menu/saffron-court
- Dashboard: http://localhost:5173/admin/saffron-court
- API health: http://localhost:4000/api/health

---

## 9. Data flow example (concrete)

### Customer spends time on Biryani

1. Biryani section crosses meaningful visibility → `CATEGORY_VIEWED`
2. Customer stays ~38s → on leave/switch → `CATEGORY_ATTENTION` with `metadata.durationMs ≈ 38000`
3. Chicken Biryani card becomes the exclusive visible dish → `DISH_VIEWED`
4. Customer opens details → `DISH_INFO_VIEWED`
5. Customer selects → `DISH_SELECTED`
6. Events flush to `POST /api/analytics/events`
7. Dashboard category chart shows Biryani average attention from real sums
8. Insight engine may emit high-attention / low-selection if selection rate is weak

### Restaurant refreshes dashboard

1. Frontend loads restaurant by slug → gets `restaurantId`
2. Parallel TanStack Query calls: overview, categories, dishes, insights
3. Charts/tables render calculated metrics
4. Insight cards show only rules that passed thresholds

---

## 10. Privacy model (demo)

**Collected**
- Opaque anonymous session UUID
- Restaurant-scoped behavioural events
- Timestamps and duration metadata
- Search query text (not personal identity)

**Not collected**
- Name, email, phone
- Precise GPS location
- Payment details
- Login credentials (customers do not log in)

---

## 11. How to run locally

```bash
cd "Digital Menu"
npm install
cp .env.example apps/api/.env   # set DATABASE_URL
npm run db:generate
# apply migrations if needed, then:
npm run db:seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000  

Useful scripts:
- `npm run db:seed` — reseed Saffron Court
- `npm run test:api` — API unit tests
- `npm run db:studio` — Prisma Studio

---

## 12. How to verify the vertical slice

1. Open customer menu → browse Main Course / Biryani slowly  
2. Open a dish → select it  
3. Optionally search “biryani” or “vegetarian”  
4. Open dashboard → refresh  
5. Confirm chart/tables change from real events  
6. Confirm insights appear only when supported  

Optional DB check:

```sql
SELECT "eventType", COUNT(*) 
FROM "AnalyticsEvent" 
GROUP BY 1 
ORDER BY 2 DESC;
```

Debug tracking in browser:

```js
localStorage.setItem('dm:analytics:debug', '1')
```

---

## 13. What is intentionally NOT built yet

- Restaurant authentication / multi-tenant onboarding
- Real QR infrastructure at scale
- Payments / POS integration
- External AI insight provider (architecture seam exists)
- Redis / queues / microservices
- Native mobile apps
- Heatmaps / session replay

---

## 14. Design principles used throughout

1. **Meaningful attention, not scroll noise**  
2. **Events in Postgres are the source of truth**  
3. **Dashboard never invents numbers**  
4. **Anonymous by default**  
5. **Modular monolith — simple for a demo, clear for extension**  
6. **Insights must be earned by data thresholds**  
7. **JavaScript everywhere**

---

## 15. Quick mental model

```
Menu UI  →  Tracking  →  Events DB  →  Calculations  →  Insights  →  Dashboard
```

If you remember only one diagram, remember that.

---

## 16. Related docs

| File | Focus |
|------|--------|
| `ARCHITECTURE.md` | Original system design |
| `docs/SESSION.md` | Anonymous sessions |
| `docs/ATTENTION_TRACKING.md` | Tracking mechanics |
| `docs/ANALYTICS_CALCULATIONS.md` | Metric formulas & report APIs |
| `docs/INSIGHTS.md` | Insight rules & AI swap seam |
| `README.md` | Setup & scripts |

---

*This guide reflects the project state after foundation, menu API, customer menu, sessions, attention tracking, analytics calculations, restaurant dashboard, and deterministic insights.*
