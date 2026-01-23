"""Flashcard models and schemas."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class Difficulty(str, Enum):
    """Flashcard difficulty levels."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Flashcard(BaseModel):
    """Flashcard domain model."""

    id: UUID
    deck_id: UUID
    document_id: UUID
    question: str
    answer: str
    difficulty: Difficulty = Difficulty.MEDIUM
    category: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class FlashcardDeck(BaseModel):
    """Flashcard deck domain model."""

    id: UUID
    document_id: UUID
    name: str
    card_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class FlashcardDeckWithCards(FlashcardDeck):
    """Flashcard deck with cards included."""

    flashcards: list[Flashcard] = []


class FlashcardGenerateRequest(BaseModel):
    """Request to generate flashcards from a document."""

    document_id: UUID
    num_cards: int = Field(default=10, ge=5, le=50)
    deck_name: str | None = None


class FlashcardGenerateResponse(BaseModel):
    """Response after generating flashcards."""

    deck_id: UUID
    document_id: UUID
    name: str
    card_count: int
    flashcards: list[Flashcard]


class FlashcardUpdate(BaseModel):
    """Request to update a flashcard."""

    question: str | None = None
    answer: str | None = None
    difficulty: Difficulty | None = None
    category: str | None = None
