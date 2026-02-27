from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SleepLogCreate(BaseModel):
    sleep_time: datetime
    wake_time: datetime
    quality: int = Field(default=3, ge=1, le=5)
    notes: Optional[str] = None
    dream_id: Optional[int] = None


class SleepLogUpdate(BaseModel):
    sleep_time: Optional[datetime] = None
    wake_time: Optional[datetime] = None
    quality: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    dream_id: Optional[int] = None


class SleepLogResponse(BaseModel):
    id: int
    user_id: int
    dream_id: Optional[int] = None
    sleep_time: datetime
    wake_time: datetime
    quality: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
