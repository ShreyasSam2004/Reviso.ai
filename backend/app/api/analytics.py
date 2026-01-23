"""API routes for analytics and reporting."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..models.analytics import (
    PerformanceResponse,
    CategoryBreakdownResponse,
    OverallStats,
    SuggestionsResponse,
    AnalyticsSummaryResponse,
)
from ..services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/performance", response_model=PerformanceResponse)
async def get_performance(
    days: int = Query(default=30, ge=1, le=365),
    session: AsyncSession = Depends(get_db),
):
    """Get performance data over time."""
    service = AnalyticsService(session)
    return await service.get_performance_over_time(days)


@router.get("/categories", response_model=CategoryBreakdownResponse)
async def get_category_breakdown(
    session: AsyncSession = Depends(get_db),
):
    """Get performance breakdown by category."""
    service = AnalyticsService(session)
    return await service.get_category_breakdown()


@router.get("/summary", response_model=OverallStats)
async def get_summary(
    session: AsyncSession = Depends(get_db),
):
    """Get overall performance statistics."""
    service = AnalyticsService(session)
    return await service.get_overall_stats()


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    session: AsyncSession = Depends(get_db),
):
    """Get AI-powered improvement suggestions."""
    service = AnalyticsService(session)
    return await service.get_improvement_suggestions()


@router.get("/", response_model=AnalyticsSummaryResponse)
async def get_analytics_dashboard(
    session: AsyncSession = Depends(get_db),
):
    """Get comprehensive analytics dashboard data."""
    service = AnalyticsService(session)
    return await service.get_analytics_summary()
