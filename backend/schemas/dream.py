from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class DreamCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    mood: int = Field(default=3, ge=1, le=5)
    tags: List[str] = Field(default_factory=list)
    dream_date: Optional[datetime] = None


class DreamUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    mood: Optional[int] = Field(None, ge=1, le=5)
    tags: Optional[List[str]] = None
    dream_date: Optional[datetime] = None


class DreamResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    mood: int
    tags: List[str]
    ai_interpretation: Optional[str] = None
    dream_date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
