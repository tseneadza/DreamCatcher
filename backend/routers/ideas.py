from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.idea import Idea
from schemas.idea import IdeaCreate, IdeaUpdate, IdeaResponse
from routers.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_idea(
    idea_data: IdeaCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    idea = Idea(
        user_id=current_user.id,
        content=idea_data.content,
        category=idea_data.category,
        tags=idea_data.tags,
        priority=idea_data.priority
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return idea


@router.get("/", response_model=List[IdeaResponse])
async def get_ideas(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
    priority: Optional[int] = Query(None, ge=1, le=3),
):
    query = db.query(Idea).filter(Idea.user_id == current_user.id)
    
    if category:
        query = query.filter(Idea.category == category)
    if priority is not None:
        query = query.filter(Idea.priority == priority)
    
    ideas = query.order_by(Idea.created_at.desc()).offset(skip).limit(limit).all()
    return ideas


@router.get("/{idea_id}", response_model=IdeaResponse)
async def get_idea(
    idea_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(
        Idea.id == idea_id,
        Idea.user_id == current_user.id
    ).first()
    
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    
    return idea


@router.put("/{idea_id}", response_model=IdeaResponse)
async def update_idea(
    idea_id: int,
    idea_data: IdeaUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(
        Idea.id == idea_id,
        Idea.user_id == current_user.id
    ).first()
    
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    
    update_data = idea_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(idea, key, value)
    
    db.commit()
    db.refresh(idea)
    return idea


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(
        Idea.id == idea_id,
        Idea.user_id == current_user.id
    ).first()
    
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    
    db.delete(idea)
    db.commit()
    return None
