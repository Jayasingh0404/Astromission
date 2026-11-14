# ASTROMISSION — Junior Astronaut Mission Trainer

> **“Your Mission. Your Decisions. Your Survival.”**  
> **NASA Space Apps Challenge 2026 — Build a Junior Astronaut Mission Trainer**

**ASTROMISSION** is a full-stack, interactive 3D space mission simulator, deterministic systems-engineering engine, and AI-assisted STEM learning platform where students step into the role of Space Mission Commanders establishing and maintaining human outposts on the **Lunar South Pole (Moon)** or **Jezero Crater (Mars)**.

---

## Core Capabilities

1. **Interactive 3D Space Exploration Game (with 2D Tactical Blueprint Fallback)**:
   - Built with **Three.js, React Three Fiber, and Drei**.
   - Distinct **Moon (Shackleton Crater Rim)** and **Mars (Jezero Delta)** 3D environments with animated rovers, astronauts, crater topography, and weather lighting.
   - **12 Constructible & Upgradable Facilities**: Crew Habitat, Photovoltaic Solar Array, Regenerative Battery Bank, Oxygen Generator Assembly (OGA), Closed-Loop Water Recycler (WPA), Hydroponic Greenhouse, Regolith Radiation Shelter, Deep Space Comm Array, Crew Medical Bay, Robotics Maintenance Workshop, Pressurized Rover Garage, and Planetary Science Lab.
   - Instant toggle to a **2D Tactical Outpost Blueprint** view (and automatic WebGL fallback for unsupported hardware).

2. **Real-Time / Turn-Based Space Mission Simulation Engine**:
   - Authoritative server-side Python simulation engine (`backend/app/engine/simulator.py`) completely decoupled from 3D graphics.
   - Tracks **7 Interconnected Resource & Safety Systems** in consistent physical units:
     - **Oxygen ($\text{kg}$)**, **Potable Water ($\text{L}$)**, **Food ($\text{kg}$)**, **Electrical Energy ($\text{kWh}$)**, **Radiation Shielding ($\%$) & Cumulative Exposure ($\text{mSv}$)**, **Crew Health ($\%$)**, and **Infrastructure Condition ($\%$)**.
   - **15 Configurable Environmental & Emergency Events** (Solar Particle Events, Martian Dust Storms, Water Processor Saturation, OGA Pressure Faults, Airlock Seal Abrasion, Ice Vein Discoveries, etc.) with multi-option engineering trade-offs.
   - **Transparent Weighted Scoring System** evaluating Crew Safety ($25\%$), Resource Management ($20\%$), Energy Efficiency ($15\%$), Infrastructure Stability ($15\%$), Emergency Decision-Making ($15\%$), and Mission Objectives ($10\%$).

3. **COMMANDER AI & Integrated Voice Assistant**:
   - Context-aware mission specialist (`backend/app/ai/commander.py`) receiving live session telemetry.
   - Structured 5-part educational responses: *Situation*, *Systems Explanation*, *Possible Decisions*, *Engineering Trade-Offs*, and *Verified NASA Learning Fact*.
   - Integrated **Web Speech API Speech-to-Text (Microphone)** and **Text-to-Speech (Spoken Narration)** with graceful text fallback.

4. **Educational Learning Center, Analytics, Classrooms & Admin Console**:
   - **8 NASA-Referenced STEM Modules & Interactive Quizzes** with immediate explanations and **English + Hindi (हिन्दी)** bilingual support.
   - **Recharts Analytics Dashboard** plotting authentic session resource snapshots over time.
   - **10 Achievement Badges**, XP progression, and mission streaks.
   - **Teacher Classroom Dashboard** (create classrooms, share join code `ASTRO2026`, assign Moon/Mars missions, compare student performance, and export CSV reports).
   - **Administrator Dashboard** (role management, scenario configuration, system health, and security audit logs).

---

## Project Architecture

```text
astromission/
├── backend/
│   ├── app/
│   │   ├── ai/            # COMMANDER AI service & NASA telemetry knowledge engine
│   │   ├── api/           # Versioned FastAPI REST endpoints (/api/v1/*)
│   │   ├── config/        # Environment settings (Pydantic Settings)
│   │   ├── core/          # SQLAlchemy engine, JWT auth & bcrypt security
│   │   ├── engine/        # Deterministic simulator.py & scientific catalog.py
│   │   ├── models/        # Normalized 22-table SQLAlchemy ORM entities
│   │   ├── schemas/       # Pydantic request/response validation schemas
│   │   ├── services/      # Idempotent database seeder (seed_service.py)
│   │   └── main.py        # FastAPI application entrypoint
│   ├── migrations/        # Alembic migration environment & initial schema revision
│   ├── tests/             # Pytest unit & integration test suite (Flows 1–4)
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar & CommanderAIPanel (with Voice STT/TTS)
│   │   ├── pages/         # All 10 functional application pages
│   │   ├── services/      # Typed REST API client (api.ts)
│   │   ├── store/         # Zustand mission state store (useMissionStore.ts)
│   │   ├── three/scenes/  # OutpostScene3D.tsx + OutpostBlueprint2D fallback
│   │   ├── types/         # TypeScript domain interfaces
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json
├── docs/                  # Architecture, simulation rules, schema, API, NASA refs, user guide
├── .env.example
├── render.yaml
└── DEVELOPMENT_STATUS.md
```

---

## Quick Start — Running Locally

### Prerequisites
- **Python 3.11+** (tested with Python 3.13)
- **Node.js 18+** and **npm**
- **PostgreSQL 14+** (optional for local dev — defaults to zero-config SQLite `sqlite:///./astromission.db` out of the box, or set `DATABASE_URL=postgresql+psycopg2://...` in `.env` for PostgreSQL)

### 1. Environment Configuration
```bash
cp .env.example .env
```

### 2. Backend Setup & Run (FastAPI on Port 8000)
```bash
# Create virtual environment (if not already created)
python3 -m venv .venv

# Install Python dependencies
.venv/bin/pip install -r backend/requirements.txt

# Run database migrations (optional; startup lifespan also initializes and seeds all 22 tables automatically)
cd backend && ../.venv/bin/alembic upgrade head && cd ..

# Start the FastAPI backend server
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Backend API: `http://localhost:8000/api/v1/health`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 3. Frontend Setup & Run (Vite + React on Port 5173)
```bash
# Install frontend packages
npm install --prefix frontend

# Start the Vite development server
npm run dev --prefix frontend
```
- Open **`http://localhost:5173`** in your browser.

---

## Running Automated Tests & Production Builds

### Backend Unit & Integration Tests (Pytest)
```bash
PYTHONPATH=backend .venv/bin/pytest backend/tests/test_astromission.py -v
```

### Frontend Unit Tests (Vitest) & Production Bundle
```bash
npm test --prefix frontend
npm run build --prefix frontend
```

---

## Pre-Seeded Demo Accounts & Walkthrough

On startup, the backend automatically seeds all 12 facilities, Moon & Mars scenarios, 15 hazard events, 8 learning modules + quizzes, 10 NASA references, and 3 demo role accounts (accessible in 1 click on the `/auth` page):

| Role | Email / Username | Password | Features to Test |
| :--- | :--- | :--- | :--- |
| **Student** | `student@astromission.edu` | `StudentPassword123!` | Launch Moon/Mars missions, earn achievements, take quizzes |
| **Teacher** | `teacher@astromission.edu` | `TeacherPassword123!` | Manage classroom `ASTRO2026`, assign labs, export CSV reports |
| **Admin** | `admin@astromission.edu` | `AdminPassword123!` | Access `/admin` console, manage user roles, edit scenarios, view audit logs |
| **Guest** | *1-Click Guest Button* | *None required* | Play complete Moon & Mars missions without registration |

---

## Online Deployment Instructions

- **Backend & Database (Render)**: Deploy using the root `render.yaml` Blueprint, which provisions a managed PostgreSQL database (`astromission-postgres`) and runs `alembic upgrade head` + `uvicorn app.main:app`.
- **Frontend (Vercel)**: Import the `frontend/` directory into Vercel, set `VITE_API_BASE_URL` to your deployed backend `/api/v1` URL, and deploy with `frontend/vercel.json` SPA rewrites enabled.

---

## Scientific Disclaimer

ASTROMISSION is an independent educational engineering simulation created for the NASA Space Apps Challenge 2026. Simulation parameters are game-balanced abstractions inspired by published NASA ECLSS, Artemis, and Mars reference literature (documented in `docs/scientific-references.md`) and do not represent official NASA endorsement or operational flight predictions.

