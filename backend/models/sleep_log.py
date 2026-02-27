from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="sleep_logs")
    dream = relationship("Dream", back_populates="sleep_log")
