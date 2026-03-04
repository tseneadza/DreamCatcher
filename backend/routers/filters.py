from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.saved_filter import SavedFilter
from schemas.saved_filter import SavedFilterCreate, SavedFilterResponse
from routers.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=SavedFilterResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_filter(
    filter_data: SavedFilterCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    saved_filter = SavedFilter(
        user_id=current_user.id,
        name=filter_data.name,
        entity_type=filter_data.entity_type,
        filter_config=filter_data.filter_config,
    )
    db.add(saved_filter)
    db.commit()
    db.refresh(saved_filter)
    return saved_filter


@router.get("/", response_model=List[SavedFilterResponse])
async def get_saved_filters(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    entity_type: Optional[str] = Query(None),
):
    query = db.query(SavedFilter).filter(SavedFilter.user_id == current_user.id)
    if entity_type:
        query = query.filter(SavedFilter.entity_type == entity_type)
    return query.order_by(SavedFilter.created_at.desc()).all()


@router.delete("/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_filter(
    filter_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    saved_filter = db.query(SavedFilter).filter(
        SavedFilter.id == filter_id,
        SavedFilter.user_id == current_user.id,
    ).first()
    if not saved_filter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved filter not found",
        )
    db.delete(saved_filter)
    db.commit()
    return None
