from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class SleepLog(Base):
    __tablename__ = "sleep_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dream_id = Column(Integer, ForeignKey("dreams.id"), nullable=True)
    sleep_time = Column(DateTime(timezone=True), nullable=False)
    wake_time = Column(DateTime(timezone=True), nullable=False)
    quality = Column(Integer, default=3)  # 1-5 scale
    notes = Column(Text, nullable=True)
    sleep_duration_minutes = Column(Integer, nullable=True)
    sleep_position = Column(String(50), nullable=True)
    pre_sleep_activity = Column(String(255), nullable=True)
    caffeine_intake = Column(Boolean, default=False)
    exercise_today = Column(Boolean, default=False)
    stress_level = Column(Integer, nullable=True)  # 1-5
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="sleep_logs")
    dream = relationship("Dream", back_populates="sleep_log")
