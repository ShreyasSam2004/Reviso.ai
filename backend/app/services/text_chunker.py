"""Text chunking service for splitting documents into processable segments."""

import logging
import re
from dataclasses import dataclass
from typing import Optional

import tiktoken

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """A chunk of text with metadata."""

    content: str
    chunk_index: int
    start_char: int
    end_char: int
    token_count: int
    page_numbers: list[int]


class TextChunker:
    """
    Splits text into overlapping chunks suitable for embedding and LLM processing.

    Uses semantic-aware splitting that respects sentence and paragraph boundaries.
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        encoding_name: str = "cl100k_base",
    ):
        """
        Initialize the chunker.

        Args:
            chunk_size: Target size for each chunk in tokens
            chunk_overlap: Number of overlapping tokens between chunks
            encoding_name: Tiktoken encoding to use for token counting
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        try:
            self.encoding = tiktoken.get_encoding(encoding_name)
        except Exception:
            # Fallback to cl100k_base if specified encoding not found
            self.encoding = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))

    def chunk_text(
        self,
        text: str,
        page_boundaries: Optional[dict[int, int]] = None,
    ) -> list[Chunk]:
        """
        Split text into overlapping chunks.

        Args:
            text: The full text to chunk
            page_boundaries: Optional dict mapping char positions to page numbers

        Returns:
            List of Chunk objects
        """
        if not text.strip():
            return []

        # Split into sentences first
        sentences = self._split_into_sentences(text)

        chunks = []
        current_chunk_sentences = []
        current_tokens = 0
        chunk_start_char = 0
        char_position = 0

        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)

            # If single sentence exceeds chunk size, split it further
            if sentence_tokens > self.chunk_size:
                # Flush current chunk first
                if current_chunk_sentences:
                    chunk = self._create_chunk(
                        sentences=current_chunk_sentences,
                        chunk_index=len(chunks),
                        start_char=chunk_start_char,
                        page_boundaries=page_boundaries,
                    )
                    chunks.append(chunk)
                    current_chunk_sentences = []
                    current_tokens = 0

                # Split long sentence into smaller pieces
                sub_chunks = self._split_long_text(sentence, chunk_start_char, page_boundaries)
                for sub_chunk in sub_chunks:
                    sub_chunk.chunk_index = len(chunks)
                    chunks.append(sub_chunk)

                char_position += len(sentence)
                chunk_start_char = char_position
                continue

            # Check if adding this sentence would exceed chunk size
            if current_tokens + sentence_tokens > self.chunk_size and current_chunk_sentences:
                # Create chunk from accumulated sentences
                chunk = self._create_chunk(
                    sentences=current_chunk_sentences,
                    chunk_index=len(chunks),
                    start_char=chunk_start_char,
                    page_boundaries=page_boundaries,
                )
                chunks.append(chunk)

                # Start new chunk with overlap
                overlap_sentences, overlap_tokens = self._get_overlap_sentences(
                    current_chunk_sentences
                )
                current_chunk_sentences = overlap_sentences
                current_tokens = overlap_tokens
                chunk_start_char = char_position - sum(len(s) for s in overlap_sentences)

            current_chunk_sentences.append(sentence)
            current_tokens += sentence_tokens
            char_position += len(sentence)

        # Don't forget the last chunk
        if current_chunk_sentences:
            chunk = self._create_chunk(
                sentences=current_chunk_sentences,
                chunk_index=len(chunks),
                start_char=chunk_start_char,
                page_boundaries=page_boundaries,
            )
            chunks.append(chunk)

        return chunks

    def _split_into_sentences(self, text: str) -> list[str]:
        """Split text into sentences while preserving spacing."""
        # Pattern matches sentence endings followed by space or newline
        pattern = r"(?<=[.!?])\s+"
        sentences = re.split(pattern, text)

        # Filter empty strings and restore spacing
        result = []
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if sentence:
                # Add space back except for last sentence
                if i < len(sentences) - 1:
                    sentence += " "
                result.append(sentence)

        return result

    def _create_chunk(
        self,
        sentences: list[str],
        chunk_index: int,
        start_char: int,
        page_boundaries: Optional[dict[int, int]] = None,
    ) -> Chunk:
        """Create a Chunk object from sentences."""
        content = "".join(sentences).strip()
        end_char = start_char + len(content)

        # Determine which pages this chunk spans
        page_numbers = self._get_pages_for_range(start_char, end_char, page_boundaries)

        return Chunk(
            content=content,
            chunk_index=chunk_index,
            start_char=start_char,
            end_char=end_char,
            token_count=self.count_tokens(content),
            page_numbers=page_numbers,
        )

    def _get_overlap_sentences(self, sentences: list[str]) -> tuple[list[str], int]:
        """Get sentences for overlap from the end of current chunk."""
        overlap_sentences = []
        overlap_tokens = 0

        for sentence in reversed(sentences):
            sentence_tokens = self.count_tokens(sentence)
            if overlap_tokens + sentence_tokens > self.chunk_overlap:
                break
            overlap_sentences.insert(0, sentence)
            overlap_tokens += sentence_tokens

        return overlap_sentences, overlap_tokens

    def _split_long_text(
        self,
        text: str,
        start_char: int,
        page_boundaries: Optional[dict[int, int]] = None,
    ) -> list[Chunk]:
        """Split text that's too long for a single chunk by words."""
        words = text.split()
        chunks = []
        current_words = []
        current_tokens = 0
        word_start = start_char

        for word in words:
            word_tokens = self.count_tokens(word + " ")

            if current_tokens + word_tokens > self.chunk_size and current_words:
                content = " ".join(current_words)
                end_char = word_start + len(content)
                page_numbers = self._get_pages_for_range(word_start, end_char, page_boundaries)

                chunks.append(
                    Chunk(
                        content=content,
                        chunk_index=len(chunks),
                        start_char=word_start,
                        end_char=end_char,
                        token_count=current_tokens,
                        page_numbers=page_numbers,
                    )
                )

                # Overlap by keeping last few words
                overlap_words = current_words[-3:] if len(current_words) > 3 else []
                current_words = overlap_words
                current_tokens = self.count_tokens(" ".join(overlap_words))
                word_start = end_char - len(" ".join(overlap_words))

            current_words.append(word)
            current_tokens += word_tokens

        # Last chunk
        if current_words:
            content = " ".join(current_words)
            end_char = word_start + len(content)
            page_numbers = self._get_pages_for_range(word_start, end_char, page_boundaries)

            chunks.append(
                Chunk(
                    content=content,
                    chunk_index=len(chunks),
                    start_char=word_start,
                    end_char=end_char,
                    token_count=self.count_tokens(content),
                    page_numbers=page_numbers,
                )
            )

        return chunks

    def _get_pages_for_range(
        self,
        start_char: int,
        end_char: int,
        page_boundaries: Optional[dict[int, int]] = None,
    ) -> list[int]:
        """Determine which pages a character range spans."""
        if not page_boundaries:
            return []

        pages = set()
        sorted_boundaries = sorted(page_boundaries.items())

        for char_pos, page_num in sorted_boundaries:
            if char_pos <= end_char:
                if char_pos >= start_char or (pages and max(pages) == page_num - 1):
                    pages.add(page_num)
            if char_pos > end_char:
                break

        return sorted(pages) if pages else []

    def chunk_by_pages(
        self,
        pages: list[tuple[int, str]],
    ) -> list[Chunk]:
        """
        Chunk text while tracking page boundaries.

        Args:
            pages: List of (page_number, page_text) tuples

        Returns:
            List of chunks with accurate page number tracking
        """
        # Build full text and page boundary map
        full_text_parts = []
        page_boundaries = {}
        current_pos = 0

        for page_num, page_text in pages:
            page_boundaries[current_pos] = page_num
            full_text_parts.append(page_text)
            current_pos += len(page_text) + 2  # +2 for "\n\n" separator

        full_text = "\n\n".join(full_text_parts)

        return self.chunk_text(full_text, page_boundaries)
