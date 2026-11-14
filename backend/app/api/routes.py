"""
ASTROMISSION Versioned REST API Router (/api/v1).
Implements Authentication, Guest Sessions, Missions, Turn-Based Simulation Engine,
Building Construction & Upgrades, Environmental Event Decisions, COMMANDER AI,
Learning Center + Quizzes, Analytics, Classrooms, and Admin Controls.
"""
from copy import deepcopy
from datetime import datetime, timezone
import random
import string
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.core.security import (
    security_scheme,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.entities import (
    User,
    UserProfile,
    Classroom,
    ClassroomMember,
    Mission,
    MissionSession,
    ResourceSnapshot,
    Facility,
    SessionFacility,
    PlayerAction,
    MissionEvent,
    EventChoice,
    MissionResult,
    Achievement,
    UserAchievement,
    LearningModule,
    Quiz,
    QuizAttempt,
    MissionAssignment,
    EducationalReference,
    Notification,
    AuditLog,
)
from app.schemas.api_schemas import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ProfileUpdateRequest,
    CreateSessionRequest,
    AdvanceDayRequest,
    ConstructFacilityRequest,
    UpdateFacilityRequest,
    PlayerActionRequest,
    EventDecisionRequest,
    MentorAskRequest,
    MentorExplainEventRequest,
    MentorExplainResultRequest,
    QuizAttemptRequest,
    CreateClassroomRequest,
    JoinClassroomRequest,
    CreateAssignmentRequest,
    AdminScenarioCreateRequest,
    AdminScenarioUpdateRequest,
    AdminRoleUpdateRequest,
)
from app.engine.catalog import FACILITY_MAP, EVENT_MAP, MISSIONS_CATALOG
from app.engine.simulator import (
    initialize_mission_state,
    recalculate_capacities_and_shielding,
    simulate_day_progression,
    apply_event_decision,
    calculate_mission_score_and_insights,
)
from app.ai.commander import (
    check_rate_limit,
    generate_contextual_mentor_response,
    explain_event_context,
    explain_mission_result_context,
)

router = APIRouter()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
        )
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or inactive.")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id, User.is_active == True).first()  # noqa: E712
    except Exception:
        return None


def require_roles(*allowed_roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}.",
            )
        return user

    return checker


def _serialize_user(user: User) -> Dict[str, Any]:
    prof = user.profile
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_guest": user.is_guest,
        "is_active": user.is_active,
        "display_name": prof.display_name if prof else user.username,
        "avatar_id": prof.avatar_id if prof else "commander-luna",
        "bio": prof.bio if prof else "",
        "preferred_language": prof.preferred_language if prof else "en",
        "xp_points": prof.xp_points if prof else 0,
        "learning_points": prof.learning_points if prof else 0,
        "level": prof.level if prof else 1,
        "mission_streak": prof.mission_streak if prof else 0,
        "missions_attempted": prof.missions_attempted if prof else 0,
        "missions_completed": prof.missions_completed if prof else 0,
        "skill_progress": prof.skill_progress if prof else {},
    }


def _check_session_ownership(session_obj: Optional[MissionSession], user: User) -> MissionSession:
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission session not found.")
    if session_obj.user_id != user.id and user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this mission session.")
    return session_obj


def _serialize_session_facility(sf: SessionFacility) -> Dict[str, Any]:
    f_def = FACILITY_MAP.get(sf.facility_id, {})
    return {
        "id": sf.id,
        "session_id": sf.session_id,
        "facility_id": sf.facility_id,
        "name": sf.name,
        "category": f_def.get("category", "operations"),
        "description": f_def.get("description", ""),
        "educational_explanation": f_def.get("educational_explanation", ""),
        "level": sf.level,
        "max_level": f_def.get("max_level", 3),
        "condition": sf.condition,
        "is_operational": sf.is_operational,
        "power_priority": sf.power_priority,
        "energy_consumption": round(float(f_def.get("energy_consumption", 0.0)) * (1.0 + 0.22 * (sf.level - 1)), 1),
        "production_rates": f_def.get("production_rates", {}),
        "construction_cost": f_def.get("construction_cost", {}),
        "grid_x": sf.grid_x,
        "grid_z": sf.grid_z,
        "built_on_day": sf.built_on_day,
    }


def _serialize_event_choice(ec: EventChoice) -> Dict[str, Any]:
    ev_def = EVENT_MAP.get(ec.event_id, {})
    return {
        "id": ec.id,
        "session_id": ec.session_id,
        "event_id": ec.event_id,
        "mission_day": ec.mission_day,
        "status": ec.status,
        "title": ev_def.get("title", ec.event_id),
        "description": ev_def.get("description", ""),
        "severity": ev_def.get("severity", "medium"),
        "affected_systems": ev_def.get("affected_systems", []),
        "decision_options": ev_def.get("decision_options", []),
        "scientific_explanation": ev_def.get("scientific_explanation", ""),
        "selected_option_id": ec.selected_option_id,
        "consequences_applied": ec.consequences_applied,
        "resolved_at": ec.resolved_at.isoformat() if ec.resolved_at else None,
    }


def _serialize_session(db: Session, s: MissionSession) -> Dict[str, Any]:
    facs = (
        db.query(SessionFacility)
        .filter(SessionFacility.session_id == s.id)
        .order_by(SessionFacility.built_on_day.asc())
        .all()
    )
    events = (
        db.query(EventChoice)
        .filter(EventChoice.session_id == s.id)
        .order_by(EventChoice.mission_day.desc())
        .all()
    )
    actions = (
        db.query(PlayerAction)
        .filter(PlayerAction.session_id == s.id)
        .order_by(PlayerAction.created_at.desc())
        .limit(25)
        .all()
    )
    return {
        "id": s.id,
        "user_id": s.user_id,
        "mission_id": s.mission_id,
        "mission_name": s.mission_name,
        "planet": s.planet,
        "difficulty": s.difficulty,
        "status": s.status,
        "current_day": s.current_day,
        "target_duration_days": s.target_duration_days,
        "crew_size": s.crew_size,
        "random_seed": s.random_seed,
        "supply_preset": s.supply_preset,
        "resources": s.current_resources,
        "environment": s.environment_state,
        "objectives": s.objectives_state,
        "facilities": [_serialize_session_facility(f) for f in facs],
        "events": [_serialize_event_choice(e) for e in events],
        "recent_actions": [
            {
                "id": a.id,
                "mission_day": a.mission_day,
                "action_type": a.action_type,
                "target_id": a.target_id,
                "payload": a.payload,
                "outcome": a.outcome,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in actions
        ],
        "result": (
            {
                "outcome": s.result.outcome,
                "days_survived": s.result.days_survived,
                "target_days": s.result.target_days,
                "total_score": s.result.total_score,
                "score_breakdown": s.result.score_breakdown,
                "crew_condition": s.result.crew_condition,
                "major_decisions": s.result.major_decisions,
                "best_decisions": s.result.best_decisions,
                "major_mistakes": s.result.major_mistakes,
                "educational_insights": s.result.educational_insights,
                "recommended_improvements": s.result.recommended_improvements,
            }
            if s.result
            else None
        ),
    }


def _evaluate_and_unlock_achievements(db: Session, user: User, session_obj: Optional[MissionSession] = None) -> List[str]:
    unlocked_ids = {
        ua.achievement_id for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user.id).all()
    }
    all_achievements = db.query(Achievement).all()
    newly_unlocked: List[str] = []
    prof = user.profile

    for ach in all_achievements:
        if ach.id in unlocked_ids:
            continue
        crit = ach.criteria or {}
        ctype = crit.get("type")
        should_unlock = False

        if ctype == "missions_completed" and prof and prof.missions_completed >= int(crit.get("count", 1)):
            should_unlock = True
        elif ctype == "planet_completed" and session_obj and session_obj.status == "completed":
            if session_obj.planet == crit.get("planet"):
                should_unlock = True
        elif ctype == "facility_built" and session_obj:
            has_fac = (
                db.query(SessionFacility)
                .filter(
                    SessionFacility.session_id == session_obj.id,
                    SessionFacility.facility_id == crit.get("facility_id"),
                )
                .first()
            )
            if has_fac:
                should_unlock = True
        elif ctype == "events_resolved" and session_obj:
            res_cnt = (
                db.query(EventChoice)
                .filter(EventChoice.session_id == session_obj.id, EventChoice.status == "resolved")
                .count()
            )
            if res_cnt >= int(crit.get("count", 3)):
                should_unlock = True
        elif ctype == "expert_mission_completed" and session_obj and session_obj.status == "completed":
            if session_obj.difficulty == "expert":
                should_unlock = True
        elif ctype == "total_score" and session_obj and session_obj.result:
            if session_obj.result.total_score >= float(crit.get("min_score", 85)):
                should_unlock = True
        elif ctype == "resource_management_score" and session_obj and session_obj.result:
            rm_score = (
                session_obj.result.score_breakdown.get("resource_management", {}).get("score", 0.0)
            )
            if rm_score >= float(crit.get("min_score", 80)):
                should_unlock = True
        elif ctype == "energy_efficiency_score" and session_obj and session_obj.result:
            ee_score = (
                session_obj.result.score_breakdown.get("energy_efficiency", {}).get("score", 0.0)
            )
            if ee_score >= float(crit.get("min_score", 80)):
                should_unlock = True
        elif ctype == "quizzes_passed":
            passed_cnt = (
                db.query(QuizAttempt)
                .filter(QuizAttempt.user_id == user.id, QuizAttempt.percentage >= 80.0)
                .count()
            )
            if passed_cnt >= int(crit.get("count", 2)):
                should_unlock = True

        if should_unlock:
            db.add(
                UserAchievement(
                    user_id=user.id,
                    achievement_id=ach.id,
                    session_id=session_obj.id if session_obj else None,
                )
            )
            if prof:
                prof.xp_points += ach.xp_reward
                prof.level = max(1, 1 + (prof.xp_points // 250))
            db.add(
                Notification(
                    user_id=user.id,
                    session_id=session_obj.id if session_obj else None,
                    level="success",
                    title=f"Achievement Unlocked: {ach.title}!",
                    message=f"{ach.description} (+{ach.xp_reward} XP)",
                )
            )
            newly_unlocked.append(ach.title)

    return newly_unlocked


# ============================================================================
# 1. AUTHENTICATION ENDPOINTS
# ============================================================================

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(User)
        .filter((User.email == req.email.lower()) | (User.username == req.username.lower()))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that email or username already exists.",
        )

    user = User(
        username=req.username.lower(),
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        role=req.role,
        is_active=True,
        is_guest=False,
    )
    db.add(user)
    db.flush()

    profile = UserProfile(
        user_id=user.id,
        display_name=req.display_name or req.username,
        avatar_id="commander-luna",
        bio="Junior Astronaut Mission Commander in training.",
        skill_progress={
            "Life Support (ECLSS)": 50,
            "Power Grid Engineering": 50,
            "Radiation Protection": 50,
            "Space Agriculture": 50,
            "Emergency Triage": 50,
        },
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/auth/login")
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    ident = req.email_or_username.strip().lower()
    user = db.query(User).filter((User.email == ident) | (User.username == ident)).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/auth/guest", status_code=status.HTTP_201_CREATED)
def create_guest_session(db: Session = Depends(get_db)):
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    username = f"guest_commander_{suffix}"
    user = User(
        username=username,
        email=f"{username}@guest.astromission.local",
        password_hash=hash_password(str(uuid.uuid4())),
        role="student",
        is_active=True,
        is_guest=True,
    )
    db.add(user)
    db.flush()
    profile = UserProfile(
        user_id=user.id,
        display_name=f"Guest Commander #{suffix.upper()}",
        avatar_id="commander-ares",
        bio="Exploring ASTROMISSION in Guest Commander Mode.",
        skill_progress={
            "Life Support (ECLSS)": 50,
            "Power Grid Engineering": 50,
            "Radiation Protection": 50,
            "Space Agriculture": 50,
            "Emergency Triage": 50,
        },
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": user.id, "role": user.role, "guest": True})
    refresh_token = create_refresh_token({"sub": user.id})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/auth/logout")
def logout_user(user: User = Depends(get_current_user)):
    return {"status": "logged_out", "user_id": user.id}


@router.post("/auth/refresh")
def refresh_access_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")
    user = db.query(User).filter(User.id == payload.get("sub"), User.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    return {
        "access_token": create_access_token({"sub": user.id, "role": user.role}),
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if user and req.new_password:
        user.password_hash = hash_password(req.new_password)
        db.commit()
        return {"status": "password_updated", "message": "Password has been securely updated."}
    return {
        "status": "reset_acknowledged",
        "message": "If an account matches that email, password reset instructions have been processed.",
    }


@router.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return _serialize_user(user)


# ============================================================================
# 2. MISSIONS & SESSIONS ENDPOINTS
# ============================================================================

@router.get("/missions")
def list_missions(db: Session = Depends(get_db)):
    missions = db.query(Mission).filter(Mission.is_active == True).all()  # noqa: E712
    return [
        {
            "id": m.id,
            "name": m.name,
            "planet": m.planet,
            "tagline": m.tagline,
            "description": m.description,
            "difficulty_default": m.difficulty_default,
            "default_duration_days": m.default_duration_days,
            "default_crew_size": m.default_crew_size,
            "environmental_constraints": m.environmental_constraints,
            "major_hazards": m.major_hazards,
            "objectives": m.objectives,
            "starting_resources": m.starting_resources,
            "starting_facilities": m.starting_facilities,
        }
        for m in missions
    ]


@router.get("/missions/{mission_id}")
def get_mission(mission_id: str, db: Session = Depends(get_db)):
    m = db.query(Mission).filter(Mission.id == mission_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission scenario not found.")
    return {
        "id": m.id,
        "name": m.name,
        "planet": m.planet,
        "tagline": m.tagline,
        "description": m.description,
        "difficulty_default": m.difficulty_default,
        "default_duration_days": m.default_duration_days,
        "default_crew_size": m.default_crew_size,
        "environmental_constraints": m.environmental_constraints,
        "major_hazards": m.major_hazards,
        "objectives": m.objectives,
        "starting_resources": m.starting_resources,
        "starting_facilities": m.starting_facilities,
    }


@router.get("/facilities/catalog")
def get_facilities_catalog(db: Session = Depends(get_db)):
    facs = db.query(Facility).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "category": f.category,
            "description": f.description,
            "educational_explanation": f.educational_explanation,
            "construction_cost": f.construction_cost,
            "energy_consumption": f.energy_consumption,
            "production_rates": f.production_rates,
            "storage_Modifiers": f.storage_Modifiers,
            "maintenance_cost_per_day": f.maintenance_cost_per_day,
            "max_level": f.max_level,
            "planet_compatibility": f.planet_compatibility,
            "functional_effects": f.functional_effects,
        }
        for f in facs
    ]


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(
    req: CreateSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mission = db.query(Mission).filter(Mission.id == req.mission_id).first()
    if not mission:
        mission = db.query(Mission).first()
        if not mission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No mission scenarios available.")

    seed = req.random_seed if req.random_seed is not None else random.randint(1000, 999999)
    res_state, env_state, obj_state, init_facs = initialize_mission_state(
        mission_id=mission.id,
        difficulty=req.difficulty,
        crew_size=req.crew_size,
        duration_days=req.target_duration_days,
        supply_preset=req.supply_preset,
        starting_facilities_override=req.starting_facilities,
    )

    session_obj = MissionSession(
        user_id=user.id,
        mission_id=mission.id,
        classroom_assignment_id=req.classroom_assignment_id,
        mission_name=req.mission_name or mission.name,
        planet=mission.planet,
        difficulty=req.difficulty,
        status="active",
        current_day=1,
        target_duration_days=req.target_duration_days,
        crew_size=req.crew_size,
        random_seed=seed,
        supply_preset=req.supply_preset,
        current_resources=res_state,
        environment_state=env_state,
        objectives_state=obj_state,
        started_at=utcnow(),
    )
    db.add(session_obj)
    db.flush()

    for idx, f_cfg in enumerate(init_facs):
        f_def = FACILITY_MAP.get(f_cfg["facility_id"], {})
        p_prio = f_def.get("functional_effects", {}).get("power_priority", 2)
        db.add(
            SessionFacility(
                session_id=session_obj.id,
                facility_id=f_cfg["facility_id"],
                name=f_def.get("name", f_cfg["facility_id"]),
                level=int(f_cfg.get("level", 1)),
                condition=100.0,
                is_operational=True,
                power_priority=p_prio,
                grid_x=float(f_cfg.get("grid_x", (idx - 1.5) * 4.5)),
                grid_z=float(f_cfg.get("grid_z", 0.0)),
                built_on_day=1,
            )
        )

    # Initial Day 1 Snapshot
    db.add(
        ResourceSnapshot(
            session_id=session_obj.id,
            mission_day=1,
            oxygen=res_state["oxygen"]["current"],
            oxygen_capacity=res_state["oxygen"]["capacity"],
            water=res_state["water"]["current"],
            water_capacity=res_state["water"]["capacity"],
            food=res_state["food"]["current"],
            food_capacity=res_state["food"]["capacity"],
            energy=res_state["energy"]["current"],
            energy_capacity=res_state["energy"]["capacity"],
            energy_generated=0.0,
            energy_consumed=0.0,
            radiation_shielding=res_state["radiation_shielding"],
            cumulative_radiation_msv=0.0,
            crew_health=100.0,
            infrastructure_condition=100.0,
            details={"note": "Mission Launch Day 1 Initial State"},
        )
    )

    if user.profile:
        user.profile.missions_attempted += 1

    db.commit()
    db.refresh(session_obj)
    return _serialize_session(db, session_obj)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    return _serialize_session(db, s)


@router.post("/sessions/{session_id}/start")
def start_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    if s.status in ("not_started", "paused"):
        s.status = "active"
        if not s.started_at:
            s.started_at = utcnow()
        db.commit()
    return _serialize_session(db, s)


@router.post("/sessions/{session_id}/pause")
def pause_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    if s.status == "active":
        s.status = "paused"
        db.commit()
    return _serialize_session(db, s)


@router.post("/sessions/{session_id}/resume")
def resume_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    if s.status == "paused":
        s.status = "active"
        db.commit()
    return _serialize_session(db, s)


@router.post("/sessions/{session_id}/advance")
def advance_mission_day(
    session_id: str,
    req: Optional[AdvanceDayRequest] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)

    if s.status in ("completed", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission has already {s.status}. View the mission report or start a new mission.",
        )

    # Idempotency guard against duplicate End Day clicks
    if req and req.action_token and s.last_action_token == req.action_token:
        return {
            "session": _serialize_session(db, s),
            "day_report": {"idempotent_replay": True, "day": s.current_day},
        }

    facs_db = db.query(SessionFacility).filter(SessionFacility.session_id == s.id).all()
    facs_dicts = [_serialize_session_facility(f) for f in facs_db]
    events_db = db.query(EventChoice).filter(EventChoice.session_id == s.id).all()
    events_dicts = [_serialize_event_choice(e) for e in events_db]

    sim_out = simulate_day_progression(
        planet=s.planet,
        difficulty=s.difficulty,
        current_day=s.current_day,
        target_duration_days=s.target_duration_days,
        crew_size=s.crew_size,
        random_seed=s.random_seed,
        resources=s.current_resources,
        environment=s.environment_state,
        facilities=facs_dicts,
        objectives=s.objectives_state,
        active_events=events_dicts,
    )

    s.current_day = sim_out["next_day"]
    s.status = sim_out["mission_status"]
    s.current_resources = sim_out["resources"]
    s.environment_state = sim_out["environment"]
    s.objectives_state = sim_out["objectives"]
    if req and req.action_token:
        s.last_action_token = req.action_token
    flag_modified(s, "current_resources")
    flag_modified(s, "environment_state")
    flag_modified(s, "objectives_state")

    # Update facility conditions in DB
    cond_by_id = {f["id"]: f["condition"] for f in sim_out["facilities"]}
    for f_row in facs_db:
        if f_row.id in cond_by_id:
            f_row.condition = cond_by_id[f_row.id]

    # Persist generated event if any
    new_event_serialized = None
    if sim_out["generated_event"]:
        ev_def = sim_out["generated_event"]
        ec = EventChoice(
            session_id=s.id,
            event_id=ev_def["id"],
            mission_day=s.current_day,
            status="pending",
        )
        db.add(ec)
        db.flush()
        new_event_serialized = _serialize_event_choice(ec)

    # Save ResourceSnapshot for the new day
    res = sim_out["resources"]
    dm = sim_out["daily_metrics"]
    existing_snap = (
        db.query(ResourceSnapshot)
        .filter(ResourceSnapshot.session_id == s.id, ResourceSnapshot.mission_day == s.current_day)
        .first()
    )
    if not existing_snap:
        db.add(
            ResourceSnapshot(
                session_id=s.id,
                mission_day=s.current_day,
                oxygen=res["oxygen"]["current"],
                oxygen_capacity=res["oxygen"]["capacity"],
                water=res["water"]["current"],
                water_capacity=res["water"]["capacity"],
                food=res["food"]["current"],
                food_capacity=res["food"]["capacity"],
                energy=res["energy"]["current"],
                energy_capacity=res["energy"]["capacity"],
                energy_generated=dm["energy_generated"],
                energy_consumed=dm["energy_consumed"],
                radiation_shielding=res["radiation_shielding"],
                cumulative_radiation_msv=res["cumulative_radiation_msv"],
                crew_health=res["crew_health"],
                infrastructure_condition=res["infrastructure_condition"],
                details=dm,
            )
        )

    db.add(
        PlayerAction(
            session_id=s.id,
            mission_day=s.current_day,
            action_type="advance_day",
            payload={"from_day": s.current_day - 1, "to_day": s.current_day},
            outcome={
                "log_entries": sim_out["log_entries"],
                "alerts": sim_out["alerts"],
                "daily_metrics": dm,
            },
        )
    )

    newly_unlocked_badges: List[str] = []

    # If mission reached completion or failure, generate MissionResult
    if s.status in ("completed", "failed"):
        s.completed_at = utcnow()
        all_actions = db.query(PlayerAction).filter(PlayerAction.session_id == s.id).all()
        all_events = db.query(EventChoice).filter(EventChoice.session_id == s.id).all()
        all_snaps = db.query(ResourceSnapshot).filter(ResourceSnapshot.session_id == s.id).all()

        score_data = calculate_mission_score_and_insights(
            planet=s.planet,
            difficulty=s.difficulty,
            outcome=s.status,
            days_survived=s.current_day,
            target_days=s.target_duration_days,
            resources=s.current_resources,
            facilities=sim_out["facilities"],
            objectives=s.objectives_state,
            actions_history=[{"action_type": a.action_type, "target_id": a.target_id} for a in all_actions],
            event_choices=[{"status": e.status, "event_id": e.event_id} for e in all_events],
            snapshots=[
                {"energy_generated": sn.energy_generated, "energy_consumed": sn.energy_consumed}
                for sn in all_snaps
            ],
        )

        mr = MissionResult(
            session_id=s.id,
            user_id=user.id,
            planet=s.planet,
            difficulty=s.difficulty,
            outcome=s.status,
            days_survived=s.current_day,
            target_days=s.target_duration_days,
            total_score=score_data["total_score"],
            score_breakdown=score_data["score_breakdown"],
            final_resources=s.current_resources,
            crew_condition=s.current_resources.get("crew_health", 0.0),
            major_decisions=score_data["major_decisions"],
            major_mistakes=score_data["major_mistakes"],
            best_decisions=score_data["best_decisions"],
            educational_insights=score_data["educational_insights"],
            recommended_improvements=score_data["recommended_improvements"],
        )
        db.add(mr)
        db.flush()

        if user.profile:
            if s.status == "completed":
                user.profile.missions_completed += 1
                user.profile.mission_streak += 1
                user.profile.xp_points += int(score_data["total_score"] * 2)
            else:
                user.profile.mission_streak = 0
                user.profile.xp_points += 40
            user.profile.level = max(1, 1 + (user.profile.xp_points // 250))

    newly_unlocked_badges = _evaluate_and_unlock_achievements(db, user, s)
    db.commit()
    db.refresh(s)

    return {
        "session": _serialize_session(db, s),
        "day_report": {
            "day": s.current_day,
            "mission_status": s.status,
            "failure_reason": sim_out["failure_reason"],
            "daily_metrics": dm,
            "alerts": sim_out["alerts"],
            "log_entries": sim_out["log_entries"],
            "generated_event": new_event_serialized,
            "newly_unlocked_achievements": newly_unlocked_badges,
        },
    }


@router.get("/sessions/{session_id}/history")
def get_session_history(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    actions = (
        db.query(PlayerAction)
        .filter(PlayerAction.session_id == s.id)
        .order_by(PlayerAction.created_at.desc())
        .all()
    )
    events = (
        db.query(EventChoice)
        .filter(EventChoice.session_id == s.id)
        .order_by(EventChoice.mission_day.desc())
        .all()
    )
    return {
        "session_id": s.id,
        "actions": [
            {
                "id": a.id,
                "mission_day": a.mission_day,
                "action_type": a.action_type,
                "target_id": a.target_id,
                "payload": a.payload,
                "outcome": a.outcome,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in actions
        ],
        "events": [_serialize_event_choice(e) for e in events],
    }


@router.get("/sessions/{session_id}/report")
def get_session_report(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    facs_db = db.query(SessionFacility).filter(SessionFacility.session_id == s.id).all()
    facs_dicts = [_serialize_session_facility(f) for f in facs_db]
    all_actions = db.query(PlayerAction).filter(PlayerAction.session_id == s.id).all()
    all_events = db.query(EventChoice).filter(EventChoice.session_id == s.id).all()
    all_snaps = (
        db.query(ResourceSnapshot)
        .filter(ResourceSnapshot.session_id == s.id)
        .order_by(ResourceSnapshot.mission_day.asc())
        .all()
    )

    if s.result:
        res_obj = s.result
        return {
            "session_id": s.id,
            "mission_name": s.mission_name,
            "planet": s.planet,
            "difficulty": s.difficulty,
            "outcome": res_obj.outcome,
            "days_survived": res_obj.days_survived,
            "target_days": res_obj.target_days,
            "total_score": res_obj.total_score,
            "score_breakdown": res_obj.score_breakdown,
            "final_resources": res_obj.final_resources,
            "crew_condition": res_obj.crew_condition,
            "major_decisions": res_obj.major_decisions,
            "best_decisions": res_obj.best_decisions,
            "major_mistakes": res_obj.major_mistakes,
            "educational_insights": res_obj.educational_insights,
            "recommended_improvements": res_obj.recommended_improvements,
            "snapshots": [
                {
                    "day": sn.mission_day,
                    "oxygen": sn.oxygen,
                    "water": sn.water,
                    "food": sn.food,
                    "energy": sn.energy,
                    "crew_health": sn.crew_health,
                    "radiation_shielding": sn.radiation_shielding,
                    "cumulative_radiation_msv": sn.cumulative_radiation_msv,
                    "infrastructure_condition": sn.infrastructure_condition,
                }
                for sn in all_snaps
            ],
        }

    # Live preview report if mission is still active
    preview_score = calculate_mission_score_and_insights(
        planet=s.planet,
        difficulty=s.difficulty,
        outcome="completed" if s.current_resources.get("crew_health", 100) > 0 else "failed",
        days_survived=s.current_day,
        target_days=s.target_duration_days,
        resources=s.current_resources,
        facilities=facs_dicts,
        objectives=s.objectives_state,
        actions_history=[{"action_type": a.action_type, "target_id": a.target_id} for a in all_actions],
        event_choices=[{"status": e.status, "event_id": e.event_id} for e in all_events],
        snapshots=[
            {"energy_generated": sn.energy_generated, "energy_consumed": sn.energy_consumed}
            for sn in all_snaps
        ],
    )
    return {
        "session_id": s.id,
        "mission_name": s.mission_name,
        "planet": s.planet,
        "difficulty": s.difficulty,
        "outcome": s.status,
        "days_survived": s.current_day,
        "target_days": s.target_duration_days,
        **preview_score,
        "final_resources": s.current_resources,
        "crew_condition": s.current_resources.get("crew_health", 100.0),
        "snapshots": [
            {
                "day": sn.mission_day,
                "oxygen": sn.oxygen,
                "water": sn.water,
                "food": sn.food,
                "energy": sn.energy,
                "crew_health": sn.crew_health,
                "radiation_shielding": sn.radiation_shielding,
                "cumulative_radiation_msv": sn.cumulative_radiation_msv,
                "infrastructure_condition": sn.infrastructure_condition,
            }
            for sn in all_snaps
        ],
    }


# ============================================================================
# 3. FACILITIES & PLAYER ACTIONS ENDPOINTS
# ============================================================================

@router.get("/sessions/{session_id}/facilities")
def list_session_facilities(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    facs = db.query(SessionFacility).filter(SessionFacility.session_id == s.id).all()
    return [_serialize_session_facility(f) for f in facs]


@router.post("/sessions/{session_id}/facilities", status_code=status.HTTP_201_CREATED)
def construct_facility(
    session_id: str,
    req: ConstructFacilityRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    if s.status in ("completed", "failed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mission is no longer active.")

    f_def = FACILITY_MAP.get(req.facility_id)
    if not f_def:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility type not found in catalog.")

    cost_e = float(f_def["construction_cost"].get("energy", 15.0))
    cost_w = float(f_def["construction_cost"].get("water", 5.0))

    res = deepcopy(s.current_resources)
    if float(res["energy"]["current"]) < cost_e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient Electrical Energy to construct {f_def['name']} (requires {cost_e} kWh, available {res['energy']['current']} kWh).",
        )
    if float(res["water"]["current"]) < cost_w:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient Water to construct {f_def['name']} (requires {cost_w} L, available {res['water']['current']} L).",
        )

    res["energy"]["current"] = round(float(res["energy"]["current"]) - cost_e, 2)
    res["water"]["current"] = round(float(res["water"]["current"]) - cost_w, 2)

    existing_count = db.query(SessionFacility).filter(SessionFacility.session_id == s.id).count()
    angle_index = existing_count
    default_x = round(((angle_index % 4) - 1.5) * 5.0, 1)
    default_z = round(((angle_index // 4) - 0.5) * 5.0, 1)

    new_sf = SessionFacility(
        session_id=s.id,
        facility_id=req.facility_id,
        name=f_def["name"],
        level=1,
        condition=100.0,
        is_operational=True,
        power_priority=f_def.get("functional_effects", {}).get("power_priority", 2),
        grid_x=req.grid_x if req.grid_x is not None else default_x,
        grid_z=req.grid_z if req.grid_z is not None else default_z,
        built_on_day=s.current_day,
    )
    db.add(new_sf)
    db.flush()

    all_facs = [_serialize_session_facility(f) for f in db.query(SessionFacility).filter(SessionFacility.session_id == s.id).all()]
    res = recalculate_capacities_and_shielding(res, all_facs, s.planet)
    s.current_resources = res
    flag_modified(s, "current_resources")

    db.add(
        PlayerAction(
            session_id=s.id,
            mission_day=s.current_day,
            action_type="build",
            target_id=req.facility_id,
            payload={"facility_id": req.facility_id, "grid_x": new_sf.grid_x, "grid_z": new_sf.grid_z},
            outcome={"message": f"Constructed {f_def['name']} (-{cost_e} kWh, -{cost_w} L Water)."},
        )
    )

    _evaluate_and_unlock_achievements(db, user, s)
    db.commit()
    db.refresh(s)
    return _serialize_session(db, s)


@router.patch("/sessions/{session_id}/facilities/{facility_id}")
def update_or_upgrade_facility(
    session_id: str,
    facility_id: str,
    req: UpdateFacilityRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    sf = (
        db.query(SessionFacility)
        .filter(SessionFacility.session_id == s.id, SessionFacility.id == facility_id)
        .first()
    )
    if not sf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installed facility not found.")

    f_def = FACILITY_MAP.get(sf.facility_id, {})
    res = deepcopy(s.current_resources)
    action_msg = f"Updated {sf.name} configuration."

    if req.upgrade:
        max_lvl = f_def.get("max_level", 3)
        if sf.level >= max_lvl:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{sf.name} is already at maximum level (Level {max_lvl}).",
            )
        upg_e = round(float(f_def.get("construction_cost", {}).get("energy", 15.0)) * 0.75 * sf.level, 1)
        upg_w = round(float(f_def.get("construction_cost", {}).get("water", 5.0)) * 0.65 * sf.level, 1)
        if float(res["energy"]["current"]) < upg_e or float(res["water"]["current"]) < upg_w:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Upgrade requires {upg_e} kWh Energy and {upg_w} L Water.",
            )
        res["energy"]["current"] = round(float(res["energy"]["current"]) - upg_e, 2)
        res["water"]["current"] = round(float(res["water"]["current"]) - upg_w, 2)
        sf.level += 1
        sf.condition = min(100.0, sf.condition + 15.0)
        action_msg = f"Upgraded {sf.name} to Level {sf.level} (-{upg_e} kWh, -{upg_w} L)."

    if req.is_operational is not None:
        sf.is_operational = req.is_operational
        action_msg = f"{'Activated' if req.is_operational else 'Powered down'} {sf.name}."

    if req.power_priority is not None:
        sf.power_priority = req.power_priority

    db.flush()
    all_facs = [_serialize_session_facility(f) for f in db.query(SessionFacility).filter(SessionFacility.session_id == s.id).all()]
    res = recalculate_capacities_and_shielding(res, all_facs, s.planet)
    s.current_resources = res
    flag_modified(s, "current_resources")

    db.add(
        PlayerAction(
            session_id=s.id,
            mission_day=s.current_day,
            action_type="upgrade" if req.upgrade else "toggle_power",
            target_id=sf.facility_id,
            payload=req.model_dump(),
            outcome={"message": action_msg},
        )
    )
    db.commit()
    db.refresh(s)
    return _serialize_session(db, s)


@router.post("/sessions/{session_id}/facilities/{facility_id}/repair")
def repair_facility(
    session_id: str,
    facility_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    sf = (
        db.query(SessionFacility)
        .filter(SessionFacility.session_id == s.id, SessionFacility.id == facility_id)
        .first()
    )
    if not sf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")

    if sf.condition >= 99.0:
        return _serialize_session(db, s)

    repair_energy_cost = 10.0
    res = deepcopy(s.current_resources)
    if float(res["energy"]["current"]) < repair_energy_cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Repair requires {repair_energy_cost} kWh of electrical energy.",
        )

    res["energy"]["current"] = round(float(res["energy"]["current"]) - repair_energy_cost, 2)
    old_cond = sf.condition
    sf.condition = 100.0
    db.flush()

    all_facs = [_serialize_session_facility(f) for f in db.query(SessionFacility).filter(SessionFacility.session_id == s.id).all()]
    res = recalculate_capacities_and_shielding(res, all_facs, s.planet)
    s.current_resources = res
    flag_modified(s, "current_resources")

    db.add(
        PlayerAction(
            session_id=s.id,
            mission_day=s.current_day,
            action_type="repair",
            target_id=sf.facility_id,
            payload={"old_condition": old_cond},
            outcome={"message": f"Repaired {sf.name} from {old_cond}% to 100% (-{repair_energy_cost} kWh)."},
        )
    )
    db.commit()
    db.refresh(s)
    return _serialize_session(db, s)


@router.post("/sessions/{session_id}/actions")
def perform_player_action(
    session_id: str,
    req: PlayerActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    res = deepcopy(s.current_resources)
    msg = ""

    if req.action_type == "ration":
        new_mode = "rationed" if res.get("rationing_mode") != "rationed" else "normal"
        res["rationing_mode"] = new_mode
        msg = f"Switched crew food protocol to {new_mode.upper()} mode."
    elif req.action_type == "emergency_o2":
        # Convert 15 L water + 18 kWh energy into +8.0 kg emergency O2
        if float(res["water"]["current"]) < 15.0 or float(res["energy"]["current"]) < 18.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency O2 electrolysis surge requires 15 L Water and 18 kWh Energy.",
            )
        res["water"]["current"] = round(float(res["water"]["current"]) - 15.0, 2)
        res["energy"]["current"] = round(float(res["energy"]["current"]) - 18.0, 2)
        res["oxygen"]["current"] = round(
            min(float(res["oxygen"]["capacity"]), float(res["oxygen"]["current"]) + 8.0), 2
        )
        msg = "Executed Emergency Electrolysis Surge: +8.0 kg Oxygen (-15 L Water, -18 kWh Energy)."
    elif req.action_type == "rover_sortie":
        if float(res["energy"]["current"]) < 16.0 or float(res["oxygen"]["current"]) < 2.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Surface Rover ISRU Ice Sortie requires 16 kWh Energy and 2.0 kg EVA Oxygen.",
            )
        res["energy"]["current"] = round(float(res["energy"]["current"]) - 16.0, 2)
        res["oxygen"]["current"] = round(float(res["oxygen"]["current"]) - 2.0, 2)
        res["water"]["current"] = round(
            min(float(res["water"]["capacity"]), float(res["water"]["current"]) + 32.0), 2
        )
        res["science_points"] = round(float(res.get("science_points", 0.0)) + 5.0, 1)
        msg = "Completed Pressurized Rover Crater Ice Sortie: +32 L Water & +5 Science Points (-16 kWh, -2.0 kg O2)."

    s.current_resources = res
    flag_modified(s, "current_resources")
    db.add(
        PlayerAction(
            session_id=s.id,
            mission_day=s.current_day,
            action_type=req.action_type,
            payload=req.payload,
            outcome={"message": msg},
        )
    )
    db.commit()
    db.refresh(s)
    return _serialize_session(db, s)


# ============================================================================
# 4. EVENTS & RESOURCES ENDPOINTS
# ============================================================================

@router.get("/sessions/{session_id}/events")
def list_session_events(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    events = (
        db.query(EventChoice)
        .filter(EventChoice.session_id == s.id)
        .order_by(EventChoice.mission_day.desc())
        .all()
    )
    return [_serialize_event_choice(e) for e in events]


@router.post("/sessions/{session_id}/events/{event_id}/choose")
def choose_event_decision(
    session_id: str,
    event_id: str,
    req: EventDecisionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    ec = (
        db.query(EventChoice)
        .filter(
            EventChoice.session_id == s.id,
            (EventChoice.id == event_id) | (EventChoice.event_id == event_id),
            EventChoice.status == "pending",
        )
        .first()
    )
    if not ec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending emergency event not found.")

    ev_def = EVENT_MAP.get(ec.event_id)
    if not ev_def:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event definition not found.")

    facs_db = db.query(SessionFacility).filter(SessionFacility.session_id == s.id).all()
    facs_dicts = [_serialize_session_facility(f) for f in facs_db]

    new_res, new_facs, summary = apply_event_decision(
        event_def=ev_def,
        option_id=req.option_id,
        resources=s.current_resources,
        facilities=facs_dicts,
    )

    s.current_resources = new_res
    flag_modified(s, "current_resources")

    cond_by_id = {f["id"]: f["condition"] for f in new_facs}
    for f_row in facs_db:
        if f_row.id in cond_by_id:
            f_row.condition = cond_by_id[f_row.id]

    ec.status = "resolved"
    ec.selected_option_id = req.option_id
    ec.consequences_applied = summary
    ec.resolved_at = utcnow()
    flag_modified(ec, "consequences_applied")

    db.add(
        PlayerAction(
            session_id=s.id,
            mission_day=s.current_day,
            action_type="event_choice",
            target_id=ec.event_id,
            payload={"option_id": req.option_id},
            outcome=summary,
        )
    )

    _evaluate_and_unlock_achievements(db, user, s)
    db.commit()
    db.refresh(s)
    return _serialize_session(db, s)


@router.get("/sessions/{session_id}/resources")
def get_session_resources(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    return s.current_resources


@router.get("/sessions/{session_id}/resources/history")
def get_session_resources_history(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _check_session_ownership(db.query(MissionSession).filter(MissionSession.id == session_id).first(), user)
    snaps = (
        db.query(ResourceSnapshot)
        .filter(ResourceSnapshot.session_id == s.id)
        .order_by(ResourceSnapshot.mission_day.asc())
        .all()
    )
    return [
        {
            "day": sn.mission_day,
            "oxygen": sn.oxygen,
            "oxygen_capacity": sn.oxygen_capacity,
            "water": sn.water,
            "water_capacity": sn.water_capacity,
            "food": sn.food,
            "food_capacity": sn.food_capacity,
            "energy": sn.energy,
            "energy_capacity": sn.energy_capacity,
            "energy_generated": sn.energy_generated,
            "energy_consumed": sn.energy_consumed,
            "radiation_shielding": sn.radiation_shielding,
            "cumulative_radiation_msv": sn.cumulative_radiation_msv,
            "crew_health": sn.crew_health,
            "infrastructure_condition": sn.infrastructure_condition,
        }
        for sn in snaps
    ]


# ============================================================================
# 5. COMMANDER AI MENTOR ENDPOINTS
# ============================================================================

@router.post("/mentor/ask")
def ask_commander_ai(
    req: MentorAskRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    rate_key = user.id if user else "anonymous"
    if not check_rate_limit(rate_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="COMMANDER AI telemetry link rate limit reached. Please wait a moment.",
        )

    mission_context: Dict[str, Any] = {"planet": req.planet or "moon"}
    if req.session_id:
        s = db.query(MissionSession).filter(MissionSession.id == req.session_id).first()
        if s:
            mission_context = _serialize_session(db, s)
            mission_context["active_events"] = mission_context.get("events", [])

    return generate_contextual_mentor_response(req.question, mission_context)


@router.post("/mentor/explain-event")
def mentor_explain_event(
    req: MentorExplainEventRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    mission_context: Dict[str, Any] = {}
    if req.session_id:
        s = db.query(MissionSession).filter(MissionSession.id == req.session_id).first()
        if s:
            mission_context = _serialize_session(db, s)
    return explain_event_context(req.event_id, mission_context)


@router.post("/mentor/explain-result")
def mentor_explain_result(
    req: MentorExplainResultRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = get_session_report(req.session_id, user, db)
    return explain_mission_result_context(report)


# ============================================================================
# 6. EDUCATIONAL LEARNING CENTER & QUIZZES
# ============================================================================

@router.get("/learning/modules")
def list_learning_modules(db: Session = Depends(get_db)):
    mods = db.query(LearningModule).order_by(LearningModule.order_index.asc()).all()
    refs = {r.id: r for r in db.query(EducationalReference).all()}
    quizzes = {q.module_id: q for q in db.query(Quiz).all()}
    return [
        {
            "id": m.id,
            "title": m.title,
            "topic": m.topic,
            "difficulty": m.difficulty,
            "summary": m.summary,
            "simple_explanation": m.simple_explanation,
            "visual_illustration_type": m.visual_illustration_type,
            "real_world_application": m.real_world_application,
            "related_game_mechanic": m.related_game_mechanic,
            "key_takeaways": m.key_takeaways,
            "translations": m.translations,
            "quiz_id": quizzes[m.id].id if m.id in quizzes else None,
            "reference": (
                {
                    "id": refs[m.reference_id].id,
                    "topic": refs[m.reference_id].topic,
                    "source_name": refs[m.reference_id].source_name,
                    "source_url": refs[m.reference_id].source_url,
                    "relevant_explanation": refs[m.reference_id].relevant_explanation,
                }
                if m.reference_id and m.reference_id in refs
                else None
            ),
        }
        for m in mods
    ]


@router.get("/learning/modules/{module_id}")
def get_learning_module(module_id: str, db: Session = Depends(get_db)):
    m = db.query(LearningModule).filter(LearningModule.id == module_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning module not found.")
    ref = db.query(EducationalReference).filter(EducationalReference.id == m.reference_id).first() if m.reference_id else None
    quiz = db.query(Quiz).filter(Quiz.module_id == m.id).first()
    return {
        "id": m.id,
        "title": m.title,
        "topic": m.topic,
        "difficulty": m.difficulty,
        "summary": m.summary,
        "simple_explanation": m.simple_explanation,
        "visual_illustration_type": m.visual_illustration_type,
        "real_world_application": m.real_world_application,
        "related_game_mechanic": m.related_game_mechanic,
        "key_takeaways": m.key_takeaways,
        "translations": m.translations,
        "reference": (
            {
                "id": ref.id,
                "topic": ref.topic,
                "source_name": ref.source_name,
                "source_url": ref.source_url,
                "relevant_explanation": ref.relevant_explanation,
            }
            if ref
            else None
        ),
        "quiz": (
            {
                "id": quiz.id,
                "title": quiz.title,
                "difficulty": quiz.difficulty,
                "points_reward": quiz.points_reward,
                "questions": quiz.questions,
            }
            if quiz
            else None
        ),
    }


@router.get("/learning/quizzes")
def list_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).all()
    return [
        {
            "id": q.id,
            "module_id": q.module_id,
            "title": q.title,
            "difficulty": q.difficulty,
            "points_reward": q.points_reward,
            "questions": q.questions,
        }
        for q in quizzes
    ]


@router.post("/learning/quizzes/{quiz_id}/attempt")
def submit_quiz_attempt(
    quiz_id: str,
    req: QuizAttemptRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    questions = quiz.questions or []
    score = 0
    details = []
    for idx, q in enumerate(questions):
        chosen = req.answers[idx] if idx < len(req.answers) else -1
        correct = int(q["correct_index"])
        is_correct = chosen == correct
        if is_correct:
            score += 1
        details.append(
            {
                "question_id": q["id"],
                "prompt": q["prompt"],
                "selected_index": chosen,
                "correct_index": correct,
                "is_correct": is_correct,
                "explanation": q["explanation"],
            }
        )

    max_score = max(1, len(questions))
    pct = round((score / max_score) * 100.0, 1)
    pts_earned = int(quiz.points_reward * (score / max_score))

    attempt = QuizAttempt(
        user_id=user.id,
        quiz_id=quiz.id,
        score=score,
        max_score=max_score,
        percentage=pct,
        answers_detail=details,
        points_earned=pts_earned,
    )
    db.add(attempt)
    if user.profile:
        user.profile.learning_points += pts_earned
        user.profile.xp_points += pts_earned
        user.profile.level = max(1, 1 + (user.profile.xp_points // 250))

    db.flush()
    newly_unlocked = _evaluate_and_unlock_achievements(db, user, None)
    db.commit()

    return {
        "attempt_id": attempt.id,
        "quiz_id": quiz.id,
        "score": score,
        "max_score": max_score,
        "percentage": pct,
        "points_earned": pts_earned,
        "details": details,
        "newly_unlocked_achievements": newly_unlocked,
    }


@router.get("/learning/references")
def list_scientific_references(db: Session = Depends(get_db)):
    refs = db.query(EducationalReference).all()
    return [
        {
            "id": r.id,
            "topic": r.topic,
            "source_name": r.source_name,
            "source_url": r.source_url,
            "relevant_explanation": r.relevant_explanation,
            "last_verified_date": r.last_verified_date,
            "game_usage": r.game_usage,
        }
        for r in refs
    ]


# ============================================================================
# 7. PROFILE, ACHIEVEMENTS & ANALYTICS
# ============================================================================

@router.get("/profile")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_ach = db.query(Achievement).all()
    user_ach = {
        ua.achievement_id: ua.unlocked_at.isoformat()
        for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user.id).all()
    }
    sessions = (
        db.query(MissionSession)
        .filter(MissionSession.user_id == user.id)
        .order_by(MissionSession.created_at.desc())
        .limit(10)
        .all()
    )
    quiz_attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "user": _serialize_user(user),
        "achievements": [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "icon_name": a.icon_name,
                "category": a.category,
                "xp_reward": a.xp_reward,
                "unlocked": a.id in user_ach,
                "unlocked_at": user_ach.get(a.id),
            }
            for a in all_ach
        ],
        "recent_sessions": [
            {
                "id": s.id,
                "mission_name": s.mission_name,
                "planet": s.planet,
                "difficulty": s.difficulty,
                "status": s.status,
                "current_day": s.current_day,
                "target_duration_days": s.target_duration_days,
                "total_score": s.result.total_score if s.result else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ],
        "quiz_attempts": [
            {
                "id": qa.id,
                "quiz_id": qa.quiz_id,
                "score": qa.score,
                "max_score": qa.max_score,
                "percentage": qa.percentage,
                "points_earned": qa.points_earned,
                "created_at": qa.created_at.isoformat() if qa.created_at else None,
            }
            for qa in quiz_attempts
        ],
    }


@router.patch("/profile")
def update_profile(
    req: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prof = user.profile
    if not prof:
        prof = UserProfile(user_id=user.id, display_name=user.username)
        db.add(prof)
    if req.display_name is not None:
        prof.display_name = req.display_name
    if req.avatar_id is not None:
        prof.avatar_id = req.avatar_id
    if req.bio is not None:
        prof.bio = req.bio
    if req.preferred_language is not None:
        prof.preferred_language = req.preferred_language
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.get("/analytics/overview")
def get_analytics_overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(MissionSession).filter(MissionSession.user_id == user.id).all()
    results = db.query(MissionResult).filter(MissionResult.user_id == user.id).all()
    quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == user.id).all()
    achievements_cnt = db.query(UserAchievement).filter(UserAchievement.user_id == user.id).count()

    attempted = len(sessions)
    completed = sum(1 for s in sessions if s.status == "completed")
    failed = sum(1 for s in sessions if s.status == "failed")
    avg_score = round(sum(r.total_score for r in results) / len(results), 1) if results else 0.0

    # Latest session resource snapshots for authentic Recharts time-series visualization
    latest_session = (
        db.query(MissionSession)
        .filter(MissionSession.user_id == user.id)
        .order_by(MissionSession.updated_at.desc())
        .first()
    )
    snapshots_series = []
    score_breakdown_series = []
    if latest_session:
        snaps = (
            db.query(ResourceSnapshot)
            .filter(ResourceSnapshot.session_id == latest_session.id)
            .order_by(ResourceSnapshot.mission_day.asc())
            .all()
        )
        snapshots_series = [
            {
                "day": f"Day {sn.mission_day}",
                "mission_day": sn.mission_day,
                "oxygen": sn.oxygen,
                "water": sn.water,
                "food": sn.food,
                "energy": sn.energy,
                "crew_health": sn.crew_health,
                "radiation_shielding": sn.radiation_shielding,
                "infrastructure_condition": sn.infrastructure_condition,
            }
            for sn in snaps
        ]
        rep = get_session_report(latest_session.id, user, db)
        for cat_key, cat_val in rep.get("score_breakdown", {}).items():
            score_breakdown_series.append(
                {
                    "category": cat_key.replace("_", " ").title(),
                    "score": cat_val.get("score", 0),
                    "weight": cat_val.get("weight", ""),
                }
            )

    return {
        "missions_attempted": attempted,
        "missions_completed": completed,
        "missions_failed": failed,
        "success_rate": round((completed / max(1, attempted)) * 100.0, 1) if attempted else 0.0,
        "failure_rate": round((failed / max(1, attempted)) * 100.0, 1) if attempted else 0.0,
        "average_score": avg_score,
        "quizzes_completed": len(quizzes),
        "achievements_unlocked": achievements_cnt,
        "latest_session_id": latest_session.id if latest_session else None,
        "latest_mission_name": latest_session.mission_name if latest_session else None,
        "resource_history": snapshots_series,
        "score_breakdown": score_breakdown_series,
    }


@router.get("/analytics/missions")
def get_analytics_missions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = (
        db.query(MissionSession)
        .filter(MissionSession.user_id == user.id)
        .order_by(MissionSession.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "mission_name": s.mission_name,
            "planet": s.planet,
            "difficulty": s.difficulty,
            "status": s.status,
            "current_day": s.current_day,
            "target_duration_days": s.target_duration_days,
            "total_score": s.result.total_score if s.result else None,
            "crew_health": s.current_resources.get("crew_health", 100.0),
            "science_points": s.current_resources.get("science_points", 0.0),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


# ============================================================================
# 8. TEACHER & CLASSROOM ENDPOINTS
# ============================================================================

@router.get("/classrooms")
def list_classrooms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role in ("teacher", "admin"):
        classes = db.query(Classroom).all() if user.role == "admin" else db.query(Classroom).filter(Classroom.teacher_id == user.id).all()
    else:
        member_ids = [
            cm.classroom_id
            for cm in db.query(ClassroomMember).filter(ClassroomMember.student_id == user.id).all()
        ]
        classes = db.query(Classroom).filter(Classroom.id.in_(member_ids)).all() if member_ids else []

    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "join_code": c.join_code,
            "grade_level": c.grade_level,
            "learning_objectives": c.learning_objectives,
            "student_count": len(c.members),
            "assignment_count": len(c.assignments),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in classes
    ]


@router.post("/classrooms", status_code=status.HTTP_201_CREATED)
def create_classroom(
    req: CreateClassroomRequest,
    user: User = Depends(require_roles("teacher", "admin")),
    db: Session = Depends(get_db),
):
    code = "ASTRO" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    cls = Classroom(
        teacher_id=user.id,
        name=req.name,
        description=req.description,
        join_code=code,
        grade_level=req.grade_level,
        learning_objectives=req.learning_objectives,
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return {
        "id": cls.id,
        "name": cls.name,
        "description": cls.description,
        "join_code": cls.join_code,
        "grade_level": cls.grade_level,
        "learning_objectives": cls.learning_objectives,
    }


@router.post("/classrooms/join")
def join_classroom(
    req: JoinClassroomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Classroom).filter(Classroom.join_code == req.join_code.strip().upper()).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom joining code not found.")
    existing = (
        db.query(ClassroomMember)
        .filter(ClassroomMember.classroom_id == cls.id, ClassroomMember.student_id == user.id)
        .first()
    )
    if not existing:
        db.add(ClassroomMember(classroom_id=cls.id, student_id=user.id))
        db.commit()
    return {"status": "joined", "classroom_id": cls.id, "classroom_name": cls.name, "join_code": cls.join_code}


@router.get("/classrooms/{classroom_id}")
def get_classroom_details(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found.")

    return {
        "id": cls.id,
        "name": cls.name,
        "description": cls.description,
        "join_code": cls.join_code,
        "grade_level": cls.grade_level,
        "learning_objectives": cls.learning_objectives,
        "members": [
            {
                "student_id": m.student_id,
                "username": m.student.username if m.student else "student",
                "display_name": (
                    m.student.profile.display_name
                    if m.student and m.student.profile
                    else (m.student.username if m.student else "Student")
                ),
                "missions_completed": m.student.profile.missions_completed if m.student and m.student.profile else 0,
                "learning_points": m.student.profile.learning_points if m.student and m.student.profile else 0,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
            for m in cls.members
        ],
        "assignments": [
            {
                "id": a.id,
                "mission_id": a.mission_id,
                "title": a.title,
                "planet": a.planet,
                "difficulty": a.difficulty,
                "target_duration_days": a.target_duration_days,
                "learning_objectives": a.learning_objectives,
                "due_date": a.due_date,
            }
            for a in cls.assignments
        ],
    }


@router.post("/classrooms/{classroom_id}/assignments", status_code=status.HTTP_201_CREATED)
def create_classroom_assignment(
    classroom_id: str,
    req: CreateAssignmentRequest,
    user: User = Depends(require_roles("teacher", "admin")),
    db: Session = Depends(get_db),
):
    cls = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found.")
    asgn = MissionAssignment(
        classroom_id=cls.id,
        mission_id=req.mission_id,
        title=req.title,
        planet=req.planet,
        difficulty=req.difficulty,
        target_duration_days=req.target_duration_days,
        learning_objectives=req.learning_objectives,
        due_date=req.due_date,
    )
    db.add(asgn)
    db.commit()
    db.refresh(asgn)
    return {
        "id": asgn.id,
        "classroom_id": asgn.classroom_id,
        "mission_id": asgn.mission_id,
        "title": asgn.title,
        "planet": asgn.planet,
        "difficulty": asgn.difficulty,
        "target_duration_days": asgn.target_duration_days,
        "learning_objectives": asgn.learning_objectives,
        "due_date": asgn.due_date,
    }


@router.get("/classrooms/{classroom_id}/reports")
def get_classroom_reports(
    classroom_id: str,
    user: User = Depends(require_roles("teacher", "admin")),
    db: Session = Depends(get_db),
):
    cls = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found.")

    student_reports = []
    for m in cls.members:
        st = m.student
        if not st:
            continue
        sessions = db.query(MissionSession).filter(MissionSession.user_id == st.id).all()
        results = db.query(MissionResult).filter(MissionResult.user_id == st.id).all()
        quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == st.id).all()
        avg_score = round(sum(r.total_score for r in results) / len(results), 1) if results else 0.0
        student_reports.append(
            {
                "student_id": st.id,
                "display_name": st.profile.display_name if st.profile else st.username,
                "missions_attempted": len(sessions),
                "missions_completed": sum(1 for s in sessions if s.status == "completed"),
                "average_mission_score": avg_score,
                "quizzes_completed": len(quizzes),
                "learning_points": st.profile.learning_points if st.profile else 0,
            }
        )

    return {
        "classroom_id": cls.id,
        "classroom_name": cls.name,
        "join_code": cls.join_code,
        "student_reports": student_reports,
    }


# ============================================================================
# 9. ADMINISTRATOR ENDPOINTS
# ============================================================================

@router.get("/admin/users")
def admin_list_users(
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).limit(100).all()
    return [_serialize_user(u) for u in users]


@router.patch("/admin/users/{user_id}/role")
def admin_update_user_role(
    user_id: str,
    req: AdminRoleUpdateRequest,
    admin_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    old_role = target.role
    target.role = req.role
    if req.is_active is not None:
        target.is_active = req.is_active
    db.add(
        AuditLog(
            actor_user_id=admin_user.id,
            action="update_user_role",
            resource_type="user",
            resource_id=target.id,
            details={"old_role": old_role, "new_role": req.role, "is_active": target.is_active},
        )
    )
    db.commit()
    db.refresh(target)
    return _serialize_user(target)


@router.get("/admin/scenarios")
def admin_list_scenarios(
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    missions = db.query(Mission).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "planet": m.planet,
            "tagline": m.tagline,
            "description": m.description,
            "difficulty_default": m.difficulty_default,
            "default_duration_days": m.default_duration_days,
            "default_crew_size": m.default_crew_size,
            "is_active": m.is_active,
        }
        for m in missions
    ]


@router.post("/admin/scenarios", status_code=status.HTTP_201_CREATED)
def admin_create_scenario(
    req: AdminScenarioCreateRequest,
    admin_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    existing = db.query(Mission).filter(Mission.id == req.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scenario ID already exists.")
    template = MISSIONS_CATALOG[0] if req.planet == "moon" else MISSIONS_CATALOG[1]
    m = Mission(
        id=req.id,
        name=req.name,
        planet=req.planet,
        tagline=req.tagline,
        description=req.description,
        difficulty_default=req.difficulty_default,
        default_duration_days=req.default_duration_days,
        default_crew_size=req.default_crew_size,
        environmental_constraints=req.environmental_constraints or template["environmental_constraints"],
        major_hazards=req.major_hazards or template["major_hazards"],
        objectives=req.objectives or template["objectives"],
        starting_resources=template["starting_resources"],
        starting_facilities=template["starting_facilities"],
        is_active=True,
    )
    db.add(m)
    db.add(
        AuditLog(
            actor_user_id=admin_user.id,
            action="create_scenario",
            resource_type="mission",
            resource_id=m.id,
            details={"name": m.name, "planet": m.planet},
        )
    )
    db.commit()
    return {"id": m.id, "name": m.name, "planet": m.planet, "status": "created"}


@router.patch("/admin/scenarios/{scenario_id}")
def admin_update_scenario(
    scenario_id: str,
    req: AdminScenarioUpdateRequest,
    admin_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    m = db.query(Mission).filter(Mission.id == scenario_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found.")
    if req.name is not None:
        m.name = req.name
    if req.tagline is not None:
        m.tagline = req.tagline
    if req.description is not None:
        m.description = req.description
    if req.difficulty_default is not None:
        m.difficulty_default = req.difficulty_default
    if req.default_duration_days is not None:
        m.default_duration_days = req.default_duration_days
    if req.default_crew_size is not None:
        m.default_crew_size = req.default_crew_size
    if req.is_active is not None:
        m.is_active = req.is_active

    db.add(
        AuditLog(
            actor_user_id=admin_user.id,
            action="update_scenario",
            resource_type="mission",
            resource_id=m.id,
            details=req.model_dump(exclude_none=True),
        )
    )
    db.commit()
    return {"id": m.id, "name": m.name, "default_duration_days": m.default_duration_days, "is_active": m.is_active}


@router.get("/admin/health")
def admin_system_health(
    admin_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return {
        "status": "healthy",
        "counts": {
            "users": db.query(User).count(),
            "active_sessions": db.query(MissionSession).filter(MissionSession.status == "active").count(),
            "completed_sessions": db.query(MissionSession).filter(MissionSession.status == "completed").count(),
            "facilities_catalog": db.query(Facility).count(),
            "events_catalog": db.query(MissionEvent).count(),
            "learning_modules": db.query(LearningModule).count(),
            "classrooms": db.query(Classroom).count(),
            "audit_logs": db.query(AuditLog).count(),
        },
    }


@router.get("/admin/audit-logs")
def admin_get_audit_logs(
    admin_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(50).all()
    return [
        {
            "id": l.id,
            "actor_user_id": l.actor_user_id,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]

