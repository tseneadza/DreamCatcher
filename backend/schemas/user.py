from pydantic import BaseModel, EmailStr, field_validator, Field
from datetime import datetime
from typing import Optional, List

from schemas.dream import DreamResponse
from schemas.goal import GoalResponse
from schemas.idea import IdeaResponse
from schemas.sleep_log import SleepLogResponse


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: Optional[str] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 128:
            raise ValueError('Password must be less than 128 characters')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None
    theme_preference: Optional[str] = None
    avatar_url: Optional[str] = None
    dream_reminder_time: Optional[str] = None
    sleep_reminder_time: Optional[str] = None
    notification_preferences: Optional[dict] = None
    age_bracket: Optional[str] = None
    gender_category: Optional[str] = None
    region: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = "UTC"
    theme_preference: Optional[str] = "system"
    notification_preferences: Optional[dict] = None
    dream_reminder_time: Optional[str] = None
    sleep_reminder_time: Optional[str] = None
    last_login_at: Optional[datetime] = None
    age_bracket: Optional[str] = None
    gender_category: Optional[str] = None
    region: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserExport(BaseModel):
    user: UserResponse
    dreams: List[DreamResponse] = []
    goals: List[GoalResponse] = []
    ideas: List[IdeaResponse] = []
    sleep_logs: List[SleepLogResponse] = []

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
