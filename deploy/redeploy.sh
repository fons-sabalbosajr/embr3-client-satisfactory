#!/usr/bin/env bash
# =============================================================================
# EMB R3 OCSM – Quick Redeploy Script
# Run on VPS after pulling latest code changes.
# =============================================================================

set -euo pipefail

APP_DIR="/opt/embr3-csm"

echo "🔄 Redeploying EMB R3 OCSM..."

# Pull latest if git is configured
if [ -d "$APP_DIR/.git" ]; then
  echo "→ Pulling latest code..."
  cd "$APP_DIR"
  git pull
fi

# Backend
echo "→ Installing server dependencies..."
cd "$APP_DIR/server"
npm ci --production

# Frontend
echo "→ Building frontend..."
cd "$APP_DIR/front-end"
npm ci
npm run build

# Restart backend
echo "→ Restarting backend service..."
sudo systemctl restart embr3-server

echo "✅ Redeployment complete!"
echo "   Check status: sudo systemctl status embr3-server"
echo "   View logs:    sudo journalctl -u embr3-server -f"
