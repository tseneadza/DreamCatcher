from sqlalchemy import Column, Integer, String, Date, Float, JSON, DateTime
from sqlalchemy.sql import func
from database import Base


class DreamResearchAggregate(Base):
    __tablename__ = "dream_research_aggregates"

    id = Column(Integer, primary_key=True, index=True)
    period_type = Column(String(20), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    sample_size = Column(Integer, nullable=False, default=0)
    emotion_counts = Column(JSON, default=dict)
    theme_counts = Column(JSON, default=dict)
    lucid_rate = Column(Float, nullable=True)
    avg_mood = Column(Float, nullable=True)
    avg_sleep_quality = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
