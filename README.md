<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</p>

# 🧬 SynthGen — AI-Powered Synthetic Data Generator

> An enterprise-grade synthetic data generation platform combining **CTGAN deep learning** and **Mimesis rule-based** engines to produce high-fidelity tabular data — complete with quality evaluation, job history, admin controls, and real-time email verification.

**Faculty of Computers and Information Technology — Academic Year 2025-2026**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Docker Deployment](#-docker-deployment)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [Team](#-team)
- [License](#-license)

---

## 🔍 Overview

SynthGen provides two complementary approaches to synthetic data generation:

| Engine | Method | Use Case | Speed |
|--------|--------|----------|-------|
| **CTGAN** | Deep learning (Conditional GAN) | Learn distributions from uploaded CSV/XLSX datasets | Minutes (training-based) |
| **Mimesis** | Rule-based schema generation | Generate data from a defined column schema | Instant |

Both engines include automatic **quality evaluation** (KS statistics, total variation distance, correlation analysis) and produce downloadable CSV/XLSX outputs.

---

## ✨ Key Features

### 🤖 AI-Powered Data Generation

- **CTGAN Pipeline**: Upload CSV/XLSX → Auto-preprocess → Train SDV CTGAN model → Sample synthetic rows → Evaluate quality → Download
- **Mimesis Generator**: Define a column schema → Generate up to 1M rows instantly → Evaluate → Download
- **Live Preview**: Real-time Mimesis preview endpoint for quick sample rows before full generation
- **Background Processing**: Generation jobs run asynchronously via FastAPI BackgroundTasks with status polling
- **Download Formats**: CSV (default) and XLSX support

### 🧠 AI Engine Intelligence

- **Smart Type Detection**: Automatically classifies columns as continuous, categorical, datetime, boolean, or ID-like
- **Missing Value Handling**: Type-aware imputation strategies
- **Optional PII Removal**: Detects and removes personally identifiable information before CTGAN training
- **SDV Metadata Creation**: Automatic metadata generation for CTGAN compatibility
- **Quality Scoring (0–100)**:
  - KS statistic for numeric distributions
  - Total variation distance for categorical distributions
  - Correlation matrix (Frobenius norm) comparison
  - Missing value rate analysis
  - Rule-based Mimesis scoring (schema completeness, null rates, type checks)

### 📊 25 Mimesis Field Types

| Category | Fields |
|----------|--------|
| **Personal** | `name`, `first_name`, `last_name`, `email`, `phone`, `address`, `country`, `city`, `age`, `gender` |
| **Temporal** | `date`, `datetime` |
| **Numeric** | `integer`, `float` |
| **Categorical** | `category`, `boolean`, `uuid`, `id` |
| **Medical** | `diagnosis`, `blood_type`, `medication`, `symptom` |
| **Financial** | `salary`, `currency`, `iban` |

### 🔐 Authentication & Security

- **JWT Authentication**: Access + Refresh token flow with configurable expiry
- **Email Verification**: Real SMTP email delivery (Gmail) with styled HTML templates, resend support, and expired-link recovery
- **Password Recovery**: Forgot/reset password flow with secure hashed reset tokens
- **Token Blocklist**: Immediate token revocation on logout
- **Role-Based Access Control**: `USER` and `ADMIN` roles with route-level enforcement
- **Graceful Logout**: Server accepts expired tokens on logout without 401 errors

### 👤 User Profile Management

- View and update username
- Change password with current-password verification
- Upload and serve custom avatars
- Delete account with password confirmation (cascades to all user data)

### 🛡️ Admin Dashboard

- **User Management**: List, search, filter, paginate all users with generation counts
- **User Actions**: Block/unblock, change roles, delete users + associated data
- **Platform Statistics**: Total users, generation counts, completion/failure rates, average quality scores, recent activity
- **Activity Logs**: Full audit trail of all critical actions (login, register, generate, admin actions)
- **Error Tracking**: View failed generation errors for debugging
- **Storage Management**: In-memory storage cleanup endpoint

### 📱 Frontend Experience

- **Premium Dark UI**: Glassmorphism, gradient animations, micro-interactions powered by Framer Motion
- **Route-Level Code Splitting**: Lazy-loaded pages for optimal performance
- **Responsive Design**: Mobile-first layouts across all pages
- **Real-Time Feedback**: Toast notifications, loading states, progress indicators
- **Smart Error Handling**: Field-level validation, friendly conflict messages with action links

### 📈 Job History & Tracking

- **Full History**: Every generation job recorded with metadata (mode, status, rows, quality score, columns, created date)
- **Job Details**: View sample rows, quality breakdown, download generated files
- **Filters**: Filter by mode (CTGAN/Mimesis) and status (completed/failed/running)
- **Pagination**: Efficient paginated history browsing

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | Async REST API framework |
| **SQLAlchemy 2.0** | Async ORM (AsyncPG for PostgreSQL) |
| **Pydantic v2** | Request/response validation |
| **Alembic** | Database migrations |
| **python-jose** | JWT token creation/validation |
| **bcrypt** | Password hashing |
| **SDV (CTGAN)** | Deep learning synthetic data |
| **Mimesis** | Rule-based synthetic data |
| **Pandas** | Data manipulation |
| **SciPy** | Statistical quality evaluation |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS v4** | Utility-first styling |
| **Zustand** | Global state management |
| **Framer Motion** | Animations & transitions |
| **React Router v7** | Client-side routing |
| **Recharts** | Admin dashboard charts |
| **Lucide React** | Icon library |
| **React Hot Toast** | Notification system |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **PostgreSQL 15+** | Production database |
| **Docker Compose** | Container orchestration |
| **Nginx** | Frontend serving (production) |

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React 19)                     │
│  Vite 8 • Tailwind v4 • Zustand • Framer Motion • React Router │
├─────────────────────────────────────────────────────────────────┤
│                        Vite Proxy / Nginx                       │
├─────────────────────────────────────────────────────────────────┤
│                       Backend (FastAPI)                          │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐│
│  │ Auth API │ │ Gen API │ │ History  │ │ Profile │ │  Admin  ││
│  └────┬─────┘ └────┬────┘ └────┬─────┘ └────┬────┘ └────┬────┘│
│       │            │           │             │           │      │
│  ┌────┴────────────┴───────────┴─────────────┴───────────┴────┐│
│  │                     Service Layer                          ││
│  │  auth_service • email_service • ctgan_service              ││
│  │  mimesis_service • storage_service • logger_service        ││
│  └────────────────────────────┬───────────────────────────────┘│
├───────────────────────────────┼─────────────────────────────────┤
│                    AI Engine Layer                               │
│  ┌─────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────────┐│
│  │ Preprocessor│ │  CTGAN    │ │  Mimesis   │ │  Evaluator   ││
│  │  (PII, NaN) │ │ (SDV Lib) │ │ (Providers)│ │ (KS, TVD)    ││
│  └─────────────┘ └───────────┘ └────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Production) / SQLite (Development)                 │
│  Users • Jobs • Tokens • Logs • Password Resets                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Route Groups

| Prefix | Purpose | Auth Required |
|--------|---------|---------------|
| `GET /health` | Health check | No |
| `/api/auth/*` | Register, login, logout, refresh, verify email, reset password | Varies |
| `/api/profile/*` | View/update profile, avatar, password, delete account | Yes |
| `/api/generate/*` | CTGAN upload, Mimesis generate, preview, download | Yes |
| `/api/history/*` | Job listing, details, deletion | Yes |
| `/api/admin/*` | User management, stats, logs, errors, cleanup | Admin only |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 15+** (or Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/mohamedfouda1810/SythnticGenerator.git
cd SythnticGenerator
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/synthgen

# Auth
SECRET_KEY=your-secure-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_HOURS=24
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
MAX_FILE_SIZE_MB=10
MAX_ROWS=50000
DEFAULT_EPOCHS=100
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Email (Gmail SMTP — requires App Password)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_FROM=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
```

> **📧 Gmail Setup**: Enable 2FA on your Google account → Go to Security → App Passwords → Generate one for "Mail".

### 3. Backend Setup

```bash
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r backend/requirements.txt
alembic -c backend/alembic.ini upgrade head
uvicorn backend.main:app --reload --port 8000
```

API documentation: **http://localhost:8000/docs**

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Application: **http://localhost:3000**

---

## 📡 API Reference

Full interactive documentation available at `/docs` (Swagger UI) when the backend is running.

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account with email verification |
| `POST` | `/api/auth/login` | Authenticate and receive JWT tokens |
| `POST` | `/api/auth/logout` | Revoke current token (accepts expired tokens) |
| `POST` | `/api/auth/refresh` | Exchange refresh token for new access token |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/auth/verify-email` | Verify email via token link |
| `POST` | `/api/auth/resend-verification` | Resend verification email |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |

### Generation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/generate/ctgan` | Upload dataset and generate synthetic data |
| `POST` | `/api/generate/mimesis` | Generate from schema definition |
| `POST` | `/api/generate/mimesis/preview` | Preview 3 sample rows |
| `GET` | `/api/generate/download/{token}` | Download generated file (CSV/XLSX) |
| `GET` | `/api/generate/supported-fields` | List all Mimesis field types |

### History, Profile & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/history` | Paginated job history with filters |
| `GET/DELETE` | `/api/history/{id}` | Job details / delete job |
| `GET/PATCH` | `/api/profile` | View / update profile |
| `PATCH` | `/api/profile/password` | Change password |
| `DELETE` | `/api/profile` | Delete account |
| `POST` | `/api/profile/avatar` | Upload avatar |
| `GET` | `/api/admin/users` | List users (admin) |
| `GET` | `/api/admin/stats` | Platform statistics (admin) |
| `GET` | `/api/admin/logs` | Activity audit logs (admin) |

---

## 🧪 Testing

### Backend Tests

```bash
python -m pytest backend/tests ai_engine/tests -q
```

### Frontend Quality Checks

```bash
cd frontend
npm run lint    # ESLint
npm run build   # Production build verification
```

> **Note**: On Windows PowerShell, if `npm run` is blocked by execution policy, use `npm.cmd run lint` instead.

**Current Status**: ✅ `npm run lint` passes clean | ✅ `npm run build` passes with route-level code splitting

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

---

## 🔒 Security

| Area | Implementation |
|------|----------------|
| **Passwords** | bcrypt hashing with salt |
| **Tokens** | JWT (HS256) with JTI-based blocklist |
| **Email Verification** | Mandatory before login, SMTP with HTML templates |
| **RBAC** | Route-level `USER` / `ADMIN` enforcement |
| **CORS** | Configurable allowed origins |
| **Input Validation** | Pydantic v2 schemas on all endpoints |

> ⚠️ **Production Checklist**:
> - Replace `SECRET_KEY` with a cryptographically random value
> - Never commit `.env` files (already in `.gitignore`)
> - Replace default seeded admin accounts
> - Add rate limiting for auth and generation endpoints
> - Consider HttpOnly cookies for JWT storage

---

## 🗺️ Roadmap

- [ ] **Persistent Storage**: Migrate from in-memory to S3/disk storage for generated files
- [ ] **Worker Queue**: Move CTGAN training to Celery/Redis for production scalability
- [ ] **Frontend Tests**: Vitest + React Testing Library for auth, generation, and admin flows
- [ ] **Rate Limiting**: Per-endpoint rate limits before public deployment
- [ ] **Password Reset Email**: Send reset links via SMTP (currently generates token only)
- [ ] **Export Formats**: Add JSON and Parquet export options

---

## 👥 Team

| Name | Role |
|------|------|
| **Mohamed Ebrahim** | Developer |
| **Mohamed Wael** | Developer |
| **Habiba Khalil** | Developer |
| **Abdelrahman Hussein** | Developer |
| **Amr Sayed** | Developer |

**Supervisor**: Dr. Yasser Kamal

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">
  <sub>Built with ❤️ at Faculty of Computers and Information Technology — 2025/2026</sub>
</p>
