import logging
from sqlalchemy.orm import Session
from models.dream import Dream
from models.user import User
from models.research_consent import ResearchConsent
from models.dream_research_event import DreamResearchEvent

logger = logging.getLogger(__name__)


def extract_research_event(
    dream: Dream, user: User, consent: ResearchConsent, db: Session
) -> DreamResearchEvent | None:
    if consent.status != "active":
        logger.debug("Consent not active for user %s, skipping extraction", user.id)
        return None

    emotion = None
    if dream.emotions and len(dream.emotions) > 0:
        emotion = dream.emotions[0]

    theme = None
    if dream.tags and len(dream.tags) > 0:
        theme = dream.tags[0]

    is_lucid = (dream.lucidity_level or 0) > 0

    day_of_week = None
    month = None
    if dream.dream_date:
        day_of_week = dream.dream_date.weekday()
        month = dream.dream_date.month

    event = DreamResearchEvent(
        consent_id=consent.id,
        emotion=emotion,
        theme=theme,
        is_lucid=is_lucid,
        mood_score=dream.mood,
        dream_type=dream.dream_type,
        vividness=dream.vividness,
        is_recurring=dream.is_recurring or False,
        day_of_week=day_of_week,
        month=month,
        age_bracket=user.age_bracket,
        region=user.region,
    )

    db.add(event)
    db.commit()
    db.refresh(event)
    logger.info("Research event %s extracted for consent %s", event.id, consent.id)
    return event
