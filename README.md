# AgriSense — Precision Agriculture IoT & Agronomy AI

A production-ready fullstack platform bifurcated into a **React + TypeScript** frontend and a **FastAPI (Python)** backend with SQLite database persistence and secure server-side AI integrations.

---

## 🏗️ Architecture Overview

```text
agrisense-fullstack/
├── backend/                        # FastAPI Application
│   ├── app/
│   │   ├── main.py                 # App entrypoint, CORS, startup seeding
│   │   ├── config.py               # Pydantic BaseSettings, loads .env
│   │   ├── database.py             # SQLAlchemy session & SQLite engine
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── routes/                 # REST API endpoints (sensors, controls, ai, etc.)
│   │   └── services/               # AI reasoning filter, database seeder
│   ├── .env                        # Server-side secrets (never exposed to browser)
│   ├── .env.example                # Example configuration
│   ├── requirements.txt            # Python dependencies
│   ├── test_api.py                 # Automated backend test suite
│   └── agrisense.service           # systemd production service unit
│
└── frontend/                       # React 19 + TypeScript (Vite)
    ├── src/
    │   ├── api/                    # Reusable typed API services & client
    │   ├── components/layout/      # Sidebar, Header, MobileNav
    │   ├── components/common/      # UIStates (Loading, Error, Empty, Sparklines)
    │   ├── pages/                  # Modular screen components (Home, Controls, AI, etc.)
    │   ├── types/                  # Strict TypeScript interfaces
    │   ├── App.tsx                 # Root application with responsive layout
    │   └── index.css               # Design tokens, emerald styling, dark theme
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts              # Vite proxy configuration
```

---

## 🚀 Quickstart Guide

### 1. Backend (FastAPI)

```bash
cd backend

# (Optional) Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Interactive Redoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Frontend (React + TypeScript)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

* **Live Dashboard**: [http://localhost:5173/](http://localhost:5173/)

---

## 🔒 Security Enhancements
* **No Client-Side Secrets**: All API keys (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GMAPS_KEY`) are stored in `backend/.env`.
* **Reasoning Token Cleanup**: AI calls pass through `strip_reasoning()` server-side to guarantee clean responses without chain-of-thought leaking.
* **Database Isolation**: The browser communicates only via REST APIs; direct database access is completely decoupled.

---

## 🐧 Production Deployment (systemd)

For persistent background execution on Linux:

1. Copy the backend code to `/opt/agrisense/backend`
2. Copy `backend/agrisense.service` to `/etc/systemd/system/agrisense.service`
3. Reload systemd and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable agrisense
sudo systemctl start agrisense
sudo systemctl status agrisense
```
