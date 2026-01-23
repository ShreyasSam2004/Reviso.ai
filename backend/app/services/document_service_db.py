"""Document service with database persistence."""

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..db.repositories import DocumentRepository, ChunkRepository
from ..models.document import (
    Document,
    DocumentChunk,
    ProcessingStatus,
)
from .pdf_processor import PDFProcessor
from .text_chunker import TextChunker

logger = logging.getLogger(__name__)


class DocumentServiceDB:
    """
    Document service with database persistence.

    Orchestrates document processing pipeline with SQLite storage.
    """

    def __init__(
        self,
        session: AsyncSession,
        pdf_processor: Optional[PDFProcessor] = None,
        text_chunker: Optional[TextChunker] = None,
    ):
        self.session = session
        self.settings = get_settings()
        self.pdf_processor = pdf_processor or PDFProcessor()
        self.text_chunker = text_chunker or TextChunker(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
        )
        self.doc_repo = DocumentRepository(session)
        self.chunk_repo = ChunkRepository(session)

        # Ensure upload directory exists
        self.upload_dir = Path(self.settings.upload_directory)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def create_document(
        self,
        file_content: bytes,
        original_filename: str,
    ) -> Document:
        """Create a new document from uploaded file content."""
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

        await self.doc_repo.create(document)
        await self.session.commit()

        logger.info(f"Created document {doc_id}: {original_filename}")
        return document

    async def process_document(self, document_id: UUID) -> Document:
        """Process a document through the full pipeline."""
        document = await self.doc_repo.get_by_id(document_id)
        if not document:
            raise ValueError(f"Document not found: {document_id}")

        try:
            # Stage 1: Extract text from PDF
            await self.doc_repo.update(document_id, status=ProcessingStatus.EXTRACTING)
            await self.session.commit()

            extraction_result = self.pdf_processor.extract(document.file_path)

            # Update document with extraction metadata
            await self.doc_repo.update(
                document_id,
                page_count=extraction_result.total_pages,
                title=extraction_result.metadata.get("title") or None,
                author=extraction_result.metadata.get("author") or None,
                subject=extraction_result.metadata.get("subject") or None,
            )

            # Stage 2: Chunk the extracted text
            await self.doc_repo.update(document_id, status=ProcessingStatus.CHUNKING)
            await self.session.commit()

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

            await self.chunk_repo.create_many(doc_chunks)

            # Stage 3: Embedding (placeholder)
            await self.doc_repo.update(document_id, status=ProcessingStatus.EMBEDDING)
            await self.session.commit()

            # Mark as completed
            await self.doc_repo.update(
                document_id,
                status=ProcessingStatus.COMPLETED,
                total_chunks=len(doc_chunks),
                total_tokens=total_tokens,
                processed_at=datetime.utcnow(),
            )
            await self.session.commit()

            logger.info(
                f"Document {document_id} processed: "
                f"{len(doc_chunks)} chunks, {total_tokens} tokens"
            )

            return await self.doc_repo.get_by_id(document_id)

        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")
            await self.doc_repo.update(
                document_id,
                status=ProcessingStatus.FAILED,
                error_message=str(e),
            )
            await self.session.commit()
            raise

    async def get_document(self, document_id: UUID) -> Optional[Document]:
        """Get a document by ID."""
        return await self.doc_repo.get_by_id(document_id)

    async def get_all_documents(self) -> list[Document]:
        """Get all documents."""
        return await self.doc_repo.get_all()

    async def get_document_chunks(self, document_id: UUID) -> list[DocumentChunk]:
        """Get all chunks for a document."""
        return await self.chunk_repo.get_by_document_id(document_id)

    async def get_document_text(self, document_id: UUID) -> str:
        """Get full text of a document from its chunks."""
        chunks = await self.get_document_chunks(document_id)
        if not chunks:
            return ""

        sorted_chunks = sorted(chunks, key=lambda c: c.chunk_index)
        return "\n\n".join(chunk.content for chunk in sorted_chunks)

    async def delete_document(self, document_id: UUID) -> bool:
        """Delete a document and its associated data."""
        document = await self.doc_repo.get_by_id(document_id)
        if not document:
            return False

        # Delete file
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()

        # Delete from database (cascades to chunks)
        await self.doc_repo.delete(document_id)
        await self.session.commit()

        logger.info(f"Deleted document {document_id}")
        return True
