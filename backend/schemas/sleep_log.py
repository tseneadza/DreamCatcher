from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SleepLogCreate(BaseModel):
    sleep_time: datetime
    wake_time: datetime
    quality: int = Field(default=3, ge=1, le=5)
    notes: Optional[str] = None
    dream_id: Optional[int] = None
    sleep_duration_minutes: Optional[int] = None
    sleep_position: Optional[str] = None
    pre_sleep_activity: Optional[str] = None
    caffeine_intake: bool = False
    exercise_today: bool = False
    stress_level: Optional[int] = Field(None, ge=1, le=5)


class SleepLogUpdate(BaseModel):
    sleep_time: Optional[datetime] = None
    wake_time: Optional[datetime] = None
    quality: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    dream_id: Optional[int] = None
    sleep_duration_minutes: Optional[int] = None
    sleep_position: Optional[str] = None
    pre_sleep_activity: Optional[str] = None
    caffeine_intake: Optional[bool] = None
    exercise_today: Optional[bool] = None
    stress_level: Optional[int] = Field(None, ge=1, le=5)


class SleepLogResponse(BaseModel):
    id: int
    user_id: int
    dream_id: Optional[int] = None
    sleep_time: datetime
    wake_time: datetime
    quality: int
    notes: Optional[str] = None
    sleep_duration_minutes: Optional[int] = None
    sleep_position: Optional[str] = None
    pre_sleep_activity: Optional[str] = None
    caffeine_intake: bool = False
    exercise_today: bool = False
    stress_level: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SleepStats(BaseModel):
    avg_quality: float
    avg_duration: Optional[float] = None
    total_logs: int
    quality_trend: list[dict]


class SleepCorrelation(BaseModel):
    mood_vs_quality: list[dict]
    duration_vs_vividness: list[dict]
