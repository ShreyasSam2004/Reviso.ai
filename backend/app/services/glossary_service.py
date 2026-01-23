"""Service for glossary (key terms) generation."""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from openai import OpenAI

from ..core.config import get_settings
from ..db.database import AsyncSessionLocal
from ..db.repositories import DocumentRepository, ChunkRepository, GlossaryRepository, KeyTermRepository
from ..models.glossary import Glossary, KeyTerm

logger = logging.getLogger(__name__)

GLOSSARY_PROMPT = """Extract {num_terms} key terms and their definitions from the following educational content.

For each term:
- Identify important concepts, technical terms, and key vocabulary
- Provide a clear, concise definition
- Categorize the term by topic/subject area
- Rate importance as "low", "medium", or "high"

Return as a JSON array:
[
  {{
    "term": "Term Name",
    "definition": "Clear definition of the term...",
    "category": "Topic/Subject",
    "importance": "high"
  }}
]

Educational Content:
{content}

Generate exactly {num_terms} key terms. Return ONLY the JSON array."""


class GlossaryService:
    """Service for generating glossaries."""

    def __init__(self):
        self.settings = get_settings()
        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.default_model = self.settings.default_model

    async def generate_glossary(
        self,
        document_id: UUID,
        num_terms: int = 20,
        name: Optional[str] = None,
    ) -> tuple[Glossary, list[KeyTerm]]:
        """Generate a glossary of key terms from a document."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                doc_repo = DocumentRepository(session)
                chunk_repo = ChunkRepository(session)
                glossary_repo = GlossaryRepository(session)
                term_repo = KeyTermRepository(session)

                # Get document
                document = await doc_repo.get_by_id(document_id)
                if not document:
                    raise ValueError(f"Document {document_id} not found")

                if document.status.value != "completed":
                    raise ValueError("Document must be processed before generating glossary")

                # Get chunks
                chunks = await chunk_repo.get_by_document_id(document_id)
                if not chunks:
                    raise ValueError("No content available for this document")

                # Combine content
                content = "\n\n".join(c.content for c in chunks[:15])

                # Generate terms using LLM
                terms_data = await self._generate_terms(content, num_terms)

                # Create glossary
                glossary = Glossary(
                    id=uuid4(),
                    document_id=document_id,
                    name=name or f"Glossary - {document.original_filename}",
                    term_count=len(terms_data),
                    created_at=datetime.utcnow(),
                )
                await glossary_repo.create(glossary)

                # Create terms
                terms = []
                for t_data in terms_data:
                    term = KeyTerm(
                        id=uuid4(),
                        document_id=document_id,
                        term=t_data.get("term", ""),
                        definition=t_data.get("definition", ""),
                        category=t_data.get("category", ""),
                        importance=t_data.get("importance", "medium"),
                        created_at=datetime.utcnow(),
                    )
                    terms.append(term)

                await term_repo.create_many(glossary.id, terms)

                logger.info(f"Generated glossary with {len(terms)} terms for document {document_id}")
                return glossary, terms

    async def _generate_terms(self, content: str, num_terms: int) -> list[dict]:
        """Generate key terms using LLM."""
        prompt = GLOSSARY_PROMPT.format(content=content, num_terms=num_terms)

        try:
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educator creating a glossary of key terms. "
                        "Extract important concepts and provide clear, educational definitions. "
                        "Always return valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=3000,
                temperature=0.3,
            )

            content = response.choices[0].message.content.strip()

            # Handle markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            terms = json.loads(content)

            if not isinstance(terms, list):
                raise ValueError("Expected JSON array")

            return terms

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse glossary JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Glossary generation failed: {e}")
            raise

    async def get_glossary(self, glossary_id: UUID) -> Optional[Glossary]:
        """Get a glossary by ID."""
        async with AsyncSessionLocal() as session:
            repo = GlossaryRepository(session)
            return await repo.get_by_id(glossary_id)

    async def get_glossary_terms(self, glossary_id: UUID) -> list[KeyTerm]:
        """Get all terms for a glossary."""
        async with AsyncSessionLocal() as session:
            repo = KeyTermRepository(session)
            return await repo.get_by_glossary_id(glossary_id)

    async def get_document_glossaries(self, document_id: UUID) -> list[Glossary]:
        """Get all glossaries for a document."""
        async with AsyncSessionLocal() as session:
            repo = GlossaryRepository(session)
            return await repo.get_by_document_id(document_id)

    async def delete_glossary(self, glossary_id: UUID) -> bool:
        """Delete a glossary."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                repo = GlossaryRepository(session)
                return await repo.delete(glossary_id)
