"""Flashcard generation service."""

import io
import json
import logging
import zipfile
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from ..core.config import get_settings
from ..db.database import AsyncSessionLocal
from ..db.repositories import DocumentRepository, ChunkRepository, FlashcardRepository, FlashcardDeckRepository
from ..models.flashcard import Flashcard, FlashcardDeck, Difficulty

logger = logging.getLogger(__name__)

FLASHCARD_PROMPT = """Generate {num_cards} flashcards from the following educational content.
Each flashcard should have:
- A clear question that tests understanding of a key concept
- A concise but complete answer
- A difficulty level (easy, medium, hard)
- A category/topic

Return the flashcards as a JSON array with this exact format:
[
  {{
    "question": "What is...?",
    "answer": "The answer is...",
    "difficulty": "medium",
    "category": "Topic Name"
  }}
]

Educational Content:
{content}

Generate exactly {num_cards} flashcards. Return ONLY the JSON array, no other text."""


class FlashcardService:
    """Service for generating and managing flashcards."""

    def __init__(self):
        self.settings = get_settings()
        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.default_model = self.settings.default_model

    async def generate_flashcards(
        self,
        document_id: UUID,
        num_cards: int = 10,
        deck_name: Optional[str] = None,
    ) -> tuple[FlashcardDeck, list[Flashcard]]:
        """
        Generate flashcards from a document.

        Args:
            document_id: ID of the document to generate flashcards from
            num_cards: Number of flashcards to generate
            deck_name: Optional name for the deck

        Returns:
            Tuple of (FlashcardDeck, list[Flashcard])
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                doc_repo = DocumentRepository(session)
                chunk_repo = ChunkRepository(session)
                deck_repo = FlashcardDeckRepository(session)
                card_repo = FlashcardRepository(session)

                # Get document
                document = await doc_repo.get_by_id(document_id)
                if not document:
                    raise ValueError(f"Document {document_id} not found")

                if document.status.value != "completed":
                    raise ValueError(f"Document must be processed before generating flashcards")

                # Get document chunks for content
                chunks = await chunk_repo.get_by_document_id(document_id)
                if not chunks:
                    raise ValueError("No content available for this document")

                # Combine chunk content (limit to avoid token limits)
                content = "\n\n".join(c.content for c in chunks[:10])

                # Generate flashcards using LLM
                cards_data = await self._generate_flashcards_llm(content, num_cards)

                # Create deck
                deck = FlashcardDeck(
                    id=uuid4(),
                    document_id=document_id,
                    name=deck_name or f"Flashcards - {document.original_filename}",
                    card_count=len(cards_data),
                    created_at=datetime.utcnow(),
                )
                await deck_repo.create(deck)

                # Create flashcards
                flashcards = []
                for card_data in cards_data:
                    difficulty = Difficulty.MEDIUM
                    if card_data.get("difficulty") in ["easy", "medium", "hard"]:
                        difficulty = Difficulty(card_data["difficulty"])

                    card = Flashcard(
                        id=uuid4(),
                        deck_id=deck.id,
                        document_id=document_id,
                        question=card_data.get("question", ""),
                        answer=card_data.get("answer", ""),
                        difficulty=difficulty,
                        category=card_data.get("category", ""),
                        created_at=datetime.utcnow(),
                    )
                    flashcards.append(card)

                await card_repo.create_many(flashcards)

                logger.info(f"Generated {len(flashcards)} flashcards for document {document_id}")
                return deck, flashcards

    async def _generate_flashcards_llm(self, content: str, num_cards: int) -> list[dict]:
        """Generate flashcard data using LLM."""
        prompt = FLASHCARD_PROMPT.format(content=content, num_cards=num_cards)

        try:
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educator creating study flashcards. "
                        "Generate clear, educational flashcards that help students learn and retain information. "
                        "Always return valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.5,
            )

            content = response.choices[0].message.content.strip()

            # Try to parse JSON
            # Handle potential markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            cards = json.loads(content)

            if not isinstance(cards, list):
                raise ValueError("Expected JSON array")

            return cards

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse flashcard JSON: {e}")
            # Return a default card if parsing fails
            return [
                {
                    "question": "What is the main topic of this document?",
                    "answer": "Please review the document content for details.",
                    "difficulty": "medium",
                    "category": "General"
                }
            ]
        except Exception as e:
            logger.error(f"Flashcard generation failed: {e}")
            raise

    async def get_deck(self, deck_id: UUID) -> Optional[FlashcardDeck]:
        """Get a flashcard deck by ID."""
        async with AsyncSessionLocal() as session:
            repo = FlashcardDeckRepository(session)
            return await repo.get_by_id(deck_id)

    async def get_deck_flashcards(self, deck_id: UUID) -> list[Flashcard]:
        """Get all flashcards for a deck."""
        async with AsyncSessionLocal() as session:
            repo = FlashcardRepository(session)
            return await repo.get_by_deck_id(deck_id)

    async def get_document_decks(self, document_id: UUID) -> list[FlashcardDeck]:
        """Get all flashcard decks for a document."""
        async with AsyncSessionLocal() as session:
            repo = FlashcardDeckRepository(session)
            return await repo.get_by_document_id(document_id)

    async def get_document_flashcards(self, document_id: UUID) -> list[Flashcard]:
        """Get all flashcards for a document."""
        async with AsyncSessionLocal() as session:
            repo = FlashcardRepository(session)
            return await repo.get_by_document_id(document_id)

    async def update_flashcard(
        self,
        flashcard_id: UUID,
        question: Optional[str] = None,
        answer: Optional[str] = None,
        difficulty: Optional[Difficulty] = None,
        category: Optional[str] = None,
    ) -> Optional[Flashcard]:
        """Update a flashcard."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                repo = FlashcardRepository(session)
                updates = {}
                if question is not None:
                    updates["question"] = question
                if answer is not None:
                    updates["answer"] = answer
                if difficulty is not None:
                    updates["difficulty"] = difficulty
                if category is not None:
                    updates["category"] = category

                return await repo.update(flashcard_id, **updates)

    async def delete_flashcard(self, flashcard_id: UUID) -> bool:
        """Delete a flashcard."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                repo = FlashcardRepository(session)
                return await repo.delete(flashcard_id)

    async def delete_deck(self, deck_id: UUID) -> bool:
        """Delete a flashcard deck and all its cards."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                repo = FlashcardDeckRepository(session)
                return await repo.delete(deck_id)

    def export_to_pdf(self, flashcards: list[Flashcard], deck_name: str) -> bytes:
        """Export flashcards to a PDF file."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=1,  # Center
        )
        question_style = ParagraphStyle(
            'Question',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=8,
            fontName='Helvetica-Bold',
        )
        answer_style = ParagraphStyle(
            'Answer',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=20,
            leftIndent=20,
        )
        difficulty_style = ParagraphStyle(
            'Difficulty',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.gray,
        )

        story = []

        # Title
        story.append(Paragraph(deck_name, title_style))
        story.append(Spacer(1, 20))

        # Flashcards
        for i, card in enumerate(flashcards, 1):
            # Card number and difficulty
            difficulty_color = {
                Difficulty.EASY: colors.green,
                Difficulty.MEDIUM: colors.orange,
                Difficulty.HARD: colors.red,
            }.get(card.difficulty, colors.gray)

            header = f"Card {i} | {card.category or 'General'} | "
            story.append(Paragraph(header, difficulty_style))

            # Difficulty badge
            diff_text = f"<font color='{difficulty_color.hexval()}'>{card.difficulty.value.upper()}</font>"
            story.append(Paragraph(diff_text, difficulty_style))
            story.append(Spacer(1, 5))

            # Question
            story.append(Paragraph(f"Q: {card.question}", question_style))

            # Answer
            story.append(Paragraph(f"A: {card.answer}", answer_style))

            # Separator line
            if i < len(flashcards):
                story.append(Spacer(1, 10))
                line_data = [['', '']]
                line_table = Table(line_data, colWidths=[6.5*inch, 0])
                line_table.setStyle(TableStyle([
                    ('LINEBELOW', (0, 0), (0, 0), 1, colors.lightgrey),
                ]))
                story.append(line_table)
                story.append(Spacer(1, 10))

        doc.build(story)
        buffer.seek(0)
        return buffer.read()

    def export_to_images(self, flashcards: list[Flashcard]) -> bytes:
        """Export flashcards to a ZIP file of PNG images."""
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, card in enumerate(flashcards, 1):
                # Create front (question) image
                front_img = self._create_card_image(
                    f"Q{i}: {card.question}",
                    card.difficulty,
                    card.category,
                    is_front=True
                )
                front_buffer = io.BytesIO()
                front_img.save(front_buffer, format='PNG')
                zipf.writestr(f"card_{i:02d}_front.png", front_buffer.getvalue())

                # Create back (answer) image
                back_img = self._create_card_image(
                    card.answer,
                    card.difficulty,
                    card.category,
                    is_front=False
                )
                back_buffer = io.BytesIO()
                back_img.save(back_buffer, format='PNG')
                zipf.writestr(f"card_{i:02d}_back.png", back_buffer.getvalue())

        buffer.seek(0)
        return buffer.read()

    def _create_card_image(
        self,
        text: str,
        difficulty: Difficulty,
        category: str,
        is_front: bool = True,
    ) -> Image.Image:
        """Create a single flashcard image."""
        # Card dimensions
        width, height = 600, 400
        padding = 30

        # Colors
        bg_color = (255, 255, 255) if is_front else (240, 248, 255)
        difficulty_colors = {
            Difficulty.EASY: (76, 175, 80),      # Green
            Difficulty.MEDIUM: (255, 152, 0),    # Orange
            Difficulty.HARD: (244, 67, 54),      # Red
        }
        diff_color = difficulty_colors.get(difficulty, (128, 128, 128))

        # Create image
        img = Image.new('RGB', (width, height), bg_color)
        draw = ImageDraw.Draw(img)

        # Draw border
        border_color = diff_color
        draw.rectangle([0, 0, width-1, height-1], outline=border_color, width=3)

        # Draw header bar
        header_height = 40
        draw.rectangle([0, 0, width, header_height], fill=diff_color)

        # Header text
        try:
            font = ImageFont.truetype("arial.ttf", 14)
            font_large = ImageFont.truetype("arial.ttf", 18)
        except:
            font = ImageFont.load_default()
            font_large = font

        header_text = f"{category or 'General'} | {difficulty.value.upper()}"
        draw.text((padding, 10), header_text, fill=(255, 255, 255), font=font)

        # Side indicator
        side_text = "QUESTION" if is_front else "ANSWER"
        draw.text((width - 100, 10), side_text, fill=(255, 255, 255), font=font)

        # Main text
        text_area_top = header_height + padding
        text_area_width = width - 2 * padding

        # Wrap text
        words = text.split()
        lines = []
        current_line = ""

        for word in words:
            test_line = f"{current_line} {word}".strip()
            bbox = draw.textbbox((0, 0), test_line, font=font_large)
            if bbox[2] - bbox[0] <= text_area_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word

        if current_line:
            lines.append(current_line)

        # Draw text
        y = text_area_top + 20
        line_height = 28
        for line in lines[:10]:  # Limit to 10 lines
            draw.text((padding, y), line, fill=(33, 33, 33), font=font_large)
            y += line_height

        if len(lines) > 10:
            draw.text((padding, y), "...", fill=(128, 128, 128), font=font)

        return img
