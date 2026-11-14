"""
COMMANDER AI — Space Mission Specialist & Educational Mentor Service.
Provides structured, context-aware engineering guidance grounded in NASA references.
Never directly alters mission state. Supports external LLM provider abstraction with
a deterministic NASA Scientific Telemetry Knowledge Engine fallback.
"""
import time
from typing import Dict, Any, List, Optional
import httpx
from app.config.settings import settings
from app.engine.catalog import EDUCATIONAL_REFERENCES, FACILITY_MAP, EVENT_MAP

REF_MAP: Dict[str, Dict[str, Any]] = {r["id"]: r for r in EDUCATIONAL_REFERENCES}

# Simple per-user sliding window rate limiter
_RATE_LIMIT_BUCKETS: Dict[str, List[float]] = {}


def check_rate_limit(user_key: str) -> bool:
    now = time.time()
    window = 60.0
    history = [t for t in _RATE_LIMIT_BUCKETS.get(user_key, []) if now - t < window]
    if len(history) >= settings.AI_RATE_LIMIT_PER_MINUTE:
        _RATE_LIMIT_BUCKETS[user_key] = history
        return False
    history.append(now)
    _RATE_LIMIT_BUCKETS[user_key] = history
    return True


def sanitize_student_question(text: str) -> str:
    """Strips prompt-injection control sequences and enforces context length limits."""
    cleaned = (text or "").strip()
    if len(cleaned) > 600:
        cleaned = cleaned[:600]
    forbidden_patterns = ["ignore previous instructions", "system prompt", "<script", "DROP TABLE"]
    for pat in forbidden_patterns:
        if pat.lower() in cleaned.lower():
            cleaned = cleaned.replace(pat, "[filtered]")
    return cleaned or "Commander, what is our current mission status and top engineering priority?"


def _select_reference_for_topic(query_lower: str, planet: str) -> Dict[str, Any]:
    if any(k in query_lower for k in ["oxygen", "breathe", "o2", "air", "electrolysis", "eclss"]):
        return REF_MAP["nasa-eclss-2023"]
    if any(k in query_lower for k in ["water", "recycle", "leak", "thirst", "ice", "wpa"]):
        return REF_MAP["nasa-water-recovery-2023"]
    if any(k in query_lower for k in ["radiation", "storm", "flare", "shield", "shelter", "gcr", "spe"]):
        return REF_MAP["nasa-space-radiation-hrp"]
    if any(k in query_lower for k in ["food", "greenhouse", "crop", "plant", "veggie", "eat"]):
        return REF_MAP["nasa-veggie-space-ag"]
    if any(k in query_lower for k in ["energy", "power", "solar", "battery", "electricity", "kwh"]):
        return REF_MAP["nasa-fission-solar-power"]
    if any(k in query_lower for k in ["health", "crew", "medical", "sick", "safety"]):
        return REF_MAP["nasa-hrp-hazards"]
    if any(k in query_lower for k in ["rover", "isru", "extract", "mine"]):
        return REF_MAP["nasa-isru-overview"]
    if planet == "mars" or "mars" in query_lower or "dust" in query_lower:
        return REF_MAP["nasa-mars-journey"]
    return REF_MAP["nasa-artemis-moon"]


def generate_contextual_mentor_response(
    question: str,
    mission_context: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Analyzes live, authoritative mission telemetry and answers the student's question
    using the required 5-part structure:
    - situation
    - explanation
    - possible_decisions
    - trade_offs
    - learning_fact
    Plus spoken_summary and verified NASA source citation.
    """
    clean_q = sanitize_student_question(question)
    q_low = clean_q.lower()

    planet = mission_context.get("planet", "moon")
    planet_label = "Lunar South Pole (Moon)" if planet == "moon" else "Jezero Crater (Mars)"
    day = mission_context.get("current_day", 1)
    target_days = mission_context.get("target_duration_days", 15)
    crew_size = mission_context.get("crew_size", 4)
    res = mission_context.get("resources", {})
    env = mission_context.get("environment", {})
    facilities = mission_context.get("facilities", [])
    active_events = mission_context.get("active_events", [])

    o2 = res.get("oxygen", {"current": 45.0, "capacity": 80.0, "production_rate": 4.8, "consumption_rate": 3.36})
    water = res.get("water", {"current": 220.0, "capacity": 360.0, "production_rate": 10.0, "consumption_rate": 14.0})
    food = res.get("food", {"current": 60.0, "capacity": 120.0, "production_rate": 0.0, "consumption_rate": 2.48})
    energy = res.get("energy", {"current": 160.0, "capacity": 240.0, "production_rate": 42.0, "consumption_rate": 36.0})
    health = res.get("crew_health", 100.0)
    shielding = res.get("radiation_shielding", 55.0)
    rad_msv = res.get("cumulative_radiation_msv", 0.0)
    infra = res.get("infrastructure_condition", 100.0)

    fac_names = [f.get("name", f.get("facility_id", "Module")) for f in facilities]
    net_e = round(float(energy.get("production_rate", 0.0)) - float(energy.get("consumption_rate", 0.0)), 2)
    net_w = round(float(water.get("production_rate", 0.0)) - float(water.get("consumption_rate", 0.0)), 2)
    net_o2 = round(float(o2.get("production_rate", 0.0)) - float(o2.get("consumption_rate", 0.0)), 2)
    net_f = round(float(food.get("production_rate", 0.0)) - float(food.get("consumption_rate", 0.0)), 2)

    situation = (
        f"Day {day}/{target_days} at {planet_label} with {crew_size} astronauts. "
        f"Telemetry: Energy {energy.get('current')} / {energy.get('capacity')} kWh (net {net_e:+.1f}/day), "
        f"Oxygen {o2.get('current')} kg (net {net_o2:+.1f}/day), "
        f"Water {water.get('current')} L (net {net_w:+.1f}/day), "
        f"Food {food.get('current')} kg (net {net_f:+.1f}/day), "
        f"Crew Health {health}%, Shielding {shielding}%."
    )

    ref = _select_reference_for_topic(q_low, planet)

    # Topic-specific reasoning grounded in actual session telemetry
    if any(k in q_low for k in ["energy", "power", "solar", "battery", "electricity", "decreasing"]):
        explanation = (
            f"Your outpost currently generates {energy.get('production_rate', 0)} kWh/day and consumes "
            f"{energy.get('consumption_rate', 0)} kWh/day (net {net_e:+.1f} kWh/day) under "
            f"'{env.get('weather_condition', 'Nominal')}' conditions (solar multiplier {env.get('effective_solar_multiplier', 1.0)}x). "
            f"Installed modules ({', '.join(fac_names)}) draw continuous electrical power."
        )
        possible_decisions = [
            "Construct or upgrade a Photovoltaic Solar Array to boost daily kWh generation.",
            "Build or upgrade a Regenerative Battery Bank so daytime surplus isn't lost before shadow or dust-storm phases.",
            "Temporarily toggle off or defer non-essential Tier-3 facilities (like the Research Lab) if battery reserves drop below 40 kWh.",
        ]
        trade_offs = (
            "Building a Solar Array costs 15 kWh and 5 L of water upfront and requires ongoing dust maintenance, "
            "whereas shutting down labs preserves life-support power immediately at the cost of Science Points."
        )
    elif any(k in q_low for k in ["water", "recycle", "thirst", "leak", "ice"]):
        explanation = (
            f"Your Water reserve is at {water.get('current')} L / {water.get('capacity')} L with production/recovery at "
            f"{water.get('production_rate', 0)} L/day vs. total demand of {water.get('consumption_rate', 0)} L/day (net {net_w:+.1f} L/day). "
            "Remember that water is consumed not just by the crew (3.5 L/astronaut/day), but also as feedwater for the Oxygen Generator and Greenhouse irrigation!"
        )
        possible_decisions = [
            "Construct or upgrade the Closed-Loop Water Recycler (WPA) to recover up to 92% of crew wastewater.",
            "Build a Pressurized Rover & ISRU Garage to harvest fresh water ice from planetary deposits (+11 L/day).",
            "Avoid over-expanding water-hungry Greenhouses until your water recovery loop is positive.",
        ]
        trade_offs = (
            "The Water Recycler consumes 10 kWh/day of electricity, and the Rover Garage consumes 11 kWh/day plus higher mechanical wear, "
            "trading electrical energy for long-term water security."
        )
    elif any(k in q_low for k in ["oxygen", "o2", "breathe", "air", "suffocat"]):
        explanation = (
            f"Your Oxygen reserve stands at {o2.get('current')} kg / {o2.get('capacity')} kg. "
            f"Your {crew_size} astronauts consume {o2.get('consumption_rate', round(crew_size * 0.84, 2))} kg/day, while your facilities produce "
            f"{o2.get('production_rate', 0)} kg/day (net {net_o2:+.1f} kg/day)."
        )
        possible_decisions = [
            "Ensure your Oxygen Generator Assembly (OGA) is operational and upgraded to match crew metabolic demand.",
            "Keep Water (>20 L) and Electrical Energy (>30 kWh) above critical levels—electrolysis stops if either feed runs dry.",
            "Construct a Hydroponic Greenhouse for supplemental photosynthetic oxygen (+1.1 kg/day) plus food.",
        ]
        trade_offs = (
            "Running the Oxygen Generator consumes 14 kWh/day of power and 4.0 L/day of purified water via electrolysis ($2\\text{H}_2\\text{O} \\rightarrow 2\\text{H}_2 + \\text{O}_2$)."
        )
    elif any(k in q_low for k in ["food", "greenhouse", "crop", "hungry", "ration"]):
        explanation = (
            f"Your Food reserve is {food.get('current')} kg / {food.get('capacity')} kg, with daily crew consumption at "
            f"{food.get('consumption_rate', 0)} kg/day and greenhouse production at {food.get('production_rate', 0)} kg/day."
        )
        possible_decisions = [
            "Build or upgrade a Hydroponic Greenhouse to grow fresh crops on-site (+3.2 kg food/day and +1.1 kg O2/day).",
            "Verify you have surplus Solar Array power (+16 kWh) and Water (+6.5 L/day) before activating the Greenhouse.",
            "Use emergency rationing only as a short-term bridge if food drops near critical threshold (12 kg).",
        ]
        trade_offs = (
            "A Greenhouse reduces dependency on Earth rations and produces oxygen, but imposes the highest combined water + electricity load of any module."
        )
    elif any(k in q_low for k in ["radiation", "shield", "shelter", "storm", "flare"]):
        explanation = (
            f"Your outpost's Radiation Shielding Effectiveness is {shielding}%, and cumulative crew exposure is {rad_msv} mSv. "
            f"On {planet_label}, ambient Galactic Cosmic Rays and sudden Solar Particle Events pose serious health hazards."
        )
        possible_decisions = [
            "Construct a Regolith-Berm Radiation Shelter (+32% shielding effectiveness and 55% acute solar storm dose reduction).",
            "Upgrade the Crew Habitat Module to add polyethylene and water-wall shielding layers.",
            "During Solar Storm alerts, always choose shelter or water-wall protection rather than unshielded surface EVA.",
        ]
        trade_offs = (
            "Building a Radiation Shelter requires 30 kWh energy and 20 L water for water-wall bladders, diverting resources from early science expansion to guarantee crew survival."
        )
    else:
        # Holistic commander assessment
        pending_ev = [e for e in active_events if e.get("status") == "pending"]
        ev_note = (
            f" First, resolve the active emergency '{pending_ev[0].get('title', 'Alert')}' in your Event Response panel."
            if pending_ev
            else ""
        )
        explanation = (
            f"Commander, your outpost on {planet_label} has {len(facilities)} active facilities at {infra}% average condition.{ev_note} "
            f"Your net daily balances are: Energy {net_e:+.1f} kWh, Oxygen {net_o2:+.1f} kg, Water {net_w:+.1f} L, and Food {net_f:+.1f} kg."
        )
        possible_decisions = [
            "Address any resource with a negative daily net balance first (especially Water or Energy, which feed other systems).",
            "Maintain facility condition above 70% by repairing worn modules or constructing a Robotics Maintenance Workshop.",
            "Once life-support loops are stable, build a Planetary Science Lab or Comm Array to achieve your Science Points objective.",
        ]
        trade_offs = (
            "Expanding science and agriculture too early can overload your power and water grids; over-hoarding supplies without building research infrastructure lowers your Mission Objectives score."
        )

    learning_fact = f"{ref['topic']}: {ref['relevant_explanation']}"
    spoken_summary = f"{situation} {explanation} Key trade-off: {trade_offs}"

    return {
        "commander_name": "COMMANDER AI",
        "question": clean_q,
        "situation": situation,
        "explanation": explanation,
        "possible_decisions": possible_decisions,
        "trade_offs": trade_offs,
        "learning_fact": learning_fact,
        "spoken_summary": spoken_summary,
        "nasa_reference": {
            "id": ref["id"],
            "topic": ref["topic"],
            "source_name": ref["source_name"],
            "source_url": ref["source_url"],
        },
        "provider_used": "nasa_telemetry_knowledge_engine",
    }


def explain_event_context(event_id: str, mission_context: Dict[str, Any]) -> Dict[str, Any]:
    ev = EVENT_MAP.get(event_id)
    if not ev:
        return generate_contextual_mentor_response(
            f"Explain the current environmental emergency ({event_id}) and our options.", mission_context
        )

    ref = REF_MAP.get(ev.get("nasa_reference_id", "nasa-eclss-2023"), EDUCATIONAL_REFERENCES[0])
    res = mission_context.get("resources", {})
    energy_curr = res.get("energy", {}).get("current", 0)
    water_curr = res.get("water", {}).get("current", 0)

    situation = (
        f"EMERGENCY BRIEFING — {ev['title']} (Severity: {ev['severity'].upper()}). "
        f"Current reserves available for response: {energy_curr} kWh Energy, {water_curr} L Water, "
        f"{res.get('oxygen', {}).get('current', 0)} kg Oxygen."
    )
    explanation = f"{ev['description']} Scientific mechanism: {ev['scientific_explanation']}"
    possible_decisions = [
        f"Option {opt['id']}: {opt['label']} — {opt['tradeoff']}" for opt in ev.get("decision_options", [])
    ]
    trade_offs = (
        "Option A typically invests electrical energy or water to protect crew health and infrastructure, "
        "whereas Option B/C conserves immediate utilities at the cost of higher radiation dose, resource loss, or equipment wear."
    )
    learning_fact = f"{ref['topic']}: {ref['relevant_explanation']}"

    return {
        "commander_name": "COMMANDER AI",
        "question": f"Emergency Analysis: {ev['title']}",
        "situation": situation,
        "explanation": explanation,
        "possible_decisions": possible_decisions,
        "trade_offs": trade_offs,
        "learning_fact": learning_fact,
        "spoken_summary": f"{situation} {ev['scientific_explanation']} {trade_offs}",
        "nasa_reference": {
            "id": ref["id"],
            "topic": ref["topic"],
            "source_name": ref["source_name"],
            "source_url": ref["source_url"],
        },
        "provider_used": "nasa_telemetry_knowledge_engine",
    }


def explain_mission_result_context(result_data: Dict[str, Any]) -> Dict[str, Any]:
    outcome = result_data.get("outcome", "completed").upper()
    score = result_data.get("total_score", 0.0)
    planet = result_data.get("planet", "moon").upper()
    days = result_data.get("days_survived", 1)
    target = result_data.get("target_days", 15)

    situation = (
        f"POST-MISSION DEBRIEF — {planet} Mission {outcome} after {days}/{target} days with a Total Score of {score}/100."
    )
    explanation = (
        "Your final evaluation weighs Crew Safety (25%), Resource Management (20%), Energy Efficiency (15%), "
        "Infrastructure Stability (15%), Emergency Decision-Making (15%), and Mission Objectives (10%)."
    )
    possible_decisions = result_data.get("recommended_improvements", [
        "Balance Solar Array and Battery Storage capacity before adding high-consumption modules.",
        "Couple Water Recycling with Oxygen Generation early to prevent life-support bottlenecks.",
    ])
    trade_offs = (
        "Keeping resources at 100% by never building science labs or greenhouses lowers your Mission Objectives score; "
        "true space systems engineering converts surplus energy and water into discovery while safeguarding crew health."
    )
    ref = REF_MAP["nasa-eclss-2023"]
    return {
        "commander_name": "COMMANDER AI",
        "question": "Mission Debrief & Engineering Review",
        "situation": situation,
        "explanation": explanation,
        "possible_decisions": possible_decisions,
        "trade_offs": trade_offs,
        "learning_fact": f"{ref['topic']}: {ref['relevant_explanation']}",
        "spoken_summary": f"{situation} {explanation} {trade_offs}",
        "nasa_reference": {
            "id": ref["id"],
            "topic": ref["topic"],
            "source_name": ref["source_name"],
            "source_url": ref["source_url"],
        },
        "provider_used": "nasa_telemetry_knowledge_engine",
    }

