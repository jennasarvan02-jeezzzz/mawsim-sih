# FreightIQ — Intelligent Freight Forecasting and Vessel Chartering Decision Platform

**Smart India Hackathon (SIH) 2026** — Maritime Logistics & Industrial Bulk Procurement Track

---

## ⚓ Executive Summary & Problem Context

Large Indian industrial organizations and steel manufacturing plants import massive quantities of metallurgical coking coal from overseas origins (Australia, Indonesia, Mozambique, USA, Russia) to India’s East Coast ports (Paradip, Visakhapatnam). 

Chartering dry bulk vessels in these trade corridors is fraught with friction:
- **Volatile Freight Rates:** Daily fluctuations in spot shipping rates lead to unhedged budget variances.
- **Reactive Spot Fixtures:** Repeated single spot bookings increase positioning premiums, queuing delays, and demurrage exposure.
- **Port & Berth Restrictions:** Ports have strict physical envelopes for maximum draft, LOA, beam, and mechanized handling rates (e.g., Paradip Mechanized Coal Berth is limited to 14.5m draft, whereas Capesize vessels require ≥17.5m).
- **The False Economy of "Cheaper" Ships:** A vessel that appears cheaper per metric tonne on paper may be physically unsuitable or trigger massive deadfreight losses due to underutilization.

**FreightIQ** provides an explainable, data-backed decision-support system that transitions bulk procurement managers from reactive single spot bookings to strategic, multi-voyage contract planning with full physical feasibility verification.

---

## 🚀 Key Features Across 6 Screens

| Screen | Route | Key Capabilities |
| :--- | :--- | :--- |
| **1. Landing Page** | `/` | Value proposition, 3-step decision flow, SIH default scenario preview, quick module navigation. |
| **2. Cargo Requirement** | `/analyze` | Parcel query form (pre-filled with default demo values), corridor validation guard, multi-step analysis loader. |
| **3. Forecast Dashboard** | `/dashboard/:id` | Core recommendation cards, Recharts 30-day forecast with 95% confidence interval area band, 4 plain-language reasons, full vessel comparison matrix. |
| **4. Port Intelligence** | `/port-intelligence/:id` | Abstract ocean corridor timeline, terminal spec cards (draft, LOA, beam, handling rates), 4-vessel physical clearance matrix (explaining Capesize rejection at Paradip). |
| **5. Risk & Alerts Center** | `/risks/:id` | Quantitative 0–100 composite risk score, 4-factor weighting breakdown, 6 categorized alert cards with impact and mitigation protocols. |
| **6. Multi-Voyage Planner** | `/contract-planner/:id` | 90-day 4-voyage simulation (300k MT), staggered laycan schedule table, side-by-side Repeated Spot vs COA comparison, cost comparison bar chart, savings analysis. |

---

## 🗄️ Database & Supabase Integration

FreightIQ supports **Supabase (PostgreSQL)** for cloud persistence, as well as a local SQLite fallback for offline development and evaluation.

### Option A: Using Supabase (Cloud PostgreSQL)
1. In your **Supabase Dashboard** (`https://supabase.com`):
   - Create a new project or select an existing one.
   - Go to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection string (URI)**.
2. Open `backend/.env` (or copy from `backend/.env.example`) and set your Supabase database connection string:
   ```env
   # Transaction pooler (recommended for FastAPI):
   DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require

   # Or Direct connection:
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres?sslmode=require

   # Optional API keys:
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_KEY=your-anon-or-service-role-key
   ```
3. *(Optional)* Run [`backend/supabase_schema.sql`](file:///c:/Users/bharg/OneDrive/Documents/freight_forecasting_update/backend/supabase_schema.sql) in the **Supabase SQL Editor** to initialize table structures, indexes, and reference ports/vessels with a single click.

### Option B: Local SQLite Fallback (Zero Config)
- If `DATABASE_URL` is omitted in `backend/.env`, FreightIQ automatically defaults to a local SQLite database (`sqlite:///./freightiq.db`), requiring zero cloud credentials to run.

---

## 🏷️ Data Provenance & Trust Framework

To prevent misleading claims, every metric in FreightIQ is explicitly tagged with a `DataProvenanceBadge`:
- **`User Input`**: User-defined parcel parameters (volume, arrival dates, contract preference).
- **`Official-source Prototype Configuration`**: Port draft limits, LOA, beam, handling rates.
- **`Sample Historical Prototype Data`**: Deterministic 60-day historical spot rates calibrated to realistic market levels.
- **`Simulated Scenario Data`**: Port queuing wait hours, voyage cycle transit timelines.
- **`Prototype Assumption`**: Heuristic parameters (e.g. +6% spot volatility buffer, -4% COA volume discount).

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Recharts, Lucide React, Axios.
- **Backend:** Python 3.11+, FastAPI, Supabase Python SDK, PostgreSQL (`psycopg2-binary`), Pydantic v2, SQLAlchemy, SQLite, Uvicorn.
- **Testing:** Pytest, HTTPX, Pytest-Asyncio.
- **Architecture:** Modular architecture supporting both Supabase PostgreSQL and local-first persistence.

---

## 📂 Repository Structure

```
freight_forecasting_update/
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, FreightChart, RouteVisualizer, DataProvenanceBadge, LoadingOverlay
│   │   ├── pages/           # LandingPage, AnalyzePage, DashboardPage, PortIntelligencePage, RiskAlertsPage, ContractPlannerPage
│   │   ├── services/        # Typed API client
│   │   ├── types/           # Complete TypeScript interface contracts
│   │   ├── App.tsx          # React Router layout
│   │   └── main.tsx         # React root
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── config/          # Settings, Supabase credentials, risk weights & cost buffer rates
│   │   ├── models/          # SQLAlchemy database tables (12 entities) & Supabase engine
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   ├── repositories/    # Database CRUD layer
│   │   ├── seed/            # Deterministic 60-day seed generator
│   │   ├── services/        # Feasibility, forecasting, cost, risk & contract services
│   │   ├── routers/         # /ports, /recommendations, /contract-plans
│   │   └── main.py          # FastAPI application entrypoint with CORS
│   ├── tests/               # 10 Pytest unit & integration test suites
│   ├── supabase_schema.sql  # Copy-paste SQL script for Supabase SQL Editor
│   ├── .env.example         # Environment template for Supabase URL & Database URI
│   ├── pytest.ini           # Pytest path settings
│   └── requirements.txt     # Backend dependencies including psycopg2-binary & supabase
│
├── docs/
│   ├── product-requirements.md  # PRD & scope
│   ├── api-contract.md          # Complete REST API specifications
│   ├── decision-logic.md        # Mathematical formulation & formulas
│   ├── data-inventory.md        # Data dictionary & provenance
│   └── demo-script.md           # 3-5 minute live hackathon presentation script
│
├── README.md
└── .gitignore
```

---

## ⚡ Quick Start Guide (Run Locally)

### 1. Start Backend Service (FastAPI)
```powershell
# Navigate to backend
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API will run at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.*

### 2. Start Frontend Application (React + Vite)
```powershell
# Open a new terminal and navigate to frontend
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
*Web application will open at `http://localhost:5173`.*

---

## 🧪 Running Automated Tests

Run the full backend test suite:
```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests -v
```
All 10 test suites validate:
1. Physical draft/LOA/beam feasibility rules
2. Capesize rejection at Paradip Port due to 14.5m draft restriction
3. Explainable time-series forecasting & 95% confidence bounds
4. Total landed cost & buffer calculations
5. 0–100 composite risk scoring & structured alert generation
6. Recommendation ranking & plain-language reason generation
7. 90-day 4-voyage multi-voyage contract planning & Repeated Spot vs COA comparison

---

## 🎯 Default Demonstration Scenario

To immediately experience FreightIQ during live evaluation:
1. Open `http://localhost:5173/` and click **"Analyze Charter Requirement"**.
2. Form loads with the SIH baseline scenario:
   - **Cargo:** Coking Coal (Metallurgical Bulk)
   - **Quantity:** 75,000 MT
   - **Origin Port:** Port of Newcastle, Australia
   - **Destination Port:** Paradip Port, India
   - **Arrival Window:** 10 October 2026 – 20 October 2026
   - **Contract Preference:** Short-Term Multiple Voyage (90 Days)
   - **Urgency:** High
3. Click **"Execute Decision Analysis"** to inspect:
   - Why **Panamax** is selected (#1 Rank) and **Capesize is rejected** (17.5m draft vs 14.5m Paradip limit).
   - Expected rate: **\$28.40 / MT** (Range: \$26.05 – \$30.75 / MT).
   - Optimal market-entry window: **15 Sep 2026 – 22 Sep 2026**.
   - 90-Day COA savings: **~\$852,000 USD** (9.4% cost efficiency) with operational reliability increasing from **65% (spot)** to **88% (contract)**.

---

## ⚖️ Limitations & Prototype Disclaimer

> [!IMPORTANT]
> **FreightIQ is an explainable decision-support prototype built for Smart India Hackathon 2026.**
> - Port dimensions and handling rates are prototype baseline configurations; live operational berth notices and official daily tide tables must be verified prior to actual commercial fixtures.
> - Historical and forecast freight rate series are deterministic synthetic models calibrated to realistic market levels and do not constitute binding commercial quotations or guaranteed savings.
> - Actual fixture terms require bilateral charter party negotiations between charterers and shipowners.
