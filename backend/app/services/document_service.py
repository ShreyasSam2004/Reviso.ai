"""Document service - orchestrates document processing pipeline."""

import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4

from ..core.config import get_settings
from ..models.document import (
    Document,
    DocumentChunk,
    DocumentCreate,
    DocumentUpdate,
    ProcessingStatus,
)
from .pdf_processor import PDFProcessor
from .text_chunker import TextChunker

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Orchestrates the document processing pipeline.

    Handles file upload, PDF extraction, chunking, and storage coordination.
    """

    def __init__(
        self,
        pdf_processor: Optional[PDFProcessor] = None,
        text_chunker: Optional[TextChunker] = None,
    ):
        self.settings = get_settings()
        self.pdf_processor = pdf_processor or PDFProcessor()
        self.text_chunker = text_chunker or TextChunker(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
        )

        # In-memory storage (will be replaced with DB)
        self._documents: dict[UUID, Document] = {}
        self._chunks: dict[UUID, list[DocumentChunk]] = {}

        # Ensure upload directory exists
        self.upload_dir = Path(self.settings.upload_directory)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def create_document(
        self,
        file_content: bytes,
        original_filename: str,
    ) -> Document:
        """
        Create a new document from uploaded file content.

        Args:
            file_content: Raw file bytes
            original_filename: Original name of uploaded file

        Returns:
            Created Document object

        Raises:
            ValueError: If file is invalid or too large
        """
        # Validate file size
        file_size = len(file_content)
        max_size = self.settings.max_file_size_mb * 1024 * 1024

        if file_size > max_size:
            raise ValueError(
                f"File size ({file_size / 1024 / 1024:.1f}MB) exceeds "
                f"maximum allowed ({self.settings.max_file_size_mb}MB)"
            )

        # Validate extension
        file_ext = Path(original_filename).suffix.lower()
        if file_ext not in self.settings.allowed_extensions:
            raise ValueError(
                f"File type '{file_ext}' not allowed. "
                f"Allowed: {self.settings.allowed_extensions}"
            )

        # Generate unique filename
        doc_id = uuid4()
        safe_filename = f"{doc_id}{file_ext}"
        file_path = self.upload_dir / safe_filename

        # Save file
        file_path.write_bytes(file_content)

        # Create document record
        document = Document(
            id=doc_id,
            filename=safe_filename,
            original_filename=original_filename,
            file_path=str(file_path),
            file_size_bytes=file_size,
            status=ProcessingStatus.PENDING,
        )

        self._documents[doc_id] = document
        logger.info(f"Created document {doc_id}: {original_filename}")

        return document

    async def process_document(self, document_id: UUID) -> Document:
        """
        Process a document through the full pipeline.

        Pipeline stages:
        1. PDF text extraction
        2. Text chunking
        3. (Future) Embedding generation

        Args:
            document_id: ID of document to process

        Returns:
            Updated Document object

        Raises:
            ValueError: If document not found
        """
        document = self.get_document(document_id)
        if not document:
            raise ValueError(f"Document not found: {document_id}")

        try:
            # Stage 1: Extract text from PDF
            await self._update_status(document_id, ProcessingStatus.EXTRACTING)

            extraction_result = self.pdf_processor.extract(document.file_path)

            # Update document with extraction metadata
            await self._update_document(
                document_id,
                DocumentUpdate(
                    page_count=extraction_result.total_pages,
                    title=extraction_result.metadata.get("title") or None,
                    author=extraction_result.metadata.get("author") or None,
                    subject=extraction_result.metadata.get("subject") or None,
                ),
            )

            # Stage 2: Chunk the extracted text
            await self._update_status(document_id, ProcessingStatus.CHUNKING)

            # Prepare pages for chunking with page tracking
            pages = [
                (page.page_number, page.text) for page in extraction_result.pages
            ]
            chunks = self.text_chunker.chunk_by_pages(pages)

            # Convert to DocumentChunk objects and store
            doc_chunks = []
            total_tokens = 0

            for chunk in chunks:
                doc_chunk = DocumentChunk(
                    document_id=document_id,
                    content=chunk.content,
                    chunk_index=chunk.chunk_index,
                    page_numbers=chunk.page_numbers,
                    token_count=chunk.token_count,
                    metadata={
                        "start_char": chunk.start_char,
                        "end_char": chunk.end_char,
                    },
                )
                doc_chunks.append(doc_chunk)
                total_tokens += chunk.token_count

            self._chunks[document_id] = doc_chunks

            # Stage 3: Embedding (placeholder for now)
            await self._update_status(document_id, ProcessingStatus.EMBEDDING)
            # TODO: Generate embeddings and store in vector DB

            # Mark as completed
            await self._update_document(
                document_id,
                DocumentUpdate(
                    status=ProcessingStatus.COMPLETED,
                    total_chunks=len(doc_chunks),
                    total_tokens=total_tokens,
                    processed_at=datetime.utcnow(),
                ),
            )

            logger.info(
                f"Document {document_id} processed: "
                f"{len(doc_chunks)} chunks, {total_tokens} tokens"
            )

            return self.get_document(document_id)

        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")
            await self._update_document(
                document_id,
                DocumentUpdate(
                    status=ProcessingStatus.FAILED,
                    error_message=str(e),
                ),
            )
            raise

    def get_document(self, document_id: UUID) -> Optional[Document]:
        """Get a document by ID."""
        return self._documents.get(document_id)

    def get_all_documents(self) -> list[Document]:
        """Get all documents."""
        return list(self._documents.values())

    def get_document_chunks(self, document_id: UUID) -> list[DocumentChunk]:
        """Get all chunks for a document."""
        return self._chunks.get(document_id, [])

    def get_document_text(self, document_id: UUID) -> str:
        """Get full text of a document from its chunks."""
        chunks = self.get_document_chunks(document_id)
        if not chunks:
            return ""

        # Sort by chunk index and join
        sorted_chunks = sorted(chunks, key=lambda c: c.chunk_index)
        return "\n\n".join(chunk.content for chunk in sorted_chunks)

    async def delete_document(self, document_id: UUID) -> bool:
        """
        Delete a document and its associated data.

        Args:
            document_id: ID of document to delete

        Returns:
            True if deleted, False if not found
        """
        document = self._documents.pop(document_id, None)
        if not document:
            return False

        # Remove chunks
        self._chunks.pop(document_id, None)

        # Delete file
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()

        logger.info(f"Deleted document {document_id}")
        return True

    async def _update_status(self, document_id: UUID, status: ProcessingStatus) -> None:
        """Update document processing status."""
        if document_id in self._documents:
            self._documents[document_id].status = status
            self._documents[document_id].updated_at = datetime.utcnow()

    async def _update_document(self, document_id: UUID, update: DocumentUpdate) -> None:
        """Apply updates to a document."""
        if document_id not in self._documents:
            return

        doc = self._documents[document_id]
        update_data = update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(doc, field):
                setattr(doc, field, value)

        doc.updated_at = datetime.utcnow()
