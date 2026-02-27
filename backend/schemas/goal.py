from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from models.goal import GoalStatus, GoalCategory


class MilestoneSchema(BaseModel):
    title: str
    completed: bool = False


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = GoalCategory.PERSONAL.value
    target_date: Optional[datetime] = None
    milestones: List[MilestoneSchema] = Field(default_factory=list)


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    target_date: Optional[datetime] = None
    milestones: Optional[List[MilestoneSchema]] = None


class GoalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    category: str
    status: str
    progress: int
    target_date: Optional[datetime] = None
    milestones: List[dict]
    ai_suggestions: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
