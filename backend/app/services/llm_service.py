"""LLM service for generating summaries using OpenAI."""

import asyncio
import logging
from typing import Optional

from openai import OpenAI

from ..core.config import get_settings
from ..models.summary import SummaryType

logger = logging.getLogger(__name__)


# Prompt templates for different summary types
SUMMARY_PROMPTS = {
    SummaryType.BRIEF: """Provide a brief 2-3 sentence summary of the following educational content.
Focus on the main topic and key takeaway.

Content:
{text}

Brief Summary:""",

    SummaryType.DETAILED: """Provide a comprehensive summary of the following educational content.
Include the main topics, key concepts, important details, and conclusions.
Structure your summary with clear paragraphs.

Content:
{text}

Detailed Summary:""",

    SummaryType.KEY_POINTS: """Extract the key points from the following educational content.
Format as a bulleted list with clear, concise points.
Include the most important concepts, facts, and takeaways.

Content:
{text}

Key Points:""",

    SummaryType.CHAPTER: """Summarize the following educational content section by section.
Identify logical sections or topics and provide a summary for each.
Use headers to organize the summary.

Content:
{text}

Chapter/Section Summary:""",

    SummaryType.CUSTOM: """Summarize the following educational content according to these instructions:
{custom_instructions}

Content:
{text}

Summary:""",
}


class LLMService:
    """Service for generating summaries using OpenAI's API."""

    def __init__(self):
        self.settings = get_settings()
        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.default_model = self.settings.default_model

    async def generate_summary(
        self,
        text: str,
        summary_type: SummaryType = SummaryType.DETAILED,
        custom_instructions: Optional[str] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> dict:
        """
        Generate a summary of the provided text.

        Args:
            text: The text content to summarize
            summary_type: Type of summary to generate
            custom_instructions: Instructions for custom summary type
            max_tokens: Maximum tokens for the response
            model: Model to use (defaults to settings)

        Returns:
            dict with summary content and token usage
        """
        model = model or self.default_model

        # Build the prompt
        prompt_template = SUMMARY_PROMPTS.get(summary_type, SUMMARY_PROMPTS[SummaryType.DETAILED])

        if summary_type == SummaryType.CUSTOM and custom_instructions:
            prompt = prompt_template.format(text=text, custom_instructions=custom_instructions)
        else:
            prompt = prompt_template.format(text=text)

        # Calculate appropriate max tokens if not specified
        if max_tokens is None:
            max_tokens = self._calculate_max_tokens(summary_type)

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educational content summarizer. "
                        "Create clear, accurate, and well-structured summaries that help students learn effectively."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.3,  # Lower temperature for more consistent summaries
            )

            content = response.choices[0].message.content
            usage = response.usage

            logger.info(
                f"Generated {summary_type.value} summary: "
                f"{usage.prompt_tokens} prompt tokens, {usage.completion_tokens} completion tokens"
            )

            return {
                "content": content,
                "model_used": model,
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
            }

        except Exception as e:
            logger.error(f"LLM summarization failed: {e}")
            raise

    async def generate_summary_for_chunks(
        self,
        chunks: list[str],
        summary_type: SummaryType = SummaryType.DETAILED,
        custom_instructions: Optional[str] = None,
    ) -> dict:
        """
        Generate a summary from multiple text chunks.

        Uses a map-reduce approach for large documents:
        1. Summarize each chunk individually
        2. Combine chunk summaries into final summary

        Args:
            chunks: List of text chunks to summarize
            summary_type: Type of summary to generate
            custom_instructions: Instructions for custom summary type

        Returns:
            dict with summary content and token usage
        """
        if len(chunks) == 1:
            return await self.generate_summary(
                chunks[0], summary_type, custom_instructions
            )

        # For multiple chunks, use map-reduce approach with PARALLEL processing
        total_prompt_tokens = 0
        total_completion_tokens = 0

        # Map phase: summarize all chunks in PARALLEL
        logger.info(f"Summarizing {len(chunks)} chunks in parallel...")

        async def summarize_chunk(chunk: str, index: int):
            logger.info(f"Summarizing chunk {index + 1}/{len(chunks)}")
            return await self.generate_summary(chunk, SummaryType.BRIEF)

        # Process all chunks concurrently
        results = await asyncio.gather(
            *[summarize_chunk(chunk, i) for i, chunk in enumerate(chunks)]
        )

        chunk_summaries = []
        for result in results:
            chunk_summaries.append(result["content"])
            total_prompt_tokens += result["prompt_tokens"]
            total_completion_tokens += result["completion_tokens"]

        # Reduce phase: combine chunk summaries
        combined_text = "\n\n---\n\n".join(chunk_summaries)

        final_prompt = f"""The following are summaries of different sections of an educational document.
Combine them into a single coherent {summary_type.value} summary.

Section Summaries:
{combined_text}

Combined Summary:"""

        if summary_type == SummaryType.CUSTOM and custom_instructions:
            final_prompt = f"""The following are summaries of different sections of an educational document.
Combine them according to these instructions: {custom_instructions}

Section Summaries:
{combined_text}

Combined Summary:"""

        final_result = await self._generate_completion(
            final_prompt,
            max_tokens=self._calculate_max_tokens(summary_type),
        )

        return {
            "content": final_result["content"],
            "model_used": final_result["model_used"],
            "prompt_tokens": total_prompt_tokens + final_result["prompt_tokens"],
            "completion_tokens": total_completion_tokens + final_result["completion_tokens"],
            "total_tokens": (
                total_prompt_tokens + total_completion_tokens +
                final_result["prompt_tokens"] + final_result["completion_tokens"]
            ),
        }

    async def generate_completion(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.3,
        model: Optional[str] = None,
    ) -> str:
        """Generate a completion for a prompt (public method)."""
        model = model or self.default_model

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educational content creator."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"LLM completion failed: {e}")
            raise

    async def _generate_completion(
        self,
        prompt: str,
        max_tokens: int = 1000,
        model: Optional[str] = None,
    ) -> dict:
        """Generate a completion for a prompt (internal use)."""
        model = model or self.default_model

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert educational content summarizer."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )

        return {
            "content": response.choices[0].message.content,
            "model_used": model,
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
        }

    def _calculate_max_tokens(self, summary_type: SummaryType) -> int:
        """Calculate appropriate max tokens based on summary type."""
        token_limits = {
            SummaryType.BRIEF: 200,
            SummaryType.DETAILED: 1500,
            SummaryType.KEY_POINTS: 800,
            SummaryType.CHAPTER: 2000,
            SummaryType.CUSTOM: 1000,
        }
        return token_limits.get(summary_type, 1000)

    async def ask_question(
        self,
        question: str,
        context: str,
        model: Optional[str] = None,
    ) -> dict:
        """
        Answer a question about the document content.

        Args:
            question: User's question
            context: Relevant document content
            model: Model to use

        Returns:
            dict with answer and token usage
        """
        model = model or self.default_model

        prompt = f"""Based on the following educational content, answer the question.
If the answer cannot be found in the content, say so.

Content:
{context}

Question: {question}

Answer:"""

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful educational assistant. "
                        "Answer questions accurately based on the provided content."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.2,
            )

            return {
                "answer": response.choices[0].message.content,
                "model_used": model,
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }

        except Exception as e:
            logger.error(f"Question answering failed: {e}")
            raise
