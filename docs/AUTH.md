# Authentication (local development)

Staff authentication for the Digital Menu platform. **Customers remain anonymous** and never use these accounts.

## How it works

- `POST /api/auth/login` verifies email/password and sets an **HTTP-only** cookie (`dm_session`) containing a signed JWT.
- Tokens are **not** stored in `localStorage`.
- `GET /api/auth/me` returns the current user when the cookie is valid.
- `POST /api/auth/logout` clears the cookie.
- Middleware: `requireAuth`, `requireRole`, `requireRestaurantAccess`.
- Restaurant admins can only access their own restaurant’s analytics and admin surfaces.
- Super admins can list restaurants via `/api/super/restaurants` and may access any restaurant’s analytics APIs.

For the full multi-tenant authorization model (IDOR rules, customer session scope, trust boundaries), see [AUTHORIZATION.md](./AUTHORIZATION.md).

## Demo credentials (local only)

Seeded by `npm run db:seed`. Do **not** use these outside local development.

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | `super@digitalmenu.local` | `SuperAdmin!23` |
| RESTAURANT_ADMIN (Saffron Court) | `admin@saffroncourt.local` | `RestaurantAdmin!23` |

## Super Admin APIs

All require an authenticated `SUPER_ADMIN` session cookie.

| Method | Path |
|--------|------|
| GET | `/api/superadmin/dashboard` |
| GET | `/api/superadmin/restaurants` |
| POST | `/api/superadmin/restaurants` |
| GET | `/api/superadmin/restaurants/:id` |
| PATCH | `/api/superadmin/restaurants/:id` |
| PATCH | `/api/superadmin/restaurants/:id/status` |
| DELETE | `/api/superadmin/restaurants/:id` |

Creating a restaurant also creates a restaurant admin user and an unpublished initial menu.

## Local URLs

| Surface | URL |
|---------|-----|
| Login | http://localhost:5173/login |
| Super Admin | http://localhost:5173/superadmin |
| Restaurant Admin | http://localhost:5173/admin |
| Customer menu (no login) | http://localhost:5173/menu/saffron-court |

## Restaurant Admin APIs

All require an authenticated `RESTAURANT_ADMIN` session. `restaurantId` is taken from the auth token only.

| Method | Path |
|--------|------|
| GET | `/api/admin/restaurant` |
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/orders` |

## Environment

See root `.env.example`:

- `JWT_SECRET` — signing secret (change outside local demos)
- `JWT_EXPIRES_IN` — default `8h`
- `AUTH_COOKIE_NAME` — default `dm_session`
- `COOKIE_SECURE` — `false` for local HTTP; `true` behind HTTPS

## Quick test checklist

1. Login as super admin → redirected to `/superadmin`
2. Login as restaurant admin → redirected to `/admin/saffron-court`
3. Open `/admin/saffron-court` while logged out → redirect to `/login`
4. Restaurant admin cannot read another restaurant’s analytics (`403`)
5. Logout clears session; `/api/auth/me` returns `401`
6. Invalid / expired JWT → `401`
7. Customer menu still works without signing in
