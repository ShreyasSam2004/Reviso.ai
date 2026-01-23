"""Summary generation endpoints."""

from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..db.repositories import SummaryRepository
from ..models.document import ProcessingStatus
from ..models.summary import Summary, SummaryType, SummaryRequest, SummaryResponse
from ..services.document_service_db import DocumentServiceDB
from ..services.llm_service import LLMService

router = APIRouter()

# Singleton LLM service instance
_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    """Dependency to get LLM service instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


def get_document_service(db: AsyncSession = Depends(get_db)) -> DocumentServiceDB:
    """Dependency to get document service with database session."""
    return DocumentServiceDB(db)


@router.post("/generate", response_model=SummaryResponse)
async def generate_summary(
    request: SummaryRequest,
    db: AsyncSession = Depends(get_db),
    llm_service: LLMService = Depends(get_llm_service),
):
    """
    Generate a summary for a document.

    Supports different summary types:
    - brief: 2-3 sentence overview
    - detailed: Comprehensive summary
    - key_points: Bulleted list of main points
    - chapter: Section-by-section summary
    - custom: User-specified format
    """
    doc_service = DocumentServiceDB(db)
    summary_repo = SummaryRepository(db)

    # Verify document exists and is processed
    document = await doc_service.get_document(request.document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Document not ready for summarization. Status: {document.status}",
        )

    # Get document chunks
    chunks = await doc_service.get_document_chunks(request.document_id)
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no content to summarize")

    # Filter chunks by page range if specified
    if request.start_page or request.end_page:
        filtered_chunks = []
        for chunk in chunks:
            if not chunk.page_numbers:
                continue
            chunk_pages = set(chunk.page_numbers)
            start = request.start_page or 1
            end = request.end_page or document.page_count
            target_pages = set(range(start, end + 1))

            if chunk_pages & target_pages:
                filtered_chunks.append(chunk)
        chunks = filtered_chunks

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No content found in the specified page range",
        )

    # Extract text from chunks
    chunk_texts = [chunk.content for chunk in sorted(chunks, key=lambda c: c.chunk_index)]

    try:
        # Generate summary
        result = await llm_service.generate_summary_for_chunks(
            chunks=chunk_texts,
            summary_type=request.summary_type,
            custom_instructions=request.custom_instructions,
        )

        # Create and store summary
        summary = Summary(
            id=uuid4(),
            document_id=request.document_id,
            summary_type=request.summary_type,
            content=result["content"],
            model_used=result["model_used"],
            prompt_tokens=result["prompt_tokens"],
            completion_tokens=result["completion_tokens"],
            start_page=request.start_page,
            end_page=request.end_page,
        )

        await summary_repo.create(summary)
        await db.commit()

        return SummaryResponse(
            id=summary.id,
            document_id=summary.document_id,
            summary_type=summary.summary_type,
            content=summary.content,
            model_used=summary.model_used,
            created_at=summary.created_at,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Summary generation failed: {str(e)}",
        )


@router.get("/{summary_id}", response_model=SummaryResponse)
async def get_summary(
    summary_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a previously generated summary by ID."""
    summary_repo = SummaryRepository(db)
    summary = await summary_repo.get_by_id(summary_id)

    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    return SummaryResponse(
        id=summary.id,
        document_id=summary.document_id,
        summary_type=summary.summary_type,
        content=summary.content,
        model_used=summary.model_used,
        created_at=summary.created_at,
    )


@router.get("/document/{document_id}", response_model=list[SummaryResponse])
async def get_document_summaries(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all summaries for a document."""
    doc_service = DocumentServiceDB(db)
    summary_repo = SummaryRepository(db)

    document = await doc_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    summaries = await summary_repo.get_by_document_id(document_id)

    return [
        SummaryResponse(
            id=s.id,
            document_id=s.document_id,
            summary_type=s.summary_type,
            content=s.content,
            model_used=s.model_used,
            created_at=s.created_at,
        )
        for s in summaries
    ]


@router.post("/{summary_id}/feedback")
async def submit_feedback(
    summary_id: UUID,
    rating: int,
    feedback: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Submit feedback on a summary quality (1-5 rating)."""
    summary_repo = SummaryRepository(db)
    summary = await summary_repo.get_by_id(summary_id)

    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    await summary_repo.update(summary_id, rating=rating, feedback=feedback)
    await db.commit()

    return {"message": "Feedback recorded", "summary_id": summary_id}


@router.post("/ask")
async def ask_question(
    document_id: UUID,
    question: str,
    db: AsyncSession = Depends(get_db),
    llm_service: LLMService = Depends(get_llm_service),
):
    """
    Ask a question about a document's content.

    The system will use relevant document content to answer the question.
    """
    doc_service = DocumentServiceDB(db)

    document = await doc_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Document not ready. Status: {document.status}",
        )

    # Get full document text
    text = await doc_service.get_document_text(document_id)
    if not text:
        raise HTTPException(status_code=400, detail="Document has no content")

    # Truncate if too long
    max_context_chars = 15000
    if len(text) > max_context_chars:
        text = text[:max_context_chars] + "..."

    try:
        result = await llm_service.ask_question(question, text)

        return {
            "question": question,
            "answer": result["answer"],
            "document_id": document_id,
            "model_used": result["model_used"],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Question answering failed: {str(e)}",
        )
