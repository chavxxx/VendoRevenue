#!/bin/bash
# GARTECH VENDO - Application Update Script
# Usage: ./update.sh

set -e

echo "=== Updating GARTECH VENDO System ==="

# 1. Pull Git Changes if repository exists
if [ -d "../.git" ] || [ -d "./.git" ]; then
    echo "Pulling latest code updates from Git repository..."
    git pull origin main || git pull origin master || true
fi

# 2. Rebuild Frontend Assets
echo "Building updated frontend assets..."
cd ../frontend || cd ./frontend
npm install --no-audit
npm run build

# 3. Reload Docker Stack with Zero Data Loss
echo "Rebuilding and restarting application containers..."
cd ../docker || cd ./docker
docker compose build backend frontend
docker compose up -d --no-deps backend frontend

echo "=== Update Completed Successfully ==="
