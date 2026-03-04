from datetime import datetime, timedelta
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


class AutoTagRequest(BaseModel):
    content: str
    mood: int = 3


class AutoTagResponse(BaseModel):
    emotions: list[str] = []
    characters: list[str] = []
    locations: list[str] = []
    dream_type: str = "normal"
    lucidity_level: int = 0


class PatternAnalysisResponse(BaseModel):
    recurring_symbols: list[str] = []
    emotional_trends: list[str] = []
    temporal_patterns: list[str] = []
    summary: str


class DreamIdeaItem(BaseModel):
    content: str
    category: str
    reasoning: str


class DreamIdeasResponse(BaseModel):
    ideas: list[DreamIdeaItem] = []


class ExploreRequest(BaseModel):
    dream_id: int
    question: str


class ExploreResponse(BaseModel):
    answer: str
    follow_up_questions: list[str] = []


class GoalAlignmentRequest(BaseModel):
    goal_id: int


class GoalAlignmentResponse(BaseModel):
    alignment_score: float
    analysis: str
    relevant_themes: list[str] = []


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


@router.post("/auto-tag", response_model=AutoTagResponse)
async def auto_tag_dream(
    request: AutoTagRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await ai_service.auto_tag_dream(
        content=request.content,
        mood=request.mood
    )
    return AutoTagResponse(**result)


@router.get("/patterns", response_model=PatternAnalysisResponse)
async def get_dream_patterns(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    days: int = 30,
):
    since = datetime.utcnow() - timedelta(days=days)
    dreams = (
        db.query(Dream)
        .filter(Dream.user_id == current_user.id, Dream.dream_date >= since.date())
        .order_by(Dream.dream_date.desc())
        .all()
    )

    dream_dicts = [
        {
            "content": d.content,
            "emotions": d.emotions or [],
            "tags": d.tags or [],
            "dream_type": d.dream_type or "normal",
            "mood": d.mood,
        }
        for d in dreams
    ]

    result = await ai_service.analyze_dream_patterns(dream_dicts)
    return PatternAnalysisResponse(**result)


@router.post("/dream-to-ideas", response_model=DreamIdeasResponse)
async def dream_to_ideas(
    request: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    dream_id = request.get("dream_id")
    if not dream_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="dream_id is required")

    dream = db.query(Dream).filter(Dream.id == dream_id, Dream.user_id == current_user.id).first()
    if not dream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dream not found")

    result = await ai_service.dream_to_ideas(
        dream_content=dream.content,
        dream_emotions=dream.emotions or [],
    )
    return DreamIdeasResponse(**result)


@router.post("/explore", response_model=ExploreResponse)
async def explore_dream(
    request: ExploreRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    dream = db.query(Dream).filter(Dream.id == request.dream_id, Dream.user_id == current_user.id).first()
    if not dream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dream not found")

    result = await ai_service.explore_dream(
        dream_content=dream.content,
        question=request.question,
    )
    return ExploreResponse(**result)


@router.post("/goal-alignment", response_model=GoalAlignmentResponse)
async def goal_alignment(
    request: GoalAlignmentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    goal = db.query(Goal).filter(Goal.id == request.goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    dreams = (
        db.query(Dream)
        .filter(Dream.user_id == current_user.id)
        .order_by(Dream.dream_date.desc())
        .limit(20)
        .all()
    )

    dreams_summary = "\n".join([
        f"- {d.title}: {d.content[:150]}... (emotions: {', '.join(d.emotions or [])}, tags: {', '.join(d.tags or [])})"
        for d in dreams
    ]) if dreams else "No dreams recorded yet."

    result = await ai_service.goal_dream_alignment(
        goal_title=goal.title,
        goal_description=goal.description or "",
        dreams_summary=dreams_summary,
    )
    return GoalAlignmentResponse(**result)
