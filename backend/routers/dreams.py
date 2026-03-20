import logging
from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, String

from database import get_db
from models.user import User
from models.dream import Dream
from models.goal import Goal
from models.research_consent import ResearchConsent
from schemas.dream import DreamCreate, DreamUpdate, DreamResponse
from routers.auth import get_current_user
from services.ai_service import ai_service
from services.research_extraction import extract_research_event

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=DreamResponse, status_code=status.HTTP_201_CREATED)
async def create_dream(
    dream_data: DreamCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    if dream_data.goal_id is not None:
        goal = db.query(Goal).filter(
            Goal.id == dream_data.goal_id,
            Goal.user_id == current_user.id
        ).first()
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found or does not belong to you"
            )

    dream = Dream(
        user_id=current_user.id,
        title=dream_data.title,
        content=dream_data.content,
        mood=dream_data.mood,
        tags=dream_data.tags,
        dream_date=dream_data.dream_date,
        lucidity_level=dream_data.lucidity_level,
        emotions=dream_data.emotions,
        characters=dream_data.characters,
        locations=dream_data.locations,
        is_recurring=dream_data.is_recurring,
        recurring_theme=dream_data.recurring_theme,
        vividness=dream_data.vividness,
        dream_type=dream_data.dream_type,
        goal_id=dream_data.goal_id,
    )
    db.add(dream)
    db.commit()
    db.refresh(dream)

    try:
        consent = (
            db.query(ResearchConsent)
            .filter(
                ResearchConsent.user_id == current_user.id,
                ResearchConsent.status == "active",
            )
            .first()
        )
        if consent:
            extract_research_event(dream, current_user, consent, db)
    except Exception:
        logger.exception("Research extraction failed for dream %s", dream.id)

    return dream


@router.get("/tags")
async def get_tags(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    dreams = db.query(Dream).filter(Dream.user_id == current_user.id).all()

    all_tags: set[str] = set()
    all_emotions: set[str] = set()
    all_characters: set[str] = set()
    all_locations: set[str] = set()

    for dream in dreams:
        if dream.tags:
            all_tags.update(dream.tags)
        if dream.emotions:
            all_emotions.update(dream.emotions)
        if dream.characters:
            all_characters.update(dream.characters)
        if dream.locations:
            all_locations.update(dream.locations)

    return {
        "tags": sorted(all_tags),
        "emotions": sorted(all_emotions),
        "characters": sorted(all_characters),
        "locations": sorted(all_locations),
    }


@router.get("/recurring", response_model=List[DreamResponse])
async def get_recurring_dreams(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    dreams = (
        db.query(Dream)
        .filter(Dream.user_id == current_user.id, Dream.is_recurring == True)
        .order_by(Dream.dream_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return dreams


@router.get("/", response_model=List[DreamResponse])
async def get_dreams(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    mood: Optional[int] = Query(None, ge=1, le=5),
    dream_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    tag: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, pattern="^(date|mood|vividness)$"),
    sort_order: Optional[str] = Query(None, pattern="^(asc|desc)$"),
):
    query = db.query(Dream).filter(Dream.user_id == current_user.id)
    
    if mood is not None:
        query = query.filter(Dream.mood == mood)
    if dream_type is not None:
        query = query.filter(Dream.dream_type == dream_type)
    if date_from is not None:
        query = query.filter(Dream.dream_date >= date_from)
    if date_to is not None:
        query = query.filter(Dream.dream_date <= date_to)
    if tag is not None:
        query = query.filter(cast(Dream.tags, String).contains(tag))
    if q is not None:
        search_term = f"%{q}%"
        query = query.filter(
            (Dream.title.like(search_term)) | (Dream.content.like(search_term))
        )

    sort_col_map = {"date": Dream.dream_date, "mood": Dream.mood, "vividness": Dream.vividness}
    sort_col = sort_col_map.get(sort_by or "date", Dream.dream_date)
    order = sort_col.asc() if sort_order == "asc" else sort_col.desc()

    dreams = query.order_by(order).offset(skip).limit(limit).all()
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
