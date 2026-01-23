"""API routes for managing favorites."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..db.models import FavoriteDB

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/favorites", tags=["favorites"])


class Favorite(BaseModel):
    """A favorite item."""
    id: str
    item_type: str  # document, flashcard_deck, test, glossary, practice_session
    item_id: str
    item_name: str
    document_name: Optional[str] = None
    created_at: str


class AddFavoriteRequest(BaseModel):
    """Request to add a favorite."""
    item_type: str
    item_id: str
    item_name: str
    document_name: Optional[str] = None


class FavoriteResponse(BaseModel):
    """Response with favorite info."""
    id: str
    item_type: str
    item_id: str
    item_name: str
    document_name: Optional[str] = None


@router.get("", response_model=list[Favorite])
async def list_favorites(
    item_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all favorites, optionally filtered by type."""
    query = select(FavoriteDB).order_by(FavoriteDB.created_at.desc())

    if item_type:
        query = query.where(FavoriteDB.item_type == item_type)

    result = await db.execute(query)
    favorites = result.scalars().all()

    return [
        Favorite(
            id=f.id,
            item_type=f.item_type,
            item_id=f.item_id,
            item_name=f.item_name,
            document_name=f.document_name,
            created_at=f.created_at.isoformat(),
        )
        for f in favorites
    ]


@router.post("", response_model=FavoriteResponse)
async def add_favorite(
    request: AddFavoriteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add an item to favorites."""
    # Check if already favorited
    result = await db.execute(
        select(FavoriteDB).where(
            FavoriteDB.item_type == request.item_type,
            FavoriteDB.item_id == request.item_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Item already in favorites")

    # Validate item_type
    valid_types = ["document", "flashcard_deck", "test", "glossary", "practice_session"]
    if request.item_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid item_type. Must be one of: {', '.join(valid_types)}"
        )

    # Create favorite
    favorite = FavoriteDB(
        item_type=request.item_type,
        item_id=request.item_id,
        item_name=request.item_name,
        document_name=request.document_name,
    )

    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)

    return FavoriteResponse(
        id=favorite.id,
        item_type=favorite.item_type,
        item_id=favorite.item_id,
        item_name=favorite.item_name,
        document_name=favorite.document_name,
    )


@router.delete("/{favorite_id}")
async def remove_favorite(
    favorite_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove an item from favorites."""
    result = await db.execute(
        select(FavoriteDB).where(FavoriteDB.id == favorite_id)
    )
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    await db.execute(
        delete(FavoriteDB).where(FavoriteDB.id == favorite_id)
    )
    await db.commit()

    return {"message": "Favorite removed successfully"}


@router.delete("/item/{item_type}/{item_id}")
async def remove_favorite_by_item(
    item_type: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a favorite by item type and ID."""
    result = await db.execute(
        select(FavoriteDB).where(
            FavoriteDB.item_type == item_type,
            FavoriteDB.item_id == item_id,
        )
    )
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    await db.execute(
        delete(FavoriteDB).where(
            FavoriteDB.item_type == item_type,
            FavoriteDB.item_id == item_id,
        )
    )
    await db.commit()

    return {"message": "Favorite removed successfully"}


@router.get("/check/{item_type}/{item_id}")
async def check_favorite(
    item_type: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Check if an item is favorited."""
    result = await db.execute(
        select(FavoriteDB).where(
            FavoriteDB.item_type == item_type,
            FavoriteDB.item_id == item_id,
        )
    )
    favorite = result.scalar_one_or_none()

    return {
        "is_favorite": favorite is not None,
        "favorite_id": favorite.id if favorite else None,
    }
