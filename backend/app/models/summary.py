"""Summary models for generated summaries."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class SummaryType(str, Enum):
    """Types of summaries that can be generated."""

    BRIEF = "brief"  # 2-3 sentences
    DETAILED = "detailed"  # Comprehensive summary
    KEY_POINTS = "key_points"  # Bullet points
    CHAPTER = "chapter"  # Per-chapter/section
    CUSTOM = "custom"  # User-specified format


class Summary(BaseModel):
    """A generated summary of a document or section."""

    id: UUID = Field(default_factory=uuid4)
    document_id: UUID
    summary_type: SummaryType
    content: str

    # Generation info
    model_used: str
    prompt_tokens: int = 0
    completion_tokens: int = 0

    # Scope (optional - for partial summaries)
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    section_title: Optional[str] = None

    # User feedback
    rating: Optional[int] = None  # 1-5
    feedback: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class SummaryRequest(BaseModel):
    """Request schema for generating a summary."""

    document_id: UUID
    summary_type: SummaryType = SummaryType.DETAILED
    custom_instructions: Optional[str] = None
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    max_length: Optional[int] = None  # Max tokens for output


class SummaryResponse(BaseModel):
    """Response schema for a generated summary."""

    id: UUID
    document_id: UUID
    summary_type: SummaryType
    content: str
    model_used: str
    created_at: datetime
