# Finora Backend

REST API for **Finora**, a personal and organizational finance application. This service handles user lifecycle (OTP-based access, roles), transaction CRUD with derived aggregates, and dashboard analytics—with **PostgreSQL** as the system of record and **Redis** for OTP storage and response caching.

---

## Purpose

The backend provides:

- **Identity and access** — Email OTP verification, JWT sessions, and role-based authorization (`VIEWER`, `ANALYST`, `ADMIN`).
- **Transactions** — Create, read, update, and soft-delete monetary records tied to users, with server-side maintenance of monthly and per-category summary rows.
- **Analytics** — Dashboard aggregates (balances, category breakdown, trends, recent activity) with Redis-backed caching and cache invalidation on transaction changes.

It is designed as a stateless HTTP API (Express) suitable for a separate web or mobile client.

---

## High-Level Architecture

```mermaid
flowchart LR
  Client[Client]
  API[Express API]
  Prisma[Prisma ORM]
  PG[(PostgreSQL)]
  Redis[(Redis)]

  Client --> API
  API --> Prisma
  Prisma --> PG
  API --> Redis
```

1. **HTTP layer** — `express` with JSON body parsing, CORS, and route modules under `src/service/*`.
2. **Auth** — JWT in the `Authorization: Bearer <token>` header (`src/middleware/JWTAuthMiddleware.ts`). Role checks via `allowRoles` (`src/middleware/allowedRolesMiddleware.ts`).
3. **Data** — `PrismaClient` singleton (`src/db/prisma.ts`) talks to PostgreSQL.
4. **Cache / OTP** — `ioredis` (`src/db/redis.config.ts`) stores hashed OTPs and serialized JSON for dashboard and user-list responses.

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js (ES modules, `"type": "module"`) |
| Language | TypeScript |
| HTTP | Express 5 |
| Validation | Zod 4 |
| ORM | Prisma 6 (`@prisma/client`) |
| Database | PostgreSQL |
| Cache / OTP store | Redis (`ioredis`) |
| Auth | `jsonwebtoken` (HS256, issuer/audience claims) |
| Email | Nodemailer (SMTP) |

Dev workflow uses `tsx` for `npm run dev`; production build uses `tsc` and `node dist/server.js`.

---

## Folder Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Data model and datasource
│   ├── migrations/            # Versioned SQL migrations
│   └── README.md              # Schema and data-layer documentation
├── src/
│   ├── app.ts                 # Express app: middleware + route mounting
│   ├── server.ts              # Entry: dotenv, listen on PORT
│   ├── config/                # e.g. mailer (SMTP)
│   ├── db/                    # prisma client, redis connection
│   ├── middleware/            # JWT auth, role guards
│   ├── service/               # Domain routers + controllers
│   │   ├── user/
│   │   ├── transaction/
│   │   └── stats/
│   ├── types/                 # Zod schemas and shared TS types
│   └── util/                  # OTP, email, cache helpers, formatters
├── package.json
├── prisma.config.ts           # Prisma CLI config (schema + migrations path)
└── tsconfig.json
```

Routers are mounted in `app.ts`:

- `/api/user` — user and auth flows
- `/api/transaction` — transaction CRUD and listing
- `/api/stats` — dashboard

---

## How the Backend Works (Conceptually)

### Request lifecycle

1. **CORS** — Allowed origin from `CORS_ORIGIN`; credentials enabled for cookie-capable clients.
2. **JSON** — `express.json()` parses bodies; controllers validate with **Zod** `safeParse` and return `400` with optional `details` (issue arrays) on failure.
3. **Authentication** — Protected routes use `authenticateUser`, which verifies a JWT and attaches `req.user = { id, role }`.
4. **Authorization** — `allowRoles([...])` ensures `req.user.role` is in the allowed set; otherwise `403` with `{ success: false, message: "Forbidden" }`.
5. **Persistence** — Controllers use Prisma; heavy or multi-step writes use `prisma.$transaction` for atomicity.
6. **Caching** — Read paths may read/write Redis via `getCache` / `setCache`. Transaction mutations call `deleteDashboardKeys(userId)` to invalidate `dashboard:<userId>:*` keys.

### Transaction aggregates

On **create**, the service updates `UserMonthlySummary` (per calendar month) and `UserCategorySummary` (per user + category) inside the same database transaction as the insert. This denormalizes totals for faster reads at the cost of write-time work and the need to keep updates consistent (see **Prisma README** for model details).

> **Note:** Updates and deletes to transactions **do not** currently recompute `UserMonthlySummary` / `UserCategorySummary`; those tables reflect create-time logic. Dashboard and list endpoints read live `Transaction` rows for most aggregates.

### OTP sign-in

1. Client posts email → server generates a 6-digit OTP, hashes it with SHA-256, stores the hash in Redis under `otp:<normalizedEmail>` with a **5-minute TTL**, and emails the plaintext OTP.
2. Client posts email + OTP → server compares hashes, deletes the key on success, and optionally issues a JWT (login path).

---

## Setup

### Prerequisites

- Node.js compatible with the repo’s TypeScript / Prisma versions
- PostgreSQL instance
- Redis instance
- SMTP credentials (for OTP and welcome emails)

### Installation

```bash
cd backend
npm install
```

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
# or during development:
npx prisma migrate dev
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma |
| `JWT_SECRET` | Yes (protected routes) | Secret for signing/verifying JWTs |
| `REDIS_HOST` | No | Defaults to `127.0.0.1` |
| `REDIS_PORT` | No | Defaults to `6379` |
| `PORT` | No | HTTP port; defaults to `5001` |
| `CORS_ORIGIN` | Recommended | Allowed browser origin for CORS |
| `NODE_ENV` | Recommended | `production` affects cookie `secure` flag |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP port (e.g. 587) |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASS` | For email | SMTP password |

Create a `.env` file in `backend/` (do not commit secrets). Example shape:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/finora"
JWT_SECRET="your-long-random-secret"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
PORT=5001
CORS_ORIGIN=http://localhost:3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Run the server

**Development** (watch mode):

```bash
npm run dev
```

**Production** (compile then run):

```bash
npm run build
npm start
```

Health check: `GET /` returns a short plain-text message that the API is running.

---

## Database and Caching

### PostgreSQL

- Single Prisma schema in `prisma/schema.prisma`.
- Migrations live in `prisma/migrations/`; use Prisma CLI for drift-free evolution.
- Soft deletes: `User` and `Transaction` use optional `deletedAt` where applicable in queries.

### Redis

| Use case | Key pattern | TTL / behavior |
|----------|-------------|----------------|
| OTP | `otp:<url-encoded-email>` | 300 seconds |
| User list pages | `users:page:<n>` | 90 seconds |
| Dashboard | `dashboard:<userId>:<from>:<to>` | 28 hours (`60 * 60 * 28` seconds) |

Dashboard keys for a user are deleted when that user’s transactions are created, updated, or soft-deleted (`deleteDashboardKeys`).

---

## Design Decisions and Patterns

| Decision | Rationale |
|----------|-----------|
| **Zod at the edge** | Request bodies and query strings are validated explicitly; failures return structured `400` responses. |
| **JWT with `sub` + `role`** | Stateless auth; role embedded for fast authorization without a DB hit per request. |
| **Prisma `$transaction`** | Creates and aggregate updates succeed or fail together. |
| **Denormalized summaries** | Speeds up reporting patterns that would otherwise scan all transactions; traded off against update/delete consistency (see note above). |
| **Redis cache** | Reduces repeated heavy aggregations and repeated user list queries; invalidated for dashboard on transaction changes. |
| **Soft delete for transactions** | Preserves history and avoids breaking foreign-key narratives; `deletedAt` filtered in most reads. |
| **Raw SQL for monthly trend** | `DATE_TRUNC` monthly grouping in `stats` controller for efficient trend series. |

---

## Security Considerations

- **JWT** — HS256; `issuer: "finora-backend"`, `audience: "finora-users"`. Missing `JWT_SECRET` yields `500` on auth middleware.
- **OTP** — Only the **hash** is stored in Redis; comparison is constant-time friendly at the application level (string equality of hashes). TTL limits exposure.
- **Transport** — Use HTTPS in production; set `secure` cookies when `NODE_ENV === "production"`.
- **CORS** — Restrict `CORS_ORIGIN` to known front-end origins.
- **Role separation** — Sensitive transaction mutations are restricted to `ADMIN` at the route level; some handlers duplicate role checks defensively.
- **Operational hygiene** — The OTP sign-in handler currently returns the generated OTP in the JSON response for development convenience; **remove or gate that in production** to avoid leaking credentials.

**Client auth:** Protected routes expect `Authorization: Bearer <token>`. Some handlers also set an `httpOnly` cookie named `token`; the JWT middleware **does not** read cookies—clients should send the Bearer token unless you extend the middleware.

**Known gap:** `GET /api/user/users` applies `allowRoles` without `authenticateUser` in the router, so `req.user` is never set by JWT middleware on that path. In practice the role guard blocks the request. Operators should add `authenticateUser` before `allowRoles` for that route so the endpoint works as intended.

---

## API Overview

Base URL: `/api` (see service READMEs for full contracts).

| Prefix | Service | Summary |
|--------|---------|---------|
| `/api/user` | User | OTP request/verify, user creation, user listing, role change |
| `/api/transaction` | Transaction | Create (admin), view/update/delete (scoped), paginated list |
| `/api/stats` | Stats | Dashboard aggregates (role-aware response shape) |

Detailed request/response shapes, validation, and errors:

- [User service](src/service/user/README.md)
- [Transaction service](src/service/transaction/README.md)
- [Stats service](src/service/stats/README.md)

Data model and migrations:

- [Prisma / database](prisma/README.md)

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | `tsc` compile to `dist/` |
| `npm start` | `node dist/server.js` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
