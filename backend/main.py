from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from models import User, Dream, Goal, Idea, SleepLog
from routers import auth, dreams, goals, ideas, sleep, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="DreamCatcher API",
    description="API for dream journaling, goal tracking, idea capture, and sleep analysis",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5111", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dreams.router, prefix="/api/dreams", tags=["Dreams"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(ideas.router, prefix="/api/ideas", tags=["Ideas"])
app.include_router(sleep.router, prefix="/api/sleep", tags=["Sleep"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])


@app.get("/")
async def root():
    return {"message": "Welcome to DreamCatcher API", "docs": "/docs"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "dreamcatcher"}
