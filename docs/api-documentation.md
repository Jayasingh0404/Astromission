# ASTROMISSION — REST API Documentation (`/api/v1`)

Interactive OpenAPI / Swagger documentation is automatically served by FastAPI at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Base Path
`/api/v1`

## Endpoint Summary

### Authentication (`/api/v1/auth`)
- `POST /auth/register` — Register a new Student or Teacher account.
- `POST /auth/login` — Authenticate with username/email and password; returns JWT `access_token` and `refresh_token`.
- `POST /auth/guest` — Provision an instant Guest Commander session and JWT token.
- `POST /auth/logout` — Log out current session.
- `POST /auth/refresh` — Exchange a valid `refresh_token` for a new `access_token`.
- `POST /auth/forgot-password` — Reset user password.
- `GET /auth/me` — Retrieve current authenticated user profile.

### Missions & Simulation Sessions (`/api/v1/missions`, `/api/v1/sessions`)
- `GET /missions` — List active Moon and Mars mission scenarios.
- `GET /missions/{mission_id}` — Get detailed configuration for a scenario.
- `GET /facilities/catalog` — List all 12 constructible outpost facilities and their physical specs.
- `POST /sessions` — Initialize and launch a new Moon or Mars mission session.
- `GET /sessions/{session_id}` — Retrieve complete session state (resources, environment, 3D facilities, events, objectives).
- `POST /sessions/{session_id}/start` — Mark session active.
- `POST /sessions/{session_id}/pause` — Pause active session.
- `POST /sessions/{session_id}/resume` — Resume paused session.
- `POST /sessions/{session_id}/advance` — Execute the 16-step daily simulation engine to advance by 1 mission day (supports idempotency `action_token`).
- `GET /sessions/{session_id}/history` — Retrieve action log and event history.
- `GET /sessions/{session_id}/report` — Retrieve weighted score breakdown, insights, and historical snapshots.

### Actions, Facilities, Events & Resources
- `POST /sessions/{session_id}/actions` — Execute crew operations (`rover_sortie`, `emergency_o2`, `ration`).
- `GET /sessions/{session_id}/facilities` — List installed facilities in the session.
- `POST /sessions/{session_id}/facilities` — Construct a new facility at 3D coordinates `(grid_x, grid_z)`.
- `PATCH /sessions/{session_id}/facilities/{facility_id}` — Upgrade facility level, toggle power state, or adjust power priority.
- `POST /sessions/{session_id}/facilities/{facility_id}/repair` — Repair facility condition to $100\%$.
- `GET /sessions/{session_id}/events` — List session environmental events.
- `POST /sessions/{session_id}/events/{event_id}/choose` — Apply player engineering decision (`A`, `B`, or `C`) to a pending emergency event.
- `GET /sessions/{session_id}/resources` — Get authoritative resource telemetry.
- `GET /sessions/{session_id}/resources/history` — Get daily resource snapshots for Recharts time-series graphs.

### COMMANDER AI Mentor (`/api/v1/mentor`)
- `POST /mentor/ask` — Ask COMMANDER AI a question with live session telemetry context; returns structured 5-part guidance + spoken summary + NASA reference.
- `POST /mentor/explain-event` — Get contextual scientific & trade-off analysis for an active emergency event.
- `POST /mentor/explain-result` — Get a post-mission engineering debrief.

### Learning Center, Profile, Analytics, Classroom & Admin
- `GET /learning/modules`, `GET /learning/modules/{module_id}`, `GET /learning/quizzes`, `POST /learning/quizzes/{quiz_id}/attempt`, `GET /learning/references`
- `GET /profile`, `PATCH /profile`, `GET /analytics/overview`, `GET /analytics/missions`
- `GET /classrooms`, `POST /classrooms`, `POST /classrooms/join`, `GET /classrooms/{classroom_id}`, `POST /classrooms/{classroom_id}/assignments`, `GET /classrooms/{classroom_id}/reports`
- `GET /admin/users`, `PATCH /admin/users/{user_id}/role`, `GET /admin/scenarios`, `POST /admin/scenarios`, `PATCH /admin/scenarios/{scenario_id}`, `GET /admin/health`, `GET /admin/audit-logs`

