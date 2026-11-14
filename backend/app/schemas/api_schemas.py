from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="student", pattern="^(student|teacher)$")
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email_or_username: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    new_password: Optional[str] = Field(default=None, min_length=6, max_length=128)


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=100)
    avatar_id: Optional[str] = Field(default=None, max_length=64)
    bio: Optional[str] = Field(default=None, max_length=500)
    preferred_language: Optional[str] = Field(default=None, pattern="^(en|hi)$")


class CreateSessionRequest(BaseModel):
    mission_id: str = Field(default="moon-shackleton-outpost")
    mission_name: Optional[str] = None
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|expert)$")
    target_duration_days: int = Field(default=15, ge=5, le=60)
    crew_size: int = Field(default=4, ge=2, le=8)
    supply_preset: str = Field(
        default="balanced",
        pattern="^(abundant|balanced|lean|power_focus|life_support_focus)$",
    )
    starting_facilities: Optional[List[Dict[str, Any]]] = None
    classroom_assignment_id: Optional[str] = None
    random_seed: Optional[int] = None


class AdvanceDayRequest(BaseModel):
    action_token: Optional[str] = None


class ConstructFacilityRequest(BaseModel):
    facility_id: str
    grid_x: Optional[float] = None
    grid_z: Optional[float] = None


class UpdateFacilityRequest(BaseModel):
    upgrade: bool = False
    is_operational: Optional[bool] = None
    power_priority: Optional[int] = Field(default=None, ge=1, le=3)


class PlayerActionRequest(BaseModel):
    action_type: str = Field(..., pattern="^(ration|toggle_power|emergency_o2|rover_sortie)$")
    payload: Dict[str, Any] = Field(default_factory=dict)


class EventDecisionRequest(BaseModel):
    option_id: str = Field(..., min_length=1, max_length=8)


class MentorAskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=600)
    session_id: Optional[str] = None
    planet: Optional[str] = "moon"


class MentorExplainEventRequest(BaseModel):
    event_id: str
    session_id: Optional[str] = None


class MentorExplainResultRequest(BaseModel):
    session_id: str


class QuizAttemptRequest(BaseModel):
    answers: List[int]


class CreateClassroomRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=120)
    description: str = Field(default="", max_length=500)
    grade_level: str = Field(default="Grades 6-10", max_length=64)
    learning_objectives: List[str] = Field(default_factory=list)


class JoinClassroomRequest(BaseModel):
    join_code: str = Field(..., min_length=4, max_length=16)


class CreateAssignmentRequest(BaseModel):
    mission_id: str
    title: str = Field(..., min_length=3, max_length=120)
    planet: str = Field(default="moon", pattern="^(moon|mars)$")
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|expert)$")
    target_duration_days: int = Field(default=10, ge=5, le=45)
    learning_objectives: List[str] = Field(default_factory=list)
    due_date: Optional[str] = None


class AdminScenarioCreateRequest(BaseModel):
    id: str = Field(..., min_length=3, max_length=64)
    name: str = Field(..., min_length=3, max_length=120)
    planet: str = Field(..., pattern="^(moon|mars)$")
    tagline: str
    description: str
    difficulty_default: str = Field(default="intermediate", pattern="^(beginner|intermediate|expert)$")
    default_duration_days: int = Field(default=15, ge=5, le=60)
    default_crew_size: int = Field(default=4, ge=2, le=8)
    environmental_constraints: Dict[str, Any] = Field(default_factory=dict)
    major_hazards: List[str] = Field(default_factory=list)
    objectives: List[Dict[str, Any]] = Field(default_factory=list)


class AdminScenarioUpdateRequest(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    difficulty_default: Optional[str] = None
    default_duration_days: Optional[int] = Field(default=None, ge=5, le=60)
    default_crew_size: Optional[int] = Field(default=None, ge=2, le=8)
    is_active: Optional[bool] = None


class AdminRoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(student|teacher|admin)$")
    is_active: Optional[bool] = None

