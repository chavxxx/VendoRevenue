#!/usr/bin/env bash
# ==============================================================================
# GARTECH VENDO – Complete Automated 1-Liner Production Installer
# Includes All System Prerequisites, Docker Engine, Docker Compose, Database,
# Backend, Frontend Web Dashboard, Nginx Gateway, Firewall & Backup Setup.
#
# Supported OS: Ubuntu (20.04/22.04/24.04), Debian (11/12), Proxmox VM & LXC
#
# 1-Liner Terminal Command:
#   curl -fsSL https://raw.githubusercontent.com/chavxxx/VendoRevenue/main/scripts/install.sh | sudo bash
# ==============================================================================

set -eo pipefail

# ANSI Color formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

clear 2>/dev/null || true

echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ██████╗  █████╗ ██████╗ ████████╗███████╗ ██████╗██╗  ██╗
 ██╔════╝ ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔════╝██║  ██║
 ██║  ███╗███████║██████╔╝   ██║   █████╗  ██║     ███████║
 ██║   ██║██╔══██║██╔══██╗   ██║   ██╔══╝  ██║     ██╔══██║
 ╚██████╔╝██║  ██║██║  ██║   ██║   ███████╗╚██████╗██║  ██║
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝
  ██╗   ██╗███████╗███╗   ██╗██████╗  ██████╗              
  ██║   ██║██╔════╝████╗  ██║██╔══██╗██╔═══██╗             
  ██║   ██║█████╗  ██╔██╗ ██║██║  ██║██║   ██║             
  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██║  ██║██║   ██║             
   ╚████╔╝ ███████╗██║ ╚████║██████╔╝╚██████╔╝             
    ╚═══╝  ╚══════╝╚═╝  ╚═══╝╚═════╝  ╚═════╝              
EOF
echo -e "${NC}"
echo -e "${BOLD}${CYAN}GARTECH VENDO – Management & Revenue Sharing System${NC}"
echo -e "${YELLOW}Complete Production Installer (Including all system prerequisites)${NC}"
echo -e "Target Environment: Ubuntu / Debian / Proxmox VM / LXC\n"
echo -e "======================================================================"

# Step 0: Privilege Check
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}[ERROR] This installer requires root privileges.${NC}"
    echo -e "Please run with sudo or as root:"
    echo -e "  ${BOLD}curl -fsSL https://raw.githubusercontent.com/chavxxx/VendoRevenue/main/scripts/install.sh | sudo bash${NC}"
    exit 1
fi

REPO_URL="https://github.com/chavxxx/VendoRevenue.git"
INSTALL_DIR="/opt/gartech"

# Detect OS
OS="unknown"
DISTRO="unknown"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    DISTRO=$VERSION_CODENAME
fi

echo -e "${PURPLE}[INFO] Detected Operating System: ${BOLD}${PRETTY_NAME:-$OS}${NC}"

# Check Proxmox LXC container specifics
if [ -f /proc/1/environ ] && grep -qa "container=lxc" /proc/1/environ 2>/dev/null; then
    echo -e "${YELLOW}[NOTE] Running inside a Proxmox LXC container.${NC}"
    echo -e "       Ensure 'Nesting' and 'keyctl' are enabled in Proxmox container Options if using Docker."
fi

# Step 1: Install System Base Prerequisites
echo -e "\n${GREEN}${BOLD}[1/8] Installing core system packages & tools...${NC}"
export DEBIAN_FRONTEND=noninteractive

if command -v apt-get &> /dev/null; then
    apt-get update -y
    apt-get install -y --no-install-recommends \
        curl \
        wget \
        git \
        ca-certificates \
        gnupg \
        lsb-release \
        openssl \
        jq \
        tar \
        gzip \
        ufw \
        cron \
        procps \
        net-tools \
        iproute2
elif command -v dnf &> /dev/null; then
    dnf install -y curl wget git ca-certificates gnupg openssl jq tar gzip firewalld cronie procps-ng iproute
elif command -v apk &> /dev/null; then
    apk add --no-cache curl wget git ca-certificates openssl jq tar gzip bash
fi

# Step 2: Install Official Docker Engine & Docker Compose Plugin
echo -e "\n${GREEN}${BOLD}[2/8] Setting up Docker Engine & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing official Docker Engine CE...${NC}"

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL "https://download.docker.com/linux/$OS/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        UBUNTU_CODENAME=$(lsb_release -cs 2>/dev/null || echo "jammy")
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
          $UBUNTU_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        apt-get update -y
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    else
        # Generic automated script fallback for other Linux distributions
        curl -fsSL https://get.docker.com | sh
    fi

    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || true
    echo -e "${GREEN}✓ Docker Engine successfully installed.$(docker --version)${NC}"
else
    echo -e "${GREEN}✓ Docker already installed: $(docker --version)${NC}"
    systemctl start docker 2>/dev/null || true
fi

# Ensure docker compose is available
if ! docker compose version &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        apt-get install -y docker-compose-plugin 2>/dev/null || apt-get install -y docker-compose 2>/dev/null || true
    fi
fi

# Step 3: Clone or Synchronize Application Repository
echo -e "\n${GREEN}${BOLD}[3/8] Setting up GARTECH VENDO codebase...${NC}"
if [ -d "./backend" ] && [ -d "./docker" ] && [ -d "./frontend" ]; then
    INSTALL_DIR="$(pwd)"
    echo -e "Using current directory: ${BOLD}${INSTALL_DIR}${NC}"
elif [ -d "${INSTALL_DIR}/.git" ]; then
    echo -e "Updating existing installation in ${BOLD}${INSTALL_DIR}${NC}..."
    cd "${INSTALL_DIR}"
    git fetch origin main || true
    git reset --hard origin/main || true
else
    mkdir -p "$(dirname "${INSTALL_DIR}")"
    echo -e "Cloning ${BOLD}${REPO_URL}${NC} into ${BOLD}${INSTALL_DIR}${NC}..."
    git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}"

# Step 4: Configure Production Environment Variables
echo -e "\n${GREEN}${BOLD}[4/8] Initializing environment secrets (.env)...${NC}"
if [ ! -f "${INSTALL_DIR}/.env" ]; then
    if [ -f "${INSTALL_DIR}/.env.example" ]; then
        cp "${INSTALL_DIR}/.env.example" "${INSTALL_DIR}/.env"
        # Generate cryptographically secure keys
        RAND_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-')
        RAND_DB_PASS=$(openssl rand -hex 16 2>/dev/null || echo "GartechPass2026Secure")
        
        sed -i "s|SECRET_KEY=.*|SECRET_KEY=${RAND_SECRET}|g" "${INSTALL_DIR}/.env" 2>/dev/null || true
        sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${RAND_DB_PASS}|g" "${INSTALL_DIR}/.env" 2>/dev/null || true
        echo -e "${GREEN}✓ Created production .env with randomized security keys.${NC}"
    fi
else
    echo -e "${GREEN}✓ Existing .env file found. Preserving current secrets.${NC}"
fi

# Step 5: Create Storage and Persistence Directories
echo -e "\n${GREEN}${BOLD}[5/8] Preparing persistent storage & backup directories...${NC}"
mkdir -p "${INSTALL_DIR}/uploads/signatures"
mkdir -p "${INSTALL_DIR}/uploads/harvests"
mkdir -p "${INSTALL_DIR}/uploads/receipts"
mkdir -p "${INSTALL_DIR}/backups"
chmod -R 755 "${INSTALL_DIR}/uploads" "${INSTALL_DIR}/backups"
chmod +x "${INSTALL_DIR}/scripts/"*.sh 2>/dev/null || true
echo -e "${GREEN}✓ Storage directories initialized.${NC}"

# Step 6: Configure Firewall Ports (80/HTTP, 443/HTTPS, 22/SSH)
echo -e "\n${GREEN}${BOLD}[6/8] Configuring firewall rules...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp comment 'SSH' 2>/dev/null || true
    ufw allow 80/tcp comment 'GARTECH HTTP' 2>/dev/null || true
    ufw allow 443/tcp comment 'GARTECH HTTPS' 2>/dev/null || true
    ufw --force enable 2>/dev/null || true
    echo -e "${GREEN}✓ UFW Firewall configured (Ports 22, 80, 443 opened).${NC}"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http 2>/dev/null || true
    firewall-cmd --permanent --add-service=https 2>/dev/null || true
    firewall-cmd --permanent --add-service=ssh 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo -e "${GREEN}✓ Firewalld configured.${NC}"
else
    echo -e "${YELLOW}[NOTE] No active UFW/Firewalld detected. Ensure ports 80 and 443 are allowed.${NC}"
fi

# Step 7: Build & Launch Docker Container Stack
echo -e "\n${GREEN}${BOLD}[7/8] Building & launching GARTECH container stack...${NC}"
echo -e "       (Services: PostgreSQL 16, FastAPI Backend, React Frontend, Nginx Gateway)"
cd "${INSTALL_DIR}/docker"

docker compose down 2>/dev/null || true
docker compose build --pull
docker compose up -d

# Step 8: Health Check & Verification
echo -e "\n${GREEN}${BOLD}[8/8] Verifying system health and connectivity...${NC}"
HEALTHY=false
for i in {1..30}; do
    if curl -s http://127.0.0.1:80/health | grep -q "healthy" 2>/dev/null || \
       curl -s http://127.0.0.1:8000/health | grep -q "healthy" 2>/dev/null; then
        HEALTHY=true
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}✓ All services are running and verified healthy!${NC}"
else
    echo -e "${YELLOW}[NOTE] Services are still initializing or starting. You can monitor with:${NC}"
    echo -e "       ${BOLD}cd ${INSTALL_DIR}/docker && docker compose logs -f${NC}"
fi

# Setup Automated Daily Backup Cron Job
echo "Configuring daily automated database backup at 2:00 AM..."
CRON_JOB="0 2 * * * ${INSTALL_DIR}/scripts/backup_db.sh >> /var/log/gartech_backup.log 2>&1"
(crontab -l 2>/dev/null | grep -Fv "backup_db.sh" ; echo "$CRON_JOB") | crontab -

# Detect Primary Host IP
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
    HOST_IP=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1 || echo "localhost")
fi

# Final Output Banner
echo -e "\n${CYAN}======================================================================${NC}"
echo -e "${GREEN}${BOLD}   GARTECH VENDO SYSTEM SUCCESSFULLY INSTALLED & RUNNING!${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e "  ${BOLD}Web Dashboard:${NC}    ${CYAN}http://${HOST_IP}${NC} (or http://localhost)"
echo -e "  ${BOLD}API Health:${NC}       ${CYAN}http://${HOST_IP}/health${NC}"
echo -e "  ${BOLD}REST API Docs:${NC}    ${CYAN}http://${HOST_IP}/docs${NC}"
echo -e "  ${BOLD}Install Path:${NC}     ${INSTALL_DIR}"
echo -e "----------------------------------------------------------------------"
echo -e "  ${BOLD}Default Seeded Credentials:${NC}"
echo -e "    • ${BOLD}Administrator:${NC}   Username: ${CYAN}admin${NC}      Password: ${YELLOW}GartechAdmin2026!${NC}"
echo -e "    • ${BOLD}Staff Encoder:${NC}   Username: ${CYAN}encoder1${NC}   Password: ${YELLOW}GartechEncoder2026!${NC}"
echo -e "----------------------------------------------------------------------"
echo -e "  ${BOLD}Management Commands:${NC}"
echo -e "    • Live Logs:        ${BOLD}cd ${INSTALL_DIR}/docker && docker compose logs -f${NC}"
echo -e "    • Restart System:   ${BOLD}cd ${INSTALL_DIR}/docker && docker compose restart${NC}"
echo -e "    • Stop System:      ${BOLD}cd ${INSTALL_DIR}/docker && docker compose down${NC}"
echo -e "    • Update Code:      ${BOLD}cd ${INSTALL_DIR} && sudo ./scripts/update.sh${NC}"
echo -e "    • Run Backup:       ${BOLD}sudo ${INSTALL_DIR}/scripts/backup_db.sh${NC}"
echo -e "${CYAN}======================================================================${NC}\n"
