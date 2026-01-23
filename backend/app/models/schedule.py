"""Schedule models for test scheduling."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RecurrenceType(str, Enum):
    """Recurrence types for scheduled tests."""
    NONE = "none"          # One-time
    DAILY = "daily"        # Every day
    WEEKLY = "weekly"      # Every week (same day)
    CUSTOM = "custom"      # Specific days of week


class ScheduledTest(BaseModel):
    """A scheduled test."""
    id: UUID
    test_id: UUID
    document_id: UUID
    name: str
    description: str = ""
    scheduled_time: datetime
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_days: list[int] = Field(default_factory=list)  # 0=Mon, 6=Sun for CUSTOM
    notification_minutes_before: int = 30
    is_active: bool = True
    created_at: datetime
    next_occurrence: Optional[datetime] = None


class ScheduleCreateRequest(BaseModel):
    """Request to create a new schedule."""
    test_id: str
    name: str
    description: str = ""
    scheduled_time: datetime
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_days: list[int] = Field(default_factory=list)
    notification_minutes_before: int = 30


class ScheduleUpdateRequest(BaseModel):
    """Request to update a schedule."""
    name: Optional[str] = None
    description: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    recurrence: Optional[RecurrenceType] = None
    recurrence_days: Optional[list[int]] = None
    notification_minutes_before: Optional[int] = None
    is_active: Optional[bool] = None


class ScheduleResponse(BaseModel):
    """Response for a scheduled test."""
    id: str
    test_id: str
    document_id: str
    test_name: str
    document_name: str
    name: str
    description: str
    scheduled_time: datetime
    recurrence: RecurrenceType
    recurrence_days: list[int]
    notification_minutes_before: int
    is_active: bool
    created_at: datetime
    next_occurrence: Optional[datetime]


class UpcomingTestResponse(BaseModel):
    """Response for upcoming tests."""
    schedule_id: str
    test_id: str
    test_name: str
    document_name: str
    scheduled_time: datetime
    is_recurring: bool
