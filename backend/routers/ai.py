from typing import Annotated, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.dream import Dream
from models.goal import Goal
from models.idea import Idea
from models.sleep_log import SleepLog
from routers.auth import get_current_user
from services.ai_service import ai_service

router = APIRouter()


class InsightsResponse(BaseModel):
    dream_insights: Optional[str] = None
    goal_insights: Optional[str] = None
    sleep_insights: Optional[str] = None
    overall_insights: str


class BrainstormRequest(BaseModel):
    idea_content: str
    category: Optional[str] = None


class BrainstormResponse(BaseModel):
    suggestions: str


@router.get("/status")
async def get_ai_status():
    return {
        "available": ai_service.is_available(),
        "message": "AI features are available" if ai_service.is_available() else "Configure OPENAI_API_KEY to enable AI features"
    }


@router.get("/insights", response_model=InsightsResponse)
async def get_insights(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    dreams = db.query(Dream).filter(Dream.user_id == current_user.id).order_by(Dream.dream_date.desc()).limit(10).all()
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    sleep_logs = db.query(SleepLog).filter(SleepLog.user_id == current_user.id).order_by(SleepLog.sleep_time.desc()).limit(14).all()
    
    dream_insights = None
    if dreams:
        themes = []
        for dream in dreams:
            if dream.tags:
                themes.extend(dream.tags)
        if themes:
            dream_insights = f"Your recent dreams feature themes of: {', '.join(set(themes)[:5])}. "
            avg_mood = sum(d.mood for d in dreams) / len(dreams)
            dream_insights += f"Average dream mood: {avg_mood:.1f}/5."
    
    goal_insights = None
    if goals:
        active = sum(1 for g in goals if g.status == 'in_progress')
        completed = sum(1 for g in goals if g.status == 'completed')
        avg_progress = sum(g.progress for g in goals) / len(goals) if goals else 0
        goal_insights = f"You have {active} active goals and {completed} completed. Average progress: {avg_progress:.0f}%."
    
    sleep_insights = None
    if len(sleep_logs) >= 3:
        sleep_data = [
            {"sleep_time": str(s.sleep_time), "wake_time": str(s.wake_time), "quality": s.quality}
            for s in sleep_logs
        ]
        sleep_insights = await ai_service.analyze_sleep_patterns(sleep_data)
    
    overall = []
    if dreams:
        overall.append(f"{len(dreams)} dreams recorded")
    if goals:
        overall.append(f"{len(goals)} goals tracked")
    if sleep_logs:
        overall.append(f"{len(sleep_logs)} sleep logs")
    
    return InsightsResponse(
        dream_insights=dream_insights,
        goal_insights=goal_insights,
        sleep_insights=sleep_insights,
        overall_insights=f"Your journey includes: {', '.join(overall)}." if overall else "Start logging to get personalized insights!"
    )


@router.post("/brainstorm", response_model=BrainstormResponse)
async def brainstorm_idea(
    request: BrainstormRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    suggestions = await ai_service.brainstorm_ideas(
        idea_content=request.idea_content,
        category=request.category
    )
    return BrainstormResponse(suggestions=suggestions)
