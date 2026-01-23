"""Repository classes for database operations."""

import json
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from .models import DocumentDB, DocumentChunkDB, SummaryDB, FlashcardDeckDB, FlashcardDB, MockTestDB, QuestionDB, TestAttemptDB, GlossaryDB, KeyTermDB, PracticeSessionDB, FavoriteDB
from ..models.document import Document, DocumentChunk, ProcessingStatus
from ..models.summary import Summary, SummaryType
from ..models.flashcard import Flashcard, FlashcardDeck, Difficulty
from ..models.mock_test import MockTest, Question, TestAttempt, QuestionType
from ..models.glossary import Glossary, KeyTerm


class DocumentRepository:
    """Repository for document database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, document: Document) -> Document:
        """Create a new document in the database."""
        db_doc = DocumentDB(
            id=str(document.id),
            filename=document.filename,
            original_filename=document.original_filename,
            file_path=document.file_path,
            file_size_bytes=document.file_size_bytes,
            page_count=document.page_count,
            status=document.status.value,
            error_message=document.error_message,
            title=document.title,
            author=document.author,
            subject=document.subject,
            total_chunks=document.total_chunks,
            total_tokens=document.total_tokens,
            created_at=document.created_at,
            updated_at=document.updated_at,
            processed_at=document.processed_at,
        )
        self.session.add(db_doc)
        await self.session.flush()
        return document

    async def get_by_id(self, document_id: UUID) -> Optional[Document]:
        """Get a document by ID."""
        result = await self.session.execute(
            select(DocumentDB).where(DocumentDB.id == str(document_id))
        )
        db_doc = result.scalar_one_or_none()
        if not db_doc:
            return None
        return self._to_domain(db_doc)

    async def get_all(self) -> list[Document]:
        """Get all documents."""
        result = await self.session.execute(
            select(DocumentDB).order_by(DocumentDB.created_at.desc())
        )
        return [self._to_domain(doc) for doc in result.scalars().all()]

    async def update(self, document_id: UUID, **kwargs) -> Optional[Document]:
        """Update document fields."""
        result = await self.session.execute(
            select(DocumentDB).where(DocumentDB.id == str(document_id))
        )
        db_doc = result.scalar_one_or_none()
        if not db_doc:
            return None

        for key, value in kwargs.items():
            if hasattr(db_doc, key):
                if key == "status" and isinstance(value, ProcessingStatus):
                    value = value.value
                setattr(db_doc, key, value)

        db_doc.updated_at = datetime.utcnow()
        await self.session.flush()
        return self._to_domain(db_doc)

    async def delete(self, document_id: UUID) -> bool:
        """Delete a document."""
        result = await self.session.execute(
            delete(DocumentDB).where(DocumentDB.id == str(document_id))
        )
        return result.rowcount > 0

    def _to_domain(self, db_doc: DocumentDB) -> Document:
        """Convert database model to domain model."""
        return Document(
            id=UUID(db_doc.id),
            filename=db_doc.filename,
            original_filename=db_doc.original_filename,
            file_path=db_doc.file_path,
            file_size_bytes=db_doc.file_size_bytes,
            page_count=db_doc.page_count,
            status=ProcessingStatus(db_doc.status),
            error_message=db_doc.error_message,
            title=db_doc.title,
            author=db_doc.author,
            subject=db_doc.subject,
            total_chunks=db_doc.total_chunks,
            total_tokens=db_doc.total_tokens,
            created_at=db_doc.created_at,
            updated_at=db_doc.updated_at,
            processed_at=db_doc.processed_at,
        )


class ChunkRepository:
    """Repository for document chunk database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_many(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        """Create multiple chunks."""
        for chunk in chunks:
            db_chunk = DocumentChunkDB(
                id=str(chunk.id),
                document_id=str(chunk.document_id),
                content=chunk.content,
                chunk_index=chunk.chunk_index,
                page_numbers=json.dumps(chunk.page_numbers),
                token_count=chunk.token_count,
                chunk_metadata=json.dumps(chunk.metadata),
                created_at=chunk.created_at,
            )
            self.session.add(db_chunk)
        await self.session.flush()
        return chunks

    async def get_by_document_id(self, document_id: UUID) -> list[DocumentChunk]:
        """Get all chunks for a document."""
        result = await self.session.execute(
            select(DocumentChunkDB)
            .where(DocumentChunkDB.document_id == str(document_id))
            .order_by(DocumentChunkDB.chunk_index)
        )
        return [self._to_domain(chunk) for chunk in result.scalars().all()]

    async def delete_by_document_id(self, document_id: UUID) -> int:
        """Delete all chunks for a document."""
        result = await self.session.execute(
            delete(DocumentChunkDB).where(DocumentChunkDB.document_id == str(document_id))
        )
        return result.rowcount

    def _to_domain(self, db_chunk: DocumentChunkDB) -> DocumentChunk:
        """Convert database model to domain model."""
        return DocumentChunk(
            id=UUID(db_chunk.id),
            document_id=UUID(db_chunk.document_id),
            content=db_chunk.content,
            chunk_index=db_chunk.chunk_index,
            page_numbers=json.loads(db_chunk.page_numbers),
            token_count=db_chunk.token_count,
            metadata=json.loads(db_chunk.chunk_metadata),
            created_at=db_chunk.created_at,
        )


class SummaryRepository:
    """Repository for summary database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, summary: Summary) -> Summary:
        """Create a new summary."""
        db_summary = SummaryDB(
            id=str(summary.id),
            document_id=str(summary.document_id),
            summary_type=summary.summary_type.value,
            content=summary.content,
            model_used=summary.model_used,
            prompt_tokens=summary.prompt_tokens,
            completion_tokens=summary.completion_tokens,
            start_page=summary.start_page,
            end_page=summary.end_page,
            section_title=summary.section_title,
            rating=summary.rating,
            feedback=summary.feedback,
            created_at=summary.created_at,
        )
        self.session.add(db_summary)
        await self.session.flush()
        return summary

    async def get_by_id(self, summary_id: UUID) -> Optional[Summary]:
        """Get a summary by ID."""
        result = await self.session.execute(
            select(SummaryDB).where(SummaryDB.id == str(summary_id))
        )
        db_summary = result.scalar_one_or_none()
        if not db_summary:
            return None
        return self._to_domain(db_summary)

    async def get_by_document_id(self, document_id: UUID) -> list[Summary]:
        """Get all summaries for a document."""
        result = await self.session.execute(
            select(SummaryDB)
            .where(SummaryDB.document_id == str(document_id))
            .order_by(SummaryDB.created_at.desc())
        )
        return [self._to_domain(s) for s in result.scalars().all()]

    async def update(self, summary_id: UUID, **kwargs) -> Optional[Summary]:
        """Update summary fields."""
        result = await self.session.execute(
            select(SummaryDB).where(SummaryDB.id == str(summary_id))
        )
        db_summary = result.scalar_one_or_none()
        if not db_summary:
            return None

        for key, value in kwargs.items():
            if hasattr(db_summary, key):
                setattr(db_summary, key, value)

        await self.session.flush()
        return self._to_domain(db_summary)

    def _to_domain(self, db_summary: SummaryDB) -> Summary:
        """Convert database model to domain model."""
        return Summary(
            id=UUID(db_summary.id),
            document_id=UUID(db_summary.document_id),
            summary_type=SummaryType(db_summary.summary_type),
            content=db_summary.content,
            model_used=db_summary.model_used,
            prompt_tokens=db_summary.prompt_tokens,
            completion_tokens=db_summary.completion_tokens,
            start_page=db_summary.start_page,
            end_page=db_summary.end_page,
            section_title=db_summary.section_title,
            rating=db_summary.rating,
            feedback=db_summary.feedback,
            created_at=db_summary.created_at,
        )


class FlashcardDeckRepository:
    """Repository for flashcard deck database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, deck: FlashcardDeck) -> FlashcardDeck:
        """Create a new flashcard deck."""
        db_deck = FlashcardDeckDB(
            id=str(deck.id),
            document_id=str(deck.document_id),
            name=deck.name,
            card_count=deck.card_count,
            created_at=deck.created_at,
        )
        self.session.add(db_deck)
        await self.session.flush()
        return deck

    async def get_by_id(self, deck_id: UUID) -> Optional[FlashcardDeck]:
        """Get a deck by ID."""
        result = await self.session.execute(
            select(FlashcardDeckDB).where(FlashcardDeckDB.id == str(deck_id))
        )
        db_deck = result.scalar_one_or_none()
        if not db_deck:
            return None
        return self._to_domain(db_deck)

    async def get_by_document_id(self, document_id: UUID) -> list[FlashcardDeck]:
        """Get all decks for a document."""
        result = await self.session.execute(
            select(FlashcardDeckDB)
            .where(FlashcardDeckDB.document_id == str(document_id))
            .order_by(FlashcardDeckDB.created_at.desc())
        )
        return [self._to_domain(d) for d in result.scalars().all()]

    async def update(self, deck_id: UUID, **kwargs) -> Optional[FlashcardDeck]:
        """Update deck fields."""
        result = await self.session.execute(
            select(FlashcardDeckDB).where(FlashcardDeckDB.id == str(deck_id))
        )
        db_deck = result.scalar_one_or_none()
        if not db_deck:
            return None

        for key, value in kwargs.items():
            if hasattr(db_deck, key):
                setattr(db_deck, key, value)

        await self.session.flush()
        return self._to_domain(db_deck)

    async def delete(self, deck_id: UUID) -> bool:
        """Delete a deck and its flashcards."""
        result = await self.session.execute(
            delete(FlashcardDeckDB).where(FlashcardDeckDB.id == str(deck_id))
        )
        return result.rowcount > 0

    def _to_domain(self, db_deck: FlashcardDeckDB) -> FlashcardDeck:
        """Convert database model to domain model."""
        return FlashcardDeck(
            id=UUID(db_deck.id),
            document_id=UUID(db_deck.document_id),
            name=db_deck.name,
            card_count=db_deck.card_count,
            created_at=db_deck.created_at,
        )


class FlashcardRepository:
    """Repository for flashcard database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, flashcard: Flashcard) -> Flashcard:
        """Create a new flashcard."""
        db_flashcard = FlashcardDB(
            id=str(flashcard.id),
            deck_id=str(flashcard.deck_id),
            document_id=str(flashcard.document_id),
            question=flashcard.question,
            answer=flashcard.answer,
            difficulty=flashcard.difficulty.value,
            category=flashcard.category,
            created_at=flashcard.created_at,
        )
        self.session.add(db_flashcard)
        await self.session.flush()
        return flashcard

    async def create_many(self, flashcards: list[Flashcard]) -> list[Flashcard]:
        """Create multiple flashcards."""
        for card in flashcards:
            db_card = FlashcardDB(
                id=str(card.id),
                deck_id=str(card.deck_id),
                document_id=str(card.document_id),
                question=card.question,
                answer=card.answer,
                difficulty=card.difficulty.value,
                category=card.category,
                created_at=card.created_at,
            )
            self.session.add(db_card)
        await self.session.flush()
        return flashcards

    async def get_by_id(self, flashcard_id: UUID) -> Optional[Flashcard]:
        """Get a flashcard by ID."""
        result = await self.session.execute(
            select(FlashcardDB).where(FlashcardDB.id == str(flashcard_id))
        )
        db_card = result.scalar_one_or_none()
        if not db_card:
            return None
        return self._to_domain(db_card)

    async def get_by_deck_id(self, deck_id: UUID) -> list[Flashcard]:
        """Get all flashcards for a deck."""
        result = await self.session.execute(
            select(FlashcardDB)
            .where(FlashcardDB.deck_id == str(deck_id))
            .order_by(FlashcardDB.created_at)
        )
        return [self._to_domain(c) for c in result.scalars().all()]

    async def get_by_document_id(self, document_id: UUID) -> list[Flashcard]:
        """Get all flashcards for a document."""
        result = await self.session.execute(
            select(FlashcardDB)
            .where(FlashcardDB.document_id == str(document_id))
            .order_by(FlashcardDB.created_at)
        )
        return [self._to_domain(c) for c in result.scalars().all()]

    async def update(self, flashcard_id: UUID, **kwargs) -> Optional[Flashcard]:
        """Update flashcard fields."""
        result = await self.session.execute(
            select(FlashcardDB).where(FlashcardDB.id == str(flashcard_id))
        )
        db_card = result.scalar_one_or_none()
        if not db_card:
            return None

        for key, value in kwargs.items():
            if hasattr(db_card, key):
                if key == "difficulty" and isinstance(value, Difficulty):
                    value = value.value
                setattr(db_card, key, value)

        await self.session.flush()
        return self._to_domain(db_card)

    async def delete(self, flashcard_id: UUID) -> bool:
        """Delete a flashcard."""
        result = await self.session.execute(
            delete(FlashcardDB).where(FlashcardDB.id == str(flashcard_id))
        )
        return result.rowcount > 0

    def _to_domain(self, db_card: FlashcardDB) -> Flashcard:
        """Convert database model to domain model."""
        return Flashcard(
            id=UUID(db_card.id),
            deck_id=UUID(db_card.deck_id),
            document_id=UUID(db_card.document_id),
            question=db_card.question,
            answer=db_card.answer,
            difficulty=Difficulty(db_card.difficulty),
            category=db_card.category,
            created_at=db_card.created_at,
        )


class MockTestRepository:
    """Repository for mock test database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, test: MockTest) -> MockTest:
        """Create a new mock test."""
        db_test = MockTestDB(
            id=str(test.id),
            document_id=str(test.document_id),
            name=test.name,
            question_count=test.question_count,
            time_limit_minutes=test.time_limit_minutes,
            created_at=test.created_at,
        )
        self.session.add(db_test)
        await self.session.flush()
        return test

    async def get_by_id(self, test_id: UUID) -> Optional[MockTest]:
        """Get a mock test by ID."""
        result = await self.session.execute(
            select(MockTestDB).where(MockTestDB.id == str(test_id))
        )
        db_test = result.scalar_one_or_none()
        if not db_test:
            return None
        return self._to_domain(db_test)

    async def get_by_document_id(self, document_id: UUID) -> list[MockTest]:
        """Get all mock tests for a document."""
        result = await self.session.execute(
            select(MockTestDB)
            .where(MockTestDB.document_id == str(document_id))
            .order_by(MockTestDB.created_at.desc())
        )
        return [self._to_domain(t) for t in result.scalars().all()]

    async def get_all(self) -> list[MockTest]:
        """Get all mock tests."""
        result = await self.session.execute(
            select(MockTestDB).order_by(MockTestDB.created_at.desc())
        )
        return [self._to_domain(t) for t in result.scalars().all()]

    async def delete(self, test_id: UUID) -> bool:
        """Delete a mock test and all its questions/attempts."""
        result = await self.session.execute(
            delete(MockTestDB).where(MockTestDB.id == str(test_id))
        )
        return result.rowcount > 0

    def _to_domain(self, db_test: MockTestDB) -> MockTest:
        """Convert database model to domain model."""
        return MockTest(
            id=UUID(db_test.id),
            document_id=UUID(db_test.document_id),
            name=db_test.name,
            question_count=db_test.question_count,
            time_limit_minutes=db_test.time_limit_minutes,
            created_at=db_test.created_at,
        )


class QuestionRepository:
    """Repository for question database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_many(self, questions: list[Question]) -> list[Question]:
        """Create multiple questions."""
        for q in questions:
            db_question = QuestionDB(
                id=str(q.id),
                test_id=str(q.test_id),
                question_type=q.question_type.value,
                question_text=q.question_text,
                options=json.dumps(q.options),
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                category=q.category,
                difficulty=q.difficulty,
                created_at=q.created_at,
            )
            self.session.add(db_question)
        await self.session.flush()
        return questions

    async def get_by_test_id(self, test_id: UUID) -> list[Question]:
        """Get all questions for a test."""
        result = await self.session.execute(
            select(QuestionDB)
            .where(QuestionDB.test_id == str(test_id))
            .order_by(QuestionDB.created_at)
        )
        return [self._to_domain(q) for q in result.scalars().all()]

    async def get_by_id(self, question_id: UUID) -> Optional[Question]:
        """Get a question by ID."""
        result = await self.session.execute(
            select(QuestionDB).where(QuestionDB.id == str(question_id))
        )
        db_q = result.scalar_one_or_none()
        if not db_q:
            return None
        return self._to_domain(db_q)

    def _to_domain(self, db_q: QuestionDB) -> Question:
        """Convert database model to domain model."""
        return Question(
            id=UUID(db_q.id),
            test_id=UUID(db_q.test_id),
            question_type=QuestionType(db_q.question_type),
            question_text=db_q.question_text,
            options=json.loads(db_q.options),
            correct_answer=db_q.correct_answer,
            explanation=db_q.explanation,
            category=db_q.category,
            difficulty=db_q.difficulty,
            created_at=db_q.created_at,
        )


class TestAttemptRepository:
    """Repository for test attempt database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, attempt: TestAttempt) -> TestAttempt:
        """Create a new test attempt."""
        db_attempt = TestAttemptDB(
            id=str(attempt.id),
            test_id=str(attempt.test_id),
            score=attempt.score,
            total_questions=attempt.total_questions,
            correct_answers=attempt.correct_answers,
            time_taken_seconds=attempt.time_taken_seconds,
            answers=json.dumps(attempt.answers),
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
        )
        self.session.add(db_attempt)
        await self.session.flush()
        return attempt

    async def get_by_test_id(self, test_id: UUID) -> list[TestAttempt]:
        """Get all attempts for a test."""
        result = await self.session.execute(
            select(TestAttemptDB)
            .where(TestAttemptDB.test_id == str(test_id))
            .order_by(TestAttemptDB.completed_at.desc())
        )
        return [self._to_domain(a) for a in result.scalars().all()]

    async def get_by_id(self, attempt_id: UUID) -> Optional[TestAttempt]:
        """Get an attempt by ID."""
        result = await self.session.execute(
            select(TestAttemptDB).where(TestAttemptDB.id == str(attempt_id))
        )
        db_a = result.scalar_one_or_none()
        if not db_a:
            return None
        return self._to_domain(db_a)

    async def get_all(self) -> list[TestAttempt]:
        """Get all test attempts."""
        result = await self.session.execute(
            select(TestAttemptDB).order_by(TestAttemptDB.completed_at.desc())
        )
        return [self._to_domain(a) for a in result.scalars().all()]

    def _to_domain(self, db_a: TestAttemptDB) -> TestAttempt:
        """Convert database model to domain model."""
        return TestAttempt(
            id=UUID(db_a.id),
            test_id=UUID(db_a.test_id),
            score=db_a.score,
            total_questions=db_a.total_questions,
            correct_answers=db_a.correct_answers,
            time_taken_seconds=db_a.time_taken_seconds,
            answers=json.loads(db_a.answers),
            started_at=db_a.started_at,
            completed_at=db_a.completed_at,
        )


class GlossaryRepository:
    """Repository for glossary database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, glossary: Glossary) -> Glossary:
        """Create a new glossary."""
        db_glossary = GlossaryDB(
            id=str(glossary.id),
            document_id=str(glossary.document_id),
            name=glossary.name,
            term_count=glossary.term_count,
            created_at=glossary.created_at,
        )
        self.session.add(db_glossary)
        await self.session.flush()
        return glossary

    async def get_by_id(self, glossary_id: UUID) -> Optional[Glossary]:
        """Get a glossary by ID."""
        result = await self.session.execute(
            select(GlossaryDB).where(GlossaryDB.id == str(glossary_id))
        )
        db_glossary = result.scalar_one_or_none()
        if not db_glossary:
            return None
        return self._to_domain(db_glossary)

    async def get_by_document_id(self, document_id: UUID) -> list[Glossary]:
        """Get all glossaries for a document."""
        result = await self.session.execute(
            select(GlossaryDB)
            .where(GlossaryDB.document_id == str(document_id))
            .order_by(GlossaryDB.created_at.desc())
        )
        return [self._to_domain(g) for g in result.scalars().all()]

    async def delete(self, glossary_id: UUID) -> bool:
        """Delete a glossary and its terms."""
        result = await self.session.execute(
            delete(GlossaryDB).where(GlossaryDB.id == str(glossary_id))
        )
        return result.rowcount > 0

    def _to_domain(self, db_glossary: GlossaryDB) -> Glossary:
        """Convert database model to domain model."""
        return Glossary(
            id=UUID(db_glossary.id),
            document_id=UUID(db_glossary.document_id),
            name=db_glossary.name,
            term_count=db_glossary.term_count,
            created_at=db_glossary.created_at,
        )


class KeyTermRepository:
    """Repository for key term database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_many(self, glossary_id: UUID, terms: list[KeyTerm]) -> list[KeyTerm]:
        """Create multiple key terms."""
        for term in terms:
            db_term = KeyTermDB(
                id=str(term.id),
                glossary_id=str(glossary_id),
                document_id=str(term.document_id),
                term=term.term,
                definition=term.definition,
                category=term.category,
                importance=term.importance,
                created_at=term.created_at,
            )
            self.session.add(db_term)
        await self.session.flush()
        return terms

    async def get_by_glossary_id(self, glossary_id: UUID) -> list[KeyTerm]:
        """Get all terms for a glossary."""
        result = await self.session.execute(
            select(KeyTermDB)
            .where(KeyTermDB.glossary_id == str(glossary_id))
            .order_by(KeyTermDB.term)
        )
        return [self._to_domain(t) for t in result.scalars().all()]

    async def get_by_document_id(self, document_id: UUID) -> list[KeyTerm]:
        """Get all terms for a document."""
        result = await self.session.execute(
            select(KeyTermDB)
            .where(KeyTermDB.document_id == str(document_id))
            .order_by(KeyTermDB.term)
        )
        return [self._to_domain(t) for t in result.scalars().all()]

    def _to_domain(self, db_term: KeyTermDB) -> KeyTerm:
        """Convert database model to domain model."""
        return KeyTerm(
            id=UUID(db_term.id),
            document_id=UUID(db_term.document_id),
            term=db_term.term,
            definition=db_term.definition,
            category=db_term.category,
            importance=db_term.importance,
            created_at=db_term.created_at,
        )
