# 💰 Finora

> A personal finance app that helps you track expenses, manage budgets, and gain clear insights into your money — all in one place.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-finora.onrender.com-blue?style=for-the-badge)](https://finora-b7o6.onrender.com/)

---

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🧠 About

**Finora** is a full-stack personal finance management application built entirely in **TypeScript**. It empowers users to take control of their finances with:

- **Real-time transaction tracking** — Log, categorize, and monitor every rupee
- **Smart budget insights** — Visual analytics on spending patterns
- **Role-based access** — Admin, analyst, and viewer dashboards
- **Secure authentication** — JWT-based user sessions with OTP verification

The goal: Remove friction from personal finance management with clean data and actionable insights.

---

## ✨ Features

- 📊 **Expense & Income Tracking** — Categorize and log transactions effortlessly
- 📁 **Smart Categories** — Organize spending by custom categories
- 📈 **Visual Insights** — Dashboard with monthly trends and category breakdowns
- 🔐 **Secure OTP Authentication** — Email-based login with hashed OTP storage
- 👥 **Role-Based Access Control** — Admin, Analyst, and Viewer roles with permission guards
- ⚡ **Cached Performance** — Redis caching for user queries and dashboard data
- 🗄️ **Soft Deletes** — Safe data handling with soft-delete support
- 📱 **Responsive Design** — Works seamlessly on desktop, tablet, and mobile

---

## 🛠️ Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| **Frontend** | React 18 + Vite + TypeScript + Tailwind |
| **Backend**  | Node.js + Express.js + TypeScript       |
| **Database** | PostgreSQL + Prisma ORM                 |
| **Caching**  | Redis (Upstash)                         |
| **Auth**     | JWT + SHA-256 hashing                   |
| **Email**    | Nodemailer (SMTP)                       |
| **DevTools** | ESLint, Prettier, Bun                   |

---

## 🗂️ Project Structure

This is a **monorepo** with independent backend and frontend applications:

```
Finora/
├── backend/                    # Express REST API
│   ├── src/
│   │   ├── service/           # Business logic (user, transaction, stats)
│   │   ├── middleware/        # Auth & role guards
│   │   ├── db/                # Prisma & Redis config
│   │   ├── util/              # Helpers (OTP, cache)
│   │   ├── types/             # Zod schemas & TypeScript types
│   │   ├── app.ts             # Express setup
│   │   └── server.ts          # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma      # Database models
│   │   └── migrations/        # Migration history
│   ├── .env.example
│   ├── package.json
│   └── README.md              # Backend-specific docs
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── assets/
│   │   └── components/
│   ├── .env.example
│   ├── package.json
│   └── README.md              # Frontend-specific docs
│
├── .gitignore
├── .gitattributes
└── README.md                   # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** `v18+` — [Download](https://nodejs.org/)
- **npm**, **yarn**, or **bun** — comes with Node.js
- **Git** — [Download](https://git-scm.com/)
- **PostgreSQL** — Local or cloud-hosted (e.g., Vercel, AWS RDS)
- **Redis** (optional) — Or use Upstash for serverless Redis

### 1. Clone the Repository

```bash
git clone https://github.com/garvitthakral/Finora.git
cd Finora
```

### 2. Set Up Backend

```bash
cd backend

# Install dependencies
bun install
# (or: yarn install / bun install)

# Set up environment variables
cp .env.example .env
# Edit .env with your database and SMTP credentials

# Run database migrations
bun run prisma:migrate dev

# Start the development server
bun run dev
```

**Backend runs on:** `http://localhost:5001`

### 3. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your backend API URL

# Start the Vite dev server
npm run dev
```

**Frontend runs on:** `http://localhost:5173`

---

## 🔐 Environment Setup

### Backend `.env`

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/finora
REDIS_URL=redis://localhost:6379           # or Upstash URL
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Finora <noreply@finora.com>"
NODE_ENV=development
```

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:5001/api
```

> 📝 **Security Note:** Never commit `.env` files to version control. They are already in `.gitignore`.

---

## 📚 API Documentation

Comprehensive API docs are available in the backend README:

- **[User Service API](./backend/src/service/user/README.md)** — Auth, user management, role changes
- **[Transaction Service API](./backend/src/service/transaction/README.md)** — CRUD operations for transactions
- **[Stats Service API](./backend/src/service/stats/README.md)** — Dashboard & summaries

### Quick API Examples

**Sign up with OTP:**

```bash
curl -X POST http://localhost:5001/api/user/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Create a transaction:**

```bash
curl -X POST http://localhost:5001/api/transaction/create-record \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "type": "EXPENSE",
    "category": "Food",
    "date": "2026-04-06T10:30:00Z"
  }'
```

---

## 🏗️ Architecture

```
┌─────────────────────────┐
│   React Frontend        │
│   (Vite + TypeScript)   │
└────────────┬────────────┘
             │ REST API (JSON)
             ▼
┌─────────────────────────┐
│   Express Backend       │
│   (Node.js + TS)        │
├─────────────────────────┤
│ • Auth & JWT            │
│ • Business Logic        │
│ • Role-Based Guards     │
└────────────┬────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────┐      ┌─────────┐
│PostgreSQL    │ Redis   │
│ (Prisma)     │ (Cache) │
└─────────┘      └─────────┘
```

---

## 🤝 Contributing

Contributions are welcome! Please follow this workflow:

1. **Fork** the repository
2. **Create a feature branch:** `git checkout -b feat/amazing-feature`
3. **Commit changes:** `git commit -m "feat: add amazing feature"`
4. **Push to branch:** `git push origin feat/amazing-feature`
5. **Open a Pull Request**

### Code Standards

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** rules
- Add **type safety** with Zod schemas
- Write **error-safe** handlers with proper validation

---

## 📄 License

This project is open source under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

## 📞 Support

For issues, questions, or suggestions:

- **Open an Issue** — [GitHub Issues](https://github.com/garvitthakral/Finora/issues)
- **Email:** garvitthakral@example.com

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/garvitthakral">Garvit Thakral</a></strong>
  <br/>
  <sub>Making personal finance simple, secure, and insightful.</sub>
</p>
