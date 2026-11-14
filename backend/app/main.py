"""
ASTROMISSION — FastAPI Application Entrypoint.
NASA Space Apps Challenge 2026 — Build a Junior Astronaut Mission Trainer.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.core.database import Base, engine, SessionLocal
import app.models.entities  # noqa: F401
from app.services.seed_service import seed_all_data
from app.api.routes import router as api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Interactive 3D Lunar & Martian Space Outpost Engineering Simulator, "
        "Deterministic ECLSS Resource Engine, and AI Mission Commander."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "operational",
        "application": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.APP_ENV,
    }

