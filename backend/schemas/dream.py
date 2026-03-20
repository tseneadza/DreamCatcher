from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class DreamCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    mood: int = Field(default=3, ge=1, le=5)
    tags: List[str] = Field(default_factory=list)
    dream_date: Optional[datetime] = None
    lucidity_level: int = Field(default=0, ge=0, le=5)
    emotions: List[str] = Field(default_factory=list)
    characters: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    is_recurring: bool = False
    recurring_theme: Optional[str] = None
    vividness: int = Field(default=3, ge=1, le=5)
    dream_type: str = Field(default="normal")
    goal_id: Optional[int] = None


class DreamUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    mood: Optional[int] = Field(None, ge=1, le=5)
    tags: Optional[List[str]] = None
    dream_date: Optional[datetime] = None
    lucidity_level: Optional[int] = Field(None, ge=0, le=5)
    emotions: Optional[List[str]] = None
    characters: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    is_recurring: Optional[bool] = None
    recurring_theme: Optional[str] = None
    vividness: Optional[int] = Field(None, ge=1, le=5)
    dream_type: Optional[str] = None
    goal_id: Optional[int] = None


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
    lucidity_level: int = 0
    emotions: List[str] = []
    characters: List[str] = []
    locations: List[str] = []
    is_recurring: bool = False
    recurring_theme: Optional[str] = None
    vividness: int = 3
    dream_type: str = "normal"
    goal_id: Optional[int] = None
    
    class Config:
        from_attributes = True
