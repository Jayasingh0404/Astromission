# ASTROMISSION — Scientific References & Validation Policy

## Scientific Credibility Rules

1. **No Invented NASA Specifications**: All educational claims in the Learning Center and COMMANDER AI responses link to verified public NASA technical and educational resources.
2. **Transparent Game Abstractions**: Simulation rates in `backend/app/engine/catalog.py` and `simulator.py` are documented as educational game-balanced abstractions inspired by NASA ECLSS and planetary reference baselines.
3. **No Medical or Operational Endorsement Claims**: Crew Health ($0\text{--}100\%$) is an educational gameplay indicator, not a clinical medical prediction. ASTROMISSION is an independent educational simulation created for the NASA Space Apps Challenge 2026.

## Curated NASA Reference Registry

| Reference ID | Topic | Source Name | URL | Game Usage | Last Verified |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `nasa-eclss-2023` | Environmental Control and Life Support Systems (ECLSS) | NASA Marshall Space Flight Center — ECLSS Overview | https://www.nasa.gov/humans-in-space/environmental-control-and-life-support-systems-eclss/ | Models per-astronaut daily $\text{O}_2$ consumption ($0.84\text{ kg/day}$) and electrolysis water/power coupling. | 2026-11-14 |
| `nasa-water-recovery-2023` | Closed-Loop Water Recovery System (WRS) | NASA — ISS Achieves 98% Water Recovery Milestone | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/ | Models Water Recycler recovery ratios ($78\text{--}95\%$) and filter maintenance events. | 2026-11-14 |
| `nasa-space-radiation-hrp` | Space Radiation & Human Spaceflight Hazards | NASA Human Research Program — Space Radiation | https://www.nasa.gov/hrp/radiation/ | Models ambient GCR dose ($\text{mSv/day}$), acute Solar Particle Events, and hydrogen-rich shelter shielding. | 2026-11-14 |
| `nasa-artemis-moon` | Lunar South Pole Environment & Artemis Base Camp | NASA — Artemis Plan: Lunar Exploration Overview | https://www.nasa.gov/specials/artemis/ | Configures Shackleton Crater rim grazing illumination, shadow cycles, and regolith abrasion. | 2026-11-14 |
| `nasa-mars-journey` | Mars Surface Environment & Dust Storms | NASA Mars Exploration Program — Fact Sheet | https://mars.nasa.gov/all-about-mars/facts/ | Configures Mars $0.378g$, $95\%\;\text{CO}_2$ atmosphere, reduced solar irradiance, and regional dust storms. | 2026-11-14 |
| `nasa-veggie-space-ag` | Space Agriculture & Hydroponic Food Production | NASA Kennedy Space Center — Growing Plants in Space | https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/ | Models Hydroponic Greenhouse LED power + irrigation water demand vs. fresh food and $\text{O}_2$ output. | 2026-11-14 |
| `nasa-fission-solar-power` | Space Surface Power & Energy Storage | NASA Glenn Research Center — Space Power Systems | https://www.nasa.gov/glenn-research-center/ | Models Solar Array generation curves, Battery Bank buffering, and Tier 1–3 load shedding. | 2026-11-14 |
| `nasa-hrp-hazards` | Five Hazards of Human Spaceflight (RIDGE) | NASA HRP — 5 Hazards of Human Spaceflight | https://www.nasa.gov/hrp/5-hazards-of-human-spaceflight/ | Underpins Crew Health indicator and Medical Bay countermeasure mechanics. | 2026-11-14 |
| `nasa-isru-overview` | In-Situ Resource Utilization (ISRU) | NASA — In-Situ Resource Utilization & MOXIE | https://www.nasa.gov/mission/mars-2020-perseverance/moxie/ | Models Rover Garage crater ice mining sorties and planetary resource extraction. | 2026-11-14 |
| `nasa-deep-space-network` | Space Communications and Navigation (SCaN) | NASA SCaN — Deep Space Network | https://www.nasa.gov/directorates/space-operations/space-communications-and-navigation-scan-program/ | Models Deep Space Comm Array science telemetry transmission and storm warning support. | 2026-11-14 |

