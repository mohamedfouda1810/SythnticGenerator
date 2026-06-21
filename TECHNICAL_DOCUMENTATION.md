# SynthGen — Complete Technical Documentation

> **Faculty of Computers and Information Technology — Academic Year 2025-2026**
> **Supervisor**: Dr. Yasser Kamal

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [AI Engine — CTGAN (Deep Learning Generator)](#3-ai-engine--ctgan-deep-learning-generator)
4. [AI Engine — Mimesis (Rule-Based Generator)](#4-ai-engine--mimesis-rule-based-generator)
5. [Data Preprocessing Pipeline](#5-data-preprocessing-pipeline)
6. [Quality Evaluation & How We Verify the Dataset](#6-quality-evaluation--how-we-verify-the-dataset)
7. [Backend — FastAPI](#7-backend--fastapi)
8. [Database — PostgreSQL & SQLAlchemy](#8-database--postgresql--sqlalchemy)
9. [Docker Infrastructure](#9-docker-infrastructure)
10. [Frontend — React 19](#10-frontend--react-19)
11. [Authentication & Security System](#11-authentication--security-system)
12. [Full Technology Stack Summary](#12-full-technology-stack-summary)
13. [Performance Characteristics](#13-performance-characteristics)
14. [Why We Chose Each Technology](#14-why-we-chose-each-technology)
15. [API Reference & Route Architecture](#15-api-reference--route-architecture)
16. [Testing Strategy](#16-testing-strategy)
17. [Team](#17-team)

---

## 1. Project Overview

**SynthGen** is an enterprise-grade, AI-powered Synthetic Data Generator platform. Its primary purpose is to generate high-fidelity tabular synthetic data that statistically resembles real-world datasets — without exposing any personally identifiable information (PII).

### Core Problem Solved

Real-world data often contains sensitive personal or medical information. Organizations need data for:
- Training machine learning models
- Testing software systems
- Research and academic studies
- Regulatory compliance testing (GDPR, HIPAA)

SynthGen solves this by generating **synthetic data** that is statistically indistinguishable from real data but does not contain any real person's information.

### Two Generation Modes

| Mode | Technology | Approach | Best For |
|------|-----------|---------|----------|
| **CTGAN** | Conditional GAN (Deep Learning) | Learns the joint statistical distribution of a real dataset uploaded by the user | Preserving complex inter-column correlations from real data |
| **Mimesis** | Rule-Based Schema Generator | Generates data from a user-defined column schema using realistic data providers | Creating data from scratch without a real dataset |

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                       │
│   React 19 + Vite 8 + Tailwind CSS v4 + Zustand + Framer Motion               │
│   Running on: http://localhost:3000 (dev) / http://localhost:80 (Docker/prod)  │
├────────────────────────────────────────────────────────────────────────────────┤
│                       PROXY / REVERSE PROXY LAYER                              │
│   Vite Dev Proxy (dev) / Nginx (production Docker container)                  │
├────────────────────────────────────────────────────────────────────────────────┤
│                          BACKEND LAYER (FastAPI)                               │
│   Python 3.11+ / Uvicorn ASGI server                                           │
│   ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│   │ /auth    │ │/generate│ │/history  │ │/profile  │ │ /admin   │            │
│   └────┬─────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│        │            │           │              │             │                  │
│   ┌────┴────────────┴───────────┴──────────────┴─────────────┴──────────────┐  │
│   │                         SERVICE LAYER                                   │  │
│   │  auth_service · email_service · ctgan_service                           │  │
│   │  mimesis_service · storage_service · logger_service                     │  │
│   └────────────────────────────────┬────────────────────────────────────────┘  │
├────────────────────────────────────┼───────────────────────────────────────────┤
│                          AI ENGINE LAYER                                       │
│   ┌──────────────────┐  ┌────────────────┐  ┌───────────────┐  ┌────────────┐ │
│   │  preprocessor.py │  │ctgan_generator │  │mimesis_generat│  │evaluator.py│ │
│   │  PII Detection   │  │ SDV CTGANSynth │  │Mimesis Providr│  │KS, TVD,    │ │
│   │  Type Inference  │  │ PyTorch GANs   │  │Rule-Based Data│  │Frobenius   │ │
│   │  Missing Values  │  │ SDV Metadata   │  │25 Field Types │  │Score 0-100 │ │
│   └──────────────────┘  └────────────────┘  └───────────────┘  └────────────┘ │
├────────────────────────────────────────────────────────────────────────────────┤
│                         DATABASE LAYER                                         │
│   PostgreSQL 15 (Docker Container) + SQLAlchemy 2.0 Async ORM + Alembic       │
│   Tables: users · generation_jobs · activity_logs · token_blocklist ·          │
│           password_reset_tokens                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow for CTGAN Generation

```
User uploads CSV ─→ Frontend (React)
  ─→ POST /api/generate/ctgan (multipart/form-data)
    ─→ FastAPI Router validates request
      ─→ BackgroundTask spawned (async, non-blocking)
        ─→ DataPreprocessor.fit_transform(df)
           · Remove PII columns
           · Auto-detect column types
           · Fill missing values
           · Build SDV metadata
        ─→ CTGANSynthesizer(metadata, epochs=N).fit(clean_df)
           · PyTorch Conditional GAN training
        ─→ CTGANSynthesizer.sample(num_rows=N)
           · Generate synthetic rows
        ─→ DataEvaluator.evaluate(real_df, synthetic_df)
           · KS tests, TVD, Frobenius norm
           · Compute quality score 0–100
        ─→ Store result in PostgreSQL (job table)
        ─→ Store CSV bytes in memory (storage_service)
  ─→ Frontend polls GET /api/generate/status/{job_id}
    ─→ Returns job status (pending / processing / completed / failed)
  ─→ Frontend calls GET /api/generate/download/{token}
    ─→ Returns file as CSV or XLSX attachment
```

---

## 3. AI Engine — CTGAN (Deep Learning Generator)

### What is CTGAN?

**CTGAN** stands for **Conditional Tabular GAN** (Generative Adversarial Network). It is a deep learning model specifically designed to generate synthetic tabular data. It was developed by researchers at MIT and is available through the **SDV (Synthetic Data Vault)** library.

### How GANs Work

A GAN consists of two competing neural networks:
- **Generator**: Takes random noise as input and tries to produce fake data that looks real
- **Discriminator**: Takes data and tries to classify it as real (from the real dataset) or fake (from the generator)

These two networks train against each other:
1. The Generator improves to fool the Discriminator
2. The Discriminator improves to detect fake data
3. After many training epochs, the Generator learns to produce data with the same statistical distribution as the real data

### CTGAN's Special Advantages for Tabular Data

Standard GANs struggle with tabular data because:
- Columns have mixed types (numerical, categorical, boolean, datetime)
- Categorical columns have non-continuous distributions
- Some columns may have highly skewed distributions (e.g., salary)

CTGAN solves this by:
1. **Mode-specific normalization**: Normalizes numerical columns using a VGM (Variational Gaussian Mixture) model to handle multi-modal distributions
2. **Conditional vector**: Uses a conditional vector to oversample rare categories in categorical columns, ensuring minority classes are well-represented
3. **Training-by-sampling**: Samples each column conditioned on a specific category value, preventing mode collapse

### Our CTGAN Implementation

**File**: `ai_engine/ctgan_generator.py`

**Configuration Parameters**:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `epochs` | 100 (configurable via `.env`) | Number of GAN training iterations |
| `batch_size` | 500 (auto-adjusted) | Training mini-batch size; must be multiple of `pac=10` |
| `generator_dim` | `[128, 128]` | Hidden layer sizes for the Generator neural network |
| `discriminator_dim` | `[128, 128]` | Hidden layer sizes for the Discriminator neural network |
| `pac` (pack size) | 10 | CTGAN discriminator groups rows in packs for stability |
| `enable_gpu` | `False` | CPU-only (GPU disabled for background thread stability) |
| `verbose` | `False` | Suppresses TQDM output to avoid hanging in async contexts |

**Batch Size Safety Algorithm** (`_resolve_ctgan_batch_size`):
```
effective_batch = floor(min(requested_batch, max(row_count, pac)) / pac) * pac
effective_batch = max(pac, effective_batch)
```
This ensures the batch size is always a positive multiple of `pac=10`, which is required by CTGAN's discriminator architecture.

**Training Pipeline Steps**:
1. **Receive** a Pandas DataFrame (from uploaded CSV/XLSX)
2. **Preprocess**: run `DataPreprocessor.fit_transform()` (PII removal, type detection, missing value fill)
3. **Build SDV Metadata**: convert preprocessing results to SDV column type dictionary; detect primary key from ID-like columns
4. **Validate Metadata**: `metadata.validate()` ensures SDV compatibility
5. **Train**: `CTGANSynthesizer.fit(clean_df)` — runs the GAN training loop
6. **Sample**: `CTGANSynthesizer.sample(num_rows=N)` — generates synthetic rows
7. **Return**: a `pd.DataFrame` of synthetic data

**Why torch.set_num_threads(1)?**
CTGAN uses PyTorch internally. When running inside FastAPI's `BackgroundTasks` (which uses a thread pool), allowing PyTorch to spawn many threads leads to CPU over-parallelization and potential deadlocks. Setting 1 thread ensures stable background execution.

---

## 4. AI Engine — Mimesis (Rule-Based Generator)

### What is Mimesis?

**Mimesis** is a Python library for generating realistic fake data. Unlike CTGAN which *learns* from real data, Mimesis uses **predefined providers** (Person, Address, Finance, etc.) to generate contextually realistic synthetic values based on a user-defined schema.

### Why Mimesis Over Faker?

| Feature | Mimesis | Faker |
|---------|---------|-------|
| Performance | Significantly faster (compiled internal structures) | Slower |
| Locale support | 50+ locales | 20+ locales |
| Data realism | High (uses real name/city databases) | Good |
| Type coverage | Broad providers | Broad providers |
| Memory | Lower | Higher |

### Our 25 Supported Field Types

**File**: `ai_engine/mimesis_generator.py`

| Category | Field Type | Provider / Source |
|----------|-----------|-------------------|
| **Personal** | `name` | `Person.full_name()` |
| **Personal** | `first_name` | `Person.first_name()` |
| **Personal** | `last_name` | `Person.last_name()` |
| **Personal** | `email` | `Person.email()` |
| **Personal** | `phone` | `Person.telephone()` |
| **Personal** | `gender` | Random choice: Male / Female / Non-binary |
| **Personal** | `age` | `random.randint(min, max)`, default 18–90 |
| **Address** | `address` | `Address.address()` |
| **Address** | `city` | `Address.city()` |
| **Address** | `country` | `Address.country()` |
| **Temporal** | `date` | Random date in configurable range (default 2000–2025) |
| **Temporal** | `datetime` | Random datetime ISO format |
| **Numeric** | `integer` | `random.randint(min, max)`, default 0–1,000,000 |
| **Numeric** | `float` | `random.uniform(min, max)` with configurable decimal places |
| **Categorical** | `category` | Random choice from user-provided `choices` list |
| **Categorical** | `boolean` | `random.choice([True, False])` |
| **Categorical** | `uuid` | `uuid.uuid4()` |
| **Categorical** | `id` | Auto-incrementing integer counter (thread-safe closure) |
| **Medical** | `diagnosis` | Curated pool of 20 real ICD-10 diagnoses |
| **Medical** | `blood_type` | Realistic distribution: A+ / A- / B+ / B- / AB+ / AB- / O+ / O- |
| **Medical** | `medication` | Pool of 20 common generic medications |
| **Medical** | `symptom` | Pool of 20 clinical symptoms |
| **Financial** | `salary` | `random.uniform(min, max)`, default $25,000–$250,000 |
| **Financial** | `currency` | 12 major world currencies (USD, EUR, GBP, JPY, etc.) |
| **Financial** | `iban` | Realistic-looking fake IBAN (10 EU country codes + 20 digits) |

### Locale Support

The Mimesis generator supports locale-aware generation. The locale is resolved using Mimesis's `Locale` enum:
- First tries `Locale[locale_str.upper()]` (e.g., `Locale["EN"]`)
- Falls back to `Locale(locale_str.lower())` (e.g., `Locale("en")`)
- Defaults to `Locale.EN` if neither resolves

### Mimesis vs. CTGAN: When to Use Which

| Scenario | Use CTGAN | Use Mimesis |
|----------|-----------|-------------|
| You have a real dataset and want synthetic data with the same distribution | Yes | No |
| You need to create data from scratch with no real dataset | No | Yes |
| You need to preserve correlations between columns (e.g., age vs. salary) | Yes | No (random, no correlation) |
| You need instant generation (< 1 second) | No (minutes of training) | Yes |
| You need medical/financial domain-specific values | Depends on training data | Yes |
| You need up to 1 million rows | Slow | Yes |

---

## 5. Data Preprocessing Pipeline

**File**: `ai_engine/preprocessor.py`

The `DataPreprocessor` class runs before CTGAN training to clean and prepare the real dataset.

### Step 1: PII Detection and Removal

Two-tier approach:

**Tier 1 — Strict PII** (always removed, substring match in column name):
```
ssn, social_security, passport, national_id, driver_license,
credit_card, card_number, cvv, password, pin, secret
```

**Tier 2 — Soft PII** (removed if column is string/object dtype AND exact name match):
```
id, patient_id, name, first_name, last_name, full_name, surname,
person_name, patient_name, user_name, username, email, email_address,
e_mail, phone, phone_number, telephone, mobile, address, street, ip_address
```

**Design rationale**: Numeric columns named "id" (e.g., a simple integer row number) are still removed to prevent CTGAN from memorizing row identifiers. But a numeric column named "age" is NOT removed even though it sounds personal — it provides valuable statistical signal for CTGAN.

### Step 2: Column Type Detection

The `_detect_column_type()` function classifies each column:

| Type | Detection Logic |
|------|----------------|
| `ID` | Uniqueness ratio >= 90% AND column name ends in `_id`, `_uuid`, `_guid`, `_key`, or `_number` |
| `BOOLEAN` | All unique values are a subset of: `{True/False}`, `{0/1}`, `{0.0/1.0}`, `{"yes"/"no"}`, `{"y"/"n"}`, `{"0"/"1"}` |
| `DATETIME` | >= 80% of sampled values (up to 200) parse successfully with `pd.to_datetime(..., format="mixed")` |
| `CATEGORICAL` | Numeric columns with unique ratio <= 10% AND <= 100 unique values; OR all string/object columns |
| `CONTINUOUS` | Numeric columns that don't qualify as categorical |

### Step 3: Missing Value Imputation (Type-Aware)

| Column Type | Strategy | Rationale |
|-------------|----------|-----------|
| `CONTINUOUS` | Replace with **column median** | Median is robust to outliers unlike mean |
| `CATEGORICAL` | Replace with **mode** (most frequent value) | Preserves the dominant category |
| `BOOLEAN` | Replace with **mode** | Preserves majority class |
| `DATETIME` | **Forward-fill** then **backward-fill** | Preserves temporal continuity |

### Step 4: Boolean Conversion

After imputation, boolean columns are converted from their raw representation (0/1, "yes"/"no", etc.) to actual Python `bool` dtype, which SDV's CTGAN requires for correct treatment.

### Step 5: SDV Metadata Generation

The preprocessor outputs an SDV-compatible metadata dictionary:
```python
{
  "columns": {
    "age":            {"sdtype": "numerical"},
    "gender":         {"sdtype": "categorical"},
    "admission_date": {"sdtype": "datetime"},
    "discharged":     {"sdtype": "boolean"},
    "patient_id":     {"sdtype": "id"}
  },
  "primary_key": "patient_id"   # if a unique ID column exists
}
```

---

## 6. Quality Evaluation & How We Verify the Dataset

**File**: `ai_engine/evaluator.py`

This is one of the most critical components. After generating synthetic data, the `DataEvaluator` class compares the synthetic data against the real data across multiple statistical dimensions to produce a **quality score from 0 to 100**.

### Why Quality Evaluation Matters

Without quality evaluation, we cannot know if the generated data is:
- Actually similar to the real data (distribution-wise)
- Useful for downstream ML training
- Free of statistical biases introduced by the GAN

### Evaluation Metrics

#### Metric 1: Kolmogorov-Smirnov (KS) Statistic — For Numerical Columns

**What it measures**: The maximum distance between the real and synthetic empirical cumulative distribution functions (CDFs).

**Formula**:
```
KS_statistic = max|CDF_real(x) - CDF_synthetic(x)|
```

**Interpretation**:
- `KS = 0.0` — Identical distributions (perfect)
- `KS = 1.0` — Completely different distributions (worst)

**How we compute it**:
```python
stat, p_value = scipy.stats.ks_2samp(real_col.astype(float), synth_col.astype(float))
similarity = max(0.0, (1.0 - stat)) * 100.0
```

**Example**: If a real dataset has ages following a normal distribution centered at 45, and the synthetic data's KS statistic is 0.05, the similarity score for that column is 95%.

#### Metric 2: Total Variation Distance (TVD) — For Categorical Columns

**What it measures**: The difference between the real and synthetic category frequency distributions.

**Formula**:
```
TVD = (1/2) * SUM |P_real(c) - P_synthetic(c)|   for all categories c
```

**Interpretation**:
- `TVD = 0.0` — Identical category distributions (perfect)
- `TVD = 1.0` — Completely different distributions (worst)

**Why TVD over KS for categoricals**: KS requires continuous numerical data. TVD directly compares discrete probability distributions.

**Example**: If in real data "Male" appears 55% of the time and "Female" 45%, and in synthetic data "Male" appears 52% and "Female" 48%, the TVD = 0.03, similarity = 97%.

#### Metric 3: Correlation Matrix Difference (Frobenius Norm) — For Numerical Columns

**What it measures**: How well the synthetic data preserves the inter-column correlations of the real data.

**Formula**:
```
Frobenius_norm = ||Corr_real - Corr_synthetic||_F = sqrt(SUM_i SUM_j (r_ij - s_ij)^2)
```

**Normalization**:
```python
n_numeric = number of numeric columns
max_diff  = 2.0 * sqrt(n_numeric * (n_numeric - 1))   # theoretical maximum
norm_diff = min(corr_diff / max_diff, 1.0)
corr_score = (1.0 - norm_diff) * 100.0
```

**Why this matters**: A GAN that perfectly captures column distributions but ignores correlations is not useful. For example, if in real data "salary" and "age" have a 0.6 correlation, the synthetic data should preserve this relationship.

#### Metric 4: Missing Value Rate

**What it measures**: How many cells in the synthetic data are null/NaN.

**Formula**:
```python
missing_rate[col] = count(NaN in synth[col]) / len(synth)
missing_score     = (1.0 - average_missing_rate) * 100.0
```

Ideally, the synthetic data should have zero missing values since CTGAN was trained on cleaned data.

### Overall Quality Score Formula

The four metrics are combined into a single **0–100 score** using a weighted average:

```
Overall_Score = 0.50 x Shape_Score + 0.30 x Correlation_Score + 0.20 x Missing_Score
```

| Component | Weight | Rationale |
|-----------|--------|-----------|
| **Shape Score** | 50% | Most important — column-by-column distribution fidelity |
| **Correlation Score** | 30% | Second most important — preserving inter-feature relationships |
| **Missing Value Score** | 20% | Synthetic data should be clean |

### Score Interpretation

| Score Range | Grade | Meaning |
|-------------|-------|---------|
| 90–100 | **Excellent** | Synthetic data is statistically very close to real data |
| 75–89 | **Good** | High-quality synthetic data suitable for most use cases |
| 50–74 | **Fair** | Some distributional differences; may need more training epochs |
| 0–49 | **Poor** | Significant divergence; likely needs more data or preprocessing |

### Quality Evaluation for Mimesis (Rule-Based)

For Mimesis-generated data, there is no real dataset to compare against (since Mimesis creates data from scratch). Therefore, quality scoring uses a rule-based approach:
- **Schema completeness**: Were all requested columns generated?
- **Null rate**: Are there any unexpected null values?
- **Type conformance**: Do values match their declared types?
- **Range compliance**: Do numeric values fall within configured min/max bounds?

### Example Quality Report Output

```
============================================================
  SYNTHETIC DATA QUALITY REPORT
============================================================

Overall Quality Score: 87.3/100  (Good)

Column Shape Similarity:
----------------------------------------
  age                  ████████████████░░░░ 82.1%  (ks_statistic)
  bmi                  ██████████████████░░ 91.4%  (ks_statistic)
  diagnosis            ███████████████░░░░░ 78.6%  (tvd)
  outcome              ████████████████████ 95.2%  (tvd)

Correlation Matrix Difference (Frobenius): 0.3842

Missing Values: None detected
============================================================
```

---

## 7. Backend — FastAPI

### Framework Choice: FastAPI

**File**: `backend/main.py`

FastAPI was chosen as the backend framework for these reasons:

1. **Async-first**: Built on Python's `asyncio`, supports thousands of concurrent requests without blocking
2. **Automatic API documentation**: Generates Swagger UI at `/docs` and ReDoc at `/redoc` from code
3. **Pydantic integration**: Automatic request/response validation via Pydantic v2 schemas
4. **Type hints**: Full Python type annotation support for IDE autocompletion and static analysis
5. **Performance**: One of the fastest Python web frameworks (on par with Node.js in benchmarks)
6. **BackgroundTasks**: Built-in support for fire-and-forget background tasks (used for CTGAN training)

### Application Startup (Lifespan)

The app uses FastAPI's `lifespan` context manager for:
1. Testing the database connection (`SELECT 1`)
2. Creating all database tables via SQLAlchemy (`create_tables()`)
3. Auto-seeding admin users if none exist (`auto_seed_if_no_admins()`)

### Middleware Stack

| Middleware | Purpose |
|-----------|---------|
| `CORSMiddleware` | Allow cross-origin requests from the configured frontend origins |
| `global_exception_handler` | Catch any unhandled exception and return a structured JSON error response |
| `log_requests` | Log every HTTP request with method, path, status code, and timing |

### Router Architecture

| Router File | Prefix | Key Endpoints |
|------------|--------|--------------|
| `routers/health.py` | `/health` | GET — system health check (DB connectivity) |
| `routers/auth.py` | `/api/auth` | register, login, logout, refresh, verify-email, forgot/reset-password |
| `routers/profile.py` | `/api/profile` | view/update profile, change password, upload avatar, delete account |
| `routers/generation.py` | `/api/generate` | CTGAN upload, Mimesis generate, preview, download, supported-fields |
| `routers/history.py` | `/api/history` | List jobs (paginated, filtered), job details, delete job |
| `routers/admin.py` | `/api/admin` | Users list, user actions, platform stats, activity logs, error tracking |

### Service Layer

The service layer contains business logic, separated from HTTP concerns:

| Service File | Responsibilities |
|-------------|----------------|
| `auth_service.py` | JWT creation/validation, password hashing/verification, token blocklist |
| `email_service.py` | SMTP email delivery via Gmail (HTML templates for verification/reset emails) |
| `ctgan_service.py` | Orchestrate CTGAN pipeline: parse upload then preprocess then train then evaluate then store |
| `mimesis_service.py` | Orchestrate Mimesis pipeline: parse schema then generate then evaluate then store |
| `storage_service.py` | In-memory storage for generated files (byte buffers keyed by download token) |
| `logger_service.py` | Write activity logs to the database (audit trail) |

### CORS Configuration

```python
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

Configurable via `.env`. Supports multiple origins. In production Docker, set to `["http://localhost", "http://localhost:80"]`.

### Background Task Pattern for CTGAN

CTGAN training is computationally expensive (minutes). To avoid blocking the HTTP connection:

```python
@router.post("/ctgan")
async def generate_ctgan(background_tasks: BackgroundTasks, ...):
    job = await create_job_in_db(status=PENDING)        # Fast — returns immediately
    background_tasks.add_task(run_ctgan_pipeline, job_id, real_df, params)
    return {"job_id": job.id, "status": "pending"}      # Responds in < 100ms

# Frontend then polls:
@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = await get_job_from_db(job_id)
    return {"status": job.status, "quality_score": job.quality_score, ...}
```

---

## 8. Database — PostgreSQL & SQLAlchemy

### Why PostgreSQL?

| Feature | PostgreSQL | SQLite (dev alternative) |
|---------|-----------|------------------------|
| Concurrent writes | Full MVCC (Multi-Version Concurrency Control) | Lock-based, limited concurrency |
| JSON support | Native JSONB type | Text stored as JSON |
| Production readiness | Industry standard | Development/embedded only |
| Docker availability | Official image | File-based |
| Array support | Native | None |
| Full-text search | Built-in | Extension required |

### ORM: SQLAlchemy 2.0 (Async)

We use **SQLAlchemy 2.0** with **asyncpg** driver, which provides:
- **Async session management**: Non-blocking database queries via `async with AsyncSession`
- **Mapped column syntax**: Modern type-annotated ORM (`Mapped[str]`, `mapped_column()`)
- **Relationship loading**: Lazy/eager loading of related objects
- **Connection pooling**: Automatic connection pool management

### Database Schema: 5 Tables

#### Table 1: `users`
Stores platform user accounts.

| Column | Type | Key | Purpose |
|--------|------|-----|---------|
| `id` | `VARCHAR(36)` | PK | UUID identifier |
| `username` | `VARCHAR(30)` | UNIQUE, INDEXED | Login username |
| `email` | `VARCHAR(255)` | UNIQUE, INDEXED | Account email |
| `hashed_password` | `VARCHAR(255)` | — | bcrypt hash |
| `role` | `ENUM(user/admin)` | — | RBAC role |
| `is_active` | `BOOLEAN` | — | Account enabled flag |
| `is_blocked` | `BOOLEAN` | — | Admin block flag |
| `avatar_data` | `BYTEA` | — | Binary avatar storage |
| `avatar_mime` | `VARCHAR(50)` | — | Avatar content type |
| `avatar_url` | `VARCHAR(500)` | — | External avatar URL fallback |
| `is_email_verified` | `BOOLEAN` | — | Email verification status |
| `email_verification_token` | `VARCHAR(255)` | — | Pending verification token |
| `email_verification_expires` | `TIMESTAMP` | — | Token expiry |
| `created_at` | `TIMESTAMP` | — | Registration time |
| `last_login` | `TIMESTAMP` | — | Last successful login |

#### Table 2: `generation_jobs`
Tracks every synthetic data generation request with full metadata.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `VARCHAR(36) PK` | UUID job identifier |
| `user_id` | `VARCHAR(36) FK` | Owner (CASCADE DELETE) |
| `mode` | `ENUM(ctgan/mimesis)` | Which engine was used |
| `status` | `ENUM(pending/processing/completed/failed)` | Job lifecycle state |
| `num_rows_requested` | `INTEGER` | Requested row count |
| `num_rows_generated` | `INTEGER` | Actual generated rows |
| `quality_score` | `FLOAT` | Overall quality 0–100 |
| `quality_metrics` | `TEXT (JSON)` | Per-column quality breakdown |
| `download_token` | `VARCHAR(36) INDEXED` | Unique token for file download |
| `generation_time_seconds` | `FLOAT` | Total job runtime |
| `columns_generated` | `TEXT (JSON)` | List of generated column names |
| `synthetic_data_sample` | `TEXT (JSON)` | First 20 rows stored as JSON |
| `schema_used` | `TEXT (JSON)` | Mimesis schema request |
| `file_name` | `VARCHAR(255)` | Uploaded CTGAN source file name |
| `error_message` | `TEXT` | Failure reason if failed |
| `created_at` | `TIMESTAMP` | Job creation time |
| `completed_at` | `TIMESTAMP` | Completion time |

#### Table 3: `password_reset_tokens`
Single-use tokens for the forgot-password flow.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `VARCHAR(36) PK` | UUID |
| `user_id` | `VARCHAR(36) FK` | Token owner (CASCADE DELETE) |
| `token` | `VARCHAR(255)` | Hashed reset token |
| `expires_at` | `TIMESTAMP` | Expiry (typically 1 hour) |
| `used` | `BOOLEAN` | Prevents token reuse |

#### Table 4: `activity_logs`
Full audit trail for security and admin monitoring.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `VARCHAR(36) PK` | UUID |
| `user_id` | `VARCHAR(36) FK` | Actor (SET NULL on user delete — preserves audit trail) |
| `action` | `VARCHAR(50)` | Event name (e.g., `login`, `register`, `generate`, `admin_block_user`) |
| `details` | `TEXT (JSON)` | Structured metadata about the event |
| `ip_address` | `VARCHAR(45)` | IPv4 or IPv6 address |
| `timestamp` | `TIMESTAMP` | Event time |

#### Table 5: `token_blocklist`
JWT revocation list for immediate logout enforcement.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | `VARCHAR(36) PK` | UUID |
| `jti` | `VARCHAR(36) UNIQUE INDEXED` | JWT ID (`jti` claim) to reject |
| `created_at` | `TIMESTAMP` | When the token was invalidated |

### Entity Relationships

```
USERS  ──(1:N)──  GENERATION_JOBS      (CASCADE DELETE)
USERS  ──(1:N)──  PASSWORD_RESET_TOKENS (CASCADE DELETE)
USERS  ──(1:N)──  ACTIVITY_LOGS         (SET NULL on delete — preserves audit)
TOKEN_BLOCKLIST                          (standalone, no foreign keys)
```

### Database Migrations: Alembic

**Alembic** handles all schema migrations:
```bash
alembic -c backend/alembic.ini upgrade head     # Apply all migrations
alembic revision --autogenerate -m "message"     # Generate migration from model changes
alembic downgrade -1                             # Roll back last migration
```

### Indexed Columns for Performance

| Index | Table | Column | Type |
|-------|-------|--------|------|
| `ix_users_username` | `users` | `username` | UNIQUE — fast login lookup |
| `ix_users_email` | `users` | `email` | UNIQUE — fast login lookup |
| `ix_generation_jobs_download_token` | `generation_jobs` | `download_token` | Fast file download |
| `ix_token_blocklist_jti` | `token_blocklist` | `jti` | UNIQUE — fast token revocation check |

---

## 9. Docker Infrastructure

### Overview

Docker Compose orchestrates **3 containers**:

```
docker-compose.yml
├── postgres   (PostgreSQL 15 Alpine)
├── backend    (FastAPI + Uvicorn)
└── frontend   (React + Nginx)
```

### Container 1: PostgreSQL (`synthgen_postgres`)

```yaml
image: postgres:15-alpine
container_name: synthgen_postgres
volumes:
  - postgres_data:/var/lib/postgresql/data     # Persistent data volume
ports:
  - "5432:5432"
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U synthgen_user -d synthgen"]
  interval: 10s
  timeout: 5s
  retries: 5
```

**Why Alpine?**: The Alpine-based image is ~50% smaller than the Debian-based image, reducing pull time and disk usage.

**Why Docker for PostgreSQL?**:
- **No local installation required**: Any developer can run `docker-compose up` without installing PostgreSQL
- **Reproducible environment**: Every developer and CI/CD pipeline gets the exact same DB version (15)
- **Data persistence**: The `postgres_data` named volume persists data across container restarts
- **Health checks**: Backend waits for `pg_isready` before starting, preventing connection race conditions
- **Isolation**: Database runs in its own network namespace, not exposed to the host beyond port 5432

### Container 2: Backend (`synthgen_backend`)

```yaml
build:
  context: .
  dockerfile: docker/backend/Dockerfile
ports:
  - "8000:8000"
depends_on:
  postgres:
    condition: service_healthy    # Waits for postgres health check to pass
restart: unless-stopped
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

The backend depends on PostgreSQL with `condition: service_healthy` — ensuring the database is fully initialized before the backend tries to connect.

### Container 3: Frontend (`synthgen_frontend`)

```yaml
build:
  context: .
  dockerfile: docker/frontend/Dockerfile
ports:
  - "80:80"
depends_on:
  - backend
restart: unless-stopped
```

The frontend container uses **Nginx** to serve the compiled React bundle and proxy API requests to the backend container.

### Service URLs (Docker Mode)

| Service | URL |
|---------|-----|
| Frontend | `http://localhost` (port 80) |
| Backend API | `http://localhost:8000` |
| API Documentation | `http://localhost:8000/docs` |
| PostgreSQL | `localhost:5432` |

### Environment Variables

All secrets are managed via `.env` file:

```env
# Database
DATABASE_URL=postgresql+asyncpg://synthgen_user:PASSWORD@localhost:5432/synthgen

# JWT Security
SECRET_KEY=<min-32-chars-random-string>
ACCESS_TOKEN_EXPIRE_HOURS=24
REFRESH_TOKEN_EXPIRE_DAYS=7

# Generation Limits
MAX_FILE_SIZE_MB=10
MAX_ROWS=50000
DEFAULT_EPOCHS=100

# Email (Gmail SMTP)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

---

## 10. Frontend — React 19

### Framework: React 19

React 19 is the latest stable version with:
- **React Compiler**: Automatic memoization (no more manual `useMemo`/`useCallback`)
- **Server Actions** (future-ready): Simplified data mutation patterns
- **Improved Suspense**: Better async component handling

### Build Tool: Vite 8

**Why Vite over CRA (Create React App)?**:

| Feature | Vite 8 | CRA |
|---------|--------|-----|
| Dev server startup | < 500ms | 10–30 seconds |
| Hot Module Replacement | Near-instant | Several seconds |
| Build speed | Very fast (Rollup) | Slow (Webpack) |
| Bundle optimization | Tree-shaking + code splitting | Basic |
| Active development | Yes | Deprecated |

### State Management: Zustand

**Why Zustand over Redux?**:
- **Boilerplate**: Near-zero boilerplate (vs. Redux's actions/reducers/selectors)
- **Bundle size**: ~1.5KB vs Redux Toolkit's ~30KB
- **API simplicity**: Access store with a single hook: `useAuthStore(state => state.user)`
- **TypeScript support**: Excellent type inference

The project uses separate Zustand stores for:
- Authentication state (`user`, `accessToken`, `isAuthenticated`)
- UI state (loading states, modals)

### Routing: React Router v7

React Router v7 introduced:
- **Lazy loading**: `React.lazy()` + `Suspense` for route-level code splitting
- **Data router**: Loaders and actions for data fetching per-route
- **TypeScript-first**: Full type safety for route params

### HTTP Client: Axios + TanStack React Query

| Tool | Role |
|------|------|
| **Axios** | HTTP client with interceptors for automatic JWT attachment and refresh |
| **TanStack React Query v5** | Server state management, caching, background refetching, optimistic updates |

The Axios instance is configured with:
1. Base URL pointing to the backend API
2. Request interceptor: Attaches `Authorization: Bearer <token>` from Zustand store
3. Response interceptor: Catches 401 responses and automatically attempts token refresh

### Animation: Framer Motion v12

Used throughout the UI for:
- **Page transitions**: Smooth enter/exit animations between routes
- **Component animations**: Cards fading in, modals scaling up
- **Micro-interactions**: Button press effects, input focus animations
- **Progress indicators**: Loading bars and skeleton screens

### Charts: Recharts v3

Used in the Admin Dashboard for:
- **Line charts**: Generation activity over time
- **Bar charts**: CTGAN vs Mimesis usage comparison
- **Pie charts**: Job status distribution (completed/failed/running)
- **Area charts**: Quality score trends

### Component Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| `lucide-react` | ^1.14.0 | 1000+ SVG icons as React components |
| `react-hot-toast` | ^2.6.0 | Toast notification system |
| `react-dropzone` | ^15.0.0 | Drag-and-drop file upload zone |
| `react-confetti` | ^6.4.0 | Celebration animation on successful generation |
| `clsx` | ^2.1.1 | Conditional CSS class names utility |

### CSS Styling: Tailwind CSS v4

Tailwind CSS v4 was used instead of v3 with key changes:
- **CSS-first configuration**: Configure in CSS variables instead of `tailwind.config.js`
- **Smaller output**: Better tree-shaking of unused utilities
- **Native CSS cascade layers**: Better integration with base browser styles
- **OKLCH colors**: Wider color gamut for modern displays

### Frontend Architecture

```
frontend/src/
├── App.jsx                  # Root router and layout
├── main.jsx                 # React DOM render entry point
├── index.css                # Global styles + Tailwind directives
├── components/              # Reusable UI components
│   ├── ui/                  # Base components (Button, Input, Modal, etc.)
│   ├── layout/              # Page layout wrappers (Sidebar, Navbar)
│   └── generation/          # Generation-specific components
├── pages/                   # Route-level page components
│   ├── auth/                # Login, Register, VerifyEmail pages
│   ├── dashboard/           # Main dashboard
│   ├── generate/            # CTGAN and Mimesis generation pages
│   ├── history/             # Job history listing and detail pages
│   ├── profile/             # User profile management
│   └── admin/               # Admin dashboard and user management
├── hooks/                   # Custom React hooks (useAuth, useGeneration, etc.)
├── services/                # API service functions (auth.js, generation.js, etc.)
├── store/                   # Zustand state stores
├── router/                  # React Router configuration with lazy loading
└── utils/                   # Utility functions (formatters, validators)
```

---

## 11. Authentication & Security System

### JWT Authentication Flow

The platform uses a **dual-token** system:

```
1. User logs in:
   POST /api/auth/login
   -> Server creates:
     - Access Token (expires in 24 hours by default)
     - Refresh Token (expires in 7 days by default)
   -> Both tokens signed with HS256 algorithm using SECRET_KEY

2. Authenticated requests:
   Request Header: Authorization: Bearer <access_token>
   -> Backend validates JWT signature, expiry, and JTI blocklist

3. Token refresh:
   POST /api/auth/refresh with { refresh_token }
   -> Server validates refresh token
   -> Issues new access token

4. Logout:
   POST /api/auth/logout
   -> Server adds token's JTI to token_blocklist table
   -> All subsequent requests with that token are rejected
   -> Note: Server accepts expired tokens on logout (graceful logout)
```

### JWT Token Structure

```json
{
  "sub": "user-uuid-here",
  "jti": "unique-token-id",
  "type": "access",
  "role": "user",
  "exp": 1234567890,
  "iat": 1234567890
}
```

**Key claims**:
- `sub` (subject): User UUID
- `jti` (JWT ID): Unique per-token ID used for the blocklist
- `type`: "access" or "refresh"
- `role`: "user" or "admin" — used for RBAC

### Password Security

**Hashing**: `bcrypt` algorithm with automatic salt generation
- Work factor: default 12 rounds (computationally expensive to prevent brute force)
- One-way hash: passwords cannot be reversed

```python
# Hashing
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

# Verification
bcrypt.checkpw(password.encode(), stored_hash)
```

### Email Verification Flow

1. User registers -> Server sends verification email with a unique token link
2. Email contains: `{FRONTEND_URL}/verify-email?token=<token>`
3. Token is stored hashed in `users.email_verification_token`
4. Token expires after configured duration (e.g., 24 hours)
5. User clicks link -> Frontend sends token to `GET /api/auth/verify-email?token=<token>`
6. Server marks `is_email_verified = True`
7. Unverified users cannot log in

**SMTP Configuration**: Gmail SMTP via App Password (2FA required). The email service sends HTML-formatted emails with:
- Registration verification emails
- Password reset emails
- Custom styled HTML templates

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| **USER** | Access own profile, generate data, view own history |
| **ADMIN** | All USER permissions + list/manage all users, view all logs, platform stats |

RBAC is enforced at the route level with FastAPI dependency injection:
```python
async def require_admin(current_user = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin access required")
```

### Security Summary

| Area | Implementation |
|------|---------------|
| **Passwords** | bcrypt hashing with salt |
| **Tokens** | JWT (HS256) with JTI-based blocklist |
| **Email Verification** | Mandatory before login, SMTP with HTML templates |
| **RBAC** | Route-level USER / ADMIN enforcement |
| **CORS** | Configurable allowed origins |
| **Input Validation** | Pydantic v2 schemas on all endpoints |
| **File Uploads** | Size limit (`MAX_FILE_SIZE_MB`), MIME type checking |

---

## 12. Full Technology Stack Summary

### Backend Stack

| Technology | Version | Category | Why We Used It |
|-----------|---------|----------|---------------|
| **Python** | 3.11+ | Language | Mature ML/data science ecosystem; asyncio support |
| **FastAPI** | >=0.115.0 | Web Framework | Async, auto-docs, Pydantic integration, high performance |
| **Uvicorn** | >=0.34.0 | ASGI Server | Production-grade async Python server with standard extras |
| **SQLAlchemy** | >=2.0.0 | ORM | Async ORM with type-annotated column syntax; PostgreSQL support |
| **asyncpg** | >=0.30.0 | DB Driver | Fastest async PostgreSQL driver for Python |
| **psycopg2-binary** | >=2.9.9 | DB Driver | Sync driver used by Alembic for migrations |
| **aiosqlite** | >=0.21.0 | DB Driver | SQLite async driver for development/testing |
| **Alembic** | >=1.13.0 | Migrations | Schema version control for PostgreSQL |
| **Pydantic** | >=2.0.0 | Validation | Fast Rust-backed request/response validation |
| **pydantic-settings** | >=2.0.0 | Config | Type-safe .env file parsing |
| **python-jose** | >=3.3.0 | JWT | JWT creation and validation (HS256) |
| **bcrypt** | >=4.0.0 | Security | Password hashing |
| **python-multipart** | >=0.0.20 | File Upload | Multipart form data parsing for CSV uploads |
| **SDV (sdv)** | >=1.0.0 | AI | CTGANSynthesizer — deep learning synthetic data |
| **PyTorch** | >=2.0.0 | AI | Neural network framework used internally by SDV/CTGAN |
| **Mimesis** | >=19.0.0 | AI | Rule-based realistic fake data generation |
| **Pandas** | >=2.0.0 | Data | DataFrame manipulation for CSV parsing and processing |
| **NumPy** | >=1.26.0 | Data | Numerical computations in evaluator |
| **SciPy** | >=1.14.0 | Statistics | KS test (`scipy.stats.ks_2samp`) |
| **openpyxl** | >=3.1.5 | Export | XLSX file generation for Excel downloads |
| **httpx** | >=0.28.0 | HTTP | Async HTTP client used in tests |
| **pytest** | >=9.0.0 | Testing | Python test framework |
| **pytest-asyncio** | >=0.26.0 | Testing | Async test support for FastAPI endpoints |
| **python-dotenv** | >=1.0.0 | Config | Load `.env` files into environment |

### Frontend Stack

| Technology | Version | Category | Why We Used It |
|-----------|---------|----------|---------------|
| **React** | ^19.2.5 | UI Framework | Latest stable React with compiler improvements |
| **Vite** | ^8.0.10 | Build Tool | Fastest dev server; instant HMR; Rollup bundler |
| **Tailwind CSS** | ^4.2.4 | Styling | Utility-first CSS; v4's CSS-first config |
| **Zustand** | ^5.0.13 | State | Minimal global state management |
| **React Router DOM** | ^7.14.2 | Routing | Client-side routing with lazy loading |
| **Axios** | ^1.15.2 | HTTP | Interceptor support for auth token management |
| **TanStack React Query** | ^5.100.7 | Server State | Caching, background refetching, optimistic updates |
| **Framer Motion** | ^12.38.0 | Animation | Production-grade animations and transitions |
| **Recharts** | ^3.8.1 | Charts | Admin dashboard data visualization |
| **Lucide React** | ^1.14.0 | Icons | 1000+ clean SVG icons |
| **React Hot Toast** | ^2.6.0 | Notifications | Toast notification system |
| **React Dropzone** | ^15.0.0 | File Upload | Drag-and-drop CSV upload component |
| **React Confetti** | ^6.4.0 | UX | Celebration animation on success |
| **clsx** | ^2.1.1 | Utility | Conditional className composition |
| **ESLint** | ^10.2.1 | Linting | Code quality enforcement |

### Infrastructure Stack

| Technology | Version | Category | Why We Used It |
|-----------|---------|----------|---------------|
| **PostgreSQL** | 15 (Alpine) | Database | Production-grade relational database; full ACID compliance |
| **Docker** | Latest | Containerization | Reproducible environments; no local DB installation needed |
| **Docker Compose** | v3.9 | Orchestration | Multi-container app definition and management |
| **Nginx** | Latest | Web Server | Serves static React bundle; proxies API requests to backend |

---

## 13. Performance Characteristics

### CTGAN Training Performance

| Dataset Size | Columns | Epochs | Approx. Training Time | Notes |
|-------------|---------|--------|----------------------|-------|
| 500 rows | 5 cols | 100 | ~2–4 minutes | Minimum viable dataset |
| 1,000 rows | 10 cols | 100 | ~4–8 minutes | Good for testing |
| 5,000 rows | 15 cols | 100 | ~10–20 minutes | Typical real-world dataset |
| 10,000 rows | 20 cols | 200 | ~30–60 minutes | High-quality large dataset |

*Times are approximate and depend on hardware. CPU-only mode (no GPU) is used for background thread stability.*

### Mimesis Generation Performance

| Rows Requested | Columns | Approx. Generation Time |
|---------------|---------|------------------------|
| 1,000 | 10 | < 100ms |
| 10,000 | 10 | < 500ms |
| 100,000 | 10 | ~2–5 seconds |
| 1,000,000 | 10 | ~20–60 seconds |

### Database Performance

| Operation | Typical Latency | Indexed |
|-----------|----------------|---------|
| User lookup by email | < 1ms | Yes |
| User lookup by username | < 1ms | Yes |
| Download by token | < 1ms | Yes |
| JWT blocklist check | < 1ms | Yes |
| Job history listing (paginated) | < 5ms | via user_id FK |

### API Response Times

| Endpoint | Typical Response Time |
|----------|----------------------|
| `GET /health` | < 50ms |
| `POST /api/auth/login` | < 200ms (bcrypt hashing) |
| `POST /api/generate/mimesis/preview` | < 500ms |
| `POST /api/generate/ctgan` (job creation) | < 100ms (returns job ID) |
| `GET /api/generate/status/{id}` | < 10ms |
| `GET /api/generate/download/{token}` | < 50ms (in-memory file) |

### Frontend Performance

- **Route-level code splitting**: Each page is a separate JS chunk, loaded on-demand
- **Build output**: Multiple chunk files (code splitting reduces initial bundle size)
- **Lint check**: `npm run lint` — passes clean (zero ESLint errors)
- **Production build**: `npm run build` — compiles successfully with Vite/Rollup optimization

---

## 14. Why We Chose Each Technology

### Why CTGAN Instead of Other Synthetic Data Methods?

| Method | Limitations | Why CTGAN is Better |
|--------|-------------|---------------------|
| **Random sampling** | No statistical relationship preserved | CTGAN learns the full joint distribution |
| **Bootstrap resampling** | Just duplicates/shuffles real data — still has real data | Fully synthetic new data |
| **SMOTE** | Only interpolates between existing points | CTGAN can extrapolate and generate novel combinations |
| **Copula models** | Assumes specific dependency structure | CTGAN learns arbitrary correlations |
| **VAE (Variational Autoencoder)** | Tends to blur/average data; mode collapse risk | CTGAN's adversarial training produces sharper distributions |

**CTGAN's Key Innovation**: The conditional vector ensures that rare categories in categorical columns are properly represented in the synthetic data — preventing the common GAN problem where rare classes are ignored.

### Why SDV (Synthetic Data Vault)?

SDV is the production-ready Python library built by the MIT Data to AI Lab. It:
- Wraps CTGAN with proper tabular data handling
- Provides the `Metadata` class for column type annotation
- Handles post-processing (e.g., clipping synthetic values to valid ranges)
- Has 5000+ GitHub stars and active maintenance

### Why Mimesis Over Faker?

| Criterion | Mimesis | Faker |
|-----------|---------|-------|
| Generation speed | 5-10x faster | Standard |
| Memory usage | Lower | Higher |
| Medical data | Available in our custom pool | Limited |
| Financial data | Available | Basic |
| Locale support | 50+ | 20+ |

### Why FastAPI Over Flask or Django?

| Criterion | FastAPI | Flask | Django |
|-----------|---------|-------|--------|
| Performance | Highest | Medium | Lower (synchronous) |
| Async support | Native (asyncio) | Limited | Limited (async views only) |
| Auto-generated docs | Built-in Swagger | Manual | Separate package |
| Type safety | Full (Pydantic) | None | Limited |
| Learning curve | Medium | Low | High |
| Background tasks | Built-in | Celery required | Celery required |

### Why PostgreSQL Over MySQL or SQLite?

| Criterion | PostgreSQL | MySQL | SQLite |
|-----------|-----------|-------|--------|
| JSONB support | Native | Partial | No |
| Full ACID compliance | Yes | Yes | Limited |
| Concurrent connections | Excellent | Good | Poor |
| Array columns | Yes | No | No |
| Docker image | Official, Alpine | Official | N/A |
| Production readiness | Industry standard | Good | Development only |

### Why Docker?

1. **Reproducibility**: "Works on my machine" problem solved — everyone gets identical environments
2. **Dependency isolation**: Python packages, PostgreSQL version, Node.js version all locked
3. **Easy deployment**: `docker-compose up --build` deploys the full stack in one command
4. **No local DB installation**: New developers don't need to install and configure PostgreSQL
5. **Health checks**: Built-in `pg_isready` health check ensures startup order

### Why Zustand Over Redux?

The app's state complexity doesn't justify Redux's boilerplate:
- Redux requires: actions, reducers, selectors, thunks/sagas, store configuration
- Zustand requires: one `create()` call with state + actions in one object
- For a mid-sized app like SynthGen, Zustand provides 95% of Redux's benefits with 10% of the code

### Why Vite Over Webpack/CRA?

- CRA was officially deprecated in 2023
- Vite's native ES module dev server needs no bundling step — near-instant startup
- Vite's production build (Rollup) produces smaller bundles than Webpack for our use case

---

## 15. API Reference & Route Architecture

### Authentication Endpoints (`/api/auth`)

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| POST | `/register` | No | Create account; triggers verification email |
| POST | `/login` | No (email must be verified) | Returns access + refresh tokens |
| POST | `/logout` | Yes (accepts expired) | Adds JTI to blocklist |
| POST | `/refresh` | No | Exchange refresh token for new access token |
| GET | `/me` | Yes | Returns current user profile |
| GET | `/verify-email` | No (token in query) | Mark email as verified |
| POST | `/resend-verification` | No | Resend verification email |
| POST | `/forgot-password` | No | Generate and send password reset token |
| POST | `/reset-password` | No (reset token) | Update password using valid reset token |

### Generation Endpoints (`/api/generate`)

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| POST | `/ctgan` | Yes | Upload CSV/XLSX, starts CTGAN background job |
| GET | `/ctgan/status/{job_id}` | Yes | Poll job status |
| POST | `/mimesis` | Yes | Generate data from schema (synchronous or background) |
| POST | `/mimesis/preview` | Yes | Generate 3 sample rows instantly |
| GET | `/download/{token}` | No (token-based) | Download CSV or XLSX file |
| GET | `/supported-fields` | No | List all 25 Mimesis field types |

### History Endpoints (`/api/history`)

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| GET | `/` | Yes | Paginated job history; filters: mode, status |
| GET | `/{job_id}` | Yes | Full job details with sample rows |
| DELETE | `/{job_id}` | Yes | Delete a specific job record |

### Profile Endpoints (`/api/profile`)

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| GET | `/` | Yes | View profile |
| PATCH | `/` | Yes | Update username |
| PATCH | `/password` | Yes | Change password (requires current password) |
| DELETE | `/` | Yes | Delete account (requires password confirmation) |
| POST | `/avatar` | Yes | Upload profile picture |
| GET | `/avatar/{user_id}` | No | Serve avatar image |

### Admin Endpoints (`/api/admin`)

| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| GET | `/users` | Admin | Paginated user list with search and filters |
| GET | `/users/{id}` | Admin | Single user details |
| PATCH | `/users/{id}/role` | Admin | Change user role |
| PATCH | `/users/{id}/block` | Admin | Block/unblock user |
| DELETE | `/users/{id}` | Admin | Delete user and all associated data |
| GET | `/stats` | Admin | Platform-wide statistics |
| GET | `/logs` | Admin | Activity audit logs |
| GET | `/errors` | Admin | Failed generation error messages |
| DELETE | `/storage/cleanup` | Admin | Clear in-memory file storage |

---

## 16. Testing Strategy

### Backend Testing

**Framework**: `pytest` + `pytest-asyncio`

**Test structure**:
```
backend/tests/
├── test_auth.py           # Registration, login, logout, token refresh
├── test_generation.py     # CTGAN upload, Mimesis generate, download
├── test_history.py        # Job listing, filtering, deletion
├── test_profile.py        # Profile update, password change, avatar
└── test_admin.py          # User management, stats, logs

ai_engine/tests/
├── test_ctgan.py          # CTGANGenerator unit tests
├── test_mimesis.py        # MimesisGenerator unit tests
├── test_evaluator.py      # DataEvaluator metric computation
└── test_preprocessor.py   # PII detection, type inference, missing values
```

**Run all tests**:
```bash
python -m pytest backend/tests ai_engine/tests -q
```

### AI Engine Testing

The evaluator and generator are unit-tested with:
- Known datasets where KS statistics and TVD can be computed manually
- Edge cases: empty columns, all-null columns, single-value categoricals
- PII detection: column names that should and should not be removed
- Type detection: boolean/datetime/continuous/categorical boundary cases

### Frontend Quality Checks

```bash
cd frontend

# ESLint — zero errors required
npm run lint

# Production build — must compile without errors
npm run build
```

**Current Status**:
- `npm run lint` — passes clean
- `npm run build` — successful with route-level code splitting

### Quality Score Validation

To validate the evaluator's correctness:
1. Generate synthetic data with known distribution (e.g., normal distribution)
2. Compare against real data with identical distribution — expected score: ~95-100
3. Compare against random noise — expected score: < 20
4. This sanity check confirms the KS/TVD metrics are working correctly

---

## 17. Team

| Name | Role |
|------|------|
| **Mohamed Ebrahim** | Developer |
| **Mohamed Wael** | Developer |
| **Habiba Khalil** | Developer |
| **Abdelrahman Hussein** | Developer |
| **Amr Sayed** | Developer |

**Supervisor**: Dr. Yasser Kamal
**Institution**: Faculty of Computers and Information Technology
**Academic Year**: 2025-2026

---

## Appendix A: Quality Score Mathematical Summary

### Formulas

**Overall Score:**

```
Overall Score = 0.50 * S_shape + 0.30 * S_corr + 0.20 * S_missing
```

**Shape Score (average per-column similarity):**

```
S_shape = (1 / n_cols) * SUM(similarity_i)
```

Where:
```
similarity_i = (1 - KS_i) * 100       if column i is numeric
similarity_i = (1 - TVD_i) * 100      if column i is categorical
```

**Correlation Score:**

```
S_corr = (1 - (||C_real - C_synth||_F / 2*sqrt(n_num * (n_num - 1)))) * 100
```

**Missing Value Score:**

```
S_missing = (1 - (1/n_cols) * SUM(missing_rate_i)) * 100
```

---

## Appendix B: Complete File Structure

```
SythnticGenerator/
├── .env                            # Environment variables (not committed)
├── .env.example                    # Example env template
├── .gitignore                      # Git ignore rules
├── README.md                       # Project overview and quickstart
├── TECHNICAL_DOCUMENTATION.md      # This file
├── database_schema.md              # Database schema and ER diagram
├── docker-compose.yml              # Multi-container Docker definition
├── pytest.ini                      # Pytest configuration
├── deploy.sh                       # Deployment helper script
│
├── ai_engine/                      # AI generation and evaluation engine
│   ├── __init__.py
│   ├── ctgan_generator.py          # CTGAN training and sampling
│   ├── mimesis_generator.py        # Rule-based data generation (25 types)
│   ├── preprocessor.py             # PII removal, type detection, imputation
│   ├── evaluator.py                # Quality metrics (KS, TVD, Frobenius)
│   ├── schemas.py                  # Pydantic schemas for AI engine
│   └── tests/                      # AI engine unit tests
│
├── backend/                        # FastAPI REST API
│   ├── main.py                     # App entry point, middleware, lifespan
│   ├── config.py                   # Settings (pydantic-settings)
│   ├── database.py                 # SQLAlchemy engine and session
│   ├── models.py                   # ORM models (User, Job, Log, etc.)
│   ├── migrate.py                  # Migration helper
│   ├── seed_admins.py              # Auto-seed admin users on startup
│   ├── requirements.txt            # Python dependencies
│   ├── alembic.ini                 # Alembic configuration
│   ├── alembic/                    # Migration versions
│   ├── routers/                    # HTTP route handlers
│   │   ├── auth.py
│   │   ├── generation.py
│   │   ├── history.py
│   │   ├── profile.py
│   │   ├── admin.py
│   │   └── health.py
│   ├── services/                   # Business logic layer
│   │   ├── auth_service.py
│   │   ├── ctgan_service.py
│   │   ├── mimesis_service.py
│   │   ├── email_service.py
│   │   ├── storage_service.py
│   │   └── logger_service.py
│   ├── middleware/                  # Custom middleware
│   │   └── error_handler.py
│   └── tests/                      # Backend integration tests
│
├── frontend/                       # React 19 + Vite 8 SPA
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Node.js dependencies
│   ├── vite.config.js              # Vite + Tailwind + proxy config
│   └── src/
│       ├── App.jsx                 # Root component
│       ├── main.jsx                # React DOM entry
│       ├── index.css               # Global styles
│       ├── components/             # Reusable components
│       ├── pages/                  # Route pages
│       ├── hooks/                  # Custom hooks
│       ├── services/               # API service functions
│       ├── store/                  # Zustand state stores
│       ├── router/                 # Route definitions
│       └── utils/                  # Utilities
│
└── docker/                         # Dockerfile definitions
    ├── backend/
    │   └── Dockerfile              # Python 3.11 + FastAPI backend image
    └── frontend/
        └── Dockerfile              # Node build + Nginx serving image
```

---

*Generated: June 2026 | SynthGen v1.0 | MIT License*
