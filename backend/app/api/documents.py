"""Document management endpoints."""

import asyncio
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db, AsyncSessionLocal
from ..models.document import Document, DocumentChunk, ProcessingStatus
from ..services.document_service_db import DocumentServiceDB

router = APIRouter()


def get_document_service(db: AsyncSession = Depends(get_db)) -> DocumentServiceDB:
    """Dependency to get document service with database session."""
    return DocumentServiceDB(db)


async def process_document_background(document_id: UUID):
    """Background task to process document with its own session."""
    async with AsyncSessionLocal() as session:
        service = DocumentServiceDB(session)
        try:
            await service.process_document(document_id)
        except Exception as e:
            # Error is already logged and stored in document
            pass


@router.post("/upload", response_model=Document)
async def upload_document(
    file: Annotated[UploadFile, File(description="PDF file to upload")],
    service: DocumentServiceDB = Depends(get_document_service),
):
    """
    Upload a PDF document for processing.

    The document will be validated, stored, and queued for background processing.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        content = await file.read()
        document = await service.create_document(content, file.filename)

        # Process in background with separate session
        asyncio.create_task(process_document_background(document.id))

        return document

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/", response_model=list[Document])
async def list_documents(
    service: DocumentServiceDB = Depends(get_document_service),
):
    """List all uploaded documents."""
    return await service.get_all_documents()


@router.get("/{document_id}", response_model=Document)
async def get_document(
    document_id: UUID,
    service: DocumentServiceDB = Depends(get_document_service),
):
    """Get a specific document by ID."""
    document = await service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("/{document_id}/status")
async def get_document_status(
    document_id: UUID,
    service: DocumentServiceDB = Depends(get_document_service),
):
    """Get the processing status of a document."""
    document = await service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": document.id,
        "status": document.status,
        "error_message": document.error_message,
        "progress": _get_progress_info(document),
    }


@router.get("/{document_id}/chunks", response_model=list[DocumentChunk])
async def get_document_chunks(
    document_id: UUID,
    service: DocumentServiceDB = Depends(get_document_service),
):
    """Get all text chunks for a document."""
    document = await service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Document not ready. Status: {document.status}",
        )

    return await service.get_document_chunks(document_id)


@router.get("/{document_id}/text")
async def get_document_text(
    document_id: UUID,
    service: DocumentServiceDB = Depends(get_document_service),
):
    """Get the full extracted text of a document."""
    document = await service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Document not ready. Status: {document.status}",
        )

    text = await service.get_document_text(document_id)
    return {
        "document_id": document_id,
        "text": text,
        "total_chunks": document.total_chunks,
        "total_tokens": document.total_tokens,
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    service: DocumentServiceDB = Depends(get_document_service),
):
    """Delete a document and all associated data."""
    deleted = await service.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"message": "Document deleted", "document_id": document_id}


@router.post("/{document_id}/reprocess", response_model=Document)
async def reprocess_document(
    document_id: UUID,
    service: DocumentServiceDB = Depends(get_document_service),
):
    """Reprocess a document (useful after failed processing)."""
    document = await service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Reset status
    from ..db.repositories import DocumentRepository
    doc_repo = DocumentRepository(service.session)
    await doc_repo.update(document_id, status=ProcessingStatus.PENDING, error_message=None)
    await service.session.commit()

    # Process in background
    asyncio.create_task(process_document_background(document_id))

    return await service.get_document(document_id)


def _get_progress_info(document: Document) -> dict:
    """Get human-readable progress information."""
    status_progress = {
        ProcessingStatus.PENDING: {"step": 0, "message": "Queued for processing"},
        ProcessingStatus.EXTRACTING: {"step": 1, "message": "Extracting text from PDF"},
        ProcessingStatus.CHUNKING: {"step": 2, "message": "Splitting text into chunks"},
        ProcessingStatus.EMBEDDING: {"step": 3, "message": "Generating embeddings"},
        ProcessingStatus.COMPLETED: {"step": 4, "message": "Processing complete"},
        ProcessingStatus.FAILED: {"step": -1, "message": f"Failed: {document.error_message}"},
    }

    progress = status_progress.get(
        document.status,
        {"step": -1, "message": "Unknown status"},
    )
    progress["total_steps"] = 4

    return progress
