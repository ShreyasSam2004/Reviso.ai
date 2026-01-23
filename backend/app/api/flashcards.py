"""Flashcard API routes."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..models.flashcard import (
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    FlashcardDeck,
    FlashcardDeckWithCards,
    Flashcard,
    FlashcardUpdate,
)
from ..services.flashcard_service import FlashcardService

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.post("/generate", response_model=FlashcardGenerateResponse)
async def generate_flashcards(request: FlashcardGenerateRequest):
    """Generate flashcards from a document."""
    service = FlashcardService()

    try:
        deck, flashcards = await service.generate_flashcards(
            document_id=request.document_id,
            num_cards=request.num_cards,
            deck_name=request.deck_name,
        )

        return FlashcardGenerateResponse(
            deck_id=deck.id,
            document_id=deck.document_id,
            name=deck.name,
            card_count=deck.card_count,
            flashcards=flashcards,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")


@router.get("/document/{document_id}", response_model=list[FlashcardDeck])
async def get_document_decks(document_id: UUID):
    """Get all flashcard decks for a document."""
    service = FlashcardService()
    return await service.get_document_decks(document_id)


@router.get("/document/{document_id}/cards", response_model=list[Flashcard])
async def get_document_flashcards(document_id: UUID):
    """Get all flashcards for a document."""
    service = FlashcardService()
    return await service.get_document_flashcards(document_id)


@router.get("/deck/{deck_id}", response_model=FlashcardDeckWithCards)
async def get_deck(deck_id: UUID):
    """Get a flashcard deck with all its cards."""
    service = FlashcardService()

    deck = await service.get_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    flashcards = await service.get_deck_flashcards(deck_id)

    return FlashcardDeckWithCards(
        id=deck.id,
        document_id=deck.document_id,
        name=deck.name,
        card_count=deck.card_count,
        created_at=deck.created_at,
        flashcards=flashcards,
    )


@router.get("/deck/{deck_id}/export/pdf")
async def export_deck_pdf(deck_id: UUID):
    """Export a flashcard deck as a PDF file."""
    service = FlashcardService()

    deck = await service.get_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    flashcards = await service.get_deck_flashcards(deck_id)
    if not flashcards:
        raise HTTPException(status_code=400, detail="No flashcards in deck")

    pdf_bytes = service.export_to_pdf(flashcards, deck.name)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{deck.name}.pdf"'
        }
    )


@router.get("/deck/{deck_id}/export/images")
async def export_deck_images(deck_id: UUID):
    """Export a flashcard deck as a ZIP file of images."""
    service = FlashcardService()

    deck = await service.get_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    flashcards = await service.get_deck_flashcards(deck_id)
    if not flashcards:
        raise HTTPException(status_code=400, detail="No flashcards in deck")

    zip_bytes = service.export_to_images(flashcards)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{deck.name}_images.zip"'
        }
    )


@router.put("/{flashcard_id}", response_model=Flashcard)
async def update_flashcard(flashcard_id: UUID, request: FlashcardUpdate):
    """Update a flashcard."""
    service = FlashcardService()

    flashcard = await service.update_flashcard(
        flashcard_id=flashcard_id,
        question=request.question,
        answer=request.answer,
        difficulty=request.difficulty,
        category=request.category,
    )

    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    return flashcard


@router.delete("/{flashcard_id}")
async def delete_flashcard(flashcard_id: UUID):
    """Delete a flashcard."""
    service = FlashcardService()
    success = await service.delete_flashcard(flashcard_id)

    if not success:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    return {"message": "Flashcard deleted"}


@router.delete("/deck/{deck_id}")
async def delete_deck(deck_id: UUID):
    """Delete a flashcard deck and all its cards."""
    service = FlashcardService()
    success = await service.delete_deck(deck_id)

    if not success:
        raise HTTPException(status_code=404, detail="Deck not found")

    return {"message": "Deck deleted"}
