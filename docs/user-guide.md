# ASTROMISSION — Student, Educator & Judge User Guide

## 1. Getting Started (Student / Guest Flow)

1. **Open the Landing Page**: Click **Start Mission** (or visit `/auth` to sign in, register, or click **Continue as Guest Commander**).
2. **Select Your Planet (`/missions`)**:
   - **Moon — Artemis Shackleton Crater Outpost**: High peak sunlight ($100\%$), deep shadow periods on Days 6–7 & 13–14 ($22\%$ solar), higher unshielded radiation ($1.35\text{ mSv/day}$), and abrasive lunar regolith.
   - **Mars — Ares Jezero Delta Research Base**: Reduced solar flux ($68\%$), regional Martian dust storms, thin $\text{CO}_2$ atmosphere ($0.78\text{ mSv/day}$), and long-duration agricultural trade-offs.
3. **Configure Your Briefing (`/briefing`)**:
   - Adjust **Mission Duration** ($5\text{--}35$ days), **Crew Size** ($2\text{--}8$ astronauts), **Difficulty** (`Beginner`, `Intermediate`, `Expert`), and **Starting Cargo Manifest**.
   - Click **LAUNCH 3D MISSION CONTROL**.

## 2. Commanding Your 3D Outpost (`/mission-control/:sessionId`)

- **Explore in 3D or 2D**: Drag to rotate the 3D camera, scroll to zoom, and click any 3D module to inspect it. Click **2D Blueprint** in the top bar anytime to toggle the tactical engineering grid view.
- **Construct & Upgrade Facilities (Right Sidebar)**:
  - Use the **Build (12)** tab to deploy Solar Arrays, Battery Banks, Oxygen Generators, Water Recyclers, Greenhouses, Radiation Shelters, Comm Stations, Medical Bays, Maintenance Workshops, Rover Garages, or Science Labs.
  - Click **Place on Grid** to click a specific location on the 3D surface or 2D pad, or click **+ Build** for automatic placement.
  - Use the **Inspect** tab to **Upgrade** a selected facility (up to Level 3), **Repair** regolith wear, or toggle it to **Standby** during power shortages.
- **Execute Crew Operations (`Crew Ops` tab)**:
  - **Launch Rover Ice Sortie**: Spend $16\text{ kWh}$ and $2.0\text{ kg O}_2$ to harvest $+32\text{ L}$ water ice and $+5$ Science Points.
  - **Emergency $\text{O}_2$ Electrolysis Surge**: Convert $15\text{ L}$ water and $18\text{ kWh}$ into $+8.0\text{ kg}$ emergency oxygen.
- **Respond to Emergencies**: When a Solar Storm, Martian Dust Storm, or equipment fault triggers, read the scientific explanation in the red Emergency Banner and choose **Option A, B, or C** based on your current resource reserves.
- **Consult COMMANDER AI (Text & Voice)**: Click **Commander AI** to ask questions via keyboard or microphone speech-to-text, and click **Voice On / Speak** to hear spoken explanations.
- **Advance Mission Days**: Click **End Day** in the top-right bar to run the server-side simulation engine for the next day.

## 3. Demo Accounts for Role Evaluation (`/auth`)

On the `/auth` page, click any of the **1-Click Demo Role Evaluation** buttons:
- **Student**: `student@astromission.edu` / `StudentPassword123!`
- **Teacher / Educator**: `teacher@astromission.edu` / `TeacherPassword123!` (Pre-configured with Classroom code `ASTRO2026`)
- **Administrator**: `admin@astromission.edu` / `AdminPassword123!` (Unlocks `/admin` console)

