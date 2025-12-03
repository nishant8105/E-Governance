@echo off
echo Starting Frontend on port 8000...
start "Frontend" python -m http.server 8000

echo Starting Backend on port 5000...
cd server
python -m uvicorn server:app --reload --port 5000