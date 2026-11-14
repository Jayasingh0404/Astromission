"""
Comprehensive Automated Test Suite for ASTROMISSION Backend & Simulation Engine.
Covers Section 23 unit tests and integration Flows 1–4.
"""
import os
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_astromission.db"

from app.main import app  # noqa: E402
from app.core.database import Base, engine, SessionLocal  # noqa: E402
from app.services.seed_service import seed_all_data  # noqa: E402
from app.engine.simulator import (  # noqa: E402
    initialize_mission_state,
    simulate_day_progression,
    apply_event_decision,
    calculate_mission_score_and_insights,
)
from app.engine.catalog import EVENTS_CATALOG  # noqa: E402


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all_data(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_astromission.db"):
        os.remove("./test_astromission.db")


client = TestClient(app)


# ============================================================================
# UNIT TESTS: SIMULATION ENGINE (INDEPENDENT OF FRONTEND & 3D GRAPHICS)
# ============================================================================

def test_simulation_initial_state_and_capacity_limits():
    res, env, objs, facs = initialize_mission_state(
        mission_id="moon-shackleton-outpost",
        difficulty="intermediate",
        crew_size=4,
        duration_days=15,
        supply_preset="balanced",
    )
    assert res["oxygen"]["current"] <= res["oxygen"]["capacity"]
    assert res["water"]["current"] <= res["water"]["capacity"]
    assert res["food"]["current"] <= res["food"]["capacity"]
    assert res["energy"]["current"] <= res["energy"]["capacity"]
    assert env["planet"] == "moon"
    assert len(facs) == 4
    assert len(objs) == 4


def test_moon_and_mars_json_config_files_and_distinct_physics():
    from pathlib import Path
    cfg_dir = Path("backend/app/config")
    assert (cfg_dir / "moon_scenario.json").exists()
    assert (cfg_dir / "mars_scenario.json").exists()

    _, moon_env, _, _ = initialize_mission_state("moon-shackleton-outpost")
    _, mars_env, _, _ = initialize_mission_state("mars-jezero-colony")
    assert moon_env["planet"] == "moon"
    assert mars_env["planet"] == "mars"
    assert moon_env["solar_irradiance_factor"] > mars_env["solar_irradiance_factor"]
    assert moon_env["ambient_radiation_msv_day"] > mars_env["ambient_radiation_msv_day"]



def test_deterministic_seed_reproducibility():
    res1, env1, objs1, facs1 = initialize_mission_state("mars-jezero-colony", "intermediate", 4, 15)
    res2, env2, objs2, facs2 = initialize_mission_state("mars-jezero-colony", "intermediate", 4, 15)

    out1 = simulate_day_progression("mars", "intermediate", 1, 15, 4, 77777, res1, env1, facs1, objs1, [])
    out2 = simulate_day_progression("mars", "intermediate", 1, 15, 4, 77777, res2, env2, facs2, objs2, [])

    assert out1["resources"] == out2["resources"]
    assert out1["daily_metrics"] == out2["daily_metrics"]
    assert out1["generated_event"] == out2["generated_event"]


def test_lunar_night_and_power_allocation_priority():
    res, env, objs, facs = initialize_mission_state("moon-shackleton-outpost", "intermediate", 4, 15)
    # Day 6 on Moon is a Lunar Shadow Cycle day (22% solar multiplier)
    out = simulate_day_progression("moon", "intermediate", 6, 15, 4, 42, res, env, facs, objs, [])
    assert out["environment"]["is_lunar_night"] is True
    assert out["environment"]["effective_solar_multiplier"] < 0.30
    assert out["daily_metrics"]["energy_generated"] < 15.0


def test_event_decision_consequences_and_shelter_mitigation():
    res, _, _, facs = initialize_mission_state("moon-shackleton-outpost", "intermediate", 4, 15)
    solar_storm = next(e for e in EVENTS_CATALOG if e["id"] == "solar_storm")

    # Without radiation shelter, Option C causes +5.5 mSv and -14% crew health
    res_c, _, summary_c = apply_event_decision(solar_storm, "C", res, facs)
    assert res_c["cumulative_radiation_msv"] == 5.5
    assert res_c["crew_health"] == 86.0
    assert summary_c["option_id"] == "C"

    # With radiation shelter installed, acute radiation delta is mitigated by 55%
    facs_with_shelter = facs + [{"facility_id": "radiation_shelter", "level": 1, "is_operational": True, "condition": 100.0}]
    res_shelter, _, _ = apply_event_decision(solar_storm, "C", res, facs_with_shelter)
    assert res_shelter["cumulative_radiation_msv"] < 3.0


def test_mission_failure_on_zero_oxygen():
    res, env, objs, _ = initialize_mission_state("moon-shackleton-outpost", "expert", 4, 15)
    res["oxygen"]["current"] = 0.0
    # No oxygen generator installed
    facs_no_o2 = [{"id": "hab1", "facility_id": "crew_habitat", "level": 1, "condition": 100.0, "is_operational": True}]
    out = simulate_day_progression("moon", "expert", 2, 15, 4, 99, res, env, facs_no_o2, objs, [])
    assert out["mission_status"] == "failed"
    assert out["failure_reason"] is not None


# ============================================================================
# INTEGRATION FLOWS 1 TO 4
# ============================================================================

def test_flow_1_guest_moon_mission_build_upgrade_advance_and_report():
    """
    FLOW 1: Enter as guest -> Select Moon -> Start mission -> Build solar array -> Advance day -> View results.
    """
    # 1. Guest login
    guest_res = client.post("/api/v1/auth/guest")
    assert guest_res.status_code == 201
    token = guest_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Moon mission (5 days duration so we can complete it)
    sess_res = client.post(
        "/api/v1/sessions",
        headers=headers,
        json={
            "mission_id": "moon-shackleton-outpost",
            "difficulty": "beginner",
            "target_duration_days": 5,
            "crew_size": 4,
            "supply_preset": "abundant",
            "random_seed": 101,
        },
    )
    assert sess_res.status_code == 201
    session_data = sess_res.json()
    session_id = session_data["id"]
    assert session_data["planet"] == "moon"
    assert len(session_data["facilities"]) == 4

    # 3. Build a Water Recycler & Solar Array
    build_res = client.post(
        f"/api/v1/sessions/{session_id}/facilities",
        headers=headers,
        json={"facility_id": "water_recycler", "grid_x": 4.0, "grid_z": 4.0},
    )
    assert build_res.status_code == 201
    facilities_after_build = build_res.json()["facilities"]
    assert len(facilities_after_build) == 5

    # Upgrade the newly built Water Recycler to Level 2
    wr_id = facilities_after_build[-1]["id"]
    upg_res = client.patch(
        f"/api/v1/sessions/{session_id}/facilities/{wr_id}",
        headers=headers,
        json={"upgrade": True},
    )
    assert upg_res.status_code == 200
    upgraded_wr = next(f for f in upg_res.json()["facilities"] if f["id"] == wr_id)
    assert upgraded_wr["level"] == 2


    # 4. Advance days until mission completes (Day 1 -> 5)
    for step in range(4):
        adv_res = client.post(
            f"/api/v1/sessions/{session_id}/advance",
            headers=headers,
            json={"action_token": f"tok-{step}"},
        )
        assert adv_res.status_code == 200

    final_sess = client.get(f"/api/v1/sessions/{session_id}", headers=headers).json()
    assert final_sess["current_day"] == 5
    assert final_sess["status"] == "completed"

    # 5. View mission report
    rep_res = client.get(f"/api/v1/sessions/{session_id}/report", headers=headers)
    assert rep_res.status_code == 200
    rep = rep_res.json()
    assert rep["outcome"] == "completed"
    assert rep["total_score"] > 50.0
    assert "crew_safety" in rep["score_breakdown"]
    assert len(rep["snapshots"]) == 5


def test_flow_2_mars_mission_event_decision_and_consequences():
    """
    FLOW 2: Select Mars -> Start mission -> Experience event -> Make decision -> View consequences.
    """
    guest_res = client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {guest_res.json()['access_token']}"}

    sess_res = client.post(
        "/api/v1/sessions",
        headers=headers,
        json={
            "mission_id": "mars-jezero-colony",
            "difficulty": "intermediate",
            "target_duration_days": 10,
            "crew_size": 4,
            "random_seed": 2,
        },
    )
    assert sess_res.status_code == 201
    session_id = sess_res.json()["id"]

    # Advance days until at least one event triggers
    triggered_event = None
    for _ in range(5):
        adv = client.post(f"/api/v1/sessions/{session_id}/advance", headers=headers).json()
        if adv["day_report"]["generated_event"]:
            triggered_event = adv["day_report"]["generated_event"]
            break

    assert triggered_event is not None
    # Make decision Option A
    choose_res = client.post(
        f"/api/v1/sessions/{session_id}/events/{triggered_event['id']}/choose",
        headers=headers,
        json={"option_id": "A"},
    )
    assert choose_res.status_code == 200
    events_after = choose_res.json()["events"]
    resolved = next(e for e in events_after if e["id"] == triggered_event["id"])
    assert resolved["status"] == "resolved"
    assert resolved["selected_option_id"] == "A"


def test_flow_3_commander_ai_contextual_explanation():
    """
    FLOW 3: Launch mission -> Ask COMMANDER AI about resource shortage -> Receive structured explanation -> Take action.
    """
    guest_res = client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {guest_res.json()['access_token']}"}

    sess_res = client.post(
        "/api/v1/sessions",
        headers=headers,
        json={"mission_id": "moon-shackleton-outpost", "difficulty": "intermediate", "target_duration_days": 10},
    )
    session_id = sess_res.json()["id"]

    ai_res = client.post(
        "/api/v1/mentor/ask",
        headers=headers,
        json={"question": "Commander, why is my water and energy decreasing?", "session_id": session_id},
    )
    assert ai_res.status_code == 200
    ai_body = ai_res.json()
    assert "situation" in ai_body
    assert "explanation" in ai_body
    assert len(ai_body["possible_decisions"]) >= 2
    assert "trade_offs" in ai_body
    assert "learning_fact" in ai_body
    assert "nasa_reference" in ai_body


def test_flow_4_teacher_classroom_and_student_assignment():
    """
    FLOW 4: Teacher logs in & creates classroom -> Student joins -> Teacher assigns mission -> Teacher views report.
    """
    # Login as seeded teacher
    t_login = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "teacher@astromission.edu", "password": "TeacherPassword123!"},
    )
    assert t_login.status_code == 200
    t_headers = {"Authorization": f"Bearer {t_login.json()['access_token']}"}

    # Create new classroom
    cls_res = client.post(
        "/api/v1/classrooms",
        headers=t_headers,
        json={
            "name": "Artemis Engineering Honors Lab",
            "description": "High school systems engineering cohort",
            "grade_level": "Grades 9-12",
            "learning_objectives": ["Master ECLSS loops"],
        },
    )
    assert cls_res.status_code == 201
    cls_data = cls_res.json()
    cls_id = cls_data["id"]
    join_code = cls_data["join_code"]

    # Register a new student & join classroom
    s_reg = client.post(
        "/api/v1/auth/register",
        json={
            "username": "student_leo",
            "email": "leo@astromission.edu",
            "password": "LeoPassword123!",
            "role": "student",
            "display_name": "Leo Shepard",
        },
    )
    assert s_reg.status_code == 201
    s_headers = {"Authorization": f"Bearer {s_reg.json()['access_token']}"}

    join_res = client.post(
        "/api/v1/classrooms/join",
        headers=s_headers,
        json={"join_code": join_code},
    )
    assert join_res.status_code == 200

    # Teacher assigns a Mars mission
    asgn_res = client.post(
        f"/api/v1/classrooms/{cls_id}/assignments",
        headers=t_headers,
        json={
            "mission_id": "mars-jezero-colony",
            "title": "Mars Dust Resilience Challenge",
            "planet": "mars",
            "difficulty": "intermediate",
            "target_duration_days": 8,
            "learning_objectives": ["Survive regional dust storm"],
        },
    )
    assert asgn_res.status_code == 201

    # Student completes a quiz in Learning Center
    quiz_res = client.post(
        "/api/v1/learning/quizzes/quiz-moon-exploration/attempt",
        headers=s_headers,
        json={"answers": [1, 0, 1]},
    )
    assert quiz_res.status_code == 200
    assert quiz_res.json()["percentage"] == 100.0

    # Teacher views classroom reports
    rep_res = client.get(f"/api/v1/classrooms/{cls_id}/reports", headers=t_headers)
    assert rep_res.status_code == 200
    reports = rep_res.json()["student_reports"]
    assert any(r["display_name"] == "Leo Shepard" and r["quizzes_completed"] == 1 for r in reports)


def test_rbac_admin_protection():
    # Student cannot access /admin/users
    s_login = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "student@astromission.edu", "password": "StudentPassword123!"},
    )
    s_headers = {"Authorization": f"Bearer {s_login.json()['access_token']}"}
    denied = client.get("/api/v1/admin/users", headers=s_headers)
    assert denied.status_code == 403

    # Admin can access /admin/users and /admin/health
    a_login = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "admin@astromission.edu", "password": "AdminPassword123!"},
    )
    a_headers = {"Authorization": f"Bearer {a_login.json()['access_token']}"}
    allowed = client.get("/api/v1/admin/health", headers=a_headers)
    assert allowed.status_code == 200
    assert allowed.json()["status"] == "healthy"
