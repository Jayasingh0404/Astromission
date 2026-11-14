"""
ASTROMISSION Core Simulation Engine.
Deterministic, scientifically grounded educational space outpost simulator.
All resource calculations use consistent physical units:
- Oxygen: kg
- Water: L
- Food: kg
- Energy: kWh
- Radiation Shielding: % (0 - 95)
- Cumulative Radiation Exposure: mSv
- Crew Health: % (0 - 100 educational index)
- Infrastructure Condition: % (0 - 100)
"""
from copy import deepcopy
import random
from typing import Dict, List, Any, Tuple, Optional
from app.engine.catalog import FACILITIES_CATALOG, MISSIONS_CATALOG, EVENTS_CATALOG

FACILITY_MAP: Dict[str, Dict[str, Any]] = {f["id"]: f for f in FACILITIES_CATALOG}
MISSION_MAP: Dict[str, Dict[str, Any]] = {m["id"]: m for m in MISSIONS_CATALOG}
EVENT_MAP: Dict[str, Dict[str, Any]] = {e["id"]: e for e in EVENTS_CATALOG}

DIFFICULTY_MODIFIERS: Dict[str, Dict[str, float]] = {
    "beginner": {
        "starting_supply_mult": 1.25,
        "consumption_mult": 0.85,
        "event_probability_mult": 0.65,
        "event_severity_mult": 0.75,
        "degradation_mult": 0.75,
    },
    "intermediate": {
        "starting_supply_mult": 1.0,
        "consumption_mult": 1.0,
        "event_probability_mult": 1.0,
        "event_severity_mult": 1.0,
        "degradation_mult": 1.0,
    },
    "expert": {
        "starting_supply_mult": 0.82,
        "consumption_mult": 1.12,
        "event_probability_mult": 1.30,
        "event_severity_mult": 1.25,
        "degradation_mult": 1.25,
    },
}

SUPPLY_PRESET_MODIFIERS: Dict[str, Dict[str, float]] = {
    "abundant": {"oxygen": 1.2, "water": 1.2, "food": 1.2, "energy": 1.2},
    "balanced": {"oxygen": 1.0, "water": 1.0, "food": 1.0, "energy": 1.0},
    "lean": {"oxygen": 0.85, "water": 0.85, "food": 0.85, "energy": 0.85},
    "power_focus": {"oxygen": 0.95, "water": 0.95, "food": 0.90, "energy": 1.30},
    "life_support_focus": {"oxygen": 1.25, "water": 1.25, "food": 1.15, "energy": 0.85},
}


def initialize_mission_state(
    mission_id: str,
    difficulty: str = "intermediate",
    crew_size: int = 4,
    duration_days: int = 15,
    supply_preset: str = "balanced",
    starting_facilities_override: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Produces initial (resources_state, environment_state, objectives_state, initial_facilities)
    for a new mission session.
    """
    mission_cfg = MISSION_MAP.get(mission_id) or MISSIONS_CATALOG[0]
    diff_mod = DIFFICULTY_MODIFIERS.get(difficulty, DIFFICULTY_MODIFIERS["intermediate"])
    preset_mod = SUPPLY_PRESET_MODIFIERS.get(supply_preset, SUPPLY_PRESET_MODIFIERS["balanced"])

    base_res = deepcopy(mission_cfg["starting_resources"])
    facilities_list = deepcopy(
        starting_facilities_override if starting_facilities_override is not None else mission_cfg["starting_facilities"]
    )

    # Compute extra storage capacities from initial facilities
    extra_cap = {"oxygen": 0.0, "water": 0.0, "food": 0.0, "energy": 0.0}
    base_shielding = 35.0
    for f_inst in facilities_list:
        f_def = FACILITY_MAP.get(f_inst["facility_id"], {})
        lvl = int(f_inst.get("level", 1))
        lvl_mult = 1.0 + 0.35 * (lvl - 1)
        s_mods = f_def.get("storage_Modifiers", {})
        extra_cap["oxygen"] += s_mods.get("oxygen_capacity", 0.0) * lvl_mult
        extra_cap["water"] += s_mods.get("water_capacity", 0.0) * lvl_mult
        extra_cap["food"] += s_mods.get("food_capacity", 0.0) * lvl_mult
        extra_cap["energy"] += s_mods.get("energy_capacity", 0.0) * lvl_mult
        base_shielding += f_def.get("production_rates", {}).get("shielding_bonus", 0.0) * lvl_mult

    for key in ["oxygen", "water", "food", "energy"]:
        cap = round(base_res[key]["capacity"] + extra_cap[key], 1)
        curr = round(
            min(
                cap,
                base_res[key]["current"] * diff_mod["starting_supply_mult"] * preset_mod.get(key, 1.0),
            ),
            1,
        )
        base_res[key]["capacity"] = cap
        base_res[key]["current"] = curr
        base_res[key]["production_rate"] = 0.0
        base_res[key]["consumption_rate"] = 0.0
        base_res[key]["status"] = _compute_resource_status(curr, cap, base_res[key]["critical"])

    base_res["radiation_shielding"] = round(min(95.0, base_shielding), 1)
    base_res["cumulative_radiation_msv"] = 0.0
    base_res["crew_health"] = 100.0
    base_res["infrastructure_condition"] = 100.0
    base_res["science_points"] = 0.0
    base_res["rationing_mode"] = "normal"

    env_constraints = deepcopy(mission_cfg["environmental_constraints"])
    environment_state = {
        "planet": mission_cfg["planet"],
        "solar_irradiance_factor": env_constraints.get("solar_irradiance_factor", 1.0),
        "effective_solar_multiplier": env_constraints.get("solar_irradiance_factor", 1.0),
        "weather_condition": "Clear Planetary Sky",
        "is_lunar_night": False,
        "is_dust_storm": False,
        "ambient_radiation_msv_day": env_constraints.get("baseline_radiation_msv_per_day", 1.0),
        "surface_temp_c": -45 if mission_cfg["planet"] == "mars" else -25,
        "dust_abrasion_rate": env_constraints.get("dust_abrasion_rate", 2.0),
    }

    objectives_state = []
    for obj in mission_cfg["objectives"]:
        objectives_state.append(
            {
                "id": obj["id"],
                "title": obj["title"],
                "type": obj["type"],
                "target": obj["target"],
                "resource": obj.get("resource"),
                "progress": 0.0,
                "completed": False,
                "failed": False,
            }
        )

    return base_res, environment_state, objectives_state, facilities_list


def _compute_resource_status(current: float, capacity: float, critical: float) -> str:
    if current <= 0.01:
        return "depleted"
    if current <= critical:
        return "critical"
    if current <= critical * 1.75 or (capacity > 0 and (current / capacity) < 0.25):
        return "warning"
    return "optimal"


def recalculate_capacities_and_shielding(
    resources: Dict[str, Any],
    facilities: List[Dict[str, Any]],
    planet: str,
) -> Dict[str, Any]:
    """Updates storage capacities and passive radiation shielding from active facilities."""
    mission_cfg = next((m for m in MISSIONS_CATALOG if m["planet"] == planet), MISSIONS_CATALOG[0])
    base_start = mission_cfg["starting_resources"]

    extra_cap = {"oxygen": 0.0, "water": 0.0, "food": 0.0, "energy": 0.0}
    shielding = 35.0
    total_cond = 0.0

    for fac in facilities:
        f_def = FACILITY_MAP.get(fac["facility_id"], {})
        lvl = int(fac.get("level", 1))
        cond_factor = max(0.2, float(fac.get("condition", 100.0)) / 100.0)
        lvl_mult = 1.0 + 0.35 * (lvl - 1)
        s_mods = f_def.get("storage_Modifiers", {})
        extra_cap["oxygen"] += s_mods.get("oxygen_capacity", 0.0) * lvl_mult
        extra_cap["water"] += s_mods.get("water_capacity", 0.0) * lvl_mult
        extra_cap["food"] += s_mods.get("food_capacity", 0.0) * lvl_mult
        extra_cap["energy"] += s_mods.get("energy_capacity", 0.0) * lvl_mult

        if fac.get("is_operational", True):
            shielding += f_def.get("production_rates", {}).get("shielding_bonus", 0.0) * lvl_mult * cond_factor
        total_cond += float(fac.get("condition", 100.0))

    for key in ["oxygen", "water", "food", "energy"]:
        new_cap = round(base_start[key]["capacity"] + extra_cap[key], 1)
        resources[key]["capacity"] = new_cap
        resources[key]["current"] = round(min(new_cap, max(0.0, float(resources[key]["current"]))), 1)
        resources[key]["status"] = _compute_resource_status(
            resources[key]["current"], new_cap, resources[key]["critical"]
        )

    resources["radiation_shielding"] = round(min(95.0, shielding), 1)
    resources["infrastructure_condition"] = (
        round(total_cond / len(facilities), 1) if facilities else 100.0
    )
    return resources


def simulate_day_progression(
    planet: str,
    difficulty: str,
    current_day: int,
    target_duration_days: int,
    crew_size: int,
    random_seed: int,
    resources: Dict[str, Any],
    environment: Dict[str, Any],
    facilities: List[Dict[str, Any]],
    objectives: List[Dict[str, Any]],
    active_events: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Executes one complete turn (1 mission day) of the ASTROMISSION simulation engine.
    Follows the 16-step deterministic lifecycle specified in Section 5.
    """
    rng = random.Random(int(random_seed) + int(current_day) * 1009)
    diff_mod = DIFFICULTY_MODIFIERS.get(difficulty, DIFFICULTY_MODIFIERS["intermediate"])
    mission_cfg = next((m for m in MISSIONS_CATALOG if m["planet"] == planet), MISSIONS_CATALOG[0])
    env_constraints = mission_cfg["environmental_constraints"]

    res = deepcopy(resources)
    env = deepcopy(environment)
    facs = deepcopy(facilities)
    objs = deepcopy(objectives)
    alerts: List[Dict[str, str]] = []
    log_entries: List[str] = []

    next_day = current_day + 1

    # Step 1: Evaluate planetary environmental conditions for the day
    base_solar = float(env_constraints.get("solar_irradiance_factor", 1.0))
    is_lunar_night = False
    is_dust_storm = False

    if planet == "moon":
        lunar_night_days = env_constraints.get("lunar_night_cycle_days", [6, 7, 13, 14])
        if (current_day % 10) in [6, 7] or current_day in lunar_night_days:
            is_lunar_night = True
            solar_mult = base_solar * float(env_constraints.get("night_solar_multiplier", 0.22))
            env["weather_condition"] = "Lunar South Pole Shadow Period (Grazing Low Sun)"
            env["surface_temp_c"] = -185
            alerts.append(
                {
                    "level": "warning",
                    "title": "Lunar Shadow Cycle Active",
                    "message": "Crater rim shadows reduce solar array output to 22%. Relying on Battery Storage.",
                }
            )
        else:
            solar_mult = base_solar
            env["weather_condition"] = "Sunlit Crater Peak (High Solar Flux)"
            env["surface_temp_c"] = -15
    else:
        # Mars environmental variation
        storm_roll = rng.random()
        if storm_roll < float(env_constraints.get("dust_storm_chance_base", 0.22)) * diff_mod["event_probability_mult"]:
            is_dust_storm = True
            solar_mult = round(base_solar * 0.42, 2)
            env["weather_condition"] = "Regional Martian Dust Haze (Reduced Optical Depth)"
            env["surface_temp_c"] = -78
            alerts.append(
                {
                    "level": "warning",
                    "title": "Martian Atmospheric Dust Haze",
                    "message": "Suspended iron-oxide dust reduces solar array output by 58% today.",
                }
            )
        else:
            solar_mult = round(base_solar * rng.uniform(0.92, 1.08), 2)
            env["weather_condition"] = "Clear Martian Sol (Nominal Irradiance)"
            env["surface_temp_c"] = -42

    env["is_lunar_night"] = is_lunar_night
    env["is_dust_storm"] = is_dust_storm
    env["effective_solar_multiplier"] = round(solar_mult, 2)

    # Recalculate capacities before daily balance
    res = recalculate_capacities_and_shielding(res, facs, planet)

    # Step 2: Calculate Power Generation
    energy_generated = 0.0
    for fac in facs:
        if not fac.get("is_operational", True):
            continue
        f_def = FACILITY_MAP.get(fac["facility_id"], {})
        lvl = int(fac.get("level", 1))
        cond_factor = max(0.15, float(fac.get("condition", 100.0)) / 100.0)
        lvl_mult = 1.0 + 0.40 * (lvl - 1)
        raw_e = f_def.get("production_rates", {}).get("energy", 0.0)
        if raw_e > 0:
            energy_generated += raw_e * lvl_mult * cond_factor * solar_mult

    energy_generated = round(energy_generated, 2)

    # Step 3 & 4: Calculate Energy Consumption and Determine Power Allocation by Priority (1 -> 2 -> 3)
    available_energy_pool = float(res["energy"]["current"]) + energy_generated
    energy_consumed = 0.0
    facility_power_efficiency: Dict[str, float] = {}

    sorted_facs = sorted(
        facs,
        key=lambda f: int(
            f.get(
                "power_priority",
                FACILITY_MAP.get(f["facility_id"], {}).get("functional_effects", {}).get("power_priority", 2),
            )
        ),
    )

    for fac in sorted_facs:
        fid_key = fac.get("id") or f"{fac['facility_id']}_{fac.get('grid_x', 0)}"
        if not fac.get("is_operational", True) or float(fac.get("condition", 100.0)) <= 5.0:
            facility_power_efficiency[fid_key] = 0.0
            continue
        f_def = FACILITY_MAP.get(fac["facility_id"], {})
        lvl = int(fac.get("level", 1))
        e_need = float(f_def.get("energy_consumption", 0.0)) * (1.0 + 0.22 * (lvl - 1))
        if e_need <= 0.0:
            facility_power_efficiency[fid_key] = 1.0
            continue
        remaining = available_energy_pool - energy_consumed
        if remaining >= e_need:
            energy_consumed += e_need
            facility_power_efficiency[fid_key] = 1.0
        elif remaining > 0.0:
            ratio = round(remaining / e_need, 2)
            energy_consumed += remaining
            facility_power_efficiency[fid_key] = ratio
            alerts.append(
                {
                    "level": "critical",
                    "title": f"Low Power Throttling: {f_def.get('name', fac['facility_id'])}",
                    "message": f"{f_def.get('name', fac['facility_id'])} operated at {int(ratio * 100)}% due to energy shortage!",
                }
            )
        else:
            facility_power_efficiency[fid_key] = 0.0
            alerts.append(
                {
                    "level": "critical",
                    "title": f"Brownout: {f_def.get('name', fac['facility_id'])} Offline",
                    "message": f"Insufficient electrical energy to power {f_def.get('name', fac['facility_id'])}.",
                }
            )

    energy_consumed = round(energy_consumed, 2)
    net_energy = round(energy_generated - energy_consumed, 2)
    res["energy"]["current"] = round(
        min(res["energy"]["capacity"], max(0.0, float(res["energy"]["current"]) + net_energy)), 2
    )
    res["energy"]["production_rate"] = energy_generated
    res["energy"]["consumption_rate"] = energy_consumed

    # Step 5, 6, 7: Oxygen, Water, Food, Science, Medical, and Auto-Repair calculations
    crew_o2_demand = round(0.84 * crew_size * diff_mod["consumption_mult"], 2)
    crew_water_demand = round(3.50 * crew_size * diff_mod["consumption_mult"], 2)
    ration_factor = 0.68 if res.get("rationing_mode") == "rationed" else 1.0
    crew_food_demand = round(0.62 * crew_size * diff_mod["consumption_mult"] * ration_factor, 2)

    o2_produced = 0.0
    water_extracted = 0.0
    water_recovery_ratios: List[float] = []
    water_consumed_by_facilities = 0.0
    food_produced = 0.0
    science_gained = 0.0
    health_recovery_bonus = 0.0
    auto_repair_bonus = 0.0
    event_mitigation_bonus = 0.0

    current_water_available = float(res["water"]["current"])

    for fac in facs:
        fid_key = fac.get("id") or f"{fac['facility_id']}_{fac.get('grid_x', 0)}"
        p_eff = facility_power_efficiency.get(fid_key, 0.0)
        if p_eff <= 0.0 or not fac.get("is_operational", True):
            continue
        f_def = FACILITY_MAP.get(fac["facility_id"], {})
        lvl = int(fac.get("level", 1))
        cond_factor = max(0.2, float(fac.get("condition", 100.0)) / 100.0)
        lvl_mult = 1.0 + 0.38 * (lvl - 1)
        eff = p_eff * cond_factor * lvl_mult
        rates = f_def.get("production_rates", {})

        # Oxygen Generator or Greenhouse requiring water input
        w_in = float(rates.get("water_input", 0.0)) * p_eff * (1.0 + 0.25 * (lvl - 1))
        water_feed_ratio = 1.0
        if w_in > 0:
            if current_water_available >= w_in:
                current_water_available -= w_in
                water_consumed_by_facilities += w_in
            elif current_water_available > 0:
                water_feed_ratio = current_water_available / w_in
                water_consumed_by_facilities += current_water_available
                current_water_available = 0.0
            else:
                water_feed_ratio = 0.0
                alerts.append(
                    {
                        "level": "critical",
                        "title": f"Water Feed Starvation: {f_def.get('name')}",
                        "message": f"{f_def.get('name')} could not operate due to depleted water reserves.",
                    }
                )

        o2_produced += float(rates.get("oxygen", 0.0)) * eff * water_feed_ratio
        food_produced += float(rates.get("food", 0.0)) * eff * water_feed_ratio
        water_extracted += float(rates.get("water", 0.0)) * eff
        water_extracted += float(rates.get("water_bonus", 0.0)) * eff
        if "water_recovery_ratio" in rates:
            rec_r = min(0.95, float(rates["water_recovery_ratio"]) * (1.0 + 0.06 * (lvl - 1)) * p_eff * cond_factor)
            water_recovery_ratios.append(rec_r)

        science_gained += float(rates.get("science_points", 0.0)) * eff
        health_recovery_bonus += float(rates.get("health_recovery", 0.0)) * eff
        auto_repair_bonus += float(rates.get("auto_repair", 0.0)) * eff
        event_mitigation_bonus = max(event_mitigation_bonus, float(rates.get("event_mitigation", 0.0)) * p_eff)

    # Combine water recycling ratio (if multiple recyclers, diminishing returns up to 95%)
    best_recovery_ratio = 0.0
    for r in sorted(water_recovery_ratios, reverse=True):
        best_recovery_ratio = best_recovery_ratio + (1.0 - best_recovery_ratio) * r
    best_recovery_ratio = min(0.95, best_recovery_ratio)

    water_recycled_liters = round(crew_water_demand * best_recovery_ratio, 2)
    total_water_produced = round(water_recycled_liters + water_extracted, 2)
    total_water_consumed = round(crew_water_demand + water_consumed_by_facilities, 2)

    o2_produced = round(o2_produced, 2)
    food_produced = round(food_produced, 2)

    # Apply resource balances: Next = Current + Production - Consumption
    res["oxygen"]["production_rate"] = o2_produced
    res["oxygen"]["consumption_rate"] = crew_o2_demand
    res["oxygen"]["current"] = round(
        min(res["oxygen"]["capacity"], max(0.0, float(res["oxygen"]["current"]) + o2_produced - crew_o2_demand)), 2
    )

    res["water"]["production_rate"] = total_water_produced
    res["water"]["consumption_rate"] = total_water_consumed
    res["water"]["current"] = round(
        min(
            res["water"]["capacity"],
            max(0.0, float(res["water"]["current"]) + total_water_produced - total_water_consumed),
        ),
        2,
    )

    res["food"]["production_rate"] = food_produced
    res["food"]["consumption_rate"] = crew_food_demand
    res["food"]["current"] = round(
        min(res["food"]["capacity"], max(0.0, float(res["food"]["current"]) + food_produced - crew_food_demand)), 2
    )

    res["science_points"] = round(float(res.get("science_points", 0.0)) + science_gained, 1)

    # Step 8: Update Facility Condition (planetary abrasion vs workshop auto-repair)
    abrasion = float(env_constraints.get("dust_abrasion_rate", 2.0)) * diff_mod["degradation_mult"]
    if is_dust_storm:
        abrasion *= 1.45

    total_cond = 0.0
    for fac in facs:
        f_def = FACILITY_MAP.get(fac["facility_id"], {})
        wear = float(f_def.get("maintenance_cost_per_day", 1.2)) * (abrasion / 2.0)
        net_cond_change = auto_repair_bonus * 0.45 - wear
        new_cond = round(min(100.0, max(10.0, float(fac.get("condition", 100.0)) + net_cond_change)), 1)
        fac["condition"] = new_cond
        total_cond += new_cond
        if new_cond < 45.0:
            alerts.append(
                {
                    "level": "warning",
                    "title": f"Maintenance Required: {f_def.get('name')}",
                    "message": f"{f_def.get('name')} condition dropped to {new_cond}%. Repair recommended.",
                }
            )

    res["infrastructure_condition"] = round(total_cond / len(facs), 1) if facs else 100.0

    # Step 9 & 10: Check unresolved events Penalty & Generate New Deterministic Environmental Event
    unresolved_penalty_health = 0.0
    for ev in active_events:
        if ev.get("status") == "pending":
            # Unattended emergency from previous day incurs mild automatic strain
            unresolved_penalty_health += 3.5
            log_entries.append(
                f"Unresolved emergency '{ev.get('title', ev.get('event_id'))}' caused system strain (-3.5% Crew Health)."
            )

    generated_event: Optional[Dict[str, Any]] = None
    event_chance = 0.48 * diff_mod["event_probability_mult"]
    if rng.random() < event_chance:
        eligible_events = [
            e
            for e in EVENTS_CATALOG
            if planet in e["planets"] and next_day >= e["trigger_conditions"].get("min_day", 1)
        ]
        if eligible_events:
            weights = [float(e["trigger_conditions"].get("weight", 1.0)) for e in eligible_events]
            chosen_ev = rng.choices(eligible_events, weights=weights, k=1)[0]
            generated_event = deepcopy(chosen_ev)
            alerts.append(
                {
                    "level": "critical" if chosen_ev["severity"] in ("critical", "high") else "warning",
                    "title": f"MISSION ALERT: {chosen_ev['title']}",
                    "message": chosen_ev["description"],
                }
            )
            log_entries.append(f"Day {next_day} Event Detected: {chosen_ev['title']} ({chosen_ev['severity'].upper()}).")

    # Step 11: Update Radiation Exposure
    ambient_rad = float(env_constraints.get("baseline_radiation_msv_per_day", 1.0))
    shielding_pct = float(res.get("radiation_shielding", 55.0))
    effective_daily_msv = round(ambient_rad * (1.0 - (shielding_pct / 100.0) * 0.85), 3)
    res["cumulative_radiation_msv"] = round(float(res.get("cumulative_radiation_msv", 0.0)) + effective_daily_msv, 2)

    # Step 12: Update Crew Health Indicator (transparent educational game rules)
    health_delta = 0.0
    for key, label, penalty in [
        ("oxygen", "Oxygen", -22.0),
        ("water", "Water", -16.0),
        ("food", "Food", -10.0),
        ("energy", "Electrical Power", -8.0),
    ]:
        status_str = _compute_resource_status(res[key]["current"], res[key]["capacity"], res[key]["critical"])
        res[key]["status"] = status_str
        if status_str == "depleted":
            health_delta += penalty
            alerts.append(
                {
                    "level": "critical",
                    "title": f"CRITICAL DEPLETION: {label} Exhausted!",
                    "message": f"Zero {label} reserves! Crew health is rapidly deteriorating ({penalty}%/day).",
                }
            )
        elif status_str == "critical":
            health_delta += penalty * 0.35
            alerts.append(
                {
                    "level": "critical",
                    "title": f"Low {label} Warning",
                    "message": f"{label} is below critical threshold ({res[key]['current']} {res[key]['unit']}).",
                }
            )

    if res.get("rationing_mode") == "rationed":
        health_delta -= 1.5

    if res["cumulative_radiation_msv"] > 20.0:
        health_delta -= 3.0

    # If all core life support resources are optimal, crew recovers slightly + medical facility bonus
    if all(res[k]["status"] == "optimal" for k in ["oxygen", "water", "food", "energy"]):
        health_delta += 1.5 + health_recovery_bonus * 0.35
    else:
        health_delta += health_recovery_bonus * 0.25

    health_delta -= unresolved_penalty_health
    res["crew_health"] = round(min(100.0, max(0.0, float(res.get("crew_health", 100.0)) + health_delta)), 1)

    # Step 13: Evaluate Mission Objectives
    for obj in objs:
        otype = obj["type"]
        if otype == "survival":
            obj["progress"] = round(min(100.0, (next_day / max(1, target_duration_days)) * 100.0), 1)
            obj["completed"] = next_day >= target_duration_days and res["crew_health"] > 0
        elif otype == "resource_min":
            r_name = obj.get("resource", "oxygen")
            curr_val = float(res.get(r_name, {}).get("current", 0.0))
            target_val = float(obj.get("target", 10.0))
            if curr_val < target_val:
                obj["failed"] = True
            obj["progress"] = 100.0 if not obj.get("failed") else 0.0
            obj["completed"] = (not obj.get("failed")) and (next_day >= target_duration_days)
        elif otype == "facility_count":
            target_cnt = int(obj.get("target", 6))
            total_levels = sum(int(f.get("level", 1)) for f in facs)
            obj["progress"] = round(min(100.0, (total_levels / max(1, target_cnt)) * 100.0), 1)
            obj["completed"] = total_levels >= target_cnt
        elif otype == "science_points":
            target_pts = float(obj.get("target", 40.0))
            curr_pts = float(res.get("science_points", 0.0))
            obj["progress"] = round(min(100.0, (curr_pts / max(1.0, target_pts)) * 100.0), 1)
            obj["completed"] = curr_pts >= target_pts

    # Step 14: Evaluate Mission Success and Failure Conditions
    mission_status = "active"
    failure_reason: Optional[str] = None

    if res["crew_health"] <= 0.0:
        mission_status = "failed"
        failure_reason = "Crew health reached 0% due to critical life-support failure or acute hazard exposure."
    elif res["oxygen"]["current"] <= 0.0 and o2_produced < crew_o2_demand:
        mission_status = "failed"
        failure_reason = "Oxygen reserves completely depleted with insufficient O2 generation capacity."
    elif res["water"]["current"] <= 0.0 and total_water_produced < crew_water_demand * 0.5:
        mission_status = "failed"
        failure_reason = "Potable water reserves completely exhausted without recovery capacity."
    elif next_day >= target_duration_days:
        mission_status = "completed"

    log_entries.insert(
        0,
        f"Day {next_day} Summary: Generated {energy_generated} kWh (used {energy_consumed} kWh), "
        f"O2 +{o2_produced}/-{crew_o2_demand} kg, Water +{total_water_produced}/-{total_water_consumed} L, "
        f"Food +{food_produced}/-{crew_food_demand} kg.",
    )

    return {
        "next_day": next_day,
        "mission_status": mission_status,
        "failure_reason": failure_reason,
        "resources": res,
        "environment": env,
        "facilities": facs,
        "objectives": objs,
        "generated_event": generated_event,
        "alerts": alerts,
        "log_entries": log_entries,
        "daily_metrics": {
            "energy_generated": energy_generated,
            "energy_consumed": energy_consumed,
            "o2_produced": o2_produced,
            "o2_consumed": crew_o2_demand,
            "water_produced": total_water_produced,
            "water_consumed": total_water_consumed,
            "food_produced": food_produced,
            "food_consumed": crew_food_demand,
            "science_gained": round(science_gained, 1),
            "effective_daily_radiation_msv": effective_daily_msv,
        },
    }


def apply_event_decision(
    event_def: Dict[str, Any],
    option_id: str,
    resources: Dict[str, Any],
    facilities: List[Dict[str, Any]],
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Applies a player's engineering decision to an active environmental or emergency event.
    """
    res = deepcopy(resources)
    facs = deepcopy(facilities)

    options = event_def.get("decision_options", [])
    chosen = next((o for o in options if o["id"] == option_id), options[0] if options else {})
    effects = chosen.get("effects", {})

    applied_summary: Dict[str, Any] = {
        "option_id": chosen.get("id", option_id),
        "label": chosen.get("label", ""),
        "tradeoff": chosen.get("tradeoff", ""),
        "deltas": {},
    }

    for r_key in ["oxygen", "water", "food", "energy"]:
        if r_key in effects:
            delta = float(effects[r_key])
            old_val = float(res[r_key]["current"])
            new_val = round(min(float(res[r_key]["capacity"]), max(0.0, old_val + delta)), 2)
            res[r_key]["current"] = new_val
            res[r_key]["status"] = _compute_resource_status(new_val, res[r_key]["capacity"], res[r_key]["critical"])
            applied_summary["deltas"][r_key] = round(new_val - old_val, 2)

    if "radiation_msv_delta" in effects:
        delta_rad = float(effects["radiation_msv_delta"])
        # If player has a Radiation Shelter built, reduce acute radiation delta by 55%
        has_shelter = any(
            f["facility_id"] == "radiation_shelter" and f.get("is_operational", True) for f in facs
        )
        if has_shelter and delta_rad > 0:
            delta_rad = round(delta_rad * 0.45, 2)
        res["cumulative_radiation_msv"] = round(max(0.0, float(res.get("cumulative_radiation_msv", 0.0)) + delta_rad), 2)
        applied_summary["deltas"]["cumulative_radiation_msv"] = delta_rad

    if "crew_health" in effects:
        dh = float(effects["crew_health"])
        res["crew_health"] = round(min(100.0, max(0.0, float(res.get("crew_health", 100.0)) + dh)), 1)
        applied_summary["deltas"]["crew_health"] = dh

    if "science_points" in effects:
        ds = float(effects["science_points"])
        res["science_points"] = round(max(0.0, float(res.get("science_points", 0.0)) + ds), 1)
        applied_summary["deltas"]["science_points"] = ds

    if "infrastructure_condition" in effects:
        di = float(effects["infrastructure_condition"])
        for fac in facs:
            fac["condition"] = round(min(100.0, max(10.0, float(fac.get("condition", 100.0)) + di)), 1)
        res["infrastructure_condition"] = (
            round(sum(float(f["condition"]) for f in facs) / len(facs), 1) if facs else 100.0
        )
        applied_summary["deltas"]["infrastructure_condition"] = di

    return res, facs, applied_summary


def calculate_mission_score_and_insights(
    planet: str,
    difficulty: str,
    outcome: str,
    days_survived: int,
    target_days: int,
    resources: Dict[str, Any],
    facilities: List[Dict[str, Any]],
    objectives: List[Dict[str, Any]],
    actions_history: List[Dict[str, Any]],
    event_choices: List[Dict[str, Any]],
    snapshots: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Transparent weighted scoring system (Section 9).
    Does NOT reward simple 100% hoarding if resources were under-utilized for science/infrastructure.
    """
    survival_ratio = min(1.0, days_survived / max(1, target_days))

    # 1. Crew Safety (25% weight)
    crew_health = float(resources.get("crew_health", 0.0))
    rad_msv = float(resources.get("cumulative_radiation_msv", 0.0))
    rad_penalty = max(0.0, (rad_msv - 12.0) * 1.5)
    crew_safety_score = round(max(0.0, min(100.0, crew_health - rad_penalty)) * (1.0 if outcome == "completed" else 0.45), 1)

    # 2. Resource Management (20% weight) — optimal utilization band is 35% to 88% capacity with sustainable production
    band_scores = []
    for k in ["oxygen", "water", "food", "energy"]:
        curr = float(resources[k]["current"])
        cap = max(1.0, float(resources[k]["capacity"]))
        crit = float(resources[k]["critical"])
        fill = curr / cap
        if curr <= crit:
            b_score = max(10.0, (curr / max(1.0, crit)) * 45.0)
        elif 0.30 <= fill <= 0.90:
            b_score = 96.0
        elif fill > 0.90:
            # Slight inefficiency penalty if hoarding >95% without converting to science/growth
            b_score = 84.0
        else:
            b_score = 72.0
        band_scores.append(b_score)
    resource_mgmt_score = round((sum(band_scores) / len(band_scores)) * survival_ratio, 1)

    # 3. Energy Efficiency (15% weight)
    e_gen_total = sum(float(s.get("energy_generated", 0.0)) for s in snapshots) or 1.0
    e_con_total = sum(float(s.get("energy_consumed", 0.0)) for s in snapshots)
    load_ratio = e_con_total / e_gen_total
    if 0.55 <= load_ratio <= 0.95:
        energy_eff_score = 95.0
    elif load_ratio < 0.55:
        energy_eff_score = 78.0  # Overbuilt solar without using power for labs/greenhouse
    else:
        energy_eff_score = max(35.0, 100.0 - (load_ratio - 0.95) * 90.0)
    energy_eff_score = round(energy_eff_score * survival_ratio, 1)

    # 4. Infrastructure Stability (15% weight)
    infra_cond = float(resources.get("infrastructure_condition", 80.0))
    diversity_bonus = min(15.0, len({f["facility_id"] for f in facilities}) * 2.2)
    infra_score = round(min(100.0, infra_cond * 0.85 + diversity_bonus), 1)

    # 5. Emergency Decision-Making (15% weight)
    total_ev = len(event_choices)
    resolved_ev = sum(1 for e in event_choices if e.get("status") == "resolved")
    if total_ev == 0:
        emergency_score = 88.0
    else:
        emergency_score = round((resolved_ev / total_ev) * 95.0 + min(5.0, resolved_ev * 1.5), 1)

    # 6. Mission Objectives & Scientific Learning (10% weight)
    completed_objs = sum(1 for o in objectives if o.get("completed"))
    obj_ratio = completed_objs / max(1, len(objectives))
    sci_points = float(resources.get("science_points", 0.0))
    objectives_score = round(min(100.0, obj_ratio * 75.0 + min(25.0, sci_points * 0.5)), 1)

    weighted_total = round(
        crew_safety_score * 0.25
        + resource_mgmt_score * 0.20
        + energy_eff_score * 0.15
        + infra_score * 0.15
        + emergency_score * 0.15
        + objectives_score * 0.10,
        1,
    )

    breakdown = {
        "crew_safety": {
            "score": crew_safety_score,
            "weight": "25%",
            "explanation": f"Crew health ended at {crew_health}% with {rad_msv} mSv cumulative radiation exposure.",
        },
        "resource_management": {
            "score": resource_mgmt_score,
            "weight": "20%",
            "explanation": "Evaluates closed-loop stability across Oxygen, Water, Food, and Energy without critical depletion or idle hoarding.",
        },
        "energy_efficiency": {
            "score": energy_eff_score,
            "weight": "15%",
            "explanation": f"Ratio of productive load to solar generation was {round(load_ratio * 100, 1)}% across the mission.",
        },
        "infrastructure_stability": {
            "score": infra_score,
            "weight": "15%",
            "explanation": f"Outpost ended with {len(facilities)} modules at {infra_cond}% average structural condition.",
        },
        "emergency_decision_making": {
            "score": emergency_score,
            "weight": "15%",
            "explanation": f"Resolved {resolved_ev} of {total_ev} environmental hazard events.",
        },
        "mission_objectives": {
            "score": objectives_score,
            "weight": "10%",
            "explanation": f"Completed {completed_objs}/{len(objectives)} mission objectives and earned {sci_points} Science Points.",
        },
    }

    major_decisions: List[str] = []
    best_decisions: List[str] = []
    major_mistakes: List[str] = []

    built_names = [
        FACILITY_MAP.get(a.get("target_id", ""), {}).get("name", a.get("target_id", "Facility"))
        for a in actions_history
        if a.get("action_type") == "build"
    ]
    if built_names:
        major_decisions.append(f"Constructed new outpost infrastructure: {', '.join(built_names[:4])}.")

    if any(f["facility_id"] == "water_recycler" for f in facilities) and any(
        f["facility_id"] == "oxygen_generator" for f in facilities
    ):
        best_decisions.append(
            "Coupled Water Recycler with Oxygen Generator Assembly to create a regenerative ECLSS life-support loop."
        )
    if any(f["facility_id"] == "radiation_shelter" for f in facilities):
        best_decisions.append("Built a dedicated Radiation Storm Shelter to protect astronauts from Solar Particle Events.")
    if any(f["facility_id"] == "greenhouse" for f in facilities):
        best_decisions.append("Established hydroponic food cultivation to offset packaged ration consumption.")

    if resources["water"]["current"] <= resources["water"]["critical"]:
        major_mistakes.append(
            "Water reserves fell into the critical zone—electrolysis and greenhouse irrigation require closed-loop recycling or rover ice extraction."
        )
    if resources["energy"]["current"] <= resources["energy"]["critical"]:
        major_mistakes.append(
            "Electrical energy dropped below critical buffer levels during peak load or low-sunlight periods."
        )
    if total_ev > resolved_ev:
        major_mistakes.append(f"Left {total_ev - resolved_ev} emergency alert(s) unresolved before advancing mission days.")

    if not best_decisions:
        best_decisions.append("Maintained core habitat operations and monitored daily life-support telemetry.")
    if not major_decisions:
        major_decisions.append("Operated initial outpost configuration across mission timeline.")

    educational_insights = [
        "Every space habitat subsystem is interconnected: producing Oxygen via electrolysis consumes both Water and Electrical Energy.",
        "Growing food in a Hydroponic Greenhouse boosts crew nutrition and oxygen, but increases water and LED power demand.",
        f"On {'the Moon' if planet == 'moon' else 'Mars'}, energy storage (batteries) is essential to survive {'crater shadow cycles' if planet == 'moon' else 'regional dust storms'}.",
    ]

    recommended_improvements = []
    if resource_mgmt_score < 80:
        recommended_improvements.append(
            "Upgrade your Water Recycler and Rover Garage earlier to prevent water bottlenecks when scaling O2 and food production."
        )
    if energy_eff_score < 80:
        recommended_improvements.append(
            "Pair Solar Array upgrades with Regenerative Battery Banks before constructing high-draw facilities like the Greenhouse or Science Lab."
        )
    if objectives_score < 80:
        recommended_improvements.append(
            "Construct a Planetary Science Lab or Deep Space Comm Station once life support is stable to meet research objectives."
        )
    if not recommended_improvements:
        recommended_improvements.append(
            "Try attempting Expert difficulty or extending mission duration to 25+ days to test long-term closed-loop resilience!"
        )

    return {
        "total_score": weighted_total,
        "score_breakdown": breakdown,
        "major_decisions": major_decisions,
        "best_decisions": best_decisions,
        "major_mistakes": major_mistakes,
        "educational_insights": educational_insights,
        "recommended_improvements": recommended_improvements,
    }

