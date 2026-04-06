# 🖥️ Finora — Frontend

> The client-side application for Finora, built with React / Next.js and TypeScript. This is where users interact with their financial data through a clean and responsive UI.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Dev Server](#running-the-dev-server)
  - [Building for Production](#building-for-production)
- [Environment Variables](#environment-variables)
- [Key Concepts Explained](#key-concepts-explained)
  - [Why TypeScript?](#why-typescript)
  - [Folder Structure Decisions](#folder-structure-decisions)
  - [How API Calls Work](#how-api-calls-work)
  - [State Management](#state-management)
- [Available Scripts](#available-scripts)
- [Connecting to the Backend](#connecting-to-the-backend)

---

## 🧠 Overview

The Finora frontend is a TypeScript-first React application. It handles all user-facing features: authentication flows, dashboard views, expense logging forms, budget tracking UI, and spending analytics charts.

It talks to the Finora backend via a REST API and has no direct database access — all data lives on the server.

---

## 🛠️ Tech Stack

| Tool / Library        | Purpose                                             |
|-----------------------|------------------------------------------------------|
| React / Next.js       | Core UI framework                                   |
| TypeScript            | Type safety across the entire codebase              |
| Tailwind CSS          | Utility-first styling                               |
| Axios / Fetch         | HTTP client for API requests                        |
| React Query / SWR     | Server-state management & data fetching             |
| React Router / Next   | Client-side routing                                 |
| Recharts / Chart.js   | Data visualisation for spending insights            |
| ESLint + Prettier     | Code quality and formatting                         |

> 📝 Update this table to reflect your actual installed packages from `package.json`.

---

## 📁 Project Structure

```
frontend/
├── public/                    # Static assets (favicon, images)
│
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Low-level building blocks (Button, Input, Card)
│   │   ├── layout/            # Page-level layout wrappers (Sidebar, Navbar)
│   │   └── charts/            # Chart components for insights
│   │
│   ├── pages/ (or app/)       # Route-level page components
│   │   ├── index.tsx          # Landing / redirect
│   │   ├── dashboard.tsx      # Main dashboard
│   │   ├── expenses.tsx       # Expense list + add expense
│   │   ├── budgets.tsx        # Budget management
│   │   └── auth/              # Login & signup pages
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts         # Auth state and helpers
│   │   ├── useExpenses.ts     # Fetching & mutating expenses
│   │   └── useBudgets.ts      # Budget data hooks
│   │
│   ├── services/              # API call functions (one file per resource)
│   │   ├── api.ts             # Base Axios instance with auth headers
│   │   ├── expenseService.ts  # CRUD for expenses
│   │   └── budgetService.ts   # CRUD for budgets
│   │
│   ├── types/                 # TypeScript interfaces and types
│   │   ├── expense.ts         # Expense type definitions
│   │   ├── budget.ts          # Budget type definitions
│   │   └── user.ts            # User / auth types
│   │
│   ├── context/               # React Context providers
│   │   └── AuthContext.tsx    # Global auth state
│   │
│   ├── utils/                 # Pure helper functions
│   │   ├── formatCurrency.ts  # ₹/$ formatting helpers
│   │   └── dateHelpers.ts     # Date formatting utilities
│   │
│   └── styles/                # Global CSS / Tailwind config overrides
│       └── globals.css
│
├── .env.example               # Example environment variables
├── next.config.ts             # Next.js configuration (if using Next.js)
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript compiler config
└── package.json               # Dependencies and scripts
```

> 📝 This structure is a recommended starting point. Update the tree above to match your actual file layout as the project grows.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `v18+`
- **npm** or **pnpm**
- The Finora **backend** running locally (see [`../backend/README.md`](../backend/README.md))

### Installation

From the repo root, navigate to the frontend folder and install dependencies:

```bash
cd frontend
npm install
```

This installs everything listed in `package.json`. You only need to run this once (and again whenever dependencies change).

### Running the Dev Server

```bash
npm run dev
```

This starts a local development server — usually at **`http://localhost:3000`**.

The dev server has **hot module replacement (HMR)** enabled, meaning your browser automatically reflects changes when you save a file — no manual refresh needed.

### Building for Production

```bash
npm run build       # Compiles and optimises the app for production
npm run start       # Runs the production build locally (Next.js only)
```

---

## 🔐 Environment Variables

Create a `.env` file in the `frontend/` directory by copying the example:

```bash
cp .env.example .env
```

Then fill in the required values:

```env
# The base URL of your running backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# (Optional) Add other keys like analytics IDs, etc.
```

> ⚠️ **Important:** Any variable prefixed with `NEXT_PUBLIC_` is exposed to the browser. Never put secrets (private keys, database passwords) here. Keep those in the backend only.

---

## 📚 Key Concepts Explained

This section explains the "why" behind the architectural decisions made in the frontend codebase. If you're new to this stack, read this carefully.

### Why TypeScript?

Plain JavaScript doesn't tell you when you're passing the wrong shape of data to a function. TypeScript adds a **type system** on top of JavaScript — the compiler will catch mistakes like:

```ts
// Without TypeScript — this silently breaks at runtime
const total = expense.amout // typo, should be "amount"

// With TypeScript — this is a compile-time error you catch immediately
const expense: Expense = { amount: 500, category: "food" }
expense.amout // ❌ Error: Property 'amout' does not exist on type 'Expense'
```

All your data shapes live in `src/types/` so every part of the app agrees on what an `Expense` or `Budget` object looks like.

---

### Folder Structure Decisions

| Folder         | What goes here                                                                 |
|----------------|--------------------------------------------------------------------------------|
| `components/`  | Things you render — buttons, forms, cards, charts. No business logic here.    |
| `pages/` or `app/` | Route-level views. Each file = one URL. Compose components here.          |
| `hooks/`       | Reusable logic that components share — data fetching, form state, etc.        |
| `services/`    | All API call code lives here. Components never call `fetch()` directly.       |
| `types/`       | TypeScript interfaces. One file per resource (expense, budget, user).         |
| `context/`     | Global state shared across the app — like the current logged-in user.         |
| `utils/`       | Pure helper functions with no React in them — formatting, calculations, etc.  |

This separation means: if the backend changes an API endpoint, you only edit `services/` — not every component that uses the data.

---

### How API Calls Work

All HTTP calls go through a **centralised Axios instance** in `src/services/api.ts`:

```ts
// src/services/api.ts
import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,  // Reads from your .env
})

// Attach the JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
```

Individual service files use this instance:

```ts
// src/services/expenseService.ts
import api from "./api"
import { Expense } from "../types/expense"

export const getExpenses = async (): Promise<Expense[]> => {
  const response = await api.get("/expenses")
  return response.data
}

export const createExpense = async (data: Omit<Expense, "id">): Promise<Expense> => {
  const response = await api.post("/expenses", data)
  return response.data
}
```

This pattern means the rest of the codebase never needs to know the raw URL or worry about auth headers — it's handled in one place.

---

### State Management

Finora uses a **two-layer state model**:

| Layer           | Tool                  | What it stores                            |
|-----------------|-----------------------|-------------------------------------------|
| **Server state**  | React Query / SWR   | Data fetched from the API (expenses, budgets) |
| **Client state**  | React Context / useState | UI state, logged-in user, form data     |

**Why not Redux?**  
For a personal finance app of this scope, Redux adds unnecessary boilerplate. React Query already handles caching, loading states, and re-fetching for server data — which is most of what you need.

---

## 📋 Available Scripts

Run these from inside the `frontend/` directory:

| Command           | What it does                                                   |
|-------------------|----------------------------------------------------------------|
| `npm run dev`     | Starts the local dev server with hot reload                    |
| `npm run build`   | Compiles TypeScript + bundles the app for production           |
| `npm run start`   | Runs the production bundle (requires `build` to run first)     |
| `npm run lint`    | Runs ESLint to check for code quality issues                   |
| `npm run format`  | Runs Prettier to auto-format all files                         |
| `npm run type-check` | Runs the TypeScript compiler without emitting output — just checks types |

---

## 🔗 Connecting to the Backend

The frontend expects the backend to be running and accessible at the URL defined by `NEXT_PUBLIC_API_URL` in your `.env` file.

During local development, this is typically:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

If you change the backend port or deploy it to a hosted URL (e.g., Railway, Render), update this value accordingly.

For backend setup instructions, refer to [`../backend/README.md`](../backend/README.md).

---

<p align="center">Part of the <a href="https://github.com/garvitthakral/Finora">Finora</a> monorepo · Built by <a href="https://github.com/garvitthakral">Garvit Thakral</a></p>