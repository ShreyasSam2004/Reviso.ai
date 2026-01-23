"""Service for generating practice exercises (Fill-in-Blank and Matching)."""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import PracticeSessionDB, DocumentChunkDB
from ..models.practice import (
    PracticeType,
    FillInBlankQuestion,
    MatchingPair,
    MatchingExercise,
    PracticeSession,
    PracticeSessionSummary,
    GeneratePracticeResponse,
    PracticeSubmission,
    PracticeResult,
    FillInBlankResult,
    MatchingResult,
)
from .llm_service import LLMService

logger = logging.getLogger(__name__)


FILL_IN_BLANK_PROMPT = """Based on the following educational content, generate {num_questions} fill-in-the-blank questions.

For each question:
1. Create a meaningful sentence from the content with ONE key term/concept replaced by a blank (represented as _____)
2. The blank should test important concepts, definitions, or facts
3. Include a hint that helps without giving away the answer
4. Vary the difficulty and topics covered

Content:
{content}

Return a JSON array with exactly {num_questions} questions in this format:
[
  {{
    "sentence": "The process of _____ converts glucose into energy in cells.",
    "blank_word": "cellular respiration",
    "hint": "This metabolic process occurs in the mitochondria",
    "context": "Energy production in cells"
  }}
]

Important:
- Make sentences complete and educational
- The blank_word should be the exact word/phrase that fills the blank
- Return ONLY the JSON array, no other text"""


MATCHING_PROMPT = """Based on the following educational content, generate {num_pairs} term-definition pairs for a matching exercise.

For each pair:
1. Extract important terms, concepts, or vocabulary
2. Provide clear, concise definitions (1-2 sentences max)
3. Make sure definitions are distinct enough to avoid confusion
4. Cover different topics from the content

Content:
{content}

Return a JSON array with exactly {num_pairs} pairs in this format:
[
  {{
    "term": "Photosynthesis",
    "definition": "The process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen"
  }}
]

Important:
- Terms should be single words or short phrases
- Definitions should be clear and unambiguous
- Return ONLY the JSON array, no other text"""


class PracticeService:
    """Service for generating and managing practice exercises."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm_service = LLMService()

    async def _get_document_content(self, document_id: str, max_chunks: int = 10) -> str:
        """Get document content from chunks."""
        from sqlalchemy import select

        result = await self.db.execute(
            select(DocumentChunkDB)
            .where(DocumentChunkDB.document_id == document_id)
            .order_by(DocumentChunkDB.chunk_index)
            .limit(max_chunks)
        )
        chunks = result.scalars().all()

        if not chunks:
            raise ValueError(f"No content found for document {document_id}")

        return "\n\n".join(chunk.content for chunk in chunks)

    async def generate_fill_in_blank(
        self,
        document_id: str,
        num_questions: int = 10,
        name: Optional[str] = None,
    ) -> GeneratePracticeResponse:
        """Generate fill-in-the-blank questions from document."""
        logger.info(f"Generating {num_questions} fill-in-blank questions for document {document_id}")

        # Get document content
        content = await self._get_document_content(document_id)

        # Generate questions using LLM
        prompt = FILL_IN_BLANK_PROMPT.format(
            num_questions=num_questions,
            content=content[:8000]  # Limit content length
        )

        response = await self.llm_service.generate_completion(
            prompt=prompt,
            max_tokens=3000,
            temperature=0.7,
        )

        # Parse response
        try:
            # Clean response - remove markdown code blocks if present
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()

            questions_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise ValueError("Failed to generate valid questions")

        # Create question objects with IDs
        questions = []
        for i, q in enumerate(questions_data[:num_questions]):
            questions.append({
                "id": str(uuid4()),
                "sentence": q.get("sentence", ""),
                "blank_word": q.get("blank_word", ""),
                "hint": q.get("hint", ""),
                "context": q.get("context", ""),
            })

        # Generate name if not provided
        if not name:
            name = f"Fill-in-Blank Practice ({len(questions)} questions)"

        # Save to database
        session_id = str(uuid4())
        practice_session = PracticeSessionDB(
            id=session_id,
            document_id=document_id,
            practice_type=PracticeType.FILL_IN_BLANK.value,
            name=name,
            question_count=len(questions),
            questions_data=json.dumps(questions),
        )

        self.db.add(practice_session)
        await self.db.commit()

        logger.info(f"Created fill-in-blank session {session_id} with {len(questions)} questions")

        return GeneratePracticeResponse(
            session_id=session_id,
            document_id=document_id,
            practice_type=PracticeType.FILL_IN_BLANK,
            name=name,
            question_count=len(questions),
        )

    async def generate_matching(
        self,
        document_id: str,
        num_pairs: int = 8,
        name: Optional[str] = None,
    ) -> GeneratePracticeResponse:
        """Generate matching exercise from document."""
        logger.info(f"Generating matching exercise with {num_pairs} pairs for document {document_id}")

        # Get document content
        content = await self._get_document_content(document_id)

        # Generate pairs using LLM
        prompt = MATCHING_PROMPT.format(
            num_pairs=num_pairs,
            content=content[:8000]
        )

        response = await self.llm_service.generate_completion(
            prompt=prompt,
            max_tokens=2000,
            temperature=0.7,
        )

        # Parse response
        try:
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()

            pairs_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise ValueError("Failed to generate valid matching pairs")

        # Create pair objects with IDs
        pairs = []
        for p in pairs_data[:num_pairs]:
            pairs.append({
                "id": str(uuid4()),
                "term": p.get("term", ""),
                "definition": p.get("definition", ""),
            })

        # Generate name if not provided
        if not name:
            name = f"Matching Exercise ({len(pairs)} pairs)"

        # Save to database
        session_id = str(uuid4())
        exercise_data = {
            "id": str(uuid4()),
            "pairs": pairs,
        }

        practice_session = PracticeSessionDB(
            id=session_id,
            document_id=document_id,
            practice_type=PracticeType.MATCHING.value,
            name=name,
            question_count=len(pairs),
            questions_data=json.dumps(exercise_data),
        )

        self.db.add(practice_session)
        await self.db.commit()

        logger.info(f"Created matching session {session_id} with {len(pairs)} pairs")

        return GeneratePracticeResponse(
            session_id=session_id,
            document_id=document_id,
            practice_type=PracticeType.MATCHING,
            name=name,
            question_count=len(pairs),
        )

    async def get_session(self, session_id: str) -> PracticeSession:
        """Get a practice session with full questions data."""
        from sqlalchemy import select

        result = await self.db.execute(
            select(PracticeSessionDB).where(PracticeSessionDB.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Practice session {session_id} not found")

        questions_data = json.loads(session.questions_data)

        practice_session = PracticeSession(
            id=UUID(session.id),
            document_id=UUID(session.document_id),
            practice_type=PracticeType(session.practice_type),
            name=session.name,
            created_at=session.created_at,
        )

        if session.practice_type == PracticeType.FILL_IN_BLANK.value:
            practice_session.fill_in_blank_questions = [
                FillInBlankQuestion(**q) for q in questions_data
            ]
        else:
            practice_session.matching_exercise = MatchingExercise(
                id=questions_data["id"],
                pairs=[MatchingPair(**p) for p in questions_data["pairs"]],
            )

        return practice_session

    async def get_sessions_by_document(self, document_id: str) -> list[PracticeSessionSummary]:
        """Get all practice sessions for a document."""
        from sqlalchemy import select

        result = await self.db.execute(
            select(PracticeSessionDB)
            .where(PracticeSessionDB.document_id == document_id)
            .order_by(PracticeSessionDB.created_at.desc())
        )
        sessions = result.scalars().all()

        return [
            PracticeSessionSummary(
                id=UUID(s.id),
                document_id=UUID(s.document_id),
                practice_type=PracticeType(s.practice_type),
                name=s.name,
                question_count=s.question_count,
                created_at=s.created_at,
            )
            for s in sessions
        ]

    async def get_all_sessions(self) -> list[PracticeSessionSummary]:
        """Get all practice sessions."""
        from sqlalchemy import select

        result = await self.db.execute(
            select(PracticeSessionDB).order_by(PracticeSessionDB.created_at.desc())
        )
        sessions = result.scalars().all()

        return [
            PracticeSessionSummary(
                id=UUID(s.id),
                document_id=UUID(s.document_id),
                practice_type=PracticeType(s.practice_type),
                name=s.name,
                question_count=s.question_count,
                created_at=s.created_at,
            )
            for s in sessions
        ]

    async def delete_session(self, session_id: str) -> bool:
        """Delete a practice session."""
        from sqlalchemy import select, delete

        result = await self.db.execute(
            select(PracticeSessionDB).where(PracticeSessionDB.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            return False

        await self.db.execute(
            delete(PracticeSessionDB).where(PracticeSessionDB.id == session_id)
        )
        await self.db.commit()

        return True

    async def grade_submission(self, submission: PracticeSubmission) -> PracticeResult:
        """Grade a practice submission."""
        session = await self.get_session(submission.session_id)

        if session.practice_type == PracticeType.FILL_IN_BLANK:
            return await self._grade_fill_in_blank(session, submission)
        else:
            return await self._grade_matching(session, submission)

    async def _grade_fill_in_blank(
        self,
        session: PracticeSession,
        submission: PracticeSubmission,
    ) -> PracticeResult:
        """Grade fill-in-blank answers."""
        if not submission.fill_in_blank_answers or not session.fill_in_blank_questions:
            raise ValueError("No answers provided for fill-in-blank session")

        # Create lookup for questions
        questions_map = {q.id: q for q in session.fill_in_blank_questions}

        results = []
        correct_count = 0

        for answer in submission.fill_in_blank_answers:
            question = questions_map.get(answer.question_id)
            if not question:
                continue

            # Normalize for comparison (case-insensitive, strip whitespace)
            user_answer = answer.user_answer.strip().lower()
            correct_answer = question.blank_word.strip().lower()

            is_correct = user_answer == correct_answer

            if is_correct:
                correct_count += 1

            results.append(FillInBlankResult(
                question_id=answer.question_id,
                user_answer=answer.user_answer,
                correct_answer=question.blank_word,
                is_correct=is_correct,
                sentence=question.sentence,
            ))

        total = len(session.fill_in_blank_questions)
        score = (correct_count / total * 100) if total > 0 else 0

        return PracticeResult(
            session_id=submission.session_id,
            practice_type=PracticeType.FILL_IN_BLANK,
            total_questions=total,
            correct_answers=correct_count,
            score_percentage=round(score, 1),
            fill_in_blank_results=results,
        )

    async def _grade_matching(
        self,
        session: PracticeSession,
        submission: PracticeSubmission,
    ) -> PracticeResult:
        """Grade matching answers."""
        if not submission.matching_answers or not session.matching_exercise:
            raise ValueError("No answers provided for matching session")

        pairs = session.matching_exercise.pairs
        user_matches = submission.matching_answers.matches

        results = []
        correct_count = 0

        for pair in pairs:
            user_def_id = user_matches.get(pair.id)
            is_correct = user_def_id == pair.id  # In our model, term and definition share the same pair ID

            if is_correct:
                correct_count += 1

            results.append(MatchingResult(
                term_id=pair.id,
                term=pair.term,
                user_matched_definition_id=user_def_id,
                correct_definition_id=pair.id,
                correct_definition=pair.definition,
                is_correct=is_correct,
            ))

        total = len(pairs)
        score = (correct_count / total * 100) if total > 0 else 0

        return PracticeResult(
            session_id=submission.session_id,
            practice_type=PracticeType.MATCHING,
            total_questions=total,
            correct_answers=correct_count,
            score_percentage=round(score, 1),
            matching_results=results,
        )
