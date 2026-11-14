# ASTROMISSION — Normalized 22-Table Database Schema

The persistence layer (`backend/app/models/entities.py`) defines 22 normalized relational tables managed via SQLAlchemy 2.x and Alembic migrations (`backend/migrations/`):

| # | Table Name | Primary Key | Foreign Keys & Indexes | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `users` | `id` (UUID) | Indexed `username`, `email`, `role` | Stores student, teacher, admin, and guest accounts with bcrypt password hashes. |
| 2 | `user_profiles` | `id` (UUID) | `user_id -> users.id` (CASCADE) | Display name, avatar, bio, language (`en`/`hi`), XP, level, streak, and skill progress. |
| 3 | `classrooms` | `id` (UUID) | `teacher_id -> users.id`, unique `join_code` | Educator classrooms with learning objectives and joining codes (e.g., `ASTRO2026`). |
| 4 | `classroom_members` | `id` (UUID) | `classroom_id`, `student_id` (Unique pair) | Maps enrolled students to classrooms. |
| 5 | `missions` | `id` (String) | Indexed `planet` | Scenario templates for Moon (`moon-shackleton-outpost`) and Mars (`mars-jezero-colony`). |
| 6 | `mission_sessions` | `id` (UUID) | `user_id`, `mission_id`, `classroom_assignment_id` | Active and completed playthrough states, deterministic seed, day counter, and JSON resources. |
| 7 | `resource_snapshots` | `id` (UUID) | `session_id -> mission_sessions.id` | Daily historical telemetry snapshots for Recharts analytics. |
| 8 | `facilities` | `id` (String) | Catalog PK | Master catalog of all 12 constructible outpost facilities and their physical parameters. |
| 9 | `session_facilities` | `id` (UUID) | `session_id`, `facility_id` | Installed buildings in a session with level, condition ($\%$), 3D grid coordinates (`grid_x`, `grid_z`), and power priority. |
| 10 | `player_actions` | `id` (UUID) | `session_id` | Immutable audit trail of player builds, upgrades, repairs, crew ops, and day advances. |
| 11 | `mission_events` | `id` (String) | Catalog PK | Master catalog of 15 environmental and emergency events with multi-option trade-offs. |
| 12 | `event_choices` | `id` (UUID) | `session_id`, `event_id` | Triggered session events, pending/resolved status, chosen option, and applied resource deltas. |
| 13 | `mission_results` | `id` (UUID) | `session_id` (Unique), `user_id` | Final weighted score breakdown, best decisions, mistakes, and educational insights. |
| 14 | `achievements` | `id` (String) | Catalog PK | 10 gamification badges with XP rewards and unlock criteria. |
| 15 | `user_achievements` | `id` (UUID) | `user_id`, `achievement_id` (Unique pair) | Tracks badges unlocked by each player. |
| 16 | `learning_modules` | `id` (String) | `reference_id -> educational_references.id` | Structured STEM learning modules with English & Hindi translations. |
| 17 | `quizzes` | `id` (String) | `module_id -> learning_modules.id` | Multiple-choice knowledge check definitions per module. |
| 18 | `quiz_attempts` | `id` (UUID) | `user_id`, `quiz_id` | Student quiz submissions, scores, percentages, and per-question explanations. |
| 19 | `mission_assignments` | `id` (UUID) | `classroom_id`, `mission_id` | Teacher-assigned Moon/Mars mission labs for a classroom. |
| 20 | `educational_references`| `id` (String) | Catalog PK | Verified NASA technical and educational references with URLs and verification dates. |
| 21 | `notifications` | `id` (UUID) | `user_id`, `session_id` | In-app achievement and mission alert notifications. |
| 22 | `audit_logs` | `id` (UUID) | `actor_user_id -> users.id` | Security and administrative audit trail for role and scenario changes. |

