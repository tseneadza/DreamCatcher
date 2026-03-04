import logging
from datetime import datetime, timezone
from typing import Annotated, Optional
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.user import User
from models.research_consent import ResearchConsent
from models.dream_research_event import DreamResearchEvent
from schemas.research import (
    ConsentTerms,
    ConsentGrant,
    ConsentResponse,
    ConsentRevoke,
    ResearchAggregateResponse,
)
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

CURRENT_CONSENT_VERSION = "1.0"
CONSENT_TEXT = (
    "By participating in DreamCatcher Research, you agree to contribute "
    "anonymized dream data for academic and scientific research. Your data "
    "will be stripped of all personally identifiable information before "
    "inclusion in any research dataset. You may revoke consent at any time, "
    "which will permanently delete all research data derived from your dreams."
)
DATA_CATEGORIES = [
    "dream_emotions",
    "dream_themes",
    "dream_types",
    "sleep_quality",
    "mood_scores",
    "demographic_brackets",
]

K_ANONYMITY_THRESHOLD = 5


@router.get("/consent/terms", response_model=ConsentTerms)
async def get_consent_terms():
    return ConsentTerms(
        version=CURRENT_CONSENT_VERSION,
        text=CONSENT_TEXT,
        data_categories=DATA_CATEGORIES,
    )


@router.get("/consent/status", response_model=ConsentResponse)
async def get_consent_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    consent = (
        db.query(ResearchConsent)
        .filter(ResearchConsent.user_id == current_user.id)
        .first()
    )
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No consent record found",
        )
    return consent


@router.post("/consent/grant", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def grant_consent(
    data: ConsentGrant,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    existing = (
        db.query(ResearchConsent)
        .filter(ResearchConsent.user_id == current_user.id)
        .first()
    )

    if existing and existing.status == "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Consent already active",
        )

    if existing and existing.status == "revoked":
        existing.status = "active"
        existing.consent_version = data.consent_version
        existing.consented_at = datetime.now(timezone.utc)
        existing.revoked_at = None
        db.commit()
        db.refresh(existing)
        return existing

    consent = ResearchConsent(
        user_id=current_user.id,
        consent_version=data.consent_version,
        status="active",
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    logger.info("Consent granted for user %s", current_user.id)
    return consent


@router.post("/consent/revoke", response_model=ConsentResponse)
async def revoke_consent(
    data: ConsentRevoke,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    consent = (
        db.query(ResearchConsent)
        .filter(
            ResearchConsent.user_id == current_user.id,
            ResearchConsent.status == "active",
        )
        .first()
    )
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active consent found",
        )

    db.query(DreamResearchEvent).filter(
        DreamResearchEvent.consent_id == consent.id
    ).delete(synchronize_session="fetch")

    consent.status = "revoked"
    consent.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(consent)
    logger.info(
        "Consent revoked for user %s, reason: %s", current_user.id, data.reason
    )
    return consent


@router.get("/aggregate", response_model=ResearchAggregateResponse)
async def get_aggregate(
    group_by: str = Query("dream_type", description="Field to group by"),
    period_type: Optional[str] = Query(None, description="Filter by period: daily/weekly/monthly"),
    db: Session = Depends(get_db),
):
    valid_group_fields = {
        "dream_type": DreamResearchEvent.dream_type,
        "emotion": DreamResearchEvent.emotion,
        "theme": DreamResearchEvent.theme,
        "is_lucid": DreamResearchEvent.is_lucid,
        "age_bracket": DreamResearchEvent.age_bracket,
        "region": DreamResearchEvent.region,
        "day_of_week": DreamResearchEvent.day_of_week,
        "month": DreamResearchEvent.month,
    }

    if group_by not in valid_group_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid group_by field. Must be one of: {', '.join(valid_group_fields.keys())}",
        )

    group_col = valid_group_fields[group_by]

    query = db.query(
        group_col.label("group_key"),
        func.count().label("count"),
        func.avg(DreamResearchEvent.mood_score).label("avg_mood"),
        func.avg(DreamResearchEvent.vividness).label("avg_vividness"),
    ).group_by(group_col)

    if period_type == "monthly":
        query = query.filter(DreamResearchEvent.month.isnot(None))

    rows = query.all()

    groups = []
    suppressed = 0
    total_events = 0

    for row in rows:
        total_events += row.count
        if row.count < K_ANONYMITY_THRESHOLD:
            suppressed += 1
            continue
        groups.append({
            "key": str(row.group_key) if row.group_key is not None else "unknown",
            "count": row.count,
            "avg_mood": round(float(row.avg_mood), 2) if row.avg_mood else None,
            "avg_vividness": round(float(row.avg_vividness), 2) if row.avg_vividness else None,
        })

    return ResearchAggregateResponse(
        groups=groups,
        total_events=total_events,
        suppressed_groups=suppressed,
    )
