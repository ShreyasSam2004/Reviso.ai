"""Schedule service for managing test schedules."""

import json
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import ScheduledTestDB, MockTestDB, DocumentDB
from ..models.schedule import (
    RecurrenceType,
    ScheduleCreateRequest,
    ScheduleUpdateRequest,
    ScheduleResponse,
    UpcomingTestResponse,
)


class ScheduleService:
    """Service for managing test schedules."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_schedule(
        self,
        request: ScheduleCreateRequest,
    ) -> ScheduleResponse:
        """Create a new test schedule."""
        # Validate test exists and get document_id
        test_result = await self.session.execute(
            select(MockTestDB).where(MockTestDB.id == request.test_id)
        )
        test = test_result.scalar_one_or_none()
        if not test:
            raise ValueError(f"Test with ID {request.test_id} not found")

        # Calculate next occurrence
        next_occurrence = self._calculate_next_occurrence(
            request.scheduled_time,
            request.recurrence,
            request.recurrence_days,
        )

        schedule = ScheduledTestDB(
            test_id=request.test_id,
            document_id=test.document_id,
            name=request.name,
            description=request.description,
            scheduled_time=request.scheduled_time,
            recurrence=request.recurrence.value,
            recurrence_days=json.dumps(request.recurrence_days),
            notification_minutes_before=request.notification_minutes_before,
            is_active=True,
            next_occurrence=next_occurrence,
        )

        self.session.add(schedule)
        await self.session.commit()
        await self.session.refresh(schedule)

        return await self._to_response(schedule)

    async def get_schedule(self, schedule_id: str) -> Optional[ScheduleResponse]:
        """Get a schedule by ID."""
        result = await self.session.execute(
            select(ScheduledTestDB)
            .options(selectinload(ScheduledTestDB.test), selectinload(ScheduledTestDB.document))
            .where(ScheduledTestDB.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            return None
        return await self._to_response(schedule)

    async def list_schedules(self) -> list[ScheduleResponse]:
        """List all schedules."""
        result = await self.session.execute(
            select(ScheduledTestDB)
            .options(selectinload(ScheduledTestDB.test), selectinload(ScheduledTestDB.document))
            .order_by(ScheduledTestDB.scheduled_time)
        )
        schedules = result.scalars().all()
        return [await self._to_response(s) for s in schedules]

    async def get_upcoming_tests(self, days: int = 7) -> list[UpcomingTestResponse]:
        """Get tests scheduled in the next N days."""
        now = datetime.utcnow()
        end_date = now + timedelta(days=days)

        result = await self.session.execute(
            select(ScheduledTestDB)
            .options(selectinload(ScheduledTestDB.test), selectinload(ScheduledTestDB.document))
            .where(ScheduledTestDB.is_active == 1)
            .where(
                (ScheduledTestDB.next_occurrence >= now)
                & (ScheduledTestDB.next_occurrence <= end_date)
                | (ScheduledTestDB.scheduled_time >= now)
                & (ScheduledTestDB.scheduled_time <= end_date)
            )
            .order_by(ScheduledTestDB.next_occurrence, ScheduledTestDB.scheduled_time)
        )
        schedules = result.scalars().all()

        upcoming = []
        for schedule in schedules:
            test = schedule.test
            document = schedule.document

            scheduled_time = schedule.next_occurrence or schedule.scheduled_time
            if scheduled_time < now or scheduled_time > end_date:
                continue

            upcoming.append(UpcomingTestResponse(
                schedule_id=schedule.id,
                test_id=schedule.test_id,
                test_name=test.name if test else "Unknown Test",
                document_name=document.original_filename if document else "Unknown Document",
                scheduled_time=scheduled_time,
                is_recurring=schedule.recurrence != RecurrenceType.NONE.value,
            ))

        # Sort by scheduled time
        upcoming.sort(key=lambda x: x.scheduled_time)
        return upcoming

    async def update_schedule(
        self,
        schedule_id: str,
        request: ScheduleUpdateRequest,
    ) -> Optional[ScheduleResponse]:
        """Update a schedule."""
        result = await self.session.execute(
            select(ScheduledTestDB).where(ScheduledTestDB.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            return None

        if request.name is not None:
            schedule.name = request.name
        if request.description is not None:
            schedule.description = request.description
        if request.scheduled_time is not None:
            schedule.scheduled_time = request.scheduled_time
        if request.recurrence is not None:
            schedule.recurrence = request.recurrence.value
        if request.recurrence_days is not None:
            schedule.recurrence_days = json.dumps(request.recurrence_days)
        if request.notification_minutes_before is not None:
            schedule.notification_minutes_before = request.notification_minutes_before
        if request.is_active is not None:
            schedule.is_active = request.is_active

        # Recalculate next occurrence if schedule changed
        recurrence = RecurrenceType(schedule.recurrence)
        recurrence_days = json.loads(schedule.recurrence_days)
        schedule.next_occurrence = self._calculate_next_occurrence(
            schedule.scheduled_time,
            recurrence,
            recurrence_days,
        )

        await self.session.commit()
        await self.session.refresh(schedule)

        return await self._to_response(schedule)

    async def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a schedule."""
        result = await self.session.execute(
            select(ScheduledTestDB).where(ScheduledTestDB.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            return False

        await self.session.delete(schedule)
        await self.session.commit()
        return True

    async def toggle_schedule(self, schedule_id: str) -> Optional[ScheduleResponse]:
        """Toggle a schedule's active status."""
        result = await self.session.execute(
            select(ScheduledTestDB).where(ScheduledTestDB.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            return None

        schedule.is_active = not schedule.is_active
        await self.session.commit()
        await self.session.refresh(schedule)

        return await self._to_response(schedule)

    def _calculate_next_occurrence(
        self,
        scheduled_time: datetime,
        recurrence: RecurrenceType,
        recurrence_days: list[int],
    ) -> Optional[datetime]:
        """Calculate the next occurrence of a scheduled test."""
        now = datetime.utcnow()

        if recurrence == RecurrenceType.NONE:
            # One-time schedule
            return scheduled_time if scheduled_time > now else None

        # For recurring schedules, find the next occurrence
        base_time = scheduled_time
        if base_time < now:
            # Start from today at the scheduled time
            base_time = now.replace(
                hour=scheduled_time.hour,
                minute=scheduled_time.minute,
                second=0,
                microsecond=0,
            )
            if base_time < now:
                base_time += timedelta(days=1)

        if recurrence == RecurrenceType.DAILY:
            return base_time

        elif recurrence == RecurrenceType.WEEKLY:
            # Same day of the week as the original scheduled_time
            target_weekday = scheduled_time.weekday()
            days_ahead = target_weekday - base_time.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            if base_time.weekday() == target_weekday and base_time > now:
                return base_time
            return base_time + timedelta(days=days_ahead)

        elif recurrence == RecurrenceType.CUSTOM:
            if not recurrence_days:
                return base_time

            # Find the next occurrence based on custom days
            for days_ahead in range(8):  # Check next 7 days
                check_date = base_time + timedelta(days=days_ahead)
                if check_date.weekday() in recurrence_days:
                    if check_date > now:
                        return check_date
            return None

        return scheduled_time

    async def _to_response(self, schedule: ScheduledTestDB) -> ScheduleResponse:
        """Convert database model to response."""
        # Get test and document info
        test_result = await self.session.execute(
            select(MockTestDB).where(MockTestDB.id == schedule.test_id)
        )
        test = test_result.scalar_one_or_none()

        doc_result = await self.session.execute(
            select(DocumentDB).where(DocumentDB.id == schedule.document_id)
        )
        document = doc_result.scalar_one_or_none()

        recurrence_days = json.loads(schedule.recurrence_days) if schedule.recurrence_days else []

        return ScheduleResponse(
            id=schedule.id,
            test_id=schedule.test_id,
            document_id=schedule.document_id,
            test_name=test.name if test else "Unknown Test",
            document_name=document.original_filename if document else "Unknown Document",
            name=schedule.name,
            description=schedule.description,
            scheduled_time=schedule.scheduled_time,
            recurrence=RecurrenceType(schedule.recurrence),
            recurrence_days=recurrence_days,
            notification_minutes_before=schedule.notification_minutes_before,
            is_active=bool(schedule.is_active),
            created_at=schedule.created_at,
            next_occurrence=schedule.next_occurrence,
        )
