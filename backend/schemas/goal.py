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
    priority: int = Field(default=3, ge=1, le=5)
    notes: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    target_date: Optional[datetime] = None
    milestones: Optional[List[MilestoneSchema]] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class GoalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    category: str
    status: str
    progress: int
    priority: int = 3
    notes: Optional[str] = None
    target_date: Optional[datetime] = None
    milestones: List[dict]
    ai_suggestions: Optional[str] = None
    dream_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class GoalDetailResponse(GoalResponse):
    linked_dreams: List["DreamResponse"] = []


from schemas.dream import DreamResponse
GoalDetailResponse.model_rebuild()
