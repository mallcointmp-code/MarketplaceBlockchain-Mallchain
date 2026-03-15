#!/bin/bash

# start_all.sh - Unified startup script for blockchain + marketplace
# This script starts all services concurrently and monitors their health

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Add local Go to PATH
export PATH="$PROJECT_ROOT/.go/bin:$PATH"
export GOTOOLCHAIN=local
export TERM=dumb

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    log_warn "Shutting down all services..."
    if [ -f "$PROJECT_ROOT/scripts/stop_all.sh" ]; then
        bash "$PROJECT_ROOT/scripts/stop_all.sh"
    else
        # Kill all background jobs
        jobs -p | xargs -r kill 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    log_warn "Killing process on port $port..."
    fuser -k $port/tcp > /dev/null 2>&1 || true
    sleep 1
}

# Wait for service to be ready
wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            log_success "$name is ready!"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$name failed to start within timeout"
    return 1
}

# Clean up old processes on required ports
log_info "Cleaning up ports..."
check_port 5000 && kill_port 5000
check_port 5173 && kill_port 5173
check_port 4000 && kill_port 4000
check_port 26657 && kill_port 26657

log_info "========================================="
log_info "Starting Blockchain + Marketplace Stack"
log_info "Using Go: $(go version)"
log_info "========================================="

# 1. Start Blockchain Node (Ignite Chain)
log_info "Starting blockchain node..."
cd "$PROJECT_ROOT/blockchain"
if ! command -v ignite &> /dev/null; then
    log_error "Ignite CLI not found. Please install: https://docs.ignite.com/welcome/install"
    exit 1
fi

nohup yes | ignite chain serve --reset-once > "$LOG_DIR/blockchain_node.log" 2>&1 &
BLOCKCHAIN_NODE_PID=$!
echo $BLOCKCHAIN_NODE_PID > "$PID_DIR/blockchain_node.pid"
log_success "Blockchain node started (PID: $BLOCKCHAIN_NODE_PID)"

# Wait for blockchain RPC to be ready
sleep 5
wait_for_service "Blockchain RPC" "http://localhost:26657/status" || log_warn "Blockchain RPC may not be ready"

# 2. Start Blockchain Backend API
log_info "Starting blockchain backend API..."
cd "$PROJECT_ROOT/blockchain/backend"
if [ ! -d "node_modules" ]; then
    log_info "Installing blockchain backend dependencies..."
    npm install
fi

nohup npm run dev > "$LOG_DIR/blockchain_backend.log" 2>&1 &
BLOCKCHAIN_BACKEND_PID=$!
echo $BLOCKCHAIN_BACKEND_PID > "$PID_DIR/blockchain_backend.pid"
log_success "Blockchain backend started (PID: $BLOCKCHAIN_BACKEND_PID)"

# Wait for blockchain backend
sleep 3
wait_for_service "Blockchain Backend" "http://localhost:4000/api/health" || log_warn "Blockchain backend may not be ready"

# 3. Start Marketplace Backend
log_info "Starting marketplace backend..."
cd "$PROJECT_ROOT/backend"
if [ ! -d "node_modules" ]; then
    log_info "Installing marketplace backend dependencies..."
    pnpm install
fi

nohup pnpm start > "$LOG_DIR/marketplace_backend.log" 2>&1 &
MARKETPLACE_BACKEND_PID=$!
echo $MARKETPLACE_BACKEND_PID > "$PID_DIR/marketplace_backend.pid"
log_success "Marketplace backend started (PID: $MARKETPLACE_BACKEND_PID)"

# 4. Start Marketplace Workers
log_info "Starting marketplace workers..."
cd "$PROJECT_ROOT/backend"

if [ -f "workers/assignmentWorker.js" ]; then
    nohup node workers/assignmentWorker.js > "$LOG_DIR/worker_assignment.log" 2>&1 &
    WORKER_ASSIGN_PID=$!
    echo $WORKER_ASSIGN_PID > "$PID_DIR/worker_assignment.pid"
    log_success "Assignment worker started (PID: $WORKER_ASSIGN_PID)"
fi

if [ -f "workers/requeueWorker.js" ]; then
    nohup node workers/requeueWorker.js > "$LOG_DIR/worker_requeue.log" 2>&1 &
    WORKER_REQUEUE_PID=$!
    echo $WORKER_REQUEUE_PID > "$PID_DIR/worker_requeue.pid"
    log_success "Requeue worker started (PID: $WORKER_REQUEUE_PID)"
fi

# Wait for marketplace backend
sleep 3
wait_for_service "Marketplace Backend" "http://localhost:5000/api/auth/login" || log_warn "Marketplace backend may not be ready"

# 5. Start Marketplace Frontend
log_info "Starting marketplace frontend..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    log_info "Installing marketplace frontend dependencies..."
    pnpm install
fi

nohup pnpm run dev > "$LOG_DIR/marketplace_frontend.log" 2>&1 &
MARKETPLACE_FRONTEND_PID=$!
echo $MARKETPLACE_FRONTEND_PID > "$PID_DIR/marketplace_frontend.pid"
log_success "Marketplace frontend started (PID: $MARKETPLACE_FRONTEND_PID)"

# Wait for frontend
sleep 5
wait_for_service "Marketplace Frontend" "http://localhost:5173" || log_warn "Marketplace frontend may not be ready"

# Display status
log_info "========================================="
log_success "All services started successfully!"
log_info "========================================="
echo ""
log_info "Service URLs:"
echo "  🔗 Marketplace Frontend:    http://localhost:5173"
echo "  🔗 Marketplace Backend:     http://localhost:5000"
echo "  🔗 Blockchain Backend:      http://localhost:4000"
echo "  🔗 Blockchain RPC:          http://localhost:26657"
echo "  🔗 Blockchain REST API:     http://localhost:1317"
echo ""
log_info "Logs available in: $LOG_DIR"
echo "  - blockchain_node.log"
echo "  - blockchain_backend.log"
echo "  - marketplace_backend.log"
echo "  - marketplace_frontend.log"
echo "  - worker_assignment.log"
echo "  - worker_requeue.log"
echo ""
log_info "Press Ctrl+C to stop all services"
echo ""

# Monitor processes
while true; do
    sleep 5
    
    # Check if critical processes are still running
    if ! kill -0 $BLOCKCHAIN_NODE_PID 2>/dev/null; then
        log_error "Blockchain node died! Check logs: $LOG_DIR/blockchain_node.log"
        cleanup
    fi
    
    if ! kill -0 $MARKETPLACE_BACKEND_PID 2>/dev/null; then
        log_error "Marketplace backend died! Check logs: $LOG_DIR/marketplace_backend.log"
        cleanup
    fi
    
    if ! kill -0 $MARKETPLACE_FRONTEND_PID 2>/dev/null; then
        log_error "Marketplace frontend died! Check logs: $LOG_DIR/marketplace_frontend.log"
        cleanup
    fi
done
