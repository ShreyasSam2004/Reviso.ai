"""Mock test API routes."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from ..models.mock_test import (
    MockTestGenerateRequest,
    MockTestGenerateResponse,
    MockTest,
    MockTestWithQuestions,
    Question,
    TestAttempt,
    TestSubmitRequest,
    TestResultResponse,
)
from ..services.mock_test_service import MockTestService

router = APIRouter(prefix="/tests", tags=["tests"])


@router.post("/generate", response_model=MockTestGenerateResponse)
async def generate_test(request: MockTestGenerateRequest):
    """Generate a mock test from a document."""
    service = MockTestService()

    try:
        test, questions = await service.generate_test(
            document_id=request.document_id,
            num_questions=request.num_questions,
            test_name=request.test_name,
            include_mcq=request.include_mcq,
            include_true_false=request.include_true_false,
            time_limit_minutes=request.time_limit_minutes,
        )

        return MockTestGenerateResponse(
            test_id=test.id,
            document_id=test.document_id,
            name=test.name,
            question_count=test.question_count,
            questions=questions,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate test: {str(e)}")


@router.get("/", response_model=list[MockTest])
async def list_tests():
    """List all mock tests."""
    service = MockTestService()
    return await service.get_all_tests()


@router.get("/document/{document_id}", response_model=list[MockTest])
async def get_document_tests(document_id: UUID):
    """Get all mock tests for a document."""
    service = MockTestService()
    return await service.get_document_tests(document_id)


@router.get("/{test_id}", response_model=MockTestWithQuestions)
async def get_test(test_id: UUID):
    """Get a mock test with all its questions."""
    service = MockTestService()

    test = await service.get_test(test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    questions = await service.get_test_questions(test_id)

    return MockTestWithQuestions(
        id=test.id,
        document_id=test.document_id,
        name=test.name,
        question_count=test.question_count,
        time_limit_minutes=test.time_limit_minutes,
        created_at=test.created_at,
        questions=questions,
    )


@router.post("/{test_id}/submit", response_model=TestResultResponse)
async def submit_test(test_id: UUID, request: TestSubmitRequest):
    """Submit test answers and get results."""
    service = MockTestService()

    try:
        attempt, question_results = await service.submit_test(
            test_id=test_id,
            answers=request.answers,
            time_taken_seconds=request.time_taken_seconds,
        )

        return TestResultResponse(
            attempt_id=attempt.id,
            test_id=attempt.test_id,
            score=attempt.score,
            total_questions=attempt.total_questions,
            correct_answers=attempt.correct_answers,
            time_taken_seconds=attempt.time_taken_seconds,
            question_results=question_results,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit test: {str(e)}")


@router.get("/{test_id}/attempts", response_model=list[TestAttempt])
async def get_test_attempts(test_id: UUID):
    """Get all attempts for a test."""
    service = MockTestService()
    return await service.get_test_attempts(test_id)


@router.get("/attempts/all", response_model=list[TestAttempt])
async def get_all_attempts():
    """Get all test attempts for analytics."""
    service = MockTestService()
    return await service.get_all_attempts()


@router.delete("/{test_id}")
async def delete_test(test_id: UUID):
    """Delete a mock test."""
    service = MockTestService()
    success = await service.delete_test(test_id)

    if not success:
        raise HTTPException(status_code=404, detail="Test not found")

    return {"message": "Test deleted"}
