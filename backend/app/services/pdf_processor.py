"""PDF processing service for text extraction."""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from pypdf import PdfReader

logger = logging.getLogger(__name__)


@dataclass
class ExtractedPage:
    """Represents extracted content from a single PDF page."""

    page_number: int  # 1-indexed
    text: str
    word_count: int


@dataclass
class ExtractionResult:
    """Result of PDF text extraction."""

    pages: list[ExtractedPage]
    total_pages: int
    total_words: int
    metadata: dict

    @property
    def full_text(self) -> str:
        """Get concatenated text from all pages."""
        return "\n\n".join(page.text for page in self.pages)


class PDFProcessor:
    """Extracts text and metadata from PDF documents using pypdf."""

    def __init__(self):
        self._supported_extensions = {".pdf"}

    def validate_file(self, file_path: Path) -> bool:
        """Check if file exists and is a valid PDF."""
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if file_path.suffix.lower() not in self._supported_extensions:
            raise ValueError(f"Unsupported file type: {file_path.suffix}")

        return True

    def extract(self, file_path: Path | str) -> ExtractionResult:
        """
        Extract text and metadata from a PDF file.

        Args:
            file_path: Path to the PDF file

        Returns:
            ExtractionResult containing pages, metadata, and statistics

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a PDF or is corrupted
        """
        file_path = Path(file_path)
        self.validate_file(file_path)

        try:
            reader = PdfReader(file_path)
        except Exception as e:
            raise ValueError(f"Failed to open PDF: {e}") from e

        pages = []
        total_words = 0

        for page_num, page in enumerate(reader.pages):
            text = self._extract_page_text(page)
            word_count = len(text.split())
            total_words += word_count

            pages.append(
                ExtractedPage(
                    page_number=page_num + 1,  # 1-indexed
                    text=text,
                    word_count=word_count,
                )
            )

        metadata = self._extract_metadata(reader)

        return ExtractionResult(
            pages=pages,
            total_pages=len(reader.pages),
            total_words=total_words,
            metadata=metadata,
        )

    def _extract_page_text(self, page) -> str:
        """Extract and clean text from a single page."""
        try:
            text = page.extract_text() or ""
        except Exception as e:
            logger.warning(f"Failed to extract text from page: {e}")
            text = ""

        return self._clean_text(text)

    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        lines = text.split("\n")
        cleaned_lines = []

        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)

        result = "\n".join(cleaned_lines)

        while "  " in result:
            result = result.replace("  ", " ")

        return result.strip()

    def _extract_metadata(self, reader: PdfReader) -> dict:
        """Extract document metadata."""
        metadata = reader.metadata or {}

        return {
            "title": metadata.get("/Title", "") if metadata else "",
            "author": metadata.get("/Author", "") if metadata else "",
            "subject": metadata.get("/Subject", "") if metadata else "",
            "creator": metadata.get("/Creator", "") if metadata else "",
            "producer": metadata.get("/Producer", "") if metadata else "",
            "creation_date": str(metadata.get("/CreationDate", "")) if metadata else "",
            "modification_date": str(metadata.get("/ModDate", "")) if metadata else "",
        }

    def get_page_count(self, file_path: Path | str) -> int:
        """Get the number of pages without full extraction."""
        file_path = Path(file_path)
        self.validate_file(file_path)

        reader = PdfReader(file_path)
        return len(reader.pages)

    def extract_pages(
        self, file_path: Path | str, start_page: int, end_page: Optional[int] = None
    ) -> ExtractionResult:
        """
        Extract text from a specific page range.

        Args:
            file_path: Path to PDF
            start_page: Starting page (1-indexed)
            end_page: Ending page (1-indexed, inclusive). None = to end

        Returns:
            ExtractionResult for the specified range
        """
        file_path = Path(file_path)
        self.validate_file(file_path)

        reader = PdfReader(file_path)
        total_pages = len(reader.pages)

        start_idx = max(0, start_page - 1)
        end_idx = min(total_pages, end_page) if end_page else total_pages

        if start_idx >= total_pages:
            raise ValueError(f"Start page {start_page} exceeds document length {total_pages}")

        pages = []
        total_words = 0

        for page_num in range(start_idx, end_idx):
            page = reader.pages[page_num]
            text = self._extract_page_text(page)
            word_count = len(text.split())
            total_words += word_count

            pages.append(
                ExtractedPage(
                    page_number=page_num + 1,
                    text=text,
                    word_count=word_count,
                )
            )

        return ExtractionResult(
            pages=pages,
            total_pages=end_idx - start_idx,
            total_words=total_words,
            metadata=self._extract_metadata(reader),
        )
