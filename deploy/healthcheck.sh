#!/usr/bin/env bash
# =============================================================================
# EMB R3 OCSM – Health Check Script
# =============================================================================
# Checks if the backend is responding and restarts it if not.
# Add to cron for automated monitoring:
#   */5 * * * * /opt/embr3-csm/deploy/healthcheck.sh >> /var/log/embr3-health.log 2>&1
# =============================================================================

set -euo pipefail

SERVICE_NAME="embr3-server"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# Read the port from server/.env so this never drifts from the running service.
# This VPS hosts a second app (HRPMS) on port 5000 — hardcoding the wrong port
# would health-check the other app and restart this one for no reason.
ENV_FILE="/opt/embr3-csm/server/.env"
BACKEND_PORT="$(sed -n 's/^[[:space:]]*PORT[[:space:]]*=[[:space:]]*\([0-9]\+\).*/\1/p' "$ENV_FILE" 2>/dev/null | head -1)"
BACKEND_PORT="${BACKEND_PORT:-5001}"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}/api/health"

# Check if backend responds within 10 seconds
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    # Healthy — only log every 12th check (once per hour if running every 5 min)
    CHECK_COUNT_FILE="/tmp/embr3-health-count"
    COUNT=$(cat "$CHECK_COUNT_FILE" 2>/dev/null || echo "0")
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge 12 ]; then
        echo "[$TIMESTAMP] OK — backend healthy (hourly log)"
        COUNT=0
    fi
    echo "$COUNT" > "$CHECK_COUNT_FILE"
else
    echo "[$TIMESTAMP] WARN — backend returned HTTP $HTTP_STATUS — restarting $SERVICE_NAME..."
    sudo systemctl restart "$SERVICE_NAME"
    sleep 5

    # Re-check after restart
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "[$TIMESTAMP] OK — backend recovered after restart"
    else
        echo "[$TIMESTAMP] CRITICAL — backend still down after restart (HTTP $HTTP_STATUS)"
        # Uncomment to send email alert:
        # echo "EMBR3 OCSM backend is down" | mail -s "ALERT: OCSM Backend Down" admin@yourdomain.com
    fi
fi
