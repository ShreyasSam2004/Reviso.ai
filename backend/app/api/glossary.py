"""API routes for glossary."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from ..models.glossary import (
    GlossaryGenerateRequest,
    GlossaryGenerateResponse,
    Glossary,
    GlossaryWithTerms,
    KeyTerm,
)
from ..services.glossary_service import GlossaryService

router = APIRouter(prefix="/glossary", tags=["glossary"])


@router.post("/generate", response_model=GlossaryGenerateResponse)
async def generate_glossary(request: GlossaryGenerateRequest):
    """Generate a glossary of key terms from a document."""
    service = GlossaryService()

    try:
        glossary, terms = await service.generate_glossary(
            document_id=request.document_id,
            num_terms=request.num_terms,
            name=request.name,
        )

        return GlossaryGenerateResponse(
            glossary_id=glossary.id,
            document_id=glossary.document_id,
            name=glossary.name,
            term_count=glossary.term_count,
            terms=terms,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate glossary: {str(e)}")


@router.get("/document/{document_id}", response_model=list[Glossary])
async def get_document_glossaries(document_id: UUID):
    """Get all glossaries for a document."""
    service = GlossaryService()
    return await service.get_document_glossaries(document_id)


@router.get("/{glossary_id}", response_model=GlossaryWithTerms)
async def get_glossary(glossary_id: UUID):
    """Get a glossary with all its terms."""
    service = GlossaryService()

    glossary = await service.get_glossary(glossary_id)
    if not glossary:
        raise HTTPException(status_code=404, detail="Glossary not found")

    terms = await service.get_glossary_terms(glossary_id)

    return GlossaryWithTerms(
        id=glossary.id,
        document_id=glossary.document_id,
        name=glossary.name,
        term_count=glossary.term_count,
        created_at=glossary.created_at,
        terms=terms,
    )


@router.delete("/{glossary_id}")
async def delete_glossary(glossary_id: UUID):
    """Delete a glossary."""
    service = GlossaryService()
    success = await service.delete_glossary(glossary_id)

    if not success:
        raise HTTPException(status_code=404, detail="Glossary not found")

    return {"message": "Glossary deleted"}
