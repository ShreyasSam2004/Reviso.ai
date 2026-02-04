"""Mock test generation service."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from openai import OpenAI

from ..core.config import get_settings
from ..db.database import AsyncSessionLocal
from ..db.repositories import DocumentRepository, ChunkRepository, MockTestRepository, QuestionRepository, TestAttemptRepository
from ..models.mock_test import MockTest, Question, TestAttempt, QuestionType

logger = logging.getLogger(__name__)

MCQ_PROMPT = """Generate {num_mcq} multiple choice questions from the following educational content.
Each question should have:
- A clear question that tests understanding
- 4 answer options (A, B, C, D)
- The index of the correct answer (0 for A, 1 for B, 2 for C, 3 for D)
- A brief explanation of why the answer is correct
- A category/topic
- A difficulty level (easy, medium, hard)

Return as a JSON array:
[
  {{
    "question_text": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "The correct answer is A because...",
    "category": "Topic",
    "difficulty": "medium"
  }}
]

Educational Content:
{content}

Generate exactly {num_mcq} MCQ questions. Return ONLY the JSON array."""

TRUE_FALSE_PROMPT = """Generate {num_tf} true/false questions from the following educational content.
Each question should have:
- A statement that can be determined as true or false
- The correct answer (0 for True, 1 for False)
- A brief explanation
- A category/topic
- A difficulty level (easy, medium, hard)

Return as a JSON array:
[
  {{
    "question_text": "Statement to evaluate...",
    "options": ["True", "False"],
    "correct_answer": 0,
    "explanation": "This is true because...",
    "category": "Topic",
    "difficulty": "medium"
  }}
]

Educational Content:
{content}

Generate exactly {num_tf} True/False questions. Return ONLY the JSON array."""


class MockTestService:
    """Service for generating and managing mock tests."""

    def __init__(self):
        self.settings = get_settings()
        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.default_model = self.settings.default_model

    async def generate_test(
        self,
        document_id: UUID,
        num_questions: int = 10,
        test_name: Optional[str] = None,
        include_mcq: bool = True,
        include_true_false: bool = True,
        time_limit_minutes: Optional[int] = None,
    ) -> tuple[MockTest, list[Question]]:
        """Generate a mock test from a document."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                doc_repo = DocumentRepository(session)
                chunk_repo = ChunkRepository(session)
                test_repo = MockTestRepository(session)
                question_repo = QuestionRepository(session)

                # Get document
                document = await doc_repo.get_by_id(document_id)
                if not document:
                    raise ValueError(f"Document {document_id} not found")

                if document.status.value != "completed":
                    raise ValueError("Document must be processed before generating tests")

                # Get chunks
                chunks = await chunk_repo.get_by_document_id(document_id)
                if not chunks:
                    raise ValueError("No content available for this document")

                # Combine content
                content = "\n\n".join(c.content for c in chunks[:10])

                # Determine question distribution
                if include_mcq and include_true_false:
                    num_mcq = num_questions * 2 // 3
                    num_tf = num_questions - num_mcq
                elif include_mcq:
                    num_mcq = num_questions
                    num_tf = 0
                else:
                    num_mcq = 0
                    num_tf = num_questions

                # Generate questions in PARALLEL for speed
                questions_data = []
                tasks = []

                if num_mcq > 0:
                    tasks.append(('mcq', self._generate_mcq(content, num_mcq)))

                if num_tf > 0:
                    tasks.append(('tf', self._generate_true_false(content, num_tf)))

                # Run all question generation tasks in parallel
                if tasks:
                    results = await asyncio.gather(*[t[1] for t in tasks])
                    for result in results:
                        questions_data.extend(result)

                # Create test
                test = MockTest(
                    id=uuid4(),
                    document_id=document_id,
                    name=test_name or f"Test - {document.original_filename}",
                    question_count=len(questions_data),
                    time_limit_minutes=time_limit_minutes,
                    created_at=datetime.utcnow(),
                )
                await test_repo.create(test)

                # Create questions
                questions = []
                for i, q_data in enumerate(questions_data):
                    q_type = QuestionType.TRUE_FALSE if len(q_data.get("options", [])) == 2 else QuestionType.MCQ

                    question = Question(
                        id=uuid4(),
                        test_id=test.id,
                        question_type=q_type,
                        question_text=q_data.get("question_text", ""),
                        options=q_data.get("options", []),
                        correct_answer=q_data.get("correct_answer", 0),
                        explanation=q_data.get("explanation", ""),
                        category=q_data.get("category", ""),
                        difficulty=q_data.get("difficulty", "medium"),
                        created_at=datetime.utcnow(),
                    )
                    questions.append(question)

                await question_repo.create_many(questions)

                logger.info(f"Generated test with {len(questions)} questions for document {document_id}")
                return test, questions

    async def _generate_mcq(self, content: str, num_questions: int) -> list[dict]:
        """Generate MCQ questions using LLM."""
        prompt = MCQ_PROMPT.format(content=content, num_mcq=num_questions)
        return await self._generate_questions(prompt)

    async def _generate_true_false(self, content: str, num_questions: int) -> list[dict]:
        """Generate True/False questions using LLM."""
        prompt = TRUE_FALSE_PROMPT.format(content=content, num_tf=num_questions)
        return await self._generate_questions(prompt)

    async def _generate_questions(self, prompt: str) -> list[dict]:
        """Generate questions using LLM."""
        try:
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educator creating test questions. "
                        "Generate clear, educational questions that test understanding. "
                        "Always return valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=3000,
                temperature=0.5,
            )

            content = response.choices[0].message.content.strip()

            # Handle markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            questions = json.loads(content)

            if not isinstance(questions, list):
                raise ValueError("Expected JSON array")

            return questions

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse question JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            raise

    async def submit_test(
        self,
        test_id: UUID,
        answers: dict[str, int],
        time_taken_seconds: Optional[int] = None,
    ) -> tuple[TestAttempt, list[dict]]:
        """Submit test answers and calculate results."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                test_repo = MockTestRepository(session)
                question_repo = QuestionRepository(session)
                attempt_repo = TestAttemptRepository(session)

                # Get test
                test = await test_repo.get_by_id(test_id)
                if not test:
                    raise ValueError(f"Test {test_id} not found")

                # Get questions
                questions = await question_repo.get_by_test_id(test_id)

                # Calculate score
                correct_count = 0
                question_results = []

                for q in questions:
                    q_id_str = str(q.id)
                    selected = answers.get(q_id_str, -1)
                    is_correct = selected == q.correct_answer

                    if is_correct:
                        correct_count += 1

                    question_results.append({
                        "question_id": q_id_str,
                        "question_text": q.question_text,
                        "question_type": q.question_type.value,
                        "options": q.options,
                        "selected_answer": selected,
                        "correct_answer": q.correct_answer,
                        "is_correct": is_correct,
                        "explanation": q.explanation,
                        "category": q.category,
                    })

                score = (correct_count / len(questions) * 100) if questions else 0

                # Create attempt
                attempt = TestAttempt(
                    id=uuid4(),
                    test_id=test_id,
                    score=round(score, 1),
                    total_questions=len(questions),
                    correct_answers=correct_count,
                    time_taken_seconds=time_taken_seconds,
                    answers=answers,
                    started_at=datetime.utcnow(),
                    completed_at=datetime.utcnow(),
                )
                await attempt_repo.create(attempt)

                logger.info(f"Test {test_id} submitted: {score:.1f}% ({correct_count}/{len(questions)})")
                return attempt, question_results

    async def get_test(self, test_id: UUID) -> Optional[MockTest]:
        """Get a mock test by ID."""
        async with AsyncSessionLocal() as session:
            repo = MockTestRepository(session)
            return await repo.get_by_id(test_id)

    async def get_test_questions(self, test_id: UUID) -> list[Question]:
        """Get all questions for a test."""
        async with AsyncSessionLocal() as session:
            repo = QuestionRepository(session)
            return await repo.get_by_test_id(test_id)

    async def get_document_tests(self, document_id: UUID) -> list[MockTest]:
        """Get all tests for a document."""
        async with AsyncSessionLocal() as session:
            repo = MockTestRepository(session)
            return await repo.get_by_document_id(document_id)

    async def get_all_tests(self) -> list[MockTest]:
        """Get all mock tests."""
        async with AsyncSessionLocal() as session:
            repo = MockTestRepository(session)
            return await repo.get_all()

    async def get_test_attempts(self, test_id: UUID) -> list[TestAttempt]:
        """Get all attempts for a test."""
        async with AsyncSessionLocal() as session:
            repo = TestAttemptRepository(session)
            return await repo.get_by_test_id(test_id)

    async def get_all_attempts(self) -> list[TestAttempt]:
        """Get all test attempts."""
        async with AsyncSessionLocal() as session:
            repo = TestAttemptRepository(session)
            return await repo.get_all()

    async def delete_test(self, test_id: UUID) -> bool:
        """Delete a mock test."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                repo = MockTestRepository(session)
                return await repo.delete(test_id)
