from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class GoalStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class GoalCategory(str, enum.Enum):
    PERSONAL = "personal"
    CAREER = "career"
    HEALTH = "health"
    LEARNING = "learning"
    FINANCIAL = "financial"
    OTHER = "other"


class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default=GoalCategory.PERSONAL.value)
    status = Column(String(50), default=GoalStatus.NOT_STARTED.value)
    progress = Column(Integer, default=0)  # 0-100 percentage
    target_date = Column(DateTime(timezone=True), nullable=True)
    milestones = Column(JSON, default=list)
    ai_suggestions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="goals")
