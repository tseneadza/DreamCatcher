from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class IdeaCreate(BaseModel):
    content: str = Field(..., min_length=1)
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    priority: int = Field(default=2, ge=1, le=3)


class IdeaUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    priority: Optional[int] = Field(None, ge=1, le=3)


class IdeaResponse(BaseModel):
    id: int
    user_id: int
    content: str
    category: Optional[str] = None
    tags: List[str]
    priority: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
