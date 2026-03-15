#!/bin/bash

# stop_all.sh - Gracefully stop all blockchain + marketplace services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${YELLOW}[STOP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[STOPPED]${NC} $1"
}

# Stop process by PID file
stop_service() {
    local name=$1
    local pid_file="$PID_DIR/$2.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            log_info "Stopping $name (PID: $pid)..."
            kill -TERM $pid 2>/dev/null || true
            
            # Wait for graceful shutdown
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                log_info "Force killing $name..."
                kill -9 $pid 2>/dev/null || true
            fi
            
            log_success "$name stopped"
        fi
        rm -f "$pid_file"
    fi
}

log_info "Stopping all services..."

# Stop in reverse order of startup
stop_service "Marketplace Frontend" "marketplace_frontend"
stop_service "Requeue Worker" "worker_requeue"
stop_service "Assignment Worker" "worker_assignment"
stop_service "Marketplace Backend" "marketplace_backend"
stop_service "Blockchain Backend" "blockchain_backend"
stop_service "Blockchain Node" "blockchain_node"

# Kill any remaining processes on known ports
log_info "Cleaning up ports..."
fuser -k 5173/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 4000/tcp 2>/dev/null || true
fuser -k 26657/tcp 2>/dev/null || true
fuser -k 26656/tcp 2>/dev/null || true
fuser -k 1317/tcp 2>/dev/null || true

log_success "All services stopped"
