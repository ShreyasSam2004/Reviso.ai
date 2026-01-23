"""Practice models for Fill-in-the-Blank and Matching questions."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PracticeType(str, Enum):
    """Types of practice exercises."""
    FILL_IN_BLANK = "fill_in_blank"
    MATCHING = "matching"


class FillInBlankQuestion(BaseModel):
    """A fill-in-the-blank question."""
    id: str
    sentence: str  # Sentence with _____ for blank
    blank_word: str  # The correct answer
    hint: Optional[str] = None
    context: Optional[str] = None  # Additional context


class MatchingPair(BaseModel):
    """A term-definition pair for matching exercises."""
    id: str
    term: str
    definition: str


class MatchingExercise(BaseModel):
    """A matching exercise with multiple pairs."""
    id: str
    pairs: list[MatchingPair]


class PracticeSession(BaseModel):
    """A practice session containing exercises."""
    id: UUID
    document_id: UUID
    practice_type: PracticeType
    name: str
    created_at: datetime

    # For fill-in-blank
    fill_in_blank_questions: Optional[list[FillInBlankQuestion]] = None

    # For matching
    matching_exercise: Optional[MatchingExercise] = None


class PracticeSessionSummary(BaseModel):
    """Summary of a practice session (without questions for listing)."""
    id: UUID
    document_id: UUID
    practice_type: PracticeType
    name: str
    question_count: int
    created_at: datetime


# Request/Response models
class GenerateFillInBlankRequest(BaseModel):
    """Request to generate fill-in-the-blank questions."""
    document_id: str
    num_questions: int = Field(default=10, ge=5, le=30)
    name: Optional[str] = None


class GenerateMatchingRequest(BaseModel):
    """Request to generate matching exercise."""
    document_id: str
    num_pairs: int = Field(default=8, ge=4, le=15)
    name: Optional[str] = None


class FillInBlankAnswer(BaseModel):
    """User's answer for a fill-in-blank question."""
    question_id: str
    user_answer: str


class MatchingAnswer(BaseModel):
    """User's answer for matching - maps term_id to definition_id."""
    matches: dict[str, str]  # term_id -> definition_id


class PracticeSubmission(BaseModel):
    """Submission of practice answers."""
    session_id: str
    fill_in_blank_answers: Optional[list[FillInBlankAnswer]] = None
    matching_answers: Optional[MatchingAnswer] = None


class FillInBlankResult(BaseModel):
    """Result for a single fill-in-blank question."""
    question_id: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    sentence: str


class MatchingResult(BaseModel):
    """Result for matching exercise."""
    term_id: str
    term: str
    user_matched_definition_id: Optional[str]
    correct_definition_id: str
    correct_definition: str
    is_correct: bool


class PracticeResult(BaseModel):
    """Results of a practice session."""
    session_id: str
    practice_type: PracticeType
    total_questions: int
    correct_answers: int
    score_percentage: float
    fill_in_blank_results: Optional[list[FillInBlankResult]] = None
    matching_results: Optional[list[MatchingResult]] = None


class GeneratePracticeResponse(BaseModel):
    """Response after generating practice session."""
    session_id: str
    document_id: str
    practice_type: PracticeType
    name: str
    question_count: int
