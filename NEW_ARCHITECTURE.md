# Multi-Restaurant Platform — Architecture Extension

**Document status:** Architecture audit only — no feature implementation in this phase  
**Date:** 2026-08-29  
**Constraint:** Extend the existing Digital Menu + Customer Attention Intelligence app. Do **not** rebuild from scratch.

Related docs: [ARCHITECTURE.md](./ARCHITECTURE.md), [DETAILED_PROJECT_GUIDE.md](./DETAILED_PROJECT_GUIDE.md), [docs/](./docs/)

---

## 1. Existing Architecture (as built)

### 1.1 Stack & layout

| Layer | Reality in repo |
|-------|-----------------|
| Monorepo | npm workspaces: `apps/web`, `apps/api` |
| Frontend | React 19 + Vite 6 + JavaScript + Tailwind 4 + React Router 7 + TanStack Query + Recharts + Lucide |
| Backend | Node.js + Express (ESM) modular monolith |
| ORM / DB | Prisma 6 → PostgreSQL |
| Auth | **None** (dashboard is open by URL slug) |

```
Digital Menu/
├── apps/web/          # Customer menu + restaurant analytics dashboard
├── apps/api/          # Express + Prisma
├── docs/              # SESSION, ATTENTION_TRACKING, ANALYTICS, INSIGHTS
├── ARCHITECTURE.md    # Original design (partially superseded by code)
└── DETAILED_PROJECT_GUIDE.md
```

### 1.2 Current product loop

```
Customer opens /menu/:restaurantSlug
        ↓
Anonymous session (sessionStorage UUID) → POST /api/sessions/start
        ↓
Published menu loaded → GET /api/restaurants/:slug/menu
        ↓
Intersection Observer attention + behavioural events
        ↓
Batch ingest → POST /api/analytics/events → PostgreSQL
        ↓
Restaurant opens /admin/:restaurantSlug (unauthenticated)
        ↓
GET /api/analytics/* + GET /api/insights/:restaurantId
        ↓
Dashboard metrics + deterministic insight rules
```

### 1.3 Current Prisma model

```
Restaurant (slug unique)
  ├── Menu(s)  → isPublished
  │     └── Category(s)  → displayOrder
  │           └── Dish(es)  → price, ingredients[], dietaryTags[], isAvailable
  ├── Session(s)  → anonymousSessionId (unique per restaurant)
  └── AnalyticsEvent(s)  → eventType, categoryId?, dishId?, metadata JSON
```

**Seeded demo:** Saffron Court (`saffron-court`) — Dinner Menu, 5 categories, 35 dishes.

### 1.4 Current API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | Public | Health + DB ping |
| GET | `/api/restaurants/:slug` | Public | Restaurant profile |
| GET | `/api/restaurants/:slug/menu` | Public | Published menu tree |
| POST | `/api/sessions/start` | Public | Create/resume anonymous session |
| POST | `/api/sessions/end` | Public | End session |
| POST | `/api/analytics/events` | Public | Batch event ingest |
| GET | `/api/analytics/overview/:restaurantId` | **Open** | Overview metrics |
| GET | `/api/analytics/categories/:restaurantId` | **Open** | Section metrics |
| GET | `/api/analytics/dishes/:restaurantId` | **Open** | Dish metrics |
| GET | `/api/analytics/trends/:restaurantId` | **Open** | Trends |
| GET | `/api/insights/:restaurantId` | **Open** | Rule-based insights |

**Missing today:** auth, users/roles, menu CRUD, tables, QR generation, cart, orders, order lifecycle, super-admin APIs.

### 1.5 Current frontend routes

| Route | Surface |
|-------|---------|
| `/` | Demo home links |
| `/health` | API health page |
| `/menu/:restaurantSlug` | Customer digital menu |
| `/admin/:restaurantSlug` | Analytics dashboard (open, single page) |

No table query param. No cart. Dish “select” is an analytics signal (`DISH_SELECTED`), not a real order.

### 1.6 Design system already in use (reuse)

Defined in `apps/web/src/index.css`:

- **Fonts:** Fraunces (display), Manrope (body)
- **Tokens:** `--ink`, `--surface`, `--surface-elevated`, `--accent` (gold), `--teal`, `--muted`, `--line`, `--danger`
- **Motion:** `menu-fade-up`, `drawer-up`, `drawer-backdrop`
- **Patterns:** dark ink headers, soft sage/paper surfaces, rounded-2xl panels, dish detail drawer, polished empty/loading/error states

All new admin screens should extend this language — not invent a second visual system.

### 1.7 What can be reused as-is

| Asset | Reuse plan |
|-------|------------|
| Restaurant / Menu / Category / Dish schema | Keep; add admin write APIs |
| `GET .../menu` + menu serializers | Keep for customer; extend with table context |
| Anonymous session module | Keep; optionally attach `tableId` |
| Attention tracking client (`features/analytics`) | Keep; remain independent of cart/orders |
| Analytics reports + metrics | Keep; later optional filter by table |
| Insight rules engine | Keep; restaurant-scoped as today |
| Dashboard charts / tables / insight cards | Keep as Analytics section inside restaurant admin |
| CSS design tokens + motion | Required baseline for all new UI |
| Modular Express layout (`modules/*`) | Add `auth`, `users`, `tables`, `orders`, `admin` modules |
| Validation + `AppError` middleware | Extend |

### 1.8 Gaps vs new product

| Capability | Status |
|------------|--------|
| Multi-restaurant data model | Partially ready (`Restaurant.slug` exists; only one seeded) |
| Super Admin | Missing |
| Restaurant Admin auth | Missing |
| Menu / category / dish management UI + APIs | Read-only only |
| Tables + QR codes | Missing |
| Cart + place order | Missing (`DISH_SELECTED` ≠ order) |
| Order lifecycle (accept → complete) | Missing |
| Tenant isolation on admin APIs | Missing (anyone with `restaurantId` can read analytics) |
| Onboarding flow | Missing |

---

## 2. New Roles

| Role | Scope | Primary jobs |
|------|-------|--------------|
| **SUPER_ADMIN** | Platform | Create/suspend restaurants, create restaurant admins, view platform health, optional global analytics summary |
| **RESTAURANT_ADMIN** | One restaurant (membership) | Manage menu, categories, dishes, tables, QR codes, orders, analytics |
| **CUSTOMER** | Anonymous, no account | Scan table QR → browse correct restaurant menu → cart → place order |

Staff roles are authenticated users. Customers remain anonymous (same privacy posture as today), but sessions may be bound to a **table**.

Optional later (out of v1): `KITCHEN_STAFF`, `WAITER` with subset of order permissions.

---

## 3. Authentication Architecture

### 3.1 Principles

- Customers: **no login** (unchanged).
- Super Admin + Restaurant Admin: **email + password** with hashed credentials (bcrypt/argon2).
- Prefer **HTTP-only secure cookies** (access + refresh) for browser admin SPAs to reduce XSS token theft; alternatively Bearer JWT in memory + refresh cookie if cookie CORS is awkward in local demo.
- All mutating and sensitive read APIs require auth + role checks.
- Public customer APIs remain open but tightly validated (slug, table token, session ownership).

### 3.2 Suggested models

```
User
  id, email (unique), passwordHash, name, role (SUPER_ADMIN | RESTAURANT_ADMIN),
  isActive, createdAt, updatedAt

RestaurantMembership          # binds restaurant admins to exactly one restaurant (v1)
  id, userId, restaurantId, role (RESTAURANT_ADMIN), createdAt
  @@unique([userId, restaurantId])

RefreshToken (optional table) or store refresh jti hash on User
```

**v1 rule:** one Restaurant Admin belongs to **one** restaurant via membership. Super Admin has no membership (platform-wide).

### 3.3 Token / session flow

```
POST /api/auth/login { email, password }
  → verify → issue access (short) + refresh (long)
  → client stores session; subsequent admin calls include credentials

POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me   → { user, role, restaurant? }
```

### 3.4 Middleware

| Middleware | Behaviour |
|------------|-----------|
| `requireAuth` | Valid access token/session required |
| `requireRole('SUPER_ADMIN')` | Platform routes |
| `requireRestaurantAdmin` | User must have membership for target restaurant |
| `resolveRestaurantScope` | From route param (`restaurantId` / `slug`) **and** membership — never trust body `restaurantId` alone |

### 3.5 Password & secrets

- New env: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (or single secret with typed claims), `BCRYPT_ROUNDS`
- Seed Super Admin from env in development only
- Never commit real credentials

---

## 4. Restaurant Isolation Strategy

### 4.1 Tenant key

**Primary tenant key:** `restaurantId` (cuid).  
**Public customer key:** `Restaurant.slug` (URL-safe, unique).

### 4.2 Isolation rules

1. Every Menu, Category, Dish, Table, Order, Session, AnalyticsEvent already or will belong to a restaurant (directly or via parent).
2. Restaurant Admin queries **always** filter `WHERE restaurantId = membership.restaurantId`.
3. Path params that look like cross-tenant IDs (dishId, orderId, tableId) must be ownership-checked before mutate/read.
4. Analytics/insights endpoints move from open `/:restaurantId` to authenticated restaurant-scoped routes (see §11).
5. Super Admin may list all restaurants; may not impersonate without explicit “view as” later (v1: manage restaurants + create admins only).

### 4.3 Soft multi-tenancy (chosen)

Single PostgreSQL database, shared schema, row-level filtering by `restaurantId`. No schema-per-tenant for this phase.

---

## 5. Onboarding Flow

### 5.1 Platform onboarding (Super Admin)

```
Super Admin logs in
  → Creates Restaurant (name, slug, description, logo, timezone?, status=ACTIVE)
  → Creates Restaurant Admin user (email, temp password) + membership
  → Restaurant appears in platform list
```

### 5.2 Restaurant activation (Restaurant Admin)

```
Restaurant Admin logs in → lands in restaurant workspace
  → Completes profile (optional)
  → Creates / edits Menu → Categories → Dishes
  → Publishes menu (isPublished = true)
  → Creates Tables (1..N)
  → Generates / downloads table QR codes
  → Opens order inbox + analytics
```

### 5.3 Customer entry

```
Guest scans Table 12 QR at Saffron Court
  → Opens /menu/saffron-court?table=12  (or tokenized equivalent)
  → App resolves restaurant + table
  → Starts anonymous session (optionally with tableId)
  → Menu + cart + checkout
```

Fallback: `/menu/:slug` without table → show premium table picker (active tables only) before cart/checkout; browsing-only may still be allowed.

---

## 6. Table Architecture

### 6.1 Model

```
RestaurantTable   # name "Table" is reserved in SQL — use RestaurantTable / dining_tables
  id              cuid
  restaurantId    FK → Restaurant
  label           string   # display: "12", "Patio A", "Bar 3"
  code            string   # URL param value, unique per restaurant (e.g. "12")
  qrToken         string   # optional opaque token for secure QR URLs (unique)
  isActive        boolean  default true
  capacity        int?     optional
  sortOrder       int
  createdAt, updatedAt

  @@unique([restaurantId, code])
  @@unique([qrToken])      # if using tokenized URLs
  @@index([restaurantId, isActive])
```

### 6.2 Behaviour

- Restaurant Admin CRUD for tables.
- Deactivating a table invalidates new customer binds; existing open orders keep historical `tableId`.
- Session and Order store `tableId` (nullable for browse-without-table).
- Table identity for customers comes from QR / query — **never** free-typed restaurant-wide table list without validation against active tables.

---

## 7. QR Architecture

### 7.1 Requirement

QR codes are **table-specific**. Scanning must identify **both** restaurant and table without manual table entry.

### 7.2 Recommended destination formats

**Primary (readable, good for demo):**

```
https://{app-host}/menu/saffron-court?table=12
```

**Hardened (preferred for production-ready path):**

```
https://{app-host}/menu/saffron-court?t={qrToken}
```

Where `qrToken` is a high-entropy opaque id stored on `RestaurantTable`. Prevents guests from inventing `?table=99` for tables that do not exist or are inactive. Label `12` remains human-facing; token is machine-facing.

**Optional clean path style (also acceptable):**

```
/m/saffron-court/t/12
/m/saffron-court/q/{qrToken}
```

Keep React Router aligned; recommend sticking close to existing `/menu/:restaurantSlug` plus query for minimal churn.

### 7.3 Generation

- Admin UI: list tables → “Download QR” / “Print sheet”
- Client or server generates QR image encoding absolute URL (use a small QR library on web or API returns PNG/SVG)
- Print layout: restaurant name + table label + QR (premium print sheet, not a raw dump)

### 7.4 Scan resolution (frontend)

1. Parse `slug` from path.
2. Parse `table` **or** `t` (token) from query.
3. `GET /api/restaurants/:slug/tables/resolve?code=` or `?token=`
4. Persist resolved `{ tableId, label }` in session context (sessionStorage alongside anon session).
5. If missing/invalid → fallback table selector UI.
6. Cart checkout requires resolved active table.

---

## 8. Order Architecture

### 8.1 Separate “interest” from “orders”

Keep `DISH_SELECTED` as an **attention/consideration** signal.  
Real commerce uses **Order** / **OrderItem**. Do not overload analytics selection into kitchen tickets.

### 8.2 Models

```
Order
  id, restaurantId, tableId?, sessionId?
  orderNumber          # human-friendly per restaurant (daily or sequential)
  status               # see lifecycle
  customerNote         String?
  subtotal, tax?, total  Decimal
  placedAt, acceptedAt?, readyAt?, completedAt?, cancelledAt?
  rejectReason?
  createdAt, updatedAt

OrderItem
  id, orderId, dishId
  dishNameSnapshot, unitPriceSnapshot   # freeze menu price/name at order time
  quantity, lineTotal
  notes?
```

### 8.3 Status lifecycle

```
PENDING
  → ACCEPTED → PREPARING → READY → COMPLETED
  → REJECTED (from PENDING)
  → CANCELLED (limited: customer before accept, or admin)
```

Restaurant Admin actions:

| Action | From → To |
|--------|-----------|
| Accept | PENDING → ACCEPTED |
| Reject | PENDING → REJECTED |
| Start preparing | ACCEPTED → PREPARING |
| Mark ready | PREPARING → READY |
| Complete | READY → COMPLETED |

### 8.4 Customer cart (client + optional server)

**v1 recommendation:**

- Cart held in client state (React context) keyed by `restaurantSlug` + `tableId`
- `POST /api/orders` creates order atomically from payload `{ tableId|token, items[], note }`
- Server re-validates dish availability + prices from DB (never trust client prices for totals)
- Clear cart on successful place

Optional later: server-side draft carts.

### 8.5 Realtime (v1 vs later)

- **v1:** Restaurant orders page polls (TanStack Query refetch interval ~3–5s) or manual refresh — matches current stack simplicity.
- **Later:** SSE/WebSocket for kitchen board.

### 8.6 Analytics linkage

Optional metadata on order placement event (new type `ORDER_PLACED`) for funnel insights: attention → select → order. Keep independent of Order tables so analytics remain event-sourced.

---

## 9. Updated Database Relationships

```
User
  └── RestaurantMembership ──┐
                             ▼
                        Restaurant
                     ┌───────┼───────────────┬──────────────┬────────────┐
                     ▼       ▼               ▼              ▼            ▼
                   Menu   RestaurantTable  Session       Order      AnalyticsEvent
                     │         │              │              │
                     ▼         │              │              ▼
                 Category      └──────────────┴────────── OrderItem
                     │                    (tableId)
                     ▼
                   Dish  ←────────────── OrderItem.dishId (FK + snapshots)
```

### 9.1 Schema changes required

| Change | Type | Notes |
|--------|------|-------|
| `User`, `RestaurantMembership` | **New** | Auth |
| `RestaurantTable` | **New** | Tables + QR |
| `Order`, `OrderItem` | **New** | Ordering |
| `Restaurant.status`, `timezone`, `isActive` | **Extend** | Ops |
| `Session.tableId` | **Extend** | Nullable FK |
| `AnalyticsEvent` | Keep | Optional `ORDER_*` event types later |
| Menu/Category/Dish | Keep | Add admin write paths; consider `Dish.restaurantId` denormalized for simpler auth queries (optional) |

### 9.2 Possible breaking changes

| Risk | Mitigation |
|------|------------|
| Open analytics URLs become protected | Version routes under `/api/admin/...`; update dashboard client; temporary internal key only if needed for demos |
| Menu URL gains `?table=` / `?t=` | Backward compatible — menu still loads without table |
| Seed resets wipe new entities | Extend `seed.js` with Super Admin, sample tables, sample admin user |
| `DISH_SELECTED` UX vs Add to cart | Keep select as “interested” **or** map button to cart add + separate analytics event — product decision in Phase 3; do not break existing event metrics formulas |
| Category belongs to Menu, not Restaurant | Admin APIs must scope via `menu.restaurantId`; publishing continues to use `isPublished` |
| No `restaurantId` on Dish today | Ownership checks join `dish → category → menu`; optional denormalize later for performance |

Non-breaking for customers: published menu GET shape can stay; additive fields only (`table` context separate endpoint).

---

## 10. Route Structure — Frontend

### 10.1 Public / customer

| Route | Purpose |
|-------|---------|
| `/` | Marketing / platform entry (evolve from demo home) |
| `/menu/:restaurantSlug` | Menu; optional `?table=` or `?t=` |
| `/menu/:restaurantSlug/cart` | Cart review (or drawer — prefer drawer on mobile for premium UX) |
| `/menu/:restaurantSlug/order/:orderId/confirmation` | Order placed confirmation |

### 10.2 Auth

| Route | Purpose |
|-------|---------|
| `/login` | Shared login (role detected from user) |
| `/logout` | Clear session |

### 10.3 Super Admin

| Route | Purpose |
|-------|---------|
| `/super` | Platform overview |
| `/super/restaurants` | Restaurant list |
| `/super/restaurants/new` | Create restaurant |
| `/super/restaurants/:id` | Restaurant detail / suspend / assign admin |

### 10.4 Restaurant Admin

Prefer slug-stable workspace (matches today’s `/admin/:restaurantSlug`):

| Route | Purpose |
|-------|---------|
| `/admin/:restaurantSlug` | Overview home (orders pulse + top insight) |
| `/admin/:restaurantSlug/menu` | Menus / publish |
| `/admin/:restaurantSlug/categories` | Category management |
| `/admin/:restaurantSlug/dishes` | Dish management |
| `/admin/:restaurantSlug/tables` | Tables + QR |
| `/admin/:restaurantSlug/orders` | Live order board |
| `/admin/:restaurantSlug/orders/:orderId` | Order detail |
| `/admin/:restaurantSlug/analytics` | **Existing** attention dashboard (moved/embedded) |

**Auth gate:** all `/admin/*` and `/super/*` require login; restaurant routes require membership matching slug.

### 10.5 Frontend module layout (extend, don’t replace)

```
apps/web/src/features/
  menu/          # existing — add cart, table bind, order confirm
  tracking/      # existing
  analytics/     # existing attention client
  dashboard/     # existing analytics UI → nest under admin shell
  auth/          # NEW
  admin/         # NEW restaurant admin shell + menu/tables/orders CRUD UI
  super/         # NEW platform admin
  cart/          # NEW
  orders/        # NEW shared order presentation bits
```

---

## 11. API Structure

### 11.1 Public (customer)

```
GET  /api/restaurants/:slug
GET  /api/restaurants/:slug/menu
GET  /api/restaurants/:slug/tables/resolve?code=12|&token=...
POST /api/sessions/start          # body may include tableCode | tableToken
POST /api/sessions/end
POST /api/analytics/events
POST /api/orders                  # place order (validated table + dishes)
GET  /api/orders/:id/public       # confirmation by id + opaque lookup token optional
```

### 11.2 Auth

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

### 11.3 Super Admin (`requireRole SUPER_ADMIN`)

```
GET    /api/super/restaurants
POST   /api/super/restaurants
GET    /api/super/restaurants/:id
PATCH  /api/super/restaurants/:id
POST   /api/super/restaurants/:id/admins
GET    /api/super/stats                 # optional counts
```

### 11.4 Restaurant Admin (`requireRestaurantAdmin`)

Scope all by membership-resolved `restaurantId`:

```
# Menu management
GET/POST   /api/admin/restaurants/:slug/menus
PATCH      /api/admin/restaurants/:slug/menus/:menuId
POST       /api/admin/restaurants/:slug/menus/:menuId/publish

GET/POST   /api/admin/restaurants/:slug/categories
PATCH/DELETE .../categories/:id

GET/POST   /api/admin/restaurants/:slug/dishes
PATCH/DELETE .../dishes/:id

# Tables & QR
GET/POST   /api/admin/restaurants/:slug/tables
PATCH/DELETE .../tables/:id
GET        .../tables/:id/qr            # returns URL + optional PNG/SVG

# Orders
GET        /api/admin/restaurants/:slug/orders?status=
GET        /api/admin/restaurants/:slug/orders/:orderId
POST       /api/admin/restaurants/:slug/orders/:orderId/accept
POST       .../reject
POST       .../preparing
POST       .../ready
POST       .../complete

# Analytics (move existing open routes here)
GET  /api/admin/restaurants/:slug/analytics/overview
GET  /api/admin/restaurants/:slug/analytics/categories
GET  /api/admin/restaurants/:slug/analytics/dishes
GET  /api/admin/restaurants/:slug/analytics/trends
GET  /api/admin/restaurants/:slug/insights
```

Deprecate or lock down legacy open `/api/analytics/:restaurantId` and `/api/insights/:restaurantId` after admin client migrates.

### 11.5 Backend modules to add

```
apps/api/src/modules/
  auth/
  users/
  tables/
  orders/
  admin/          # thin aggregators or keep CRUD in menu/category/dish services
  super/
```

Extend existing: `restaurant`, `menu`, `category`, `dish`, `session`, `analytics`, `insights`.

---

## 12. Security Boundaries

| Boundary | Rule |
|----------|------|
| Customer → menu | Public read of **published** menu only |
| Customer → order | Must resolve **active** table for restaurant; server recomputes prices; rate-limit place-order |
| Customer → analytics ingest | Session must belong to restaurant; category/dish ownership already validated |
| Restaurant Admin → data | Membership-scoped only; no cross-tenant IDs |
| Super Admin → platform | Can create restaurants/admins; no need for kitchen order ops in v1 |
| Dashboard analytics | Authenticated; remove open `restaurantId` guessing |
| QR tokens | Prefer opaque tokens; treat table codes as guessable — validate `isActive` |
| Passwords | Hashed; no plaintext in logs |
| CORS | Keep Vite origin; credentials mode if cookies used |
| PII | Customers still anonymous; staff emails are staff-only PII |

---

## 13. UX / Design Requirements (new screens)

Every new screen must feel **premium SaaS**, using existing tokens:

- Strong typography (Fraunces headings, Manrope UI)
- Refined spacing, elegant nav shell for admin
- Sophisticated cards only where interaction needs containment
- Polished data tables (orders, dishes), status badges (order states)
- Premium forms & drawers/modals (reuse dish drawer motion language)
- Useful empty states (no tables yet, no orders, unpublished menu)
- Subtle animations (fade/slide already defined)
- Responsive: customer mobile-first; admin desktop-first with usable tablet
- Charts: keep Recharts styling consistent with current dashboard

Avoid: Bootstrap-looking CRUD, cluttered card grids, generic purple SaaS tropes, unstyled file inputs, raw HTML tables without hierarchy.

---

## 14. Development Phases

### Phase 0 — Architecture audit (this document)
- Inspect repo, schema, routes, auth gap, reuse map, breaking changes.
- **Stop here until implementation is requested.**

### Phase 1 — Auth + multi-restaurant foundation
- Prisma: User, Membership, Restaurant status fields
- Auth module + middleware
- Super Admin: create restaurants + admins
- Seed: Super Admin + Saffron Court admin + keep existing menu seed
- Frontend: login + `/super/*` shell + protect `/admin/*`

### Phase 2 — Restaurant menu management
- Admin CRUD APIs for menus, categories, dishes
- Premium admin UI for menu management + publish flow
- Keep public customer menu read path unchanged in contract

### Phase 3 — Tables + QR
- `RestaurantTable` model + resolve API
- Admin tables UI + QR download/print
- Customer menu binds table from query; fallback selector
- Attach `tableId` to Session when known

### Phase 4 — Cart + orders
- Order / OrderItem schema + place-order API
- Customer cart + checkout UX
- Restaurant order board + status transitions
- Confirmation screen

### Phase 5 — Wire analytics into admin shell
- Move existing dashboard under `/admin/:slug/analytics`
- Lock down legacy open analytics routes
- Optional: order funnel event `ORDER_PLACED`
- Optional: filter attention by table

### Phase 6 — Polish & hardening
- Rate limits, QR token default, print sheets
- Empty/loading states pass, mobile cart polish
- Docs + demo runbook for multi-restaurant story
- Tests for auth isolation, order transitions, table resolve

---

## 15. Implementation Guardrails

1. **Do not** rewrite the attention pipeline or insight engine.
2. **Do not** replace the design tokens or customer menu visual identity.
3. Prefer **additive** Prisma migrations; preserve Saffron Court seed content.
4. Treat analytics “selection” and kitchen “orders” as separate concepts.
5. Enforce restaurant isolation in services, not only in UI.
6. Ship premium admin UX in the same visual language as the existing dashboard header / insight cards.

---

## 16. Audit Summary

| Area | Finding |
|------|---------|
| Architecture | Solid modular monolith; ready to extend |
| Schema | Strong menu + analytics base; needs User, Table, Order |
| Auth | Completely absent — highest priority platform gap |
| Isolation | Data model is tenant-ready; APIs are not yet gated |
| QR / tables | Not present; route `/menu/:slug` is the right base to extend |
| Orders | Not present; `DISH_SELECTED` is analytics-only |
| Frontend | Menu + analytics dashboard reusable inside new admin IA |
| Breaking risk | Medium on analytics route lockdown; low on customer menu URL if query params are additive |

---

*End of architecture audit. No features implemented in this phase. Awaiting next instruction to begin Phase 1.*
