# Finora Database Layer (Prisma)

This document describes the **PostgreSQL** schema managed by Prisma: models, fields, relationships, indexes, and how migrations and the application interact with the data layer.

---

## Overview

- **Provider:** PostgreSQL (`datasource db` in `schema.prisma`).
- **ORM:** Prisma Client is instantiated once in `src/db/prisma.ts` and imported from controllers.
- **Migrations:** SQL files under `prisma/migrations/`, configured via `prisma.config.ts` (`migrations.path`).

Enums and tables model **users**, **transactions**, and **precomputed aggregates** (`UserMonthlySummary`, `UserCategorySummary`) used when creating transactions.

---

## Enums

| Enum | Values | Usage |
|------|--------|--------|
| `USER_ROLE` | `VIEWER`, `ANALYST`, `ADMIN` | Authorization tier stored on `User.role`. |
| `TransactionType` | `INCOME`, `EXPENSE` | Direction of cash flow on `Transaction.type`. |
| `UserStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED` | Account state; OTP and login paths reject `INACTIVE` / `SUSPENDED`. |

---

## Models

### `User`

Represents an account that can own transactions and receive summaries.

| Field | Type | Constraints / default | Description |
|-------|------|------------------------|-------------|
| `id` | `String` (UUID) | Primary key | Stable user identifier; JWT `sub` claim. |
| `email` | `String` | **Unique** | Login identifier; OTP flows key off this. |
| `name` | `String?` | Optional | Display name (e.g. composed from first/last on create). |
| `role` | `USER_ROLE` | Default `VIEWER` | RBAC role. |
| `status` | `UserStatus` | Default `ACTIVE` | Blocks OTP when not `ACTIVE`. |
| `transactions` | `Transaction[]` | Relation | All transactions for this user. |
| `monthlySummaries` | `UserMonthlySummary[]` | Relation | Per-month rollups. |
| `categorySummaries` | `UserCategorySummary[]` | Relation | Per-category rollups. |
| `createdAt` | `DateTime` | Auto | Creation timestamp. |
| `updatedAt` | `DateTime` | Auto-updated | Last mutation. |
| `deletedAt` | `DateTime?` | Optional | Soft-delete marker (schema present; usage depends on app queries). |

**Why this shape:** Email uniqueness enforces one row per mailbox. Role and status separate **who they are** from **whether they may sign in**, which is common for admin-driven provisioning and suspension.

---

### `Transaction`

A single monetary movement for a user.

| Field | Type | Constraints / default | Description |
|-------|------|------------------------|-------------|
| `id` | `String` (UUID) | Primary key | |
| `amount` | `Decimal(10,2)` | Required | Magnitude; type indicates direction. |
| `currency` | `String` | Default `INR` | Stored for future multi-currency use. |
| `type` | `TransactionType` | Required | `INCOME` vs `EXPENSE`. |
| `category` | `String` | Required | Free-form category label (aggregated in stats). |
| `notes` | `String?` | Optional | User note. |
| `transactionDate` | `DateTime` | Required | Business date of the transaction. |
| `isFirstTransactionOfDay` | `Boolean` | Default `false` | Set at create time if no other non-deleted row exists that calendar day for the user (used in monthly avg. spend logic). |
| `userId` | `String` | FK → `User.id` | Owner; **onDelete: Cascade** removes transactions if user is deleted. |
| `user` | `User` | Relation | |
| `createdAt` / `updatedAt` | `DateTime` | Auto | |
| `deletedAt` | `DateTime?` | Optional | **Soft delete**; list/view endpoints filter `deletedAt: null`. |

**Indexes (see `@@index` in schema):**

| Index | Purpose |
|-------|---------|
| `userId` | Filter transactions by owner. |
| `transactionDate` | Time-range reports and sorting. |
| `[userId, transactionDate]` | Common composite: “this user’s history by date”. |
| `category` / `[userId, category]` | Category breakdowns and filters. |
| `type` / `[userId, type]` | Income vs expense filters. |

**Relationship choice:** Many `Transaction` rows to one `User` is the natural ownership model. `onDelete: Cascade` avoids orphaned rows if a user row is removed (use with care in production; prefer soft-delete on users if you must retain history).

---

### `UserMonthlySummary`

One row per **(user, calendar month)** storing denormalized totals for that month.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key. |
| `month` | `DateTime` | Month anchor (typically first day of month in app logic). |
| `totalIncome` / `totalExpense` | `Decimal(10,2)` | Running totals. |
| `netBalance` | `Decimal(10,2)` | Net for the month (maintained on create). |
| `transactionCount` | `Int` | Number of transactions counted into this row on create path. |
| `highestExpense` | `Decimal?` | Max single expense in month (when applicable). |
| `largestCategory` | `String?` | Category with largest expense sum in month. |
| `avgDailySpend` | `Decimal?` | Derived from total expense and “active expense days”. |
| `activeExpenseDays` | `Int` | Count of distinct days with at least one expense (incremented when first expense of that day is created). |
| `userId` | `String` | FK → `User` (no `onDelete` in schema—rely on app-level consistency). |

**Constraints:**

- `@@unique([userId, month])` — At most one summary row per user per month key.

**Indexes:** `@@index([userId])` for “all months for user” patterns.

**Why it exists:** Avoids scanning all transactions for heavy monthly KPIs. **Trade-off:** The application **updates this on transaction create**; **update/delete** of transactions do not currently recompute these rows, so they may drift if data is edited after creation. Dashboard code primarily aggregates `Transaction` directly; these tables support future optimizations or reporting consistency work.

---

### `UserCategorySummary`

One row per **(user, category)** with lifetime (or app-lifetime) rollups for that slice.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key. |
| `category` | `String` | Category name. |
| `totalIncome` / `totalExpense` | `Decimal(10,2)` | Totals for that user+category. |
| `transactionCount` | `Int` | Count of transactions included. |
| `highestTransaction` | `Decimal?` | Peak amount seen. |
| `averageTransaction` | `Decimal?` | Average (implementation uses expense-oriented math on create path). |
| `userId` | `String` | FK → `User`. |

**Constraints:**

- `@@unique([userId, category])` — One aggregate row per user per category label.

**Why it exists:** Same rationale as monthly summaries: faster category-level analytics. Same **consistency caveat** applies when transactions change after insert.

---

## Relationship Diagram (Conceptual)

```
User 1 ──< Transaction
  │
  ├──< UserMonthlySummary   (unique per user + month)
  └──< UserCategorySummary  (unique per user + category)
```

---

## Migrations

- **Location:** `prisma/migrations/`.
- **Lock file:** `migration_lock.toml` pins the provider (PostgreSQL).
- **Workflow:**
  - **Development:** After editing `schema.prisma`, run `npx prisma migrate dev --name <description>` to generate and apply a new migration locally.
  - **CI / production:** Run `npx prisma migrate deploy` against `DATABASE_URL`.

Historical migrations show schema evolution (e.g. removal of password fields, addition of `UserStatus`, transaction indexes). Always review generated SQL before deploying to shared environments.

---

## How Prisma Is Used in the Project

| Pattern | Where | Purpose |
|---------|--------|---------|
| Singleton client | `src/db/prisma.ts` | Single connection pool per process. |
| CRUD + filters | Transaction / user controllers | Typed queries, `findMany`, `create`, `update`. |
| Interactive transactions | `createRecord`, `getTransaction`, `dashboard`, `getUsers` | Atomic multi-step reads/writes. |
| Raw SQL | `stats/controller/dashboard.ts` | `prisma.$queryRaw` for monthly `DATE_TRUNC` aggregation. |
| `groupBy` | Dashboard, create aggregates | Server-side sums grouped by type or category. |

**Decimal values:** Prisma returns `Decimal` types for money fields; JSON responses may serialize them as strings or objects depending on client and middleware—clients should normalize to numbers if needed.

---

## Related Documentation

- [Backend overview](../README.md) — Architecture, env vars, security.
- [Transaction service](../src/service/transaction/README.md) — How creates update summaries and invalidate cache.
