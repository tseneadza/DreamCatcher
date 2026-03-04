from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ConsentTerms(BaseModel):
    version: str
    text: str
    data_categories: list[str]


class ConsentGrant(BaseModel):
    consent_version: str
    data_categories: list[str]


class ConsentResponse(BaseModel):
    id: int
    consent_version: str
    status: str
    consented_at: datetime
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConsentRevoke(BaseModel):
    reason: Optional[str] = None


class ResearchAggregateResponse(BaseModel):
    groups: list[dict]
    total_events: int
    suppressed_groups: int
