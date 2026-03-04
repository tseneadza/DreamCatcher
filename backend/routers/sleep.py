from typing import Annotated, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from database import get_db
from models.user import User
from models.sleep_log import SleepLog
from models.dream import Dream
from schemas.sleep_log import (
    SleepLogCreate,
    SleepLogUpdate,
    SleepLogResponse,
    SleepStats,
    SleepCorrelation,
)
from routers.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=SleepLogResponse, status_code=status.HTTP_201_CREATED)
async def create_sleep_log(
    sleep_data: SleepLogCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    if sleep_data.dream_id:
        dream = db.query(Dream).filter(
            Dream.id == sleep_data.dream_id,
            Dream.user_id == current_user.id
        ).first()
        if not dream:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dream not found or doesn't belong to you"
            )
    
    sleep_log = SleepLog(
        user_id=current_user.id,
        sleep_time=sleep_data.sleep_time,
        wake_time=sleep_data.wake_time,
        quality=sleep_data.quality,
        notes=sleep_data.notes,
        dream_id=sleep_data.dream_id,
        sleep_duration_minutes=sleep_data.sleep_duration_minutes,
        sleep_position=sleep_data.sleep_position,
        pre_sleep_activity=sleep_data.pre_sleep_activity,
        caffeine_intake=sleep_data.caffeine_intake,
        exercise_today=sleep_data.exercise_today,
        stress_level=sleep_data.stress_level,
    )
    db.add(sleep_log)
    db.commit()
    db.refresh(sleep_log)
    return sleep_log


@router.get("/", response_model=List[SleepLogResponse])
async def get_sleep_logs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    quality: Optional[int] = Query(None, ge=1, le=5),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    quality_min: Optional[int] = Query(None, ge=1, le=5),
    sort_by: Optional[str] = Query(None, pattern="^(date|quality|duration)$"),
    sort_order: Optional[str] = Query(None, pattern="^(asc|desc)$"),
):
    query = db.query(SleepLog).filter(SleepLog.user_id == current_user.id)
    
    if quality is not None:
        query = query.filter(SleepLog.quality == quality)
    if date_from is not None:
        query = query.filter(SleepLog.sleep_time >= date_from)
    if date_to is not None:
        query = query.filter(SleepLog.sleep_time <= date_to)
    if quality_min is not None:
        query = query.filter(SleepLog.quality >= quality_min)

    sort_col_map = {
        "date": SleepLog.sleep_time,
        "quality": SleepLog.quality,
        "duration": SleepLog.sleep_duration_minutes,
    }
    sort_col = sort_col_map.get(sort_by or "date", SleepLog.sleep_time)
    order = sort_col.asc() if sort_order == "asc" else sort_col.desc()

    sleep_logs = query.order_by(order).offset(skip).limit(limit).all()
    return sleep_logs


@router.get("/stats", response_model=SleepStats)
async def get_sleep_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    query = db.query(SleepLog).filter(SleepLog.user_id == current_user.id)

    if date_from:
        query = query.filter(SleepLog.sleep_time >= date_from)
    if date_to:
        query = query.filter(SleepLog.sleep_time <= date_to)

    logs = query.order_by(SleepLog.sleep_time.asc()).all()
    total_logs = len(logs)

    if total_logs == 0:
        return SleepStats(
            avg_quality=0.0,
            avg_duration=None,
            total_logs=0,
            quality_trend=[],
        )

    total_quality = sum(log.quality for log in logs)
    avg_quality = round(total_quality / total_logs, 2)

    durations = [log.sleep_duration_minutes for log in logs if log.sleep_duration_minutes is not None]
    avg_duration = round(sum(durations) / len(durations), 1) if durations else None

    quality_trend = [
        {
            "date": log.sleep_time.isoformat(),
            "quality": log.quality,
        }
        for log in logs
    ]

    return SleepStats(
        avg_quality=avg_quality,
        avg_duration=avg_duration,
        total_logs=total_logs,
        quality_trend=quality_trend,
    )


@router.get("/correlations", response_model=SleepCorrelation)
async def get_sleep_correlations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    query = (
        db.query(SleepLog, Dream)
        .outerjoin(Dream, SleepLog.dream_id == Dream.id)
        .filter(SleepLog.user_id == current_user.id)
    )

    if date_from:
        query = query.filter(SleepLog.sleep_time >= date_from)
    if date_to:
        query = query.filter(SleepLog.sleep_time <= date_to)

    results = query.all()

    mood_vs_quality = []
    duration_vs_vividness = []

    for sleep_log, dream in results:
        if dream is not None:
            mood_vs_quality.append({
                "date": sleep_log.sleep_time.isoformat(),
                "mood": dream.mood,
                "quality": sleep_log.quality,
            })

            if sleep_log.sleep_duration_minutes is not None:
                duration_vs_vividness.append({
                    "date": sleep_log.sleep_time.isoformat(),
                    "duration_minutes": sleep_log.sleep_duration_minutes,
                    "vividness": dream.vividness,
                })

    return SleepCorrelation(
        mood_vs_quality=mood_vs_quality,
        duration_vs_vividness=duration_vs_vividness,
    )


@router.get("/{sleep_id}", response_model=SleepLogResponse)
async def get_sleep_log(
    sleep_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    sleep_log = db.query(SleepLog).filter(
        SleepLog.id == sleep_id,
        SleepLog.user_id == current_user.id
    ).first()
    
    if not sleep_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sleep log not found")
    
    return sleep_log


@router.put("/{sleep_id}", response_model=SleepLogResponse)
async def update_sleep_log(
    sleep_id: int,
    sleep_data: SleepLogUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    sleep_log = db.query(SleepLog).filter(
        SleepLog.id == sleep_id,
        SleepLog.user_id == current_user.id
    ).first()
    
    if not sleep_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sleep log not found")
    
    if sleep_data.dream_id:
        dream = db.query(Dream).filter(
            Dream.id == sleep_data.dream_id,
            Dream.user_id == current_user.id
        ).first()
        if not dream:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dream not found or doesn't belong to you"
            )
    
    update_data = sleep_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sleep_log, key, value)
    
    db.commit()
    db.refresh(sleep_log)
    return sleep_log


@router.delete("/{sleep_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sleep_log(
    sleep_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    sleep_log = db.query(SleepLog).filter(
        SleepLog.id == sleep_id,
        SleepLog.user_id == current_user.id
    ).first()
    
    if not sleep_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sleep log not found")
    
    db.delete(sleep_log)
    db.commit()
    return None
