"""SQLAlchemy database models."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from ..models.document import ProcessingStatus
from ..models.summary import SummaryType
from ..models.flashcard import Difficulty
from ..models.mock_test import QuestionType
from ..models.schedule import RecurrenceType


def generate_uuid() -> str:
    """Generate UUID as string for SQLite compatibility."""
    return str(uuid4())


class UserDB(Base):
    """Database model for users."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class DocumentDB(Base):
    """Database model for documents."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(
        String(20), default=ProcessingStatus.PENDING.value
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Processing stats
    total_chunks: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    chunks: Mapped[list["DocumentChunkDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    summaries: Mapped[list["SummaryDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    flashcard_decks: Mapped[list["FlashcardDeckDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    flashcards: Mapped[list["FlashcardDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    mock_tests: Mapped[list["MockTestDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    scheduled_tests: Mapped[list["ScheduledTestDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    glossaries: Mapped[list["GlossaryDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    key_terms: Mapped[list["KeyTermDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    practice_sessions: Mapped[list["PracticeSessionDB"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunkDB(Base):
    """Database model for document chunks."""

    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_numbers: Mapped[str] = mapped_column(Text, default="[]")  # JSON array as string
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_metadata: Mapped[str] = mapped_column(Text, default="{}")  # JSON as string
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    document: Mapped["DocumentDB"] = relationship(back_populates="chunks")


class SummaryDB(Base):
    """Database model for summaries."""

    __tablename__ = "summaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    summary_type: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Generation info
    model_used: Mapped[str] = mapped_column(String(50), nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)

    # Scope
    start_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    section_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Feedback
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    document: Mapped["DocumentDB"] = relationship(back_populates="summaries")


class FlashcardDeckDB(Base):
    """Database model for flashcard decks."""

    __tablename__ = "flashcard_decks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    card_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    document: Mapped["DocumentDB"] = relationship(back_populates="flashcard_decks")
    flashcards: Mapped[list["FlashcardDB"]] = relationship(
        back_populates="deck", cascade="all, delete-orphan"
    )


class FlashcardDB(Base):
    """Database model for flashcards."""

    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    deck_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("flashcard_decks.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default=Difficulty.MEDIUM.value)
    category: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    deck: Mapped["FlashcardDeckDB"] = relationship(back_populates="flashcards")
    document: Mapped["DocumentDB"] = relationship(back_populates="flashcards")


class MockTestDB(Base):
    """Database model for mock tests."""

    __tablename__ = "mock_tests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    document: Mapped["DocumentDB"] = relationship(back_populates="mock_tests")
    questions: Mapped[list["QuestionDB"]] = relationship(
        back_populates="test", cascade="all, delete-orphan"
    )
    attempts: Mapped[list["TestAttemptDB"]] = relationship(
        back_populates="test", cascade="all, delete-orphan"
    )
    schedules: Mapped[list["ScheduledTestDB"]] = relationship(
        back_populates="test", cascade="all, delete-orphan"
    )


class QuestionDB(Base):
    """Database model for test questions."""

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    test_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mock_tests.id", ondelete="CASCADE"), nullable=False
    )
    question_type: Mapped[str] = mapped_column(String(20), default=QuestionType.MCQ.value)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array as string
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(255), default="")
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    test: Mapped["MockTestDB"] = relationship(back_populates="questions")


class TestAttemptDB(Base):
    """Database model for test attempts."""

    __tablename__ = "test_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    test_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mock_tests.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[float] = mapped_column(Integer, nullable=False)  # Percentage
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False)
    time_taken_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    answers: Mapped[str] = mapped_column(Text, default="{}")  # JSON: question_id -> selected
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationship
    test: Mapped["MockTestDB"] = relationship(back_populates="attempts")


class ScheduledTestDB(Base):
    """Database model for scheduled tests."""

    __tablename__ = "scheduled_tests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    test_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mock_tests.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    recurrence: Mapped[str] = mapped_column(String(20), default=RecurrenceType.NONE.value)
    recurrence_days: Mapped[str] = mapped_column(Text, default="[]")  # JSON array as string
    notification_minutes_before: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Integer, default=1)  # SQLite boolean
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    next_occurrence: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    test: Mapped["MockTestDB"] = relationship(back_populates="schedules")
    document: Mapped["DocumentDB"] = relationship(back_populates="scheduled_tests")


class GlossaryDB(Base):
    """Database model for glossaries."""

    __tablename__ = "glossaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    term_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    document: Mapped["DocumentDB"] = relationship(back_populates="glossaries")
    terms: Mapped[list["KeyTermDB"]] = relationship(
        back_populates="glossary", cascade="all, delete-orphan"
    )


class KeyTermDB(Base):
    """Database model for key terms."""

    __tablename__ = "key_terms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    glossary_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("glossaries.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    term: Mapped[str] = mapped_column(String(255), nullable=False)
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(255), default="")
    importance: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    glossary: Mapped["GlossaryDB"] = relationship(back_populates="terms")
    document: Mapped["DocumentDB"] = relationship(back_populates="key_terms")


class PracticeSessionDB(Base):
    """Database model for practice sessions (fill-in-blank and matching)."""

    __tablename__ = "practice_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    practice_type: Mapped[str] = mapped_column(String(20), nullable=False)  # fill_in_blank or matching
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    questions_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON structure
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    document: Mapped["DocumentDB"] = relationship(back_populates="practice_sessions")


class FavoriteDB(Base):
    """Database model for user favorites."""

    __tablename__ = "favorites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)  # document, flashcard_deck, test, glossary, practice_session
    item_id: Mapped[str] = mapped_column(String(36), nullable=False)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    document_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
