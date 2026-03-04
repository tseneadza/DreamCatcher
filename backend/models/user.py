from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    timezone = Column(String(50), default="UTC")
    theme_preference = Column(String(20), default="system")
    notification_preferences = Column(JSON, default=dict)
    dream_reminder_time = Column(String(5), nullable=True)
    sleep_reminder_time = Column(String(5), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    age_bracket = Column(String(10), nullable=True)
    gender_category = Column(String(20), nullable=True)
    region = Column(String(50), nullable=True)
    
    dreams = relationship("Dream", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    ideas = relationship("Idea", back_populates="user", cascade="all, delete-orphan")
    sleep_logs = relationship("SleepLog", back_populates="user", cascade="all, delete-orphan")
    research_consent = relationship("ResearchConsent", back_populates="user", uselist=False)
    saved_filters = relationship("SavedFilter", back_populates="user", cascade="all, delete-orphan")
