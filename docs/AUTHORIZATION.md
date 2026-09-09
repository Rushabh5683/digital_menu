# Authorization architecture (multi-tenant)

This document describes how Digital Menu enforces tenant isolation across **SUPER_ADMIN**, **RESTAURANT_ADMIN**, and anonymous **customers**.

## Roles

| Role | Scope | How restaurant is chosen |
|------|--------|---------------------------|
| `SUPER_ADMIN` | Entire platform | Explicit `restaurantId` / slug on the request when a restaurant context is needed |
| `RESTAURANT_ADMIN` | One restaurant | **Always** from `user.restaurantId` in the database (loaded on every authenticated request). Client `restaurantId` is never trusted. |
| Customer (anonymous) | Public menu + own session/table orders | Restaurant from **slug**; table and order from session binding + ownership checks |

There is no authenticated “customer” role. Guests use anonymous sessions (`anonymousSessionId`) scoped to a restaurant.

## Trust boundaries

1. **Session identity** comes from the HTTP-only JWT cookie (`dm_session`). Role and `restaurantId` on `req.auth` are reloaded from the database on each request (`requireAuth`), not taken from stale JWT claims alone for authorization decisions.
2. **Restaurant admin scope** is set only by:
   - `requireBoundRestaurantAdmin` → `req.restaurantId = req.auth.restaurantId`
   - or `requireRestaurantAccess` → `req.restaurantAccess.restaurantId` from the bound restaurant
3. **Never trust** client-supplied `restaurantId`, `tableId`, `orderId`, `dishId`, or `categoryId` as proof of ownership. Those IDs are looked up **and** filtered by the server-side restaurant (or session/table) scope.
4. If a restaurant admin **also** sends a `restaurantId` / slug that does not match their bound restaurant, the API responds **`403`** (IDOR attempt), rather than silently substituting their own tenant.

## Middleware map

| Middleware | Purpose |
|------------|---------|
| `requireAuth` | Valid cookie/Bearer → `req.auth` |
| `requireRole(...)` | Role gate |
| `requireBoundRestaurantAdmin` | Restaurant admin only; sets `req.restaurantId` from auth |
| `requireRestaurantAccess` | Super: resolve target restaurant from params/query/body. Admin: bound restaurant only; mismatch → 403 |

## API surfaces

### `/api/admin/*` (restaurant admin)

- Guarded by `requireAuth` + `requireBoundRestaurantAdmin`.
- All handlers receive `req.restaurantId` from auth.
- Menu / category / dish / table / QR / order / dashboard services use `*Owned` helpers (`where: { id, restaurantId }`). Foreign IDs → **404** (not found in tenant), not a cross-tenant leak.

### `/api/analytics/*` and `/api/insights/*`

- `requireAuth` + `requireRestaurantAccess`.
- Reports always use `req.restaurantAccess.restaurantId`.
- Restaurant admin calling `/api/analytics/overview/{otherRestaurantId}` → **403**.

### `/api/orders` (staff)

- `GET/PATCH /api/orders/:orderId` scopes restaurant admins with `{ restaurantId: req.auth.restaurantId }`.
- `GET /api/restaurants/:restaurantId/orders` uses `requireRestaurantAccess` (admin mismatch → 403).

### `/api/superadmin/*` (and `/api/super/*`)

- `requireAuth` + `requireRole(SUPER_ADMIN)` only.
- Restaurant admins receive **403** on all platform routes.
- Super admins may read/update any restaurant, manage restaurant admin accounts, and query any restaurant’s analytics/orders with an explicit id.

### Public / customer

| Endpoint | Guard |
|----------|--------|
| `GET /api/restaurants/:slug` | ACTIVE restaurants only; **no** email/phone/address in public serializer |
| `GET /api/restaurants/:slug/menu` | ACTIVE + published menu; disabled categories / unavailable dishes filtered |
| `GET /api/restaurants/:slug/tables` | ACTIVE; active tables only |
| `POST /api/sessions/start` | Slug → ACTIVE restaurant; table must belong to that restaurant; **cannot rebind** an already table-bound session to another table |
| `POST /api/orders` | Slug + session + table ownership; prices from DB; one open order per table |
| `POST /api/orders/:id/items` | Session **required**; session may only act on its bound table (or bind once if unbound) |
| `GET /api/orders/open` | Session **required**; same table rules |
| `GET /api/orders/:id/track` | Order must match session, or same table already bound on the session — **not** an arbitrary `tableNumber` query |

## IDOR scenarios (expected results)

Restaurant **A** admin attempting to:

| Action | Expected |
|--------|----------|
| Read / mutate Restaurant B profile via admin APIs | Own restaurant only; B unchanged |
| Modify B dish / category / menu | **404** |
| Delete B table / generate B QR | **404** |
| Read B order by id or list via B’s `restaurantId` | **404** / **403** |
| Read B analytics or insights | **403** |
| Call `/api/superadmin/*` | **403** |

Super admin performing the same against B: **allowed**.

Customer with session unbound or bound to another table: cannot track or mutate B’s foreign ticket via spoofed ids → **404** / **403**.

## Implementation checklist for new APIs

1. Pick the correct middleware (`requireBoundRestaurantAdmin` vs `requireRestaurantAccess` vs public slug resolution).
2. Pass **server** `restaurantId` into services; never `req.body.restaurantId` for admins.
3. Load mutable resources with composite filters (`id` + `restaurantId` or `menu.restaurantId`).
4. For customer writes, require `anonymousSessionId` and enforce table binding.
5. Add an isolation test that creates two restaurants and asserts foreign ids fail.
