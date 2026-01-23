"""Models for glossary (key terms)."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class KeyTerm(BaseModel):
    """A key term with its definition."""
    id: UUID
    document_id: UUID
    term: str
    definition: str
    category: str = ""
    importance: str = "medium"  # low, medium, high
    created_at: datetime


class Glossary(BaseModel):
    """A collection of key terms from a document."""
    id: UUID
    document_id: UUID
    name: str
    term_count: int
    created_at: datetime


class GlossaryWithTerms(Glossary):
    """Glossary with all its terms."""
    terms: list[KeyTerm]


# Request/Response models
class GlossaryGenerateRequest(BaseModel):
    """Request to generate a glossary."""
    document_id: UUID
    num_terms: int = Field(default=20, ge=5, le=50)
    name: Optional[str] = None


class GlossaryGenerateResponse(BaseModel):
    """Response after generating a glossary."""
    glossary_id: UUID
    document_id: UUID
    name: str
    term_count: int
    terms: list[KeyTerm]
