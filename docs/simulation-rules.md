# ASTROMISSION — Simulation Engine & Mathematical Rules

## General Resource Balance Formula

Every mission turn (1 End Day action = 1 Mission Day / Sol) updates each tracked resource using consistent physical units:

$$\text{Resource}_{t+1} = \min\Big(\text{Capacity},\; \max\big(0,\; \text{Resource}_t + \text{Production}_t - \text{Consumption}_t + \Delta\text{Events}_t\big)\Big)$$

## Resource Units & Baseline Crew Rates

| Resource | Physical Unit | Crew Demand (per Astronaut/Day) | Primary Producers | Primary Consumers |
| :--- | :--- | :--- | :--- | :--- |
| **Oxygen ($\text{O}_2$)** | $\text{kg}$ | $0.84\text{ kg/day}$ | Oxygen Generator (OGA), Greenhouse | Astronaut crew, Rover EVA sorties |
| **Potable Water ($\text{H}_2\text{O}$)** | $\text{L}$ | $3.50\text{ L/day}$ | Water Recycler (up to $95\%$ recovery), Rover Garage ice mining | Astronaut crew, OGA electrolysis ($4.0\text{ L/d}$), Greenhouse irrigation ($6.5\text{ L/d}$) |
| **Food** | $\text{kg}$ | $0.62\text{ kg/day}$ ($0.42\text{ kg}$ rationed) | Hydroponic Greenhouse ($+3.2\text{ kg/d}$ at L1) | Astronaut crew |
| **Electrical Energy** | $\text{kWh}$ | Facility-dependent | Photovoltaic Solar Array ($+42\text{ kWh/d}$ at L1 $\times$ solar flux) | All active outpost facilities by Priority Tier 1 $\rightarrow$ 2 $\rightarrow$ 3 |
| **Radiation Shielding** | $\%$ ($0\text{--}95\%$) | Passive structural metric | Crew Habitat ($45\%+$), Radiation Shelter ($+32\%$) | Mitigates daily GCR and acute Solar Storm doses |
| **Radiation Exposure** | $\text{mSv}$ | Cumulative absorbed dose | Planetary GCR + Solar Particle Events | Reduced by Shielding $\%$ and Shelter decisions |
| **Crew Health** | $\%$ ($0\text{--}100\%$) | Educational game index | Optimal life support + Medical Facility | Resource depletion, rationing, acute radiation |
| **Infrastructure** | $\%$ ($0\text{--}100\%$) | Structural integrity | Robotics Maintenance Workshop + Repairs | Planetary regolith dust abrasion & storms |

## 16-Step Daily Simulation Lifecycle

1. Evaluate planetary weather and solar multiplier (Moon shadow cycle $0.22\times$; Mars dust storm $0.42\times$).
2. Recalculate storage capacities and passive radiation shielding from operational facilities.
3. Calculate gross solar power generation ($\text{kWh}$).
4. Allocate electrical energy across facilities sorted by `power_priority` (Tier 1 Critical Life Support $\rightarrow$ Tier 2 Operations/Greenhouse $\rightarrow$ Tier 3 Science/Prospecting).
5. Compute Oxygen production (requiring both electrical power and water feedwater) and crew $\text{O}_2$ consumption.
6. Compute Water recycling recovery ratio, rover ice extraction, and crew + facility water consumption.
7. Compute Greenhouse crop production and crew food consumption.
8. Apply planetary regolith abrasion wear against Maintenance Workshop auto-repair.
9. Evaluate unresolved emergency penalties.
10. Roll deterministic RNG (`seed + day * 1009`) for eligible planetary environmental events.
11. Update cumulative radiation exposure ($\text{mSv}$).
12. Update Crew Health indicator based on life-support adequacy and medical care.
13. Evaluate progress on all Mission Objectives.
14. Check Mission Completion (`day >= target_duration_days` with `crew_health > 0`) or Failure (`crew_health <= 0` or unrecoverable $\text{O}_2$/Water depletion).
15. Persist atomic `ResourceSnapshot` and `PlayerAction` records.
16. Return structured `day_report` to the client.

## Weighted Mission Scoring System

- **Crew Safety (25%)**: Final crew health minus excessive cumulative radiation dose penalties.
- **Resource Management (20%)**: Rewards keeping all four core consumables in the sustainable $30\%\text{--}90\%$ utilization band rather than critical depletion or idle $100\%$ hoarding.
- **Energy Efficiency (15%)**: Evaluates productive power utilization without brownouts.
- **Infrastructure Stability (15%)**: Evaluates average module condition and architectural diversity.
- **Emergency Decision-Making (15%)**: Evaluates timely resolution of environmental hazards.
- **Mission Objectives & Science (10%)**: Evaluates completed objectives and Planetary Science Points.

