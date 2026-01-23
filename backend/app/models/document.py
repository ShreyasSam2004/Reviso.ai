"""Document models for PDF storage and processing."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ProcessingStatus(str, Enum):
    """Status of document processing pipeline."""

    PENDING = "pending"
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentChunk(BaseModel):
    """A chunk of text extracted from a document."""

    id: UUID = Field(default_factory=uuid4)
    document_id: UUID
    content: str
    chunk_index: int
    page_numbers: list[int] = Field(default_factory=list)
    token_count: int = 0
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class Document(BaseModel):
    """Represents an uploaded PDF document."""

    id: UUID = Field(default_factory=uuid4)
    filename: str
    original_filename: str
    file_path: str
    file_size_bytes: int
    page_count: int = 0
    status: ProcessingStatus = ProcessingStatus.PENDING
    error_message: Optional[str] = None

    # Extracted metadata
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None

    # Processing info
    total_chunks: int = 0
    total_tokens: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    """Schema for creating a new document record."""

    filename: str
    original_filename: str
    file_path: str
    file_size_bytes: int


class DocumentUpdate(BaseModel):
    """Schema for updating document fields."""

    status: Optional[ProcessingStatus] = None
    error_message: Optional[str] = None
    page_count: Optional[int] = None
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    total_chunks: Optional[int] = None
    total_tokens: Optional[int] = None
    processed_at: Optional[datetime] = None
