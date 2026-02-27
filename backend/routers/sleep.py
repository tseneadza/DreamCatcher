from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.sleep_log import SleepLog
from models.dream import Dream
from schemas.sleep_log import SleepLogCreate, SleepLogUpdate, SleepLogResponse
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
        dream_id=sleep_data.dream_id
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
):
    query = db.query(SleepLog).filter(SleepLog.user_id == current_user.id)
    
    if quality is not None:
        query = query.filter(SleepLog.quality == quality)
    
    sleep_logs = query.order_by(SleepLog.sleep_time.desc()).offset(skip).limit(limit).all()
    return sleep_logs


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
