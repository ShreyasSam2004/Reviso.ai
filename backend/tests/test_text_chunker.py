"""Tests for text chunking service."""

import pytest

from app.services.text_chunker import TextChunker


class TestTextChunker:
    """Test suite for TextChunker."""

    def setup_method(self):
        """Set up test fixtures."""
        self.chunker = TextChunker(chunk_size=100, chunk_overlap=20)

    def test_count_tokens(self):
        """Test token counting."""
        text = "Hello world, this is a test."
        count = self.chunker.count_tokens(text)
        assert count > 0
        assert isinstance(count, int)

    def test_chunk_empty_text(self):
        """Test chunking empty text returns empty list."""
        chunks = self.chunker.chunk_text("")
        assert chunks == []

        chunks = self.chunker.chunk_text("   ")
        assert chunks == []

    def test_chunk_short_text(self):
        """Test short text that fits in one chunk."""
        text = "This is a short sentence."
        chunks = self.chunker.chunk_text(text)

        assert len(chunks) == 1
        assert chunks[0].content == text
        assert chunks[0].chunk_index == 0

    def test_chunk_long_text(self):
        """Test longer text gets split into multiple chunks."""
        # Create text that will exceed chunk size
        sentences = ["This is sentence number {}.".format(i) for i in range(50)]
        text = " ".join(sentences)

        chunks = self.chunker.chunk_text(text)

        assert len(chunks) > 1
        # Verify sequential indexing
        for i, chunk in enumerate(chunks):
            assert chunk.chunk_index == i
            assert chunk.content
            assert chunk.token_count > 0

    def test_chunk_overlap(self):
        """Test that chunks have overlapping content."""
        # Create text that will need multiple chunks
        sentences = ["Sentence {} has some content.".format(i) for i in range(30)]
        text = " ".join(sentences)

        chunker = TextChunker(chunk_size=50, chunk_overlap=10)
        chunks = chunker.chunk_text(text)

        if len(chunks) > 1:
            # Check that consecutive chunks share some words
            first_words = set(chunks[0].content.split())
            second_words = set(chunks[1].content.split())
            overlap = first_words & second_words
            assert len(overlap) > 0, "Chunks should have overlapping content"

    def test_chunk_by_pages(self):
        """Test chunking with page boundaries."""
        pages = [
            (1, "This is content from page one."),
            (2, "This is content from page two."),
            (3, "This is content from page three."),
        ]

        chunks = self.chunker.chunk_by_pages(pages)

        assert len(chunks) >= 1
        # All chunks should have page numbers
        for chunk in chunks:
            assert isinstance(chunk.page_numbers, list)

    def test_chunk_preserves_text(self):
        """Test that chunking preserves all text content."""
        text = "First sentence. Second sentence. Third sentence."
        chunks = self.chunker.chunk_text(text)

        # All original words should appear in at least one chunk
        original_words = set(text.replace(".", "").split())
        chunk_words = set()
        for chunk in chunks:
            chunk_words.update(chunk.content.replace(".", "").split())

        assert original_words <= chunk_words


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
