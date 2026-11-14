"""
Idempotent Database Seeder for ASTROMISSION.
Populates NASA educational references, 12 facilities, Moon & Mars scenarios,
15 environmental events, 10 achievements, 8 learning modules + quizzes,
and demo accounts (student, teacher, admin) with a pre-configured classroom.
"""
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.entities import (
    User,
    UserProfile,
    Classroom,
    ClassroomMember,
    Mission,
    Facility,
    MissionEvent,
    Achievement,
    LearningModule,
    Quiz,
    EducationalReference,
    MissionAssignment,
)
from app.engine.catalog import (
    EDUCATIONAL_REFERENCES,
    FACILITIES_CATALOG,
    MISSIONS_CATALOG,
    EVENTS_CATALOG,
    ACHIEVEMENTS_CATALOG,
    LEARNING_MODULES_CATALOG,
)


def seed_all_data(db: Session) -> None:
    # 1. Educational References
    for ref in EDUCATIONAL_REFERENCES:
        existing = db.query(EducationalReference).filter(EducationalReference.id == ref["id"]).first()
        if not existing:
            db.add(EducationalReference(**ref))
    db.flush()

    # 2. Facilities (12 constructible facilities)
    for fac in FACILITIES_CATALOG:
        existing = db.query(Facility).filter(Facility.id == fac["id"]).first()
        if not existing:
            db.add(Facility(**fac))
    db.flush()

    # 3. Missions (Moon & Mars)
    for m in MISSIONS_CATALOG:
        existing = db.query(Mission).filter(Mission.id == m["id"]).first()
        if not existing:
            db.add(Mission(**m))
    db.flush()

    # 4. Mission Events (15 events)
    for ev in EVENTS_CATALOG:
        existing = db.query(MissionEvent).filter(MissionEvent.id == ev["id"]).first()
        if not existing:
            db.add(MissionEvent(**ev))
    db.flush()

    # 5. Achievements (10 badges)
    for ach in ACHIEVEMENTS_CATALOG:
        existing = db.query(Achievement).filter(Achievement.id == ach["id"]).first()
        if not existing:
            db.add(Achievement(**ach))
    db.flush()

    # 6. Learning Modules & Quizzes
    for mod in LEARNING_MODULES_CATALOG:
        mod_copy = {k: v for k, v in mod.items() if k != "quiz"}
        existing_mod = db.query(LearningModule).filter(LearningModule.id == mod["id"]).first()
        if not existing_mod:
            db.add(LearningModule(**mod_copy))
            db.flush()
        quiz_data = mod.get("quiz")
        if quiz_data:
            existing_quiz = db.query(Quiz).filter(Quiz.id == quiz_data["id"]).first()
            if not existing_quiz:
                db.add(
                    Quiz(
                        id=quiz_data["id"],
                        module_id=mod["id"],
                        title=quiz_data["title"],
                        difficulty=quiz_data["difficulty"],
                        points_reward=quiz_data["points_reward"],
                        questions=quiz_data["questions"],
                    )
                )
    db.flush()

    # 7. Demo Accounts (Student, Teacher, Admin)
    demo_users = [
        {
            "id": "demo-student-001",
            "username": "cadet_aria",
            "email": "student@astromission.edu",
            "password": "StudentPassword123!",
            "role": "student",
            "display_name": "Cadet Aria Vance",
            "avatar_id": "commander-luna",
            "bio": "Junior Astronaut Commander specializing in closed-loop lunar life support.",
        },
        {
            "id": "demo-teacher-001",
            "username": "prof_sagan",
            "email": "teacher@astromission.edu",
            "password": "TeacherPassword123!",
            "role": "teacher",
            "display_name": "Dr. Elena Sagan (Educator)",
            "avatar_id": "mission-director",
            "bio": "STEM Aerospace & Systems Engineering Educator.",
        },
        {
            "id": "demo-admin-001",
            "username": "flight_director",
            "email": "admin@astromission.edu",
            "password": "AdminPassword123!",
            "role": "admin",
            "display_name": "Flight Director Kranz",
            "avatar_id": "flight-director",
            "bio": "ASTROMISSION Systems Administrator & Scenario Architect.",
        },
    ]

    for u_info in demo_users:
        user = db.query(User).filter(User.email == u_info["email"]).first()
        if not user:
            user = User(
                id=u_info["id"],
                username=u_info["username"],
                email=u_info["email"],
                password_hash=hash_password(u_info["password"]),
                role=u_info["role"],
                is_active=True,
                is_guest=False,
            )
            db.add(user)
            db.flush()
            profile = UserProfile(
                user_id=user.id,
                display_name=u_info["display_name"],
                avatar_id=u_info["avatar_id"],
                bio=u_info["bio"],
                xp_points=250 if u_info["role"] == "student" else 500,
                learning_points=120 if u_info["role"] == "student" else 300,
                level=2 if u_info["role"] == "student" else 4,
                skill_progress={
                    "Life Support (ECLSS)": 75,
                    "Power Grid Engineering": 80,
                    "Radiation Protection": 65,
                    "Space Agriculture": 60,
                    "Emergency Triage": 70,
                },
            )
            db.add(profile)
            db.flush()

    # 8. Demo Classroom & Assignment
    demo_cls = db.query(Classroom).filter(Classroom.join_code == "ASTRO2026").first()
    teacher = db.query(User).filter(User.email == "teacher@astromission.edu").first()
    student = db.query(User).filter(User.email == "student@astromission.edu").first()
    if teacher and not demo_cls:
        demo_cls = Classroom(
            id="demo-classroom-001",
            teacher_id=teacher.id,
            name="NASA Space Apps 2026 — Aerospace Systems Cohort",
            description="Hands-on engineering trade-off lab exploring Lunar South Pole and Martian Jezero Crater habitats.",
            join_code="ASTRO2026",
            grade_level="Grades 7-12",
            learning_objectives=[
                "Understand closed-loop water recycling and oxygen electrolysis trade-offs",
                "Maintain electrical grid stability across lunar shadow cycles and Martian dust storms",
                "Protect astronaut health during acute Solar Particle Events",
            ],
        )
        db.add(demo_cls)
        db.flush()

        if student:
            db.add(ClassroomMember(classroom_id=demo_cls.id, student_id=student.id))

        db.add(
            MissionAssignment(
                id="demo-assignment-moon",
                classroom_id=demo_cls.id,
                mission_id="moon-shackleton-outpost",
                title="Lab 1: Shackleton Crater 10-Day Survival & Water Loop",
                planet="moon",
                difficulty="beginner",
                target_duration_days=10,
                learning_objectives=[
                    "Construct a Closed-Loop Water Recycler before Day 4",
                    "Survive Day 6–7 Lunar Shadow Cycle without battery depletion",
                ],
                due_date="2026-12-01",
            )
        )
        db.add(
            MissionAssignment(
                id="demo-assignment-mars",
                classroom_id=demo_cls.id,
                mission_id="mars-jezero-colony",
                title="Lab 2: Mars Jezero Dust Storm & Hydroponic Greenhouse",
                planet="mars",
                difficulty="intermediate",
                target_duration_days=12,
                learning_objectives=[
                    "Balance Solar Array and Battery Storage for Mars' 68% irradiance",
                    "Operate a Hydroponic Greenhouse while maintaining >40 L water reserve",
                ],
                due_date="2026-12-15",
            )
        )

    db.commit()

