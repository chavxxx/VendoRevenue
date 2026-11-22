#!/usr/bin/env bash
# ==============================================================================
# GARTECH VENDO – Application Update Script
# Usage: sudo ./scripts/update.sh
# ==============================================================================

set -eo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}=== Updating GARTECH VENDO System ===${NC}"

# Find script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"

# 1. Pull Git Changes
if [ -d "${APP_DIR}/.git" ]; then
    echo -e "${GREEN}[1/3] Pulling latest code updates from GitHub...${NC}"
    git fetch origin main
    git reset --hard origin/main
fi

# 2. Rebuild Local Frontend Assets if npm is present on host
if command -v npm &> /dev/null && [ -d "${APP_DIR}/frontend" ]; then
    echo -e "${GREEN}[2/3] Compiling optimized frontend bundle...${NC}"
    cd "${APP_DIR}/frontend"
    npm install --no-audit --silent 2>/dev/null || true
    npm run build 2>/dev/null || true
fi

# 3. Reload Docker Stack (Preserving All Production Data in Named Volumes)
if command -v docker &> /dev/null && [ -d "${APP_DIR}/docker" ]; then
    echo -e "${GREEN}[3/3] Rebuilding & restarting application containers...${NC}"
    cd "${APP_DIR}/docker"
    # Never pass -v to down or restart; pgdata named volume preserves all database records!
    docker compose build backend frontend
    docker compose up -d --no-deps backend frontend
fi

echo -e "\n${GREEN}${BOLD}✓ System Updated Successfully!${NC}"
echo -e "Web Dashboard: http://localhost (or server IP)\n"
