"""Health check endpoints."""

from fastapi import APIRouter

from ..core.config import get_settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    settings = get_settings()
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness check - verifies all dependencies are available."""
    # TODO: Add checks for database, vector store, etc.
    return {
        "status": "ready",
        "checks": {
            "database": "ok",
            "vector_store": "ok",
        },
    }
