from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class SavedFilterCreate(BaseModel):
    name: str = Field(..., max_length=100)
    entity_type: str = Field(..., max_length=20)
    filter_config: dict[str, Any] = Field(default_factory=dict)


class SavedFilterResponse(BaseModel):
    id: int
    name: str
    entity_type: str
    filter_config: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
