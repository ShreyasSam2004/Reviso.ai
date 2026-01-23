"""API routes for test scheduling."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..models.schedule import (
    ScheduleCreateRequest,
    ScheduleUpdateRequest,
    ScheduleResponse,
    UpcomingTestResponse,
)
from ..services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.post("/", response_model=ScheduleResponse)
async def create_schedule(
    request: ScheduleCreateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Create a new test schedule."""
    service = ScheduleService(session)
    try:
        return await service.create_schedule(request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules(
    session: AsyncSession = Depends(get_db),
):
    """List all schedules."""
    service = ScheduleService(session)
    return await service.list_schedules()


@router.get("/upcoming", response_model=list[UpcomingTestResponse])
async def get_upcoming_tests(
    days: int = Query(default=7, ge=1, le=30),
    session: AsyncSession = Depends(get_db),
):
    """Get tests scheduled in the next N days."""
    service = ScheduleService(session)
    return await service.get_upcoming_tests(days)


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Get a specific schedule."""
    service = ScheduleService(session)
    schedule = await service.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    request: ScheduleUpdateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Update a schedule."""
    service = ScheduleService(session)
    schedule = await service.update_schedule(schedule_id, request)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Delete a schedule."""
    service = ScheduleService(session)
    deleted = await service.delete_schedule(schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}


@router.post("/{schedule_id}/toggle", response_model=ScheduleResponse)
async def toggle_schedule(
    schedule_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Toggle a schedule's active status."""
    service = ScheduleService(session)
    schedule = await service.toggle_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule
