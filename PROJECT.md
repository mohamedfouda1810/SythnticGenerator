# SynthGen — AI-Powered Synthetic Data Generation Platform

## Project Overview

**SynthGen** is a graduation project for the Faculty of Computers and Information Technology (Academic Year 2025–2026). It provides a complete web platform for generating synthetic tabular data using two approaches:

1. **CTGAN (Deep Learning)** — Upload real data, AI learns statistical patterns, generates realistic synthetic rows
2. **Mimesis (Rule-Based)** — Define a schema with 25+ field types, instantly generate structured data

**Supervisor**: Dr. Yasser Kamal  
**Team**: Habiba Khalil, Abdelrahman Hussein, Mohamed Wael, Mohamed Ebrahim, Amr Sayed

---

## Architecture Overview

```
┌─────────────────┐     HTTP/REST     ┌─────────────────┐     Python     ┌─────────────────┐
│   React Frontend │ ◄──────────────► │  FastAPI Backend │ ◄────────────► │   AI Engine     │
│   (Vite + TW4)   │                  │  (Uvicorn)       │               │ (CTGAN/Mimesis)  │
└─────────────────┘                   └────────┬────────┘               └─────────────────┘
                                               │
                                        ┌──────▼──────┐
                                        │   SQLite DB  │
                                        │ (async)      │
                                        └─────────────┘
```

---

## Complete File Structure

```
SynthGen/
├── ai_engine/                    # AI generation core
│   ├── __init__.py
│   ├── ctgan_generator.py        # CTGAN training & generation
│   ├── mimesis_generator.py      # Rule-based generation
│   ├── preprocessor.py           # Data cleaning & PII removal
│   ├── evaluator.py              # Quality metrics
│   └── schemas.py                # Data schemas
│
├── backend/                      # FastAPI backend
│   ├── __init__.py
│   ├── main.py                   # App entry point, CORS, routers
│   ├── config.py                 # Settings (env vars)
│   ├── database.py               # Async SQLAlchemy setup
│   ├── models.py                 # ORM models (User, Job, etc.)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py               # Register, login, logout, reset
│   │   ├── profile.py            # User profile CRUD
│   │   ├── admin.py              # Admin panel endpoints
│   │   ├── generation.py         # CTGAN & Mimesis generation
│   │   ├── history.py            # Job history
│   │   └── health.py             # Health check
│   ├── services/
│   │   ├── auth_service.py       # JWT, bcrypt, dependencies
│   │   ├── logger_service.py     # Activity logging
│   │   ├── ctgan_service.py      # CTGAN pipeline orchestration
│   │   └── mimesis_service.py    # Mimesis pipeline orchestration
│   ├── middleware/
│   │   └── error_handler.py      # Global exception handler
│   └── tests/
│       ├── conftest.py           # Test fixtures
│       ├── test_auth.py          # Auth tests (15 tests)
│       ├── test_profile.py       # Profile tests (6 tests)
│       ├── test_admin.py         # Admin tests (9 tests)
│       ├── test_generation_endpoints.py
│       └── test_history_endpoints.py
│
├── frontend/                     # React frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── public/index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Routes + auth restoration
│       ├── index.css             # Design tokens + global styles
│       ├── store/
│       │   └── authStore.js      # Zustand auth state
│       ├── router/
│       │   └── ProtectedRoute.jsx # Route guards
│       ├── services/
│       │   └── api.js            # All API calls + interceptors
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.jsx    # Auth-aware navigation
│       │   │   └── PageTransition.jsx
│       │   └── ui/
│       │       ├── AnimatedButton.jsx
│       │       ├── Avatar.jsx
│       │       ├── ConfirmModal.jsx
│       │       ├── GlowCard.jsx
│       │       ├── Modal.jsx
│       │       ├── ParticleBackground.jsx
│       │       ├── StatusBadge.jsx
│       │       └── TypewriterText.jsx
│       ├── pages/
│       │   ├── HomePage.jsx      # 7-section showcase page
│       │   ├── GeneratePage.jsx  # CTGAN + Mimesis generation
│       │   ├── HistoryPage.jsx   # Job history
│       │   ├── ProfilePage.jsx   # User profile (4 tabs)
│       │   ├── auth/
│       │   │   ├── LoginPage.jsx
│       │   │   ├── RegisterPage.jsx
│       │   │   ├── ForgotPasswordPage.jsx
│       │   │   └── ResetPasswordPage.jsx
│       │   └── admin/
│       │       ├── AdminDashboard.jsx  # Sidebar layout
│       │       └── panels/
│       │           ├── OverviewPanel.jsx  # Stats + charts
│       │           ├── UsersPanel.jsx     # User management
│       │           ├── LogsPanel.jsx      # Activity logs
│       │           ├── ErrorsPanel.jsx    # Error reports
│       │           └── StoragePanel.jsx   # Cleanup
│       ├── hooks/
│       │   └── useGeneration.js
│       └── utils/
│
├── docker/
│   ├── backend/Dockerfile
│   └── frontend/
│       ├── Dockerfile
│       └── nginx.conf
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── PROJECT.md                    # This file
```

---

## All API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create new account |
| POST | `/api/auth/login` | No | Authenticate, get JWT |
| POST | `/api/auth/logout` | Yes | Invalidate token |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/forgot-password` | No | Request reset token |
| POST | `/api/auth/reset-password` | No | Reset password |
| GET | `/api/auth/me` | Yes | Current user profile |

### Profile
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/profile` | Yes | Profile with stats |
| PATCH | `/api/profile` | Yes | Update username/avatar |
| PATCH | `/api/profile/password` | Yes | Change password |
| DELETE | `/api/profile` | Yes | Deactivate account |

### Generation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/generate/ctgan` | Optional | Generate via CTGAN (file upload) |
| POST | `/api/generate/mimesis` | Optional | Generate via Mimesis (schema) |
| GET | `/api/generate/download/{token}` | No | Download synthetic CSV |
| GET | `/api/generate/supported-fields` | No | List Mimesis field types |

### History
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/history` | Optional | List jobs (user-scoped) |
| GET | `/api/history/{id}` | Optional | Job detail |
| DELETE | `/api/history/{id}` | Optional | Delete job |

### Admin (requires role=admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Admin | List users (paginated, filterable) |
| GET | `/api/admin/users/{id}` | Admin | User detail + jobs |
| PATCH | `/api/admin/users/{id}/block` | Admin | Toggle block status |
| PATCH | `/api/admin/users/{id}/role` | Admin | Change user role |
| DELETE | `/api/admin/users/{id}` | Admin | Hard delete user |
| GET | `/api/admin/stats` | Admin | Dashboard statistics |
| GET | `/api/admin/logs` | Admin | Activity logs |
| GET | `/api/admin/errors` | Admin | Failed generation jobs |
| DELETE | `/api/admin/storage/cleanup` | Admin | Clean expired results |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `synthgen-dev-secret-...` | JWT signing key (change in prod!) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./synthetic_data.db` | Database connection |
| `ACCESS_TOKEN_EXPIRE_HOURS` | `24` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `MAX_FILE_SIZE_MB` | `10` | Max upload file size |
| `MAX_ROWS` | `50000` | Max synthetic rows per request |
| `DEFAULT_EPOCHS` | `100` | Default CTGAN training epochs |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins (JSON) |

---

## How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend
```bash
# From project root
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Run Tests
```bash
python -m pytest backend/tests/ -v
```

---

## How to Run with Docker

```bash
docker-compose up --build
```

This starts:
- **Backend** at `http://localhost:8000`
- **Frontend** at `http://localhost:80`
- API docs at `http://localhost:8000/docs`

---

## Database Schema

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| username | VARCHAR(30) | UNIQUE, NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| hashed_password | VARCHAR(255) | NOT NULL |
| role | ENUM(user, admin) | DEFAULT user |
| is_active | BOOLEAN | DEFAULT TRUE |
| is_blocked | BOOLEAN | DEFAULT FALSE |
| avatar_url | VARCHAR(500) | NULLABLE |
| created_at | DATETIME | NOT NULL |
| last_login | DATETIME | NULLABLE |

### generation_jobs
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NULLABLE |
| mode | ENUM(ctgan, mimesis) | NOT NULL |
| status | ENUM(pending, processing, completed, failed) | NOT NULL |
| num_rows_requested | INTEGER | NOT NULL |
| num_rows_generated | INTEGER | NULLABLE |
| file_name | VARCHAR(255) | NULLABLE |
| schema_used | TEXT (JSON) | NULLABLE |
| quality_score | FLOAT | NULLABLE |
| quality_metrics | TEXT (JSON) | NULLABLE |
| error_message | TEXT | NULLABLE |
| created_at | DATETIME | NOT NULL |
| completed_at | DATETIME | NULLABLE |

### activity_logs
| Column | Type |
|--------|------|
| id | UUID |
| user_id | UUID (nullable) |
| action | VARCHAR(50) |
| details | TEXT (JSON) |
| ip_address | VARCHAR(45) |
| timestamp | DATETIME |

### password_reset_tokens
| Column | Type |
|--------|------|
| id | UUID |
| user_id | UUID (FK) |
| token | VARCHAR(255) (hashed) |
| expires_at | DATETIME |
| used | BOOLEAN |

### token_blocklist
| Column | Type |
|--------|------|
| id | UUID |
| jti | VARCHAR(36) (UNIQUE) |
| created_at | DATETIME |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **user** | Generate data, view own history, manage profile |
| **admin** | All user capabilities + manage users, view all logs, view stats, cleanup storage |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| FastAPI | Async support, auto-docs, Pydantic validation, modern Python |
| SQLite (dev) | Zero-config, file-based, perfect for academic projects |
| CTGAN (SDV) | Industry-standard deep learning for tabular data synthesis |
| Mimesis | Fast rule-based generation with 25+ data providers |
| JWT (access+refresh) | Stateless auth with secure token rotation |
| Framer Motion | Production-quality animations with declarative API |
| Zustand | Minimal, fast state management (2KB) |
| Tailwind CSS v4 | Utility-first CSS with zero-config v4 |

---

## Known Limitations

1. SQLite is single-writer — not suitable for high-concurrency production
2. CTGAN training happens synchronously (blocks the request)
3. No email service integration (reset tokens returned in API for dev)
4. File storage is in-memory (expires after 1 hour)
5. No rate limiting implemented
6. No WebSocket support for real-time training progress

---

## Future Improvements

- [ ] PostgreSQL for production database
- [ ] Celery/Redis for async CTGAN training
- [ ] Email service for password reset
- [ ] S3/MinIO for persistent file storage
- [ ] Rate limiting middleware
- [ ] WebSocket training progress updates
- [ ] Data versioning and comparison
- [ ] Team/organization support
- [ ] API key authentication for programmatic access

---

## Continuing Development

To continue development, provide this PROJECT.md and describe what you want to add or fix.

**Always start your prompt with:**
> "Read PROJECT.md first. The project is SynthGen. [your request]"

This gives the AI full context about the architecture, file structure, and existing endpoints.
