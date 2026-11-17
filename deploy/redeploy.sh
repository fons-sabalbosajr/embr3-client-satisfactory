#!/usr/bin/env bash
# =============================================================================
# EMB R3 OCSM – Quick Redeploy Script
# Run on the VPS as the app user:
#   sudo -iu embapp bash -c 'cd /opt/embr3-csm && ./deploy/redeploy.sh'
# Pulls main (and release tags), rebuilds, restarts, then health-checks.
# =============================================================================

set -euo pipefail

APP_DIR="/opt/embr3-csm"

echo "🔄 Redeploying EMB R3 OCSM..."

# Pull latest if git is configured
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  echo "→ Currently on: $(git describe --tags --always 2>/dev/null || echo unknown)"
  echo "→ Pulling latest code and release tags..."
  git fetch --tags origin
  git pull --ff-only origin main
fi

# Backend
echo "→ Installing server dependencies..."
cd "$APP_DIR/server"
npm ci --omit=dev

# Frontend
echo "→ Building frontend..."
cd "$APP_DIR/front-end"
npm ci
npm run build

# Restart backend
echo "→ Restarting backend service..."
sudo systemctl restart embr3-server

# Health check (reads only PORT from server/.env)
PORT="$(grep -E '^PORT=' "$APP_DIR/server/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '\r"'"'" || true)"
PORT="${PORT:-5001}"
echo "→ Waiting for the API on port $PORT..."
HEALTHY=""
for _ in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then HEALTHY=1; break; fi
  sleep 2
done

cd "$APP_DIR"
VERSION="$(git describe --tags --always 2>/dev/null || echo unknown)"
if [ -n "$HEALTHY" ]; then
  echo "✅ Redeployment complete — now running $VERSION"
else
  echo "⚠️  Deployed $VERSION but the API did not answer on port $PORT."
  echo "   Check: sudo journalctl -u embr3-server -n 50 --no-pager"
  exit 1
fi
echo "   Check status: sudo systemctl status embr3-server"
echo "   View logs:    sudo journalctl -u embr3-server -f"
