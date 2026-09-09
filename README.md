# Digital Menu + Customer Attention Intelligence

Polished DEMO/MVP foundation for a digital restaurant menu with customer attention tracking and a restaurant insights dashboard.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for product and technical design.
See [NEW_ARCHITECTURE.md](./NEW_ARCHITECTURE.md) for the multi-restaurant platform plan.
See [DETAILED_PROJECT_GUIDE.md](./DETAILED_PROJECT_GUIDE.md) for a full explanation of everything built and the end-to-end flow.
See [docs/AUTH.md](./docs/AUTH.md) for staff authentication and local demo credentials.
See [docs/SESSION.md](./docs/SESSION.md) for anonymous customer session behavior.
See [docs/ATTENTION_TRACKING.md](./docs/ATTENTION_TRACKING.md) for attention & consideration tracking.
See [docs/ANALYTICS_CALCULATIONS.md](./docs/ANALYTICS_CALCULATIONS.md) for metrics and report APIs.
See [docs/INSIGHTS.md](./docs/INSIGHTS.md) for the deterministic insight engine.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, JavaScript, Tailwind CSS, React Router, TanStack Query, Recharts, Lucide React |
| Backend | Node.js, Express, JavaScript |
| ORM | Prisma |
| Database | PostgreSQL |

## Repository layout

```
apps/
  web/          # Vite + React SPA
  api/          # Express + Prisma API
ARCHITECTURE.md
README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL running locally

## Setup

### 1. Clone / open the project

```bash
cd "Digital Menu"
```

### 2. Environment variables

```bash
cp .env.example apps/api/.env
```

On Windows (PowerShell):

```powershell
Copy-Item .env.example apps\api\.env
```

Edit `apps/api/.env` and set `DATABASE_URL` to your PostgreSQL connection string:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/digital_menu?schema=public"
```

Create the database if needed:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE digital_menu;"
```

Frontend env (optional): `apps/web/.env` — leave `VITE_API_BASE_URL` empty to use the Vite proxy to `http://localhost:4000`.

### 3. Install dependencies

From the repo root (npm workspaces):

```bash
npm install
```

### 4. Prisma migrate + seed

```bash
npm run db:migrate
npm run db:seed
```

This applies migrations and seeds **Saffron Court** (`saffron-court`) with a published dinner menu: Starters, Main Course, Biryani, Desserts, and Beverages (35 dishes).

Or from the API package:

```bash
cd apps/api
npx prisma migrate deploy
npm run db:seed
```

### 5. Run locally

Terminal 1 — API:

```bash
npm run dev:api
```

Terminal 2 — Web:

```bash
npm run dev:web
```

- Web: http://localhost:5173  
- API health: http://localhost:4000/api/health  

Or run both with:

```bash
npm run dev
```

## Useful scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API + web (via concurrently) |
| `npm run dev:web` | Vite dev server |
| `npm run dev:api` | Express with `--watch` |
| `npm run build` | Production build of the web app |
| `npm run start:api` | Start API without watch |
| `npm run db:generate` | `prisma generate` |
| `npm run db:push` | Push schema to PostgreSQL (demo-friendly) |
| `npm run db:migrate` | Create/apply Prisma migrations |
| `npm run db:seed` | Seed Saffron Court demo restaurant |
| `npm run db:reset` | Reset DB, re-apply migrations, seed (local only) |
| `npm run db:studio` | Open Prisma Studio |

## Health check

`GET /api/health` returns JSON when Express and PostgreSQL are reachable:

```json
{
  "status": "ok",
  "service": "digital-menu-api",
  "database": "connected",
  "timestamp": "..."
}
```

The web app also exposes this at `/health` via the shared API client.

## Current scope

This foundation includes:

- Frontend + backend scaffolding
- Prisma + PostgreSQL connection
- Staff authentication (SUPER_ADMIN / RESTAURANT_ADMIN) with HTTP-only cookies
- Protected restaurant analytics dashboard and super-admin console
- Anonymous customer digital menu + attention tracking
- Analytics calculations + deterministic insights
- CORS for local Vite
- Centralized API error handling
- Frontend API client

**Not implemented yet:** table QR codes, cart/orders, menu CRUD admin, restaurant onboarding wizard.
