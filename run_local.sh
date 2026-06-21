#!/bin/bash

# Adaptive Edge-Cloud Plant Disease Diagnosis - Local Runner
# Launches both frontend and backend dev servers and handles graceful shutdown

echo "=================================================================="
echo "Starting Adaptive Edge-Cloud Crop Diagnostics Local Development"
echo "=================================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0;7m'
RESET='\033[0m'

# Get current script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Cleanup handles termination of child processes
cleanup() {
    echo -e "\n${RED}Stopping development servers...${RESET}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 1. Start backend
echo -e "${BLUE}[1/2] Starting FastAPI Backend server on port 7860...${RESET}"
cd "$DIR/backend"
python3 app.py > backend.log 2>&1 &
BACKEND_PID=$!

# Wait briefly to check if it started
sleep 2
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}Backend is running successfully (PID: $BACKEND_PID). Log: backend/backend.log${RESET}"
else
    echo -e "${RED}Error: Backend failed to start. Check backend/backend.log for details.${RESET}"
    exit 1
fi

# 2. Start frontend
echo -e "${BLUE}[2/2] Starting Vite Frontend server...${RESET}"
cd "$DIR/frontend"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait briefly
sleep 2
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}Frontend is running successfully (PID: $FRONTEND_PID). Log: frontend/frontend.log${RESET}"
else
    echo -e "${RED}Error: Frontend failed to start. Check frontend/frontend.log for details.${RESET}"
    kill $BACKEND_PID
    exit 1
fi

echo -e "\n=================================================================="
echo -e "${GREEN}SYSTEM IS ONLINE${RESET}"
echo -e "Backend Engine  : ${BLUE}http://localhost:7860${RESET}"
echo -e "Frontend Panel  : ${BLUE}http://localhost:5173${RESET}"
echo -e "=================================================================="
echo "Press [Ctrl+C] to stop both servers."

# Keep shell open to monitor processes
while true; do
    sleep 1
    # Check if either process died
    if ! ps -p $BACKEND_PID > /dev/null; then
        echo -e "${RED}Backend process died. Exiting...${RESET}"
        cleanup
    fi
    if ! ps -p $FRONTEND_PID > /dev/null; then
        echo -e "${RED}Frontend process died. Exiting...${RESET}"
        cleanup
    fi
done
