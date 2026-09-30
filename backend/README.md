# FreightIQ — Backend Service

Lightweight, local-first Python FastAPI service providing vessel clearance evaluation, time-series freight forecasting, landed cost modeling, 0–100 risk scoring, and multi-voyage contract planning.

---

## Technology Stack
- **Python 3.11+**
- **FastAPI** (REST API framework)
- **SQLAlchemy** & **SQLite** (Local-first persistence)
- **Pydantic v2** (Data validation & API schemas)
- **Pytest** & **HTTPX** (Automated testing suite)

---

## Directory Structure
```
backend/
├── app/
│   ├── config/          # Settings, risk weights & cost buffer rates
│   ├── models/          # SQLAlchemy database tables (12 entities)
│   ├── schemas/         # Pydantic v2 schemas matching API contracts
│   ├── repositories/    # Clean data access layer
│   ├── seed/            # Deterministic 60-day historical seed data generator
│   ├── services/        # Feasibility, forecasting, cost, risk & contract engines
│   ├── routers/         # API routes for /ports, /recommendations, /contract-plans
│   └── main.py          # FastAPI application entrypoint with lifespan startup & CORS
├── tests/               # Pytest unit & integration test suite
├── pytest.ini           # Pytest pythonpath configuration
└── requirements.txt     # Backend dependencies
```

---

## Setup & Running Locally

### 1. Create and Activate Virtual Environment
```powershell
# Create venv
python -m venv .venv

# Activate venv (Windows PowerShell)
.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Run FastAPI Backend
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Swagger UI): `http://localhost:8000/docs`  
Health Check: `http://localhost:8000/health`

---

## Running Automated Tests
```powershell
pytest tests -v
```
All 10 test suites validate feasibility rules, forecasting intervals, landed costs, composite risk scores, recommendations, and multi-voyage contract schedules.
