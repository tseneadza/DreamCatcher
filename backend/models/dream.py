from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Dream(Base):
    __tablename__ = "dreams"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    mood = Column(Integer, default=3)  # 1-5 scale
    tags = Column(JSON, default=list)
    ai_interpretation = Column(Text, nullable=True)
    dream_date = Column(DateTime(timezone=True), default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="dreams")
    sleep_log = relationship("SleepLog", back_populates="dream", uselist=False)
