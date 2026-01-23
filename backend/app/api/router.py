"""API router aggregating all route modules."""

from fastapi import APIRouter

from .auth import router as auth_router
from .documents import router as documents_router
from .health import router as health_router
from .summaries import router as summaries_router
from .flashcards import router as flashcards_router
from .mock_tests import router as mock_tests_router
from .schedules import router as schedules_router
from .analytics import router as analytics_router
from .glossary import router as glossary_router
from .practice import router as practice_router
from .favorites import router as favorites_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(documents_router, prefix="/documents", tags=["documents"])
api_router.include_router(summaries_router, prefix="/summaries", tags=["summaries"])
api_router.include_router(flashcards_router)
api_router.include_router(mock_tests_router)
api_router.include_router(schedules_router)
api_router.include_router(analytics_router)
api_router.include_router(glossary_router)
api_router.include_router(practice_router)
api_router.include_router(favorites_router)
