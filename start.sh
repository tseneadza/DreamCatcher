#!/bin/bash

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install Python dependencies if needed
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Install frontend dependencies if needed
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    if [ ! -d "frontend/node_modules" ]; then
        cd frontend
        npm install
        cd ..
    fi
fi

# Start backend and frontend
cd backend
uvicorn main:app --host 0.0.0.0 --port 5111 --reload &
BACKEND_PID=$!

cd ../frontend
if [ -f "package.json" ]; then
    npm run dev &
    FRONTEND_PID=$!
fi

# Wait for processes
wait $BACKEND_PID
