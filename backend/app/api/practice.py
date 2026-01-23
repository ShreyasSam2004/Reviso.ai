"""API routes for practice exercises (Fill-in-Blank and Matching)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..models.practice import (
    GenerateFillInBlankRequest,
    GenerateMatchingRequest,
    GeneratePracticeResponse,
    PracticeSession,
    PracticeSessionSummary,
    PracticeSubmission,
    PracticeResult,
)
from ..services.practice_service import PracticeService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/practice", tags=["practice"])


@router.post("/fill-in-blank/generate", response_model=GeneratePracticeResponse)
async def generate_fill_in_blank(
    request: GenerateFillInBlankRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate fill-in-the-blank questions from a document."""
    try:
        service = PracticeService(db)
        result = await service.generate_fill_in_blank(
            document_id=request.document_id,
            num_questions=request.num_questions,
            name=request.name,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating fill-in-blank: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate questions")


@router.post("/matching/generate", response_model=GeneratePracticeResponse)
async def generate_matching(
    request: GenerateMatchingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a matching exercise from a document."""
    try:
        service = PracticeService(db)
        result = await service.generate_matching(
            document_id=request.document_id,
            num_pairs=request.num_pairs,
            name=request.name,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating matching: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate matching exercise")


@router.get("/sessions", response_model=list[PracticeSessionSummary])
async def list_sessions(
    document_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List practice sessions, optionally filtered by document."""
    service = PracticeService(db)
    if document_id:
        return await service.get_sessions_by_document(document_id)
    return await service.get_all_sessions()


@router.get("/sessions/{session_id}", response_model=PracticeSession)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a practice session with full questions."""
    try:
        service = PracticeService(db)
        return await service.get_session(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a practice session."""
    service = PracticeService(db)
    deleted = await service.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}


@router.post("/sessions/{session_id}/submit", response_model=PracticeResult)
async def submit_practice(
    session_id: str,
    submission: PracticeSubmission,
    db: AsyncSession = Depends(get_db),
):
    """Submit answers and get graded results."""
    try:
        # Ensure session_id matches
        submission.session_id = session_id
        service = PracticeService(db)
        return await service.grade_submission(submission)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error grading submission: {e}")
        raise HTTPException(status_code=500, detail="Failed to grade submission")
