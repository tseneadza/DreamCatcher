import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class DreamResearchEvent(Base):
    __tablename__ = "dream_research_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    consent_id = Column(
        Integer, ForeignKey("research_consent.id", ondelete="CASCADE"), nullable=False
    )
    emotion = Column(String(50), nullable=True)
    theme = Column(String(100), nullable=True)
    is_lucid = Column(Boolean, default=False, nullable=False)
    mood_score = Column(Integer, nullable=True)
    sleep_quality = Column(Integer, nullable=True)
    dream_type = Column(String(20), nullable=True)
    vividness = Column(Integer, nullable=True)
    is_recurring = Column(Boolean, default=False)
    day_of_week = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)
    age_bracket = Column(String(10), nullable=True)
    region = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    consent = relationship("ResearchConsent", back_populates="research_events")
