# 💰 Finora

> A personal finance app that helps you track expenses, manage budgets, and gain clear insights into your money — all in one place.

---

## 📖 Table of Contents

- [About the Project](#about-the-project)
- [Monorepo Structure](#monorepo-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone the Repo](#clone-the-repo)
  - [Run Backend](#run-backend)
  - [Run Frontend](#run-frontend)
- [Environment Variables](#environment-variables)
- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Contributing](#contributing)
- [License](#license)

---

## 🧠 About the Project

**Finora** is a full-stack personal finance management application built entirely in TypeScript. It gives users a clear, structured view of their financial life — from daily expense logging to monthly budget planning and visual spending insights.

The goal of Finora is to remove the friction from personal finance: no spreadsheets, no guesswork — just clean data and actionable clarity.

---

## 🗂️ Monorepo Structure

This is a monorepo — both the backend and frontend live in the same repository, each as an independent application with its own `package.json`, dependencies, and configuration.

```
Finora/
├── backend/          # Node.js + Express REST API (TypeScript)
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── README.md     # ← Backend-specific docs
│
├── frontend/         # React / Next.js client (TypeScript)
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── README.md     # ← Frontend-specific docs
│
├── .gitattributes
└── README.md         # ← You are here
```

> **Why a monorepo?**  
> Keeping both apps in one repo means you can make a single branch/PR that spans frontend + backend changes together — much cleaner for a solo project or a small team.

---

## 🛠️ Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Language   | TypeScript (end-to-end)                         |
| Backend    | Node.js, Express.js                             |
| Frontend   | React / Next.js, Tailwind CSS                   |
| Database   | PostgreSQL / MongoDB _(update as applicable)_   |
| Auth       | JWT / NextAuth _(update as applicable)_         |
| ORM        | Prisma / Mongoose _(update as applicable)_      |
| Dev Tools  | ESLint, Prettier, ts-node, nodemon              |

> 📝 **Note for contributors:** Update the table above to match your actual stack once dependencies are finalised.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your machine before you begin:

- **Node.js** `v18+` — [Download](https://nodejs.org/)
- **npm** or **pnpm** — comes with Node.js
- **Git** — [Download](https://git-scm.com/)
- A running database instance (PostgreSQL or MongoDB, depending on what you use)

### Clone the Repo

```bash
git clone https://github.com/garvitthakral/Finora.git
cd Finora
```

### Run Backend

```bash
cd backend
npm install         # Install backend dependencies
create .env.example .env  # fill in your values
npm run dev         # Start the development server
```

The backend will start on `http://localhost:5001` (or whichever port you set in `.env`).

### Run Frontend

```bash
cd frontend
npm install         # Install frontend dependencies
create .env.example .env  # fill in your values
npm run dev         # Start the dev server
```

The frontend will start on `http://localhost:5173/`.

> ⚠️ Make sure the backend is running before you start the frontend, as the frontend depends on the API.

---

## 🔐 Environment Variables

Both apps require their own `.env` files. You will find `.env.example` in each folder with all the required keys documented.

**Never commit `.env` files.** They are already listed in `.gitignore`.

| App      | File location           |
|----------|--------------------------|
| Backend  | `backend/.env`          |
| Frontend | `frontend/.env`         |

Refer to each sub-folder's `README.md` for the full list of environment variables required.

---

## ✨ Features

- 📊 **Expense Tracking** — Log and categorise your daily spending
- 📁 **Budget Management** — Set monthly budgets per category and track remaining balance
- 📈 **Insights & Analytics** — Visual breakdowns of where your money goes
- 🔐 **Secure Auth** — User accounts with JWT-based authentication
- 📱 **Responsive UI** — Works seamlessly on desktop and mobile

---

## 🏗️ Architecture Overview

Finora follows a classic **client-server architecture**:

```
[ Browser / Client ]
        │
        │  HTTP Requests (REST API)
        ▼
[ Express.js Backend ]
        │
        │  Database Queries
        ▼
[ PostgreSQL / MongoDB ]
```

- The **frontend** is a standalone React/Next.js SPA that fetches data from the backend API.
- The **backend** exposes a RESTful API, handles business logic, authentication, and database operations.
- Both communicate over HTTP with JSON payloads.

For deeper documentation on each layer, see:
- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a new feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes and commit: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feat/your-feature-name`
5. Open a Pull Request against `main`

Please make sure your code follows the existing TypeScript conventions and passes lint checks before submitting a PR.

---

## 📄 License

This project is open source. Add your license here — e.g., [MIT License](https://choosealicense.com/licenses/mit/).

---

<p align="center">Built with ❤️ by <a href="https://github.com/garvitthakral">Garvit Thakral</a></p>