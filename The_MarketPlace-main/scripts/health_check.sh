#!/bin/bash

# health_check.sh - Check health of all blockchain + marketplace services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HEALTHY=0
UNHEALTHY=0

check_service() {
    local name=$1
    local url=$2
    local optional=${3:-false}
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name: ${GREEN}Healthy${NC}"
        HEALTHY=$((HEALTHY + 1))
        return 0
    else
        if [ "$optional" = "true" ]; then
            echo -e "${YELLOW}⚠${NC} $name: ${YELLOW}Not Running (Optional)${NC}"
        else
            echo -e "${RED}✗${NC} $name: ${RED}Unhealthy${NC}"
            UNHEALTHY=$((UNHEALTHY + 1))
        fi
        return 1
    fi
}

check_port() {
    local name=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name (port $port): ${GREEN}Listening${NC}"
        HEALTHY=$((HEALTHY + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $name (port $port): ${RED}Not Listening${NC}"
        UNHEALTHY=$((UNHEALTHY + 1))
        return 1
    fi
}

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}System Health Check${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${BLUE}Core Services:${NC}"
check_service "Marketplace Frontend" "http://localhost:5173"
check_service "Marketplace Backend" "http://localhost:5000/metrics"
check_service "Blockchain Backend" "http://localhost:4000/api/health"
check_service "Blockchain RPC" "http://localhost:26657/status"
check_service "Blockchain REST API" "http://localhost:1317/cosmos/base/tendermint/v1beta1/node_info"

echo ""
echo -e "${BLUE}Port Status:${NC}"
check_port "Frontend" 5173
check_port "Marketplace API" 5000
check_port "Blockchain API" 4000
check_port "Tendermint RPC" 26657
check_port "Tendermint P2P" 26656
check_port "Cosmos REST" 1317

echo ""
echo -e "${BLUE}Optional Services:${NC}"
check_service "Redis" "http://localhost:6379" true || true
check_service "MongoDB" "http://localhost:27017" true || true

echo ""
echo -e "${BLUE}=========================================${NC}"
if [ $UNHEALTHY -eq 0 ]; then
    echo -e "${GREEN}Overall Status: HEALTHY${NC}"
    echo -e "${GREEN}All critical services are running${NC}"
    exit 0
else
    echo -e "${RED}Overall Status: UNHEALTHY${NC}"
    echo -e "${RED}$UNHEALTHY service(s) are not running${NC}"
    exit 1
fi
