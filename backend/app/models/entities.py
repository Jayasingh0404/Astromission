from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


# 1. users
class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="student", index=True)  # student, teacher, admin, guest
    is_active = Column(Boolean, default=True, nullable=False)
    is_guest = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("MissionSession", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


# 2. user_profiles
class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    avatar_id = Column(String(64), default="commander-luna", nullable=False)
    bio = Column(Text, default="Junior Astronaut Mission Commander in training.")
    preferred_language = Column(String(16), default="en", nullable=False)
    xp_points = Column(Integer, default=0, nullable=False)
    learning_points = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    mission_streak = Column(Integer, default=0, nullable=False)
    missions_attempted = Column(Integer, default=0, nullable=False)
    missions_completed = Column(Integer, default=0, nullable=False)
    skill_progress = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="profile")


# 3. classrooms
class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    teacher_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, default="")
    join_code = Column(String(16), unique=True, nullable=False, index=True)
    grade_level = Column(String(64), default="Grades 6-10")
    learning_objectives = Column(JSON, default=list, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    members = relationship("ClassroomMember", back_populates="classroom", cascade="all, delete-orphan")
    assignments = relationship("MissionAssignment", back_populates="classroom", cascade="all, delete-orphan")


# 4. classroom_members
class ClassroomMember(Base):
    __tablename__ = "classroom_members"
    __table_args__ = (UniqueConstraint("classroom_id", "student_id", name="uq_classroom_student"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    classroom_id = Column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    classroom = relationship("Classroom", back_populates="members")
    student = relationship("User")


# 5. missions (Scenario templates for Moon / Mars)
class Mission(Base):
    __tablename__ = "missions"

    id = Column(String(64), primary_key=True)  # e.g., 'moon-artemis-base', 'mars-ares-outpost'
    name = Column(String(120), nullable=False)
    planet = Column(String(32), nullable=False, index=True)  # 'moon' | 'mars'
    tagline = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    difficulty_default = Column(String(32), default="intermediate", nullable=False)
    default_duration_days = Column(Integer, default=15, nullable=False)
    default_crew_size = Column(Integer, default=4, nullable=False)
    environmental_constraints = Column(JSON, default=dict, nullable=False)
    major_hazards = Column(JSON, default=list, nullable=False)
    objectives = Column(JSON, default=list, nullable=False)
    starting_resources = Column(JSON, default=dict, nullable=False)
    starting_facilities = Column(JSON, default=list, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# 6. mission_sessions
class MissionSession(Base):
    __tablename__ = "mission_sessions"
    __table_args__ = (Index("ix_session_user_status", "user_id", "status"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_id = Column(String(64), ForeignKey("missions.id", ondelete="RESTRICT"), nullable=False, index=True)
    classroom_assignment_id = Column(String(36), ForeignKey("mission_assignments.id", ondelete="SET NULL"), nullable=True)
    mission_name = Column(String(120), nullable=False)
    planet = Column(String(32), nullable=False)  # 'moon' | 'mars'
    difficulty = Column(String(32), nullable=False, default="intermediate")  # 'beginner' | 'intermediate' | 'expert'
    status = Column(String(32), nullable=False, default="not_started")  # not_started, active, paused, completed, failed
    current_day = Column(Integer, nullable=False, default=1)
    target_duration_days = Column(Integer, nullable=False, default=15)
    crew_size = Column(Integer, nullable=False, default=4)
    random_seed = Column(Integer, nullable=False, default=42)
    supply_preset = Column(String(32), nullable=False, default="balanced")
    current_resources = Column(JSON, nullable=False, default=dict)
    environment_state = Column(JSON, nullable=False, default=dict)
    objectives_state = Column(JSON, nullable=False, default=list)
    last_action_token = Column(String(64), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")
    mission = relationship("Mission")
    snapshots = relationship("ResourceSnapshot", back_populates="session", cascade="all, delete-orphan")
    facilities = relationship("SessionFacility", back_populates="session", cascade="all, delete-orphan")
    actions = relationship("PlayerAction", back_populates="session", cascade="all, delete-orphan")
    choices = relationship("EventChoice", back_populates="session", cascade="all, delete-orphan")
    result = relationship("MissionResult", back_populates="session", uselist=False, cascade="all, delete-orphan")


# 7. resource_snapshots
class ResourceSnapshot(Base):
    __tablename__ = "resource_snapshots"
    __table_args__ = (UniqueConstraint("session_id", "mission_day", name="uq_session_day_snapshot"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("mission_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_day = Column(Integer, nullable=False)
    oxygen = Column(Float, nullable=False)
    oxygen_capacity = Column(Float, nullable=False)
    water = Column(Float, nullable=False)
    water_capacity = Column(Float, nullable=False)
    food = Column(Float, nullable=False)
    food_capacity = Column(Float, nullable=False)
    energy = Column(Float, nullable=False)
    energy_capacity = Column(Float, nullable=False)
    energy_generated = Column(Float, nullable=False, default=0.0)
    energy_consumed = Column(Float, nullable=False, default=0.0)
    radiation_shielding = Column(Float, nullable=False, default=50.0)
    cumulative_radiation_msv = Column(Float, nullable=False, default=0.0)
    crew_health = Column(Float, nullable=False, default=100.0)
    infrastructure_condition = Column(Float, nullable=False, default=100.0)
    details = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    session = relationship("MissionSession", back_populates="snapshots")


# 8. facilities (Catalog of 12 facility definitions)
class Facility(Base):
    __tablename__ = "facilities"

    id = Column(String(64), primary_key=True)  # e.g., 'solar_array', 'oxygen_generator'
    name = Column(String(100), nullable=False)
    category = Column(String(64), nullable=False)  # life_support, power, habitation, science, operations
    description = Column(Text, nullable=False)
    educational_explanation = Column(Text, nullable=False)
    construction_cost = Column(JSON, nullable=False, default=dict)  # energy, materials/water/etc.
    energy_consumption = Column(Float, nullable=False, default=0.0)
    production_rates = Column(JSON, nullable=False, default=dict)
    storage_Modifiers = Column(JSON, nullable=False, default=dict)
    maintenance_cost_per_day = Column(Float, nullable=False, default=1.5)
    max_level = Column(Integer, nullable=False, default=3)
    planet_compatibility = Column(JSON, nullable=False, default=lambda: ["moon", "mars"])
    functional_effects = Column(JSON, nullable=False, default=dict)


# 9. session_facilities (Constructed buildings inside a mission session)
class SessionFacility(Base):
    __tablename__ = "session_facilities"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("mission_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    facility_id = Column(String(64), ForeignKey("facilities.id", ondelete="RESTRICT"), nullable=False)
    name = Column(String(100), nullable=False)
    level = Column(Integer, nullable=False, default=1)
    condition = Column(Float, nullable=False, default=100.0)  # 0 to 100%
    is_operational = Column(Boolean, nullable=False, default=True)
    power_priority = Column(Integer, nullable=False, default=1)  # 1 = critical, 2 = standard, 3 = non-essential
    grid_x = Column(Float, nullable=False, default=0.0)
    grid_z = Column(Float, nullable=False, default=0.0)
    built_on_day = Column(Integer, nullable=False, default=1)
    custom_state = Column(JSON, nullable=False, default=dict)

    session = relationship("MissionSession", back_populates="facilities")
    facility_def = relationship("Facility")


# 10. player_actions
class PlayerAction(Base):
    __tablename__ = "player_actions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("mission_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_day = Column(Integer, nullable=False)
    action_type = Column(String(64), nullable=False)  # build, upgrade, repair, toggle_power, ration, event_choice, advance_day
    target_id = Column(String(64), nullable=True)
    payload = Column(JSON, default=dict, nullable=False)
    outcome = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    session = relationship("MissionSession", back_populates="actions")


# 11. mission_events (Catalog of 15+ environmental and emergency events)
class MissionEvent(Base):
    __tablename__ = "mission_events"

    id = Column(String(64), primary_key=True)  # e.g., 'solar_storm', 'dust_storm'
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), nullable=False)  # low, medium, high, critical
    planets = Column(JSON, nullable=False, default=lambda: ["moon", "mars"])
    trigger_conditions = Column(JSON, nullable=False, default=dict)
    affected_systems = Column(JSON, nullable=False, default=list)
    decision_options = Column(JSON, nullable=False, default=list)
    scientific_explanation = Column(Text, nullable=False)
    nasa_reference_id = Column(String(64), nullable=True)


# 12. event_choices (Active & resolved events per session)
class EventChoice(Base):
    __tablename__ = "event_choices"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("mission_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(64), ForeignKey("mission_events.id", ondelete="RESTRICT"), nullable=False)
    mission_day = Column(Integer, nullable=False)
    status = Column(String(32), nullable=False, default="pending")  # pending, resolved
    selected_option_id = Column(String(32), nullable=True)
    consequences_applied = Column(JSON, default=dict, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    session = relationship("MissionSession", back_populates="choices")
    event_def = relationship("MissionEvent")


# 13. mission_results
class MissionResult(Base):
    __tablename__ = "mission_results"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("mission_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    planet = Column(String(32), nullable=False)
    difficulty = Column(String(32), nullable=False)
    outcome = Column(String(32), nullable=False)  # completed | failed
    days_survived = Column(Integer, nullable=False)
    target_days = Column(Integer, nullable=False)
    total_score = Column(Float, nullable=False)
    score_breakdown = Column(JSON, nullable=False, default=dict)
    final_resources = Column(JSON, nullable=False, default=dict)
    crew_condition = Column(Float, nullable=False)
    major_decisions = Column(JSON, nullable=False, default=list)
    major_mistakes = Column(JSON, nullable=False, default=list)
    best_decisions = Column(JSON, nullable=False, default=list)
    educational_insights = Column(JSON, nullable=False, default=list)
    recommended_improvements = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    session = relationship("MissionSession", back_populates="result")


# 14. achievements
class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String(64), primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    icon_name = Column(String(64), nullable=False, default="Award")
    category = Column(String(64), nullable=False, default="mission")
    xp_reward = Column(Integer, nullable=False, default=100)
    criteria = Column(JSON, nullable=False, default=dict)


# 15. user_achievements
class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_id = Column(String(64), ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(36), nullable=True)
    unlocked_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")


# 16. learning_modules
class LearningModule(Base):
    __tablename__ = "learning_modules"

    id = Column(String(64), primary_key=True)
    title = Column(String(120), nullable=False)
    topic = Column(String(64), nullable=False, index=True)
    difficulty = Column(String(32), nullable=False, default="beginner")
    summary = Column(Text, nullable=False)
    simple_explanation = Column(Text, nullable=False)
    visual_illustration_type = Column(String(64), nullable=False)
    real_world_application = Column(Text, nullable=False)
    related_game_mechanic = Column(Text, nullable=False)
    key_takeaways = Column(JSON, nullable=False, default=list)
    translations = Column(JSON, nullable=False, default=dict)  # e.g., {'hi': {...}}
    reference_id = Column(String(64), ForeignKey("educational_references.id", ondelete="SET NULL"), nullable=True)
    order_index = Column(Integer, nullable=False, default=1)


# 17. quizzes
class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String(64), primary_key=True)
    module_id = Column(String(64), ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    difficulty = Column(String(32), nullable=False, default="beginner")
    points_reward = Column(Integer, nullable=False, default=50)
    questions = Column(JSON, nullable=False, default=list)  # list of {id, prompt, options, correct_index, explanation}


# 18. quiz_attempts
class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_id = Column(String(64), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    answers_detail = Column(JSON, nullable=False, default=list)
    points_earned = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz")


# 19. mission_assignments
class MissionAssignment(Base):
    __tablename__ = "mission_assignments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    classroom_id = Column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_id = Column(String(64), ForeignKey("missions.id", ondelete="RESTRICT"), nullable=False)
    title = Column(String(120), nullable=False)
    planet = Column(String(32), nullable=False)
    difficulty = Column(String(32), nullable=False, default="intermediate")
    target_duration_days = Column(Integer, nullable=False, default=10)
    learning_objectives = Column(JSON, nullable=False, default=list)
    due_date = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    classroom = relationship("Classroom", back_populates="assignments")


# 20. educational_references
class EducationalReference(Base):
    __tablename__ = "educational_references"

    id = Column(String(64), primary_key=True)
    topic = Column(String(100), nullable=False)
    source_name = Column(String(200), nullable=False)
    source_url = Column(String(500), nullable=False)
    relevant_explanation = Column(Text, nullable=False)
    last_verified_date = Column(String(32), nullable=False, default="2026-11-14")
    game_usage = Column(String(255), nullable=False)


# 21. notifications
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), nullable=True, index=True)
    level = Column(String(32), nullable=False, default="info")  # info, warning, critical, success
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


# 22. audit_logs
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    details = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

