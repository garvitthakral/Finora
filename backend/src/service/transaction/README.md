# Transaction Service

Manages **financial transactions** for users: create (admin, with explicit `userId`), read by id, update, soft-delete, and **paginated listing** scoped to the **authenticated user**. Creating a transaction **atomically** maintains `UserMonthlySummary` and `UserCategorySummary` rows and **invalidates** the affected user’s dashboard cache in Redis.

---

## Purpose

- Record **income** and **expense** entries with amount, category, optional notes, and business date.
- Enforce **role-based** access: only `ADMIN` may create/update/delete via route middleware; `ANALYST` may read/list; `VIEWER` is blocked on most transaction endpoints (see per-route exceptions below).
- Tie listing and single-record reads to the **JWT user id** (`req.user.id`), not to arbitrary `userId` query parameters—so analysts and admins see **their own** ledger when browsing, while **create** allows an admin to specify **which user** the row belongs to.

**Cross-service interaction**

- **Stats service:** Dashboard cache keys `dashboard:<userId>:*` are deleted via `deleteDashboardKeys` from `src/util/transaction/deleteCacheKey.ts` after create/update/soft-delete.
- **Database:** Prisma models `Transaction`, `UserMonthlySummary`, `UserCategorySummary`, `User` (see `prisma/README.md`).

---

## Base Path

Routes are mounted under **`/api/transaction`**.

---

## Routes

| Method   | Path                 | Middleware                                             | Description                                              |
| -------- | -------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `POST`   | `/create-record`     | `authenticateUser`, `allowRoles(["ADMIN"])`            | Create transaction for `body.userId`; update aggregates. |
| `GET`    | `/view-records/:id`  | `authenticateUser`, `allowRoles(["ADMIN", "ANALYST"])` | Get one transaction by id **for current user only**.     |
| `PATCH`  | `/update-record/:id` | `authenticateUser`, `allowRoles(["ADMIN"])`            | Partial update; invalidates dashboard cache.             |
| `DELETE` | `/delete-record/:id` | `authenticateUser`, `allowRoles(["ADMIN"])`            | Soft-delete (`deletedAt`); invalidates dashboard cache.  |
| `GET`    | `/get-transactions`  | `authenticateUser`, `allowRoles(["ADMIN", "ANALYST"])` | Paginated, filterable list for **current user**.         |

### Authorization nuance

Handlers **re-check** roles in several places. For example, `view-records` allows `ANALYST` at the router level but the controller returns **403** for `VIEWER` only—so `ANALYST` and `ADMIN` pass. `create-record` middleware already restricts to `ADMIN`; the inner check for `VIEWER`/`ANALYST` is redundant but defensive.

### Admin vs owner semantics

- **Create:** `userId` in the **body** is the transaction owner (admin acts on behalf of that user).
- **View / update / delete / list:** Resources are constrained by **`req.user.id`**. An admin creating a transaction for user B will **not** see it under their own id in `view-records` or `get-transactions` unless their JWT `sub` is also B.

Document this clearly to API consumers when designing admin UIs (e.g. impersonation or separate admin endpoints may be needed).

---

## `POST /api/transaction/create-record`

**Headers:** `Authorization: Bearer <JWT>` (`ADMIN`).

**Request body (JSON)** — `CreateTransactionReqSchema` (`src/types/transaction/createTransactionReq.type.ts`)

| Field      | Type   | Rules                                               |
| ---------- | ------ | --------------------------------------------------- |
| `userId`   | string | Target owner (UUID)                                 |
| `amount`   | number | Must be **positive**                                |
| `type`     | string | `"INCOME"` or `"EXPENSE"`                           |
| `category` | string | Min length 1                                        |
| `notes`    | string | Optional                                            |
| `date`     | string | Parsed with `new Date(date)`; invalid dates → `400` |

**Additional business rules**

- If `type === "EXPENSE"`, `amount` must be **positive** (already enforced by schema; handler also rejects non-positive expense explicitly).
- **First transaction of day:** If no existing transaction for that `userId` on the same local calendar day, `isFirstTransactionOfDay` is set `true`; used when incrementing `activeExpenseDays` for monthly summary.

**Transactional work (single DB transaction)**

1. Insert `Transaction`.
2. **Upsert** `UserMonthlySummary` for month of `transactionDate`: income/expense totals, `netBalance`, counts, `highestExpense`, `largestCategory` (from groupBy), `avgDailySpend`, `activeExpenseDays`.
3. **Upsert** `UserCategorySummary` for `userId` + `category`: totals, counts, `highestTransaction`, `averageTransaction`.

**After commit:** `deleteDashboardKeys(userId)` removes Redis keys matching `dashboard:<userId>:*`.

**Success — `201`**

```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction": {
      "id": "d61c6d7e-96cb-479c-94d8-74acc6b3b139",
      "amount": "1300",
      "currency": "INR",
      "type": "INCOME",
      "category": "Gift",
      "notes": "Festival gift money",
      "transactionDate": "2026-01-25T00:00:00.000Z",
      "isFirstTransactionOfDay": true,
      "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
      "createdAt": "2026-04-04T15:01:15.609Z",
      "updatedAt": "2026-04-04T15:01:15.609Z",
      "deletedAt": null
    },
    "monthlySummary": {
      "id": "8283e3b9-9d98-4f5e-9154-dc3727b9dce3",
      "month": "2025-12-31T18:30:00.000Z",
      "totalIncome": "2500",
      "totalExpense": "220",
      "netBalance": "2280",
      "transactionCount": 3,
      "highestExpense": "220",
      "largestCategory": "Snacks",
      "avgDailySpend": "220",
      "activeExpenseDays": 1,
      "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9"
    },
    "categorySummary": {
      "id": "425f0b50-7546-41c9-92fd-febf3ad00a69",
      "category": "Gift",
      "totalIncome": "3500",
      "totalExpense": "0",
      "transactionCount": 3,
      "highestTransaction": "1300",
      "averageTransaction": "0",
      "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9"
    }
  }
}
```

**Error responses**

| Status        | Condition                                                                  |
| ------------- | -------------------------------------------------------------------------- |
| `400`         | Zod failure (`details`: issue array), invalid date, invalid expense amount |
| `403`         | Role not allowed (defensive)                                               |
| `400` / `503` | Prisma validation / DB init                                                |
| `500`         | Generic failure                                                            |

---

## `GET /api/transaction/view-records/:id`

**Roles:** `ADMIN`, `ANALYST` (not `VIEWER`).

**Path:** `id` — transaction UUID.

**Scope:** `where: { id, userId: req.user.id, deletedAt: null }`.

**Success — `200`**

```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": "01260dd3-0889-48b7-8067-8b518aadcd48",
    "amount": "800",
    "currency": "INR",
    "type": "EXPENSE",
    "category": "Shopping",
    "notes": "Clothes purchase",
    "transactionDate": "2026-04-04T00:00:00.000Z",
    "isFirstTransactionOfDay": false,
    "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
    "createdAt": "2026-04-03T05:17:36.017Z",
    "updatedAt": "2026-04-03T05:17:36.017Z",
    "deletedAt": null
  }
}
```

**Error responses**

| Status                | Condition                 |
| --------------------- | ------------------------- |
| `400`                 | Missing `id`              |
| `401`                 | No `req.user`             |
| `403`                 | `VIEWER`                  |
| `404`                 | Not found or soft-deleted |
| `400` / `503` / `500` | Prisma / server           |

---

## `PATCH /api/transaction/update-record/:id`

**Roles:** `ADMIN` only.

**Path:** `id` — transaction UUID.

**Body** — `UpdateTransactionReqSchema`: all fields optional; at least one must be present.

| Field      | Type   | Rules                                |
| ---------- | ------ | ------------------------------------ |
| `amount`   | number | Positive if present                  |
| `type`     | string | `"INCOME"` \| `"EXPENSE"`            |
| `category` | string | Min 1 if present                     |
| `date`     | string | If present, must parse to valid date |

**Scope:** Existing row must match `id`, `userId: req.user.id`, `deletedAt: null`.

**Note:** Summary tables (`UserMonthlySummary` / `UserCategorySummary`) are **not** recalculated on update; only the `Transaction` row changes. Dashboard cache for the user is still invalidated.

**Success — `200`**

```json
{
  "success": true,
  "message": "Transaction updated successfully",
  "data": {
    "id": "01260dd3-0889-48b7-8067-8b518aadcd48",
    "amount": "400",
    "currency": "INR",
    "type": "EXPENSE",
    "category": "Shopping",
    "notes": "Clothes purchase",
    "transactionDate": "2026-04-04T00:00:00.000Z",
    "isFirstTransactionOfDay": false,
    "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
    "createdAt": "2026-04-03T05:17:36.017Z",
    "updatedAt": "2026-04-05T22:21:08.825Z",
    "deletedAt": null
  }
}
```

**Error responses**

| Status                | Condition                             |
| --------------------- | ------------------------------------- |
| `400`                 | No fields, invalid data, invalid date |
| `401` / `403`         | Auth / role                           |
| `404`                 | Not found                             |
| `400` / `503` / `500` | Prisma / server                       |

---

## `DELETE /api/transaction/delete-record/:id`

**Roles:** `ADMIN`.

**Soft delete:** Sets `deletedAt` to current timestamp.

**Scope:** Row must match `id` and `userId: req.user.id` (deleted rows can still be found for idempotency check).

**Success — `200`**

```json
{
  "success": true,
  "message": "Transaction deleted successfully",
  "data": {
    "id": "01260dd3-0889-48b7-8067-8b518aadcd48",
    "amount": "400",
    "currency": "INR",
    "type": "EXPENSE",
    "category": "Shopping",
    "notes": "Clothes purchase",
    "transactionDate": "2026-04-04T00:00:00.000Z",
    "isFirstTransactionOfDay": false,
    "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
    "createdAt": "2026-04-03T05:17:36.017Z",
    "updatedAt": "2026-04-05T22:22:17.401Z",
    "deletedAt": "2026-04-05T22:22:17.399Z"
  }
}
```

**Error responses**

| Status                | Condition       |
| --------------------- | --------------- |
| `409`                 | Already deleted |
| `404`                 | Not found       |
| `401` / `403`         | Auth / role     |
| `400` / `503` / `500` | Prisma / server |

---

## `GET /api/transaction/get-transactions`

**Roles:** `ADMIN`, `ANALYST` (`VIEWER` → `403`).

**Scope:** Always `userId: req.user.id` and `deletedAt: null`.

**Query parameters** — `transactionQuerySchema` (`src/types/transaction/getTransactionQuery.type.ts`)

| Parameter   | Type             | Default           | Description                             |
| ----------- | ---------------- | ----------------- | --------------------------------------- |
| `page`      | string (coerced) | `"1"`             | Page number, ≥ 1                        |
| `limit`     | string (coerced) | `"10"`            | Page size, 1–100                        |
| `type`      | enum             | —                 | `INCOME` or `EXPENSE`                   |
| `category`  | string           | —                 | Exact match                             |
| `minAmount` | string           | —                 | `amount >=` (non-negative)              |
| `maxAmount` | string           | —                 | `amount <=` (non-negative)              |
| `startDate` | string           | —                 | `transactionDate >=` (parseable date)   |
| `endDate`   | string           | —                 | `transactionDate <=` (parseable date)   |
| `sortBy`    | enum             | `transactionDate` | `amount`, `transactionDate`, `category` |
| `order`     | enum             | `desc`            | `asc` or `desc`                         |

**Validation extras**

- `minAmount` must not exceed `maxAmount` when both set.
- `startDate` must be ≤ `endDate` when both set.

**Success — `200`**

```json
{
  "success": true,
  "message": "Transactions fetched successfully",
  "data": {
    "transactions": [
      {
        "id": "f8df2272-317b-400f-a2a4-f5d714f514e7",
        "amount": "200",
        "currency": "INR",
        "type": "EXPENSE",
        "category": "Snacks",
        "notes": "Evening snacks",
        "transactionDate": "2026-04-09T00:00:00.000Z",
        "isFirstTransactionOfDay": true,
        "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
        "createdAt": "2026-04-03T09:44:32.879Z",
        "updatedAt": "2026-04-03T09:44:32.879Z",
        "deletedAt": null
      },
      {
        "id": "724c9e89-653c-4fd0-991a-5ccb72c31eea",
        "amount": "600",
        "currency": "INR",
        "type": "EXPENSE",
        "category": "Food",
        "notes": "Dinner with friends",
        "transactionDate": "2026-04-08T00:00:00.000Z",
        "isFirstTransactionOfDay": true,
        "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
        "createdAt": "2026-04-03T09:44:24.608Z",
        "updatedAt": "2026-04-03T09:44:24.608Z",
        "deletedAt": null
      },
      {
        "id": "2df67b06-a99a-4a74-8b3c-d4c57c01590b",
        "amount": "450",
        "currency": "INR",
        "type": "EXPENSE",
        "category": "Entertainment",
        "notes": "Movie tickets",
        "transactionDate": "2026-04-07T00:00:00.000Z",
        "isFirstTransactionOfDay": true,
        "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
        "createdAt": "2026-04-03T09:44:12.756Z",
        "updatedAt": "2026-04-03T09:44:12.756Z",
        "deletedAt": null
      },
      {
        "id": "ba355075-3686-4996-95ca-c626f2911a00",
        "amount": "1000",
        "currency": "INR",
        "type": "EXPENSE",
        "category": "Utilities",
        "notes": "Electricity bill",
        "transactionDate": "2026-04-06T00:00:00.000Z",
        "isFirstTransactionOfDay": false,
        "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
        "createdAt": "2026-04-03T05:18:10.401Z",
        "updatedAt": "2026-04-03T05:18:10.401Z",
        "deletedAt": null
      },
      {
        "id": "44891248-9aa8-4375-b942-512b163f734b",
        "amount": "150",
        "currency": "INR",
        "type": "EXPENSE",
        "category": "Coffee",
        "notes": "Cafe visit",
        "transactionDate": "2026-04-05T00:00:00.000Z",
        "isFirstTransactionOfDay": false,
        "userId": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
        "createdAt": "2026-04-03T05:17:58.437Z",
        "updatedAt": "2026-04-03T05:17:58.437Z",
        "deletedAt": null
      }
    ],
    "total": 22,
    "page": 1,
    "totalPages": 3
  }
}
```

**Error responses**

| Status                | Condition                                      |
| --------------------- | ---------------------------------------------- |
| `400`                 | Invalid query, Zod `details`, range/date logic |
| `403`                 | `VIEWER`                                       |
| `400` / `503` / `500` | Prisma / server                                |

---

## Example Requests

**Create (admin)**

```bash
curl -s -X POST http://localhost:5001/api/transaction/create-record \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT" \
  -d '{
    "userId":"b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "amount": 49.99,
    "type": "EXPENSE",
    "category": "Groceries",
    "notes": "Weekly shop",
    "date": "2026-04-06T12:00:00.000Z"
  }'
```

**List (analyst/admin — own rows)**

```bash
curl -s "http://localhost:5001/api/transaction/get-transactions?page=1&limit=10&type=EXPENSE" \
  -H "Authorization: Bearer JWT"
```

**Soft-delete**

```bash
curl -s -X DELETE http://localhost:5001/api/transaction/delete-record/TX_UUID \
  -H "Authorization: Bearer ADMIN_JWT"
```

---

## Related Files

| Path                                     | Role                                     |
| ---------------------------------------- | ---------------------------------------- |
| `index.ts`                               | Route definitions                        |
| `controller/createRecord.ts`             | Create + aggregates + cache invalidation |
| `controller/viewRecord.ts`               | Single read                              |
| `controller/updateRecord.ts`             | Partial update                           |
| `controller/deleteRecord.ts`             | Soft delete                              |
| `controller/getTransaction.ts`           | Filtered pagination                      |
| `src/types/transaction/*.ts`             | Zod schemas                              |
| `src/util/transaction/deleteCacheKey.ts` | Redis dashboard key deletion             |
