#!/bin/bash
# GARTECH VENDO - Automated Installation Script for Ubuntu Server / Proxmox VM or LXC
# Run as root or with sudo: sudo ./install.sh

set -e

echo "=========================================================="
echo "  GARTECH VENDO – System Installation & Deployment"
echo "  Target: Ubuntu Server / Proxmox VM / LXC"
echo "=========================================================="

# 1. Update OS Packages
echo "Updating apt package repository..."
apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw

# 2. Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker Engine..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully."
fi

# 3. Configure Firewall (UFW)
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 4. Environment File Setup
if [ ! -f "../.env" ] && [ ! -f "./.env" ]; then
    echo "Generating .env configuration file..."
    cp ../.env.example ../.env 2>/dev/null || cp ./.env.example ./.env
fi

# 5. Create storage directories
mkdir -p /opt/gartech/uploads/signatures
mkdir -p /opt/gartech/uploads/harvests
mkdir -p /opt/gartech/uploads/receipts
mkdir -p /opt/gartech/backups

# 6. Build and Start Docker Containers
echo "Building and launching GARTECH VENDO Docker stack..."
cd ../docker || cd ./docker
docker compose down || true
docker compose build
docker compose up -d

# 7. Setup Automated Daily Database Backup in Cron
echo "Setting up daily database backup cron job at 2:00 AM..."
CRON_JOB="0 2 * * * /opt/gartech/scripts/backup_db.sh >> /var/log/gartech_backup.log 2>&1"
(crontab -l 2>/dev/null | grep -Fv "backup_db.sh" ; echo "$CRON_JOB") | crontab -

echo "=========================================================="
echo "  GARTECH VENDO System Deployed Successfully!"
echo "  Web Portal URL: http://$(hostname -I | cut -d' ' -f1)"
echo "  API Health:     http://$(hostname -I | cut -d' ' -f1)/health"
echo "  Swagger Docs:   http://$(hostname -I | cut -d' ' -f1)/docs"
echo "=========================================================="
