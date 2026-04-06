# User Service

Handles **email OTP** flows, **user creation**, **paginated user listing** (with Redis cache), and **role changes** for administrators. It is the identity and access edge of the Finora backend.

---

## Purpose

- Send a one-time password to a known email and store a **hashed** OTP in Redis.
- Verify the OTP and optionally complete login (JWT + optional `httpOnly` cookie).
- Create new users with name and role (welcome email).
- List users with pagination (cached briefly in Redis).
- Allow `ADMIN` to change another user’s role (JWT required).

**Interactions:**

- **PostgreSQL** (`User`) via Prisma.
- **Redis** for OTP keys (`util/otp/setOtpKey.ts`) and user-list cache (`util/stats/redisConect.ts`).
- **SMTP** via Nodemailer (`config/mailer.ts`, `util/otp/sendEmail.ts`, `util/otp/sendWelcomeEmail.ts`).
- **JWT** issued on successful verify (login) and on user create (`jsonwebtoken`).

---

## Base Path

All routes are mounted under **`/api/user`** (see `src/app.ts`).

---

## Routes

| Method   | Path               | Middleware                                             | Description                                          |
| -------- | ------------------ | ------------------------------------------------------ | ---------------------------------------------------- |
| `POST`   | `/signup`          | —                                                      | Request OTP for an email.                            |
| `POST`   | `/verify-otp`      | —                                                      | Verify OTP; optional login.                          |
| `POST`   | `/create-user`     | —                                                      | Create a new user; issue JWT cookie.                 |
| `GET`    | `/get-users`       | `authenticateUser`, `allowRoles(["ADMIN", "ANALYST"])` | Paginated user list (see implementation note below). |
| `PATCH`  | `/change-role/:id` | `authenticateUser`, `allowRoles(["ADMIN"])`            | Update target user’s role by `:id`.                  |
| `DELETE` | `/delete-user/:id` | `authenticateUser`, `allowRoles(["ADMIN"])`            | Soft-delete a user by `:id`.                         |

### Implementation note: `GET /get-users`

`GET /get-users` must run `authenticateUser` before `allowRoles`. The role middleware reads `req.user?.role`, which is only populated by `authenticateUser`. Without that middleware, `req.user` is undefined and role checks can incorrectly return **403 Forbidden**.

**Intended usage:** The router correctly chains `authenticateUser` before `allowRoles` for `GET /get-users`, so JWT-backed roles are available.

---

## Route Reference

### `POST /api/user/signup`

Initiates OTP delivery for the given email.

**Request body (JSON)**

| Field   | Type   | Validation                                        |
| ------- | ------ | ------------------------------------------------- |
| `email` | string | Zod `z.string()` (no format constraint in schema) |

**Behavior**

1. Rejects users with `status` `INACTIVE` or `SUSPENDED`.
2. Generates a 6-digit OTP, hashes with **SHA-256**, stores under Redis key `otp:<normalizedEmail>` with **300s TTL**.
3. Sends plaintext OTP via email.

**Success — `200`**

```json
{
  "success": true,
  "message": "OTP sent",
  "data": {
    "otp": "123456"
  }
}
```

> **Production warning:** Returning `otp` in the response bypasses email for debugging. Remove or feature-flag in production.

**Error responses**

| Status | Condition                                              | Example body                                                                             |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `400`  | Invalid body / suspended user / OTP generation failure | `{ "success": false, "error": "Invalid request schema" }`                                |
| `500`  | Redis or email failure                                 | `{ "success": false, "error": "Failed to set OTP key" }` or `"Failed to send OTP email"` |
| `500`  | Unexpected                                             | `{ "success": false, "error": "Failed to send OTP" }`                                    |

---

### `POST /api/user/verify-otp`

Validates OTP and consumes the Redis key (deleted on success).

**Request body (JSON)**

| Field     | Type    | Validation                |
| --------- | ------- | ------------------------- |
| `email`   | string  | Required                  |
| `otp`     | string  | Length 6                  |
| `isLogin` | boolean | Optional; default `false` |

**Behavior**

1. Rejects `INACTIVE` / `SUSPENDED` users.
2. Compares SHA-256 hash of `otp` to Redis value.
3. Deletes Redis key on match.
4. If `isLogin === true`: loads user, returns `400` if not found; signs JWT (`7d`, HS256, `issuer` / `audience` same as middleware); sets `httpOnly` cookie `token`.

**Success — `200`**

```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

JWT is **not** returned in this JSON body; clients using Bearer auth must obtain the token from your chosen mechanism (e.g. extend handler to return token, or use cookie-based sessions with cookie-aware clients).

**Error responses**

| Status | Condition                                                                     |
| ------ | ----------------------------------------------------------------------------- |
| `400`  | Invalid schema, bad OTP, missing Redis key, user blocked or not found (login) |
| `500`  | Server error                                                                  |

---

### `POST /api/user/create-user`

Creates a user record.

**Request body (JSON)**

| Field       | Type        | Validation                                                 |
| ----------- | ----------- | ---------------------------------------------------------- |
| `email`     | string      | Required                                                   |
| `firstName` | string      | Min length 1                                               |
| `lastName`  | string      | Min length 1                                               |
| `role`      | enum string | `"VIEWER"` \| `"ANALYST"` \| `"ADMIN"`; default `"VIEWER"` |

**Behavior**

1. `name` stored as `` `${firstName} ${lastName}` ``.
2. Rejects duplicate email.
3. Issues JWT and sets same `httpOnly` cookie as verify-otp.
4. Sends welcome email (non-blocking for success; see responses).

**Success — `201`**

```json
{
  "success": true,
  "message": "User created",
  "data": {
    "id": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
    "email": "garvitthakral1001@gmail.com",
    "name": "Garit thakral",
    "role": "VIEWER",
    "createdAt": "2026-04-02T02:48:56.436Z",
    "updatedAt": "2026-04-02T02:48:56.436Z",
    "deletedAt": null
  }
}
```

`data` is the full Prisma `User` object (includes `id`, `email`, `role`, timestamps, etc.).

**Alternate — `201`** (email failure)

```json
{
  "success": true,
  "message": "User created",
  "data": {
    "id": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
    "email": "garvitthakral1001@gmail.com",
    "name": "Garit thakral",
    "role": "VIEWER",
    "createdAt": "2026-04-02T02:48:56.436Z",
    "updatedAt": "2026-04-02T02:48:56.436Z",
    "deletedAt": null
  }
}
```

**Error responses**

| Status | Body                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| `400`  | `{ "success": false, "error": "Invalid request schema" }` or `"Email already exists"` |
| `500`  | `{ "success": false, "error": "Failed to create user" }`                              |

---

### `GET /api/user/get-users?page=1`

Paginated list of users, ordered by `createdAt` descending.

**Query parameters**

| Name   | Type             | Default | Rules       |
| ------ | ---------------- | ------- | ----------- |
| `page` | number (coerced) | `1`     | Must be ≥ 1 |

**Fixed page size:** `10` (not configurable in query).

**Caching**

- Key: `users:page:<page>`
- TTL: **90 seconds**
- Cache hit message: `"Users fetched from cache"`

**Success — `200`**

```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": {
    "users": [
      {
        "id": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
        "email": "garvitthakral1001@gmail.com",
        "name": "Garit thakral",
        "role": "ADMIN",
        "status": "ACTIVE",
        "createdAt": "2026-04-02T02:48:56.436Z",
        "updatedAt": "2026-04-05T22:12:00.275Z",
        "deletedAt": null
      }
    ],
    "page": 1,
    "limit": 10,
    "totalUsers": 1,
    "totalPages": 1
  }
}
```

**Error responses**

| Status | Condition                                                               |
| ------ | ----------------------------------------------------------------------- |
| `400`  | `page` < 1                                                              |
| `400`  | Prisma validation                                                       |
| `503`  | DB initialization failure                                               |
| `403`  | Role not in `ADMIN` / `ANALYST` (or missing `req.user`—see router note) |
| `500`  | Generic server error                                                    |

---

### `PATCH /api/user/change-role/:id`

**Authentication:** `Authorization: Bearer <JWT>` required.

**Authorization:** `ADMIN` only (middleware + extra guard in handler against `VIEWER` / `ANALYST`).

**Path parameters**

| Name | Description      |
| ---- | ---------------- |
| `id` | Target user UUID |

**Request body (JSON)**

| Field     | Type   | Validation                                                                                |
| --------- | ------ | ----------------------------------------------------------------------------------------- |
| `userId`  | string | Present in `ChangeUserRoleReqSchema` but **not used** by handler (update uses `:id` only) |
| `newRole` | enum   | `"VIEWER"` \| `"ANALYST"` \| `"ADMIN"`                                                    |

**Success — `200`**

```json
{
  {
    "success": true,
    "message": "User role updated successfully",
    "data": {
      "id": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
      "email": "garvitthakral1001@gmail.com",
      "name": "Garit thakral",
      "role": "VIEWER",
      "status": "ACTIVE",
      "createdAt": "2026-04-02T02:48:56.436Z",
      "updatedAt": "2026-04-05T22:09:37.729Z",
      "deletedAt": null
    }
  }
}
```

`data` is the updated `User`.

**Error responses**

| Status        | Condition                          |
| ------------- | ---------------------------------- |
| `400`         | Missing/invalid `id`, invalid body |
| `403`         | Caller not permitted               |
| `404`         | User not found                     |
| `400` / `503` | Prisma validation / DB init        |
| `500`         | Generic error                      |

---

### `DELETE /api/user/delete-user/:id`

**Authentication:** `Authorization: Bearer <JWT>` required.

**Authorization:** `ADMIN` only.

**Path parameters**

| Name | Description      |
| ---- | ---------------- |
| `id` | Target user UUID |

**Behavior**

1. Validates the `:id` parameter.
2. Verifies the target user exists.
3. Soft-deletes the user by setting `deletedAt` and `status: "INACTIVE"`.
4. Rejects already-deleted users with `409`.

**Success — `200`**

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": "f1198988-6d1e-482a-8bc6-bd1761c0c9d9",
    "email": "user@example.com",
    "name": "User Name",
    "role": "VIEWER",
    "status": "INACTIVE",
    "createdAt": "2026-04-02T02:48:56.436Z",
    "updatedAt": "2026-04-05T22:09:37.729Z",
    "deletedAt": "2026-04-05T22:20:00.000Z"
  }
}
```

**Error responses**

| Status | Condition                 |
| ------ | ------------------------- |
| `400`  | Missing or invalid `id`   |
| `403`  | Caller not permitted      |
| `404`  | User not found            |
| `409`  | User already deleted      |
| `503`  | DB initialization failure |
| `500`  | Generic server error      |

---

## Validation Rules (Summary)

| Endpoint    | Schema / location                                               |
| ----------- | --------------------------------------------------------------- |
| Signup      | `otpSigninReqSchema` — `src/types/userLogin.type.ts`            |
| Verify OTP  | `VerifyOtpReqSchema` — same file                                |
| Create user | `CreateUserReqSchema` — same file                               |
| Change role | `ChangeUserRoleReqSchema` — `src/types/user/chnageRole.type.ts` |

---

## Example cURL

**Request OTP**

```bash
curl -s -X POST http://localhost:5001/api/user/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Verify OTP**

```bash
curl -s -X POST http://localhost:5001/api/user/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","otp":"123456","isLogin":true}'
```

**Create user**

```bash
curl -s -X POST http://localhost:5001/api/user/create-user \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","firstName":"Ada","lastName":"Lovelace","role":"VIEWER"}'
```

**Change role (admin)**

```bash
curl -s -X PATCH http://localhost:5001/api/user/change-role/USER_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"userId":"ignored","newRole":"ANALYST"}'
```

---

## Related Files

| File                                       | Role                                  |
| ------------------------------------------ | ------------------------------------- |
| `index.ts`                                 | Router and middleware chain           |
| `controller/*.ts`                          | Handlers                              |
| `src/middleware/JWTAuthMiddleware.ts`      | JWT verification                      |
| `src/middleware/allowedRolesMiddleware.ts` | Role guard                            |
| `src/util/otp/*`                           | OTP generation, hashing, Redis, email |
| `src/db/prisma.ts`                         | Database client                       |
| `src/db/redis.config.ts`                   | Redis connection                      |
