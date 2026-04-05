# Stats Service

Exposes **dashboard analytics** for the authenticated user: net balances, current-month totals, category breakdown (expenses), recent transactions, and a **monthly trend** series derived from SQL. Responses are **cached in Redis** with a long TTL; **transaction** mutations invalidate cache keys for that user.

---

## Purpose

- Provide a single endpoint for charts and summary cards the Finora client can bind to.
- Apply **role-based response shaping**: `VIEWER` receives a **reduced** payload (only balance summaries); `ADMIN` and `ANALYST` receive the full structure including `success`, `message`, and `data`.
- Support optional **date range filtering** via query parameters `from` and `to` (inclusive upper bound uses `lte` on `transactionDate` in the constructed where clause).

**Interactions**

- **Prisma** — `groupBy`, `findMany`, and `$queryRaw` against `Transaction`.
- **Redis** — Read-through cache via `getCache` / `setCache` (`src/util/stats/redisConect.ts`).
- **Formatting** — `formatDashboardData` (`src/util/stats/formatStats.ts`) normalizes Prisma aggregates into plain numbers and ISO date strings.

---

## Base Path

Mounted under **`/api/stats`**.

---

## Routes

| Method | Path         | Middleware         | Description                            |
| ------ | ------------ | ------------------ | -------------------------------------- |
| `GET`  | `/dashboard` | `authenticateUser` | Dashboard aggregates for `req.user.id` |

---

## `GET /api/stats/dashboard`

**Headers:** `Authorization: Bearer <JWT>` (any authenticated role).

### Query parameters

| Name   | Type                                | Required | Description                                                    |
| ------ | ----------------------------------- | -------- | -------------------------------------------------------------- |
| `from` | string (ISO or parseable by `Date`) | No       | Lower bound on `transactionDate` (`gte`) when building filters |
| `to`   | string                              | No       | Upper bound on `transactionDate` (`lte`)                       |

If either is missing, that side of the range is omitted. Invalid strings produce `Invalid Date`; the handler may still run queries with partial filters—clients should send valid ISO strings.

### Cache key

```
dashboard:<userId>:<fromDate ?? "all">:<toDate ?? "all">
```

`fromDate` / `toDate` are the parsed `Date` objects’ string coercions in the template (see controller). TTL on set: **28 hours** (`60 * 60 * 28` seconds).

### Data loading (inside `prisma.$transaction`)

1. **Summary by type** — `groupBy` on `type`, `_sum.amount`, scoped to `userId` and optional date filter.
2. **Current calendar month** — Same grouping but `transactionDate` in `[first day of month, first day of next month)`.
3. **Category breakdown** — `groupBy` on `category` where `type === "EXPENSE"`, ordered by sum descending.
4. **Recent transactions** — Last **5** by `transactionDate` desc; selected fields: `id`, `amount`, `category`, `type`, `transactionDate`.
5. **Monthly trend** — Raw SQL:

```sql
SELECT
  DATE_TRUNC('month', "transactionDate") as month,
  SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END) as expense
FROM "Transaction"
WHERE "userId" = $1
GROUP BY month
ORDER BY month;
```

> **Note:** The `WHERE` clause only binds `userId`. Optional `from` / `to` filters are **not** applied inside this raw query—only the Prisma `groupBy` / `findMany` branches use `whereClause` with dates. Trend series is therefore **lifetime per user** in the SQL branch, while other sections respect the date range. Operators should be aware of this inconsistency when interpreting charts.

### Formatted output (full response)

After `formatDashboardData`, `data` contains:

| Field                | Meaning                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `categoryBreakdown`  | `{ category, total }[]` for expenses                                      |
| `recentTransactions` | `{ id, amount, category, type, transactionDate }[]`                       |
| `monthlyTrend`       | `{ month, income, expense, balance }[]` (`month` as `YYYY-MM-DD`)         |
| `netBalance`         | `{ income, expense, overAllBalance }` over filtered window (from groupBy) |
| `currMonthBalance`   | `{ income, expense, overAllBalance }` for current month only              |

### Response shapes

**`ADMIN` / `ANALYST` — cache miss / fresh — `200`**

```json
{
  "success": true,
  "message": "Dashboard retrieved from cache",
  "data": {
    "categoryBreakdown": [
      {
        "category": "Shopping",
        "total": 1800
      },
      {
        "category": "Groceries",
        "total": 1100
      },
      {
        "category": "Food",
        "total": 950
      }
    ],
    "recentTransactions": [
      {
        "id": "19e2fea3-6806-4fad-b97e-64963281c509",
        "amount": 50000,
        "category": "Salary",
        "type": "INCOME",
        "transactionDate": "2026-04-01T00:00:00.000Z"
      },
      {
        "id": "2021d0a8-b68e-47eb-a635-0180b8eccef7",
        "amount": 50000,
        "category": "Salary",
        "type": "INCOME",
        "transactionDate": "2026-04-01T00:00:00.000Z"
      }
    ],
    "monthlyTrend": [
      {
        "month": "2026-01-01",
        "income": 1200,
        "expense": 220,
        "balance": 980
      },
      {
        "month": "2026-02-01",
        "income": 2500,
        "expense": 1050,
        "balance": 1450
      }
    ],
    "netBalance": {
      "income": 160700,
      "expense": 5370,
      "overAllBalance": 155330
    },
    "currMonthBalance": {
      "income": 112400,
      "expense": 10650,
      "overAllBalance": 101750
    }
  }
}
```

**`ADMIN` / `ANALYST` — cache hit — `200`**

Same shape; `message` is `"Dashboard retrieved from cache"`.

**`VIEWER` — `200`**

Reduced JSON (no `success` / `message` / full `data` wrapper):

```json
{
  "netBalance": {
    "income": 160700,
    "expense": 5370,
    "overAllBalance": 155330
  },
  "currMonthBalance": {
    "income": 112400,
    "expense": 10650,
    "overAllBalance": 101750
  }
}
```

The same reduction applies when serving cached data to `VIEWER`.

### Error responses

| Status | Condition                            |
| ------ | ------------------------------------ |
| `400`  | Prisma validation                    |
| `503`  | Database initialization failure      |
| `500`  | Generic `"Failed to load dashboard"` |
| `401`  | Missing/invalid JWT (middleware)     |

---

## Cache invalidation

When transactions are **created**, **updated**, or **soft-deleted**, `deleteDashboardKeys(userId)` runs (from the transaction service). It executes `KEYS dashboard:<userId>:*` and `DEL` matching keys. This keeps dashboard numbers from going stale after writes, at the cost of `KEYS` on Redis (acceptable for small key spaces; consider `SCAN` for very large deployments).

---

## Validation rules

There is **no Zod schema** for dashboard query params; `from` and `to` are taken from `req.query` as strings and passed to `new Date()`. Prefer documenting supported formats (ISO 8601) for API clients.

---

## Example requests

**Full dashboard (analyst)**

```bash
curl -s "http://localhost:5001/api/stats/dashboard" \
  -H "Authorization: Bearer JWT"
```

**Date-filtered (client sends ISO dates)**

```bash
curl -s "http://localhost:5001/api/stats/dashboard?from=2026-01-01&to=2026-03-31" \
  -H "Authorization: Bearer JWT"
```

**Viewer (reduced body)**

```bash
curl -s "http://localhost:5001/api/stats/dashboard" \
  -H "Authorization: Bearer VIEWER_JWT"
```

---

## Related files

| Path                                     | Role                                 |
| ---------------------------------------- | ------------------------------------ |
| `index.ts`                               | Router                               |
| `controller/dashboard.ts`                | Handler, cache, Prisma, raw SQL      |
| `src/util/stats/formatStats.ts`          | Response shaping                     |
| `src/util/stats/redisConect.ts`          | JSON get/set with TTL                |
| `src/util/transaction/deleteCacheKey.ts` | Invalidation from transaction writes |
| `src/types/stats/stats.type.ts`          | Types for monthly trend rows         |

For the underlying tables and indexes, see [Prisma README](../../../prisma/README.md) and [Backend overview](../../../README.md).
