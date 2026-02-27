from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.goal import Goal, GoalStatus, GoalCategory
from schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from routers.auth import get_current_user
from services.ai_service import ai_service

router = APIRouter()


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    milestones = [m.model_dump() for m in goal_data.milestones] if goal_data.milestones else []
    
    goal = Goal(
        user_id=current_user.id,
        title=goal_data.title,
        description=goal_data.description,
        category=goal_data.category,
        target_date=goal_data.target_date,
        milestones=milestones
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
):
    query = db.query(Goal).filter(Goal.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Goal.status == status_filter)
    if category:
        query = query.filter(Goal.category == category)
    
    goals = query.order_by(Goal.created_at.desc()).offset(skip).limit(limit).all()
    return goals


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    
    update_data = goal_data.model_dump(exclude_unset=True)
    
    if "milestones" in update_data and update_data["milestones"] is not None:
        update_data["milestones"] = [m if isinstance(m, dict) else m.model_dump() for m in update_data["milestones"]]
    
    for key, value in update_data.items():
        setattr(goal, key, value)
    
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    return None


@router.get("/categories/list", response_model=List[str])
async def get_categories():
    return [c.value for c in GoalCategory]


@router.get("/statuses/list", response_model=List[str])
async def get_statuses():
    return [s.value for s in GoalStatus]


@router.post("/{goal_id}/suggest", response_model=GoalResponse)
async def suggest_goal_steps(
    goal_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    
    suggestions = await ai_service.suggest_goal_steps(
        goal_title=goal.title,
        goal_description=goal.description or "",
        category=goal.category
    )
    
    goal.ai_suggestions = suggestions
    db.commit()
    db.refresh(goal)
    return goal
