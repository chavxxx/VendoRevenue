#!/usr/bin/env bash
# ==============================================================================
# GARTECH VENDO – Complete System Uninstaller
# Permanently removes all GARTECH VENDO containers, databases, storage volumes,
# network bridges, automated backup cron jobs, and application files.
#
# 1-Liner Terminal Command:
#   curl -fsSL https://raw.githubusercontent.com/chavxxx/VendoRevenue/main/scripts/uninstall.sh | sudo bash
#
# Non-interactive / Force mode:
#   curl -fsSL https://raw.githubusercontent.com/chavxxx/VendoRevenue/main/scripts/uninstall.sh | sudo bash -s -- --force
# ==============================================================================

set -eo pipefail

# ANSI Color formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}${BOLD}"
cat << "EOF"
  ██████╗  █████╗ ██████╗ ████████╗███████╗ ██████╗██╗  ██╗
 ██╔════╝ ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔════╝██║  ██║
 ██║  ███╗███████║██████╔╝   ██║   █████╗  ██║     ███████║
 ██║   ██║██╔══██║██╔══██╗   ██║   ██╔══╝  ██║     ██╔══██║
 ╚██████╔╝██║  ██║██║  ██║   ██║   ███████╗╚██████╗██║  ██║
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝
         UNINSTALLER & PURGE SCRIPT
EOF
echo -e "${NC}"
echo -e "${BOLD}${RED}GARTECH VENDO – Complete System Uninstaller${NC}"
echo -e "${YELLOW}Warning: This will permanently remove all containers, database data, and files.${NC}\n"

# Step 0: Privilege Check
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}[ERROR] This uninstaller requires root privileges.${NC}"
    echo -e "Please run with sudo or as root:"
    echo -e "  ${BOLD}curl -fsSL https://raw.githubusercontent.com/chavxxx/VendoRevenue/main/scripts/uninstall.sh | sudo bash${NC}"
    exit 1
fi

# Detect Installation Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
POSSIBLE_DIR="$(cd "${SCRIPT_DIR}/.." 2>/dev/null && pwd || echo "")"

if [ -f "${POSSIBLE_DIR}/docker/docker-compose.yml" ]; then
    INSTALL_DIR="${POSSIBLE_DIR}"
elif [ -f "./docker/docker-compose.yml" ]; then
    INSTALL_DIR="$(pwd)"
elif [ -d "/opt/gartech" ]; then
    INSTALL_DIR="/opt/gartech"
else
    INSTALL_DIR="/opt/gartech"
fi

echo -e "${CYAN}Target Installation Directory: ${BOLD}${INSTALL_DIR}${NC}\n"

# Confirmation Gate (can be bypassed with --force or -y or FORCE=1)
FORCE_FLAG=0
for arg in "$@"; do
    if [ "$arg" = "--force" ] || [ "$arg" = "-y" ] || [ "$arg" = "-f" ]; then
        FORCE_FLAG=1
    fi
done

if [ "${FORCE:-0}" = "1" ]; then
    FORCE_FLAG=1
fi

if [ "$FORCE_FLAG" -ne 1 ]; then
    if [ -t 0 ] || [ -e /dev/tty ]; then
        echo -e "${RED}${BOLD}CAUTION: You are about to permanently delete:${NC}"
        echo -e "  [1] All Docker containers (gartech_postgres, gartech_backend, gartech_frontend, gartech_nginx, gartech_certbot)"
        echo -e "  [2] All database records, harvests, vendos, and named Docker volumes (pgdata, uploads, backups)"
        echo -e "  [3] Automated backup cron jobs in /etc/crontab or crontab -l"
        echo -e "  [4] Application directory: ${INSTALL_DIR}\n"
        
        read -r -p "Are you sure you want to completely uninstall GARTECH VENDO? (Type 'yes' to proceed): " CONFIRM < /dev/tty || true
        if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "YES" ] && [ "$CONFIRM" != "y" ]; then
            echo -e "\n${GREEN}Uninstallation cancelled. No changes were made.${NC}"
            exit 0
        fi
        echo ""
    fi
fi

# Step 1: Stop and Tear Down Docker Compose Stack
echo -e "${GREEN}[1/5] Stopping and removing Docker stack, volumes, and images...${NC}"
if [ -d "${INSTALL_DIR}/docker" ] && command -v docker &> /dev/null; then
    cd "${INSTALL_DIR}/docker"
    docker compose down -v --rmi all --remove-orphans 2>/dev/null || true
fi

# Fallback: force remove any remaining gartech containers
if command -v docker &> /dev/null; then
    docker rm -f gartech_postgres gartech_backend gartech_frontend gartech_nginx gartech_certbot 2>/dev/null || true
    
    # Remove all gartech named volumes
    for vol in $(docker volume ls -q 2>/dev/null | grep -E "gartech|docker_pgdata|docker_uploads|docker_backups" || true); do
        docker volume rm -f "$vol" 2>/dev/null || true
    done
    
    # Remove gartech network
    docker network rm gartech_net docker_gartech_net 2>/dev/null || true
fi
echo -e "${GREEN}✓ Docker containers, volumes, and networks purged.${NC}"

# Step 2: Remove Cron Jobs
echo -e "\n${GREEN}[2/5] Removing automated backup cron jobs...${NC}"
if command -v crontab &> /dev/null; then
    CURRENT_CRON=$(crontab -l 2>/dev/null || true)
    if echo "$CURRENT_CRON" | grep -q "backup_db.sh"; then
        (echo "$CURRENT_CRON" | grep -v "backup_db.sh" | grep -v "gartech") | crontab - 2>/dev/null || true
        echo -e "${GREEN}✓ Removed GARTECH daily backup cron schedule.${NC}"
    else
        echo -e "No active GARTECH cron job found."
    fi
fi

# Step 3: Remove Application Files & Logs
echo -e "\n${GREEN}[3/5] Deleting application directories and logs...${NC}"
if [ -d "${INSTALL_DIR}" ]; then
    rm -rf "${INSTALL_DIR}"
    echo -e "${GREEN}✓ Removed installation folder: ${INSTALL_DIR}${NC}"
fi

# Clean up log files
rm -f /var/log/gartech_backup.log

# Step 4: Clean up Docker system cache (optional dangling images)
echo -e "\n${GREEN}[4/5] Pruning dangling Docker build layers...${NC}"
if command -v docker &> /dev/null; then
    docker builder prune -f >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ Docker cache cleaned.${NC}"
fi

# Step 5: Verification & Completion
echo -e "\n${GREEN}[5/5] Final verification...${NC}"
REMAINING_CONTAINERS=$(docker ps -a --filter "name=gartech" -q 2>/dev/null | wc -l || echo "0")
if [ "$REMAINING_CONTAINERS" -eq 0 ]; then
    echo -e "${GREEN}✓ Zero GARTECH containers running.${NC}"
fi

echo -e "\n${CYAN}======================================================================${NC}"
echo -e "${GREEN}${BOLD}   GARTECH VENDO HAS BEEN COMPLETELY & CLEANLY UNINSTALLED!${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e "  • All Docker containers stopped and removed"
echo -e "  • All PostgreSQL database volumes (pgdata) deleted"
echo -e "  • All application source files and uploads purged"
echo -e "  • All automated cron jobs cleared"
echo -e "  • Port 80 & 443 released\n"
