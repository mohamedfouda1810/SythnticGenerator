# SynthGen 🧬

> **AI-Powered Synthetic Data Generation Platform**  
> Faculty of Computers and Information Technology | Academic Year 2025–2026

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## What is SynthGen?

SynthGen is a full-stack web platform for generating high-quality synthetic tabular data. It combines deep learning (CTGAN) and rule-based generation (Mimesis) to produce privacy-safe datasets that preserve the statistical properties of your original data.

Whether you need to augment training datasets, create test data for development, or share data without exposing sensitive information, SynthGen provides an intuitive web interface that requires zero machine learning expertise.

## ✨ Features

- 🧠 **CTGAN Generation** — Upload CSV/Excel → AI learns patterns → generates realistic synthetic data
- 📋 **Rule-Based Generation** — Define schemas with 25+ field types → instant structured data
- 🔒 **Privacy Preserving** — Automatic PII detection and removal
- 📊 **Quality Metrics** — Statistical quality scores for every generated dataset
- 📁 **Multiple Formats** — Download as CSV or Excel
- 📜 **Generation History** — Track all previous generations with re-download
- 👤 **User Authentication** — JWT-based auth with role management
- 🛡️ **Admin Dashboard** — User management, analytics, activity logs
- 🎨 **Premium UI** — Dark theme with animations, glassmorphism, and micro-interactions
- 🐳 **Docker Ready** — One-command deployment with Docker Compose

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/synthgen.git
cd synthgen

# Backend setup
pip install -r backend/requirements.txt

# Frontend setup
cd frontend
npm install
cd ..
```

### Running Locally

```bash
# Terminal 1 — Backend (from project root)
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend (from frontend/)
cd frontend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Running with Docker

```bash
docker-compose up --build
```

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, Vite, Tailwind CSS v4 | UI framework |
| Animations | Framer Motion | Page transitions, micro-interactions |
| State | Zustand | Auth state management |
| Charts | Recharts | Admin dashboard visualizations |
| Backend | FastAPI, Uvicorn | REST API server |
| Database | SQLAlchemy + SQLite (async) | ORM + storage |
| Auth | JWT (python-jose), bcrypt | Authentication |
| AI Engine | SDV (CTGAN), Mimesis | Data generation |
| Deployment | Docker, nginx | Containerized hosting |

## 👥 Team

| Name | Role |
|------|------|
| Habiba Khalil | Team Member |
| Abdelrahman Hussein | Team Member |
| Mohamed Wael | Team Member |
| Mohamed Ebrahim | Team Member |
| Amr Sayed | Team Member |

**Supervisor**: Dr. Yasser Kamal

## 📄 License

MIT
"# SythnticGenerator" 
"# SythnticGenerator" 
