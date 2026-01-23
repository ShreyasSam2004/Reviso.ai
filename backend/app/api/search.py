"""API routes for full-text search across documents."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..db.models import DocumentDB, DocumentChunkDB, SummaryDB, FlashcardDB, KeyTermDB

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


class SearchResult(BaseModel):
    """A single search result."""
    id: str
    type: str  # document, chunk, summary, flashcard, key_term
    title: str
    content: str  # Snippet with highlighted matches
    document_id: str
    document_name: str
    relevance_score: float


class SearchResponse(BaseModel):
    """Search response with results and metadata."""
    query: str
    total_results: int
    results: list[SearchResult]


def highlight_snippet(text: str, query: str, max_length: int = 200) -> str:
    """Extract a snippet around the query match and highlight it."""
    query_lower = query.lower()
    text_lower = text.lower()

    # Find position of query in text
    pos = text_lower.find(query_lower)

    if pos == -1:
        # Query not found directly, try individual words
        words = query_lower.split()
        for word in words:
            pos = text_lower.find(word)
            if pos != -1:
                break

    if pos == -1:
        # Still not found, return start of text
        return text[:max_length] + "..." if len(text) > max_length else text

    # Calculate snippet boundaries
    start = max(0, pos - 50)
    end = min(len(text), pos + len(query) + 150)

    snippet = text[start:end]

    # Add ellipsis if needed
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."

    return snippet


@router.get("", response_model=SearchResponse)
async def search_content(
    q: str = Query(..., min_length=2, description="Search query"),
    types: Optional[str] = Query(None, description="Comma-separated types to search: document,chunk,summary,flashcard,key_term"),
    document_id: Optional[str] = Query(None, description="Limit search to specific document"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    db: AsyncSession = Depends(get_db),
):
    """Search across all document content."""
    results: list[SearchResult] = []
    search_types = types.split(",") if types else ["document", "chunk", "summary", "flashcard", "key_term"]

    # Search pattern for SQL LIKE
    search_pattern = f"%{q}%"

    # Get document name lookup
    doc_names: dict[str, str] = {}
    docs_result = await db.execute(select(DocumentDB.id, DocumentDB.original_filename))
    for doc_id, doc_name in docs_result.all():
        doc_names[doc_id] = doc_name

    # Search documents
    if "document" in search_types:
        query = select(DocumentDB).where(
            or_(
                DocumentDB.original_filename.ilike(search_pattern),
                DocumentDB.title.ilike(search_pattern),
                DocumentDB.subject.ilike(search_pattern),
            )
        )
        if document_id:
            query = query.where(DocumentDB.id == document_id)

        doc_results = await db.execute(query.limit(limit))
        for doc in doc_results.scalars().all():
            results.append(SearchResult(
                id=doc.id,
                type="document",
                title=doc.original_filename,
                content=highlight_snippet(
                    f"{doc.title or ''} {doc.subject or ''} {doc.original_filename}",
                    q
                ),
                document_id=doc.id,
                document_name=doc.original_filename,
                relevance_score=1.0,
            ))

    # Search document chunks (main content)
    if "chunk" in search_types:
        query = select(DocumentChunkDB).where(
            DocumentChunkDB.content.ilike(search_pattern)
        )
        if document_id:
            query = query.where(DocumentChunkDB.document_id == document_id)

        chunk_results = await db.execute(query.limit(limit))
        for chunk in chunk_results.scalars().all():
            doc_name = doc_names.get(chunk.document_id, "Unknown")
            results.append(SearchResult(
                id=chunk.id,
                type="chunk",
                title=f"Content from {doc_name} (Page section {chunk.chunk_index + 1})",
                content=highlight_snippet(chunk.content, q),
                document_id=chunk.document_id,
                document_name=doc_name,
                relevance_score=0.9,
            ))

    # Search summaries
    if "summary" in search_types:
        query = select(SummaryDB).where(
            SummaryDB.content.ilike(search_pattern)
        )
        if document_id:
            query = query.where(SummaryDB.document_id == document_id)

        summary_results = await db.execute(query.limit(limit))
        for summary in summary_results.scalars().all():
            doc_name = doc_names.get(summary.document_id, "Unknown")
            results.append(SearchResult(
                id=summary.id,
                type="summary",
                title=f"Summary: {summary.section_title or summary.summary_type}",
                content=highlight_snippet(summary.content, q),
                document_id=summary.document_id,
                document_name=doc_name,
                relevance_score=0.85,
            ))

    # Search flashcards
    if "flashcard" in search_types:
        query = select(FlashcardDB).where(
            or_(
                FlashcardDB.question.ilike(search_pattern),
                FlashcardDB.answer.ilike(search_pattern),
            )
        )
        if document_id:
            query = query.where(FlashcardDB.document_id == document_id)

        flashcard_results = await db.execute(query.limit(limit))
        for card in flashcard_results.scalars().all():
            doc_name = doc_names.get(card.document_id, "Unknown")
            results.append(SearchResult(
                id=card.id,
                type="flashcard",
                title=f"Flashcard: {card.question[:50]}...",
                content=highlight_snippet(f"Q: {card.question}\nA: {card.answer}", q),
                document_id=card.document_id,
                document_name=doc_name,
                relevance_score=0.8,
            ))

    # Search key terms
    if "key_term" in search_types:
        query = select(KeyTermDB).where(
            or_(
                KeyTermDB.term.ilike(search_pattern),
                KeyTermDB.definition.ilike(search_pattern),
            )
        )
        if document_id:
            query = query.where(KeyTermDB.document_id == document_id)

        term_results = await db.execute(query.limit(limit))
        for term in term_results.scalars().all():
            doc_name = doc_names.get(term.document_id, "Unknown")
            results.append(SearchResult(
                id=term.id,
                type="key_term",
                title=f"Term: {term.term}",
                content=highlight_snippet(f"{term.term}: {term.definition}", q),
                document_id=term.document_id,
                document_name=doc_name,
                relevance_score=0.75,
            ))

    # Sort by relevance score
    results.sort(key=lambda x: x.relevance_score, reverse=True)

    # Limit total results
    results = results[:limit]

    return SearchResponse(
        query=q,
        total_results=len(results),
        results=results,
    )
