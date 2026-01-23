"""Mock test models and schemas."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class QuestionType(str, Enum):
    """Question types for mock tests."""

    MCQ = "mcq"
    TRUE_FALSE = "true_false"


class Question(BaseModel):
    """Question domain model."""

    id: UUID
    test_id: UUID
    question_type: QuestionType
    question_text: str
    options: list[str]
    correct_answer: int  # Index of correct option
    explanation: str = ""
    category: str = ""
    difficulty: str = "medium"
    created_at: datetime

    model_config = {"from_attributes": True}


class MockTest(BaseModel):
    """Mock test domain model."""

    id: UUID
    document_id: UUID
    name: str
    question_count: int = 0
    time_limit_minutes: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MockTestWithQuestions(MockTest):
    """Mock test with questions included."""

    questions: list[Question] = []


class TestAttempt(BaseModel):
    """Test attempt domain model."""

    id: UUID
    test_id: UUID
    score: float
    total_questions: int
    correct_answers: int
    time_taken_seconds: int | None = None
    answers: dict[str, int] = {}  # question_id -> selected option index
    started_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class TestAttemptWithDetails(TestAttempt):
    """Test attempt with question details for results."""

    question_results: list[dict] = []


class MockTestGenerateRequest(BaseModel):
    """Request to generate a mock test."""

    document_id: UUID
    num_questions: int = Field(default=10, ge=5, le=30)
    test_name: str | None = None
    include_mcq: bool = True
    include_true_false: bool = True
    time_limit_minutes: int | None = None


class MockTestGenerateResponse(BaseModel):
    """Response after generating a mock test."""

    test_id: UUID
    document_id: UUID
    name: str
    question_count: int
    questions: list[Question]


class TestSubmitRequest(BaseModel):
    """Request to submit test answers."""

    answers: dict[str, int]  # question_id -> selected option index
    time_taken_seconds: int | None = None


class TestResultResponse(BaseModel):
    """Response with test results."""

    attempt_id: UUID
    test_id: UUID
    score: float
    total_questions: int
    correct_answers: int
    time_taken_seconds: int | None
    question_results: list[dict]  # Each has question, selected, correct, is_correct, explanation
