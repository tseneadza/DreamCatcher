from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.dream import Dream
from schemas.dream import DreamCreate, DreamUpdate, DreamResponse
from routers.auth import get_current_user
from services.ai_service import ai_service

router = APIRouter()


@router.post("/", response_model=DreamResponse, status_code=status.HTTP_201_CREATED)
async def create_dream(
    dream_data: DreamCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    dream = Dream(
        user_id=current_user.id,
        title=dream_data.title,
        content=dream_data.content,
        mood=dream_data.mood,
        tags=dream_data.tags,
        dream_date=dream_data.dream_date
    )
    db.add(dream)
    db.commit()
    db.refresh(dream)
    return dream


@router.get("/", response_model=List[DreamResponse])
async def get_dreams(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    mood: Optional[int] = Query(None, ge=1, le=5),
):
    query = db.query(Dream).filter(Dream.user_id == current_user.id)
    
    if mood is not None:
        query = query.filter(Dream.mood == mood)
    
    dreams = query.order_by(Dream.dream_date.desc()).offset(skip).limit(limit).all()
    return dreams


@router.get("/{dream_id}", response_model=DreamResponse)
async def get_dream(
    dream_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    dream = db.query(Dream).filter(
        Dream.id == dream_id,
        Dream.user_id == current_user.id
    ).first()
    
    if not dream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dream not found")
    
    return dream


@router.put("/{dream_id}", response_model=DreamResponse)
async def update_dream(
    dream_id: int,
    dream_data: DreamUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    dream = db.query(Dream).filter(
        Dream.id == dream_id,
        Dream.user_id == current_user.id
    ).first()
    
    if not dream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dream not found")
    
    update_data = dream_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dream, key, value)
    
    db.commit()
    db.refresh(dream)
    return dream


@router.delete("/{dream_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dream(
    dream_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    dream = db.query(Dream).filter(
        Dream.id == dream_id,
        Dream.user_id == current_user.id
    ).first()
    
    if not dream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dream not found")
    
    db.delete(dream)
    db.commit()
    return None


@router.post("/{dream_id}/interpret", response_model=DreamResponse)
async def interpret_dream(
    dream_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    dream = db.query(Dream).filter(
        Dream.id == dream_id,
        Dream.user_id == current_user.id
    ).first()
    
    if not dream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dream not found")
    
    interpretation = await ai_service.interpret_dream(
        dream_content=dream.content,
        mood=dream.mood,
        tags=dream.tags or []
    )
    
    dream.ai_interpretation = interpretation
    db.commit()
    db.refresh(dream)
    return dream
