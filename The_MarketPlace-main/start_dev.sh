#!/bin/bash

# start_dev.sh - Safe startup script for local development

# 1. Kill any process using port 5000 (backend) to prevent EADDRINUSE
echo "🧹 Cleaning up port 5000..."
fuser -k 5000/tcp > /dev/null 2>&1
sleep 1

# 2. Start Backend
echo "🚀 Starting Backend on port 5000..."
cd backend
# Ensure installs
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    pnpm install
fi

# Run backend in background
# We use 'npm run dev' or 'node app.js'. Let's use node app.js directly for simplicity or npm start.
# Assuming npm start runs node app.js
nohup pnpm start > ../backend_logs.txt 2>&1 &
BACKEND_PID=$!
echo "   Backend running (PID: $BACKEND_PID). Logs: backend_logs.txt"
cd ..

# 3. Start Workers
echo "👷 Starting Workers..."
cd backend
nohup node workers/assignmentWorker.js > ../worker_assignment_logs.txt 2>&1 &
ASSIGN_PID=$!
nohup node workers/requeueWorker.js > ../worker_requeue_logs.txt 2>&1 &
REQUEUE_PID=$!
echo "   Assignment Worker (PID: $ASSIGN_PID)"
echo "   Requeue Worker (PID: $REQUEUE_PID)"
cd ..

# 4. Start Frontend
echo "🎨 Starting Frontend on port 5173..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    pnpm install
fi
# Using npm run dev
pnpm run dev
