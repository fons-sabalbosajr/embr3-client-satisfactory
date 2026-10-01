#!/usr/bin/env bash
# =============================================================================
# EMB Region III – Online CSM Portal
# Hostinger KVM 2 VPS – One-shot Deployment Script
# =============================================================================
# Run this script ON the VPS as root (or with sudo) after initial OS setup.
# Tested on Ubuntu 22.04 / 24.04 LTS.
#
# Usage:
#   chmod +x deploy/setup-vps.sh
#   sudo ./deploy/setup-vps.sh
# =============================================================================

set -euo pipefail

# --------------- Configuration -----------------------------------------------
APP_USER="embapp"
APP_DIR="/opt/embr3-csm"
REPO_URL=""  # Set this if cloning from git, otherwise we assume files are uploaded
NODE_VERSION="20"
DOMAIN=""  # Set your domain, e.g., csm.emb3.gov.ph (leave empty for IP-only access)
# Backend port. Must match PORT in server/.env. The live VPS uses 5001 because
# 5000 is already taken by the HRPMS app on the same host.
BACKEND_PORT="5001"

# NOTE: this script sets up a single app at the domain ROOT. The live VPS serves
# OCSM under /ocsm/ alongside HRPMS — see deploy/nginx-embr3.conf before using
# this on a host that already runs another app.

echo "============================================="
echo " EMB R3 OCSM – VPS Deployment Setup"
echo "============================================="

# --------------- 1. System updates & essentials ------------------------------
echo "[1/8] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git build-essential nginx certbot python3-certbot-nginx ufw

# --------------- 2. Node.js via NodeSource -----------------------------------
echo "[2/8] Installing Node.js ${NODE_VERSION}.x..."
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_VERSION" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node -v)  npm: $(npm -v)"

# --------------- 3. Create app user & directory ------------------------------
echo "[3/8] Setting up application user and directory..."
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# --------------- 4. Copy / Clone app files -----------------------------------
echo "[4/8] Deploying application files..."
if [ -n "$REPO_URL" ]; then
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR" 2>/dev/null || {
    cd "$APP_DIR" && sudo -u "$APP_USER" git pull
  }
else
  echo "  ⚠ REPO_URL not set. Please upload files to $APP_DIR manually."
  echo "  Then re-run this script or continue with steps below."
fi

# --------------- 5. Install dependencies & build ----------------------------
echo "[5/8] Installing dependencies and building..."
cd "$APP_DIR/server"
sudo -u "$APP_USER" npm ci --production

cd "$APP_DIR/front-end"
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build

# --------------- 6. Systemd service for Node backend -------------------------
echo "[6/9] Creating systemd service..."
if [ -f "$APP_DIR/deploy/embr3-server.service" ]; then
  cp "$APP_DIR/deploy/embr3-server.service" /etc/systemd/system/
  # Patch paths if APP_DIR or APP_USER differ from defaults
  sed -i "s|/opt/embr3-csm|${APP_DIR}|g" /etc/systemd/system/embr3-server.service
  sed -i "s|User=embapp|User=${APP_USER}|g" /etc/systemd/system/embr3-server.service
else
  cat > /etc/systemd/system/embr3-server.service <<EOF
[Unit]
Description=EMB R3 OCSM Backend Server
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/server/.env
TimeoutStopSec=15
MemoryMax=2G
CPUQuota=150%
StandardOutput=journal
StandardError=journal
SyslogIdentifier=embr3-server
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_DIR}/server
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

[Install]
WantedBy=multi-user.target
EOF
fi

systemctl daemon-reload
systemctl enable embr3-server

# --------------- 7. Nginx reverse proxy -------------------------------------
echo "[7/9] Configuring Nginx..."
NGINX_SERVER_NAME="${DOMAIN:-_}"

# Deliberately NOT copying deploy/nginx-embr3.conf here. That file documents the
# live subdirectory deployment (/ocsm/ on HTTPS, certbot certificate paths); on a
# fresh host those certificates do not exist yet and `nginx -t` below would fail.
# Generate a plain HTTP root-path config instead, then run certbot, which rewrites
# this file to add TLS:
#   sudo certbot --nginx -d yourdomain.com
cat > /etc/nginx/sites-available/embr3-csm <<EOF
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;

server {
    listen 80;
    server_name ${NGINX_SERVER_NAME};
    client_max_body_size 10M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    root ${APP_DIR}/front-end/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|webp|avif)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\.(?!well-known) {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/embr3-csm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# --------------- 8. Firewall -------------------------------------------------
echo "[8/9] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# --------------- 9. Health check cron ----------------------------------------
echo "[9/9] Setting up health check cron job..."
if [ -f "$APP_DIR/deploy/healthcheck.sh" ]; then
  chmod +x "$APP_DIR/deploy/healthcheck.sh"
  # Install cron job — every 5 minutes
  CRON_LINE="*/5 * * * * ${APP_DIR}/deploy/healthcheck.sh >> /var/log/embr3-health.log 2>&1"
  (crontab -l 2>/dev/null | grep -v "healthcheck.sh"; echo "$CRON_LINE") | crontab -
  echo "  Health check cron installed (every 5 min)"
fi

echo ""
echo "============================================="
echo " Deployment setup complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Create server .env from template:"
echo "       cp $APP_DIR/deploy/.env.production.example $APP_DIR/server/.env"
echo "       nano $APP_DIR/server/.env"
echo "     Required values: MONGO_URI, JWT_SECRET, CLIENT_ORIGIN, FRONTEND_URL, SMTP_*"
echo ""
echo "  2. Create frontend .env.production:"
echo "       cp $APP_DIR/deploy/.env.frontend.production $APP_DIR/front-end/.env.production"
echo "       nano $APP_DIR/front-end/.env.production"
echo "     Set VITE_APP_URL to: https://${DOMAIN:-YOUR_DOMAIN}"
echo ""
echo "  3. Rebuild frontend with production env:"
echo "       cd $APP_DIR/front-end && sudo -u $APP_USER npm run build"
echo ""
echo "  4. Start the backend:"
echo "       sudo systemctl start embr3-server"
echo "       sudo systemctl status embr3-server"
echo ""
if [ -n "$DOMAIN" ]; then
echo "  5. Enable HTTPS with Let's Encrypt:"
echo "       sudo certbot --nginx -d ${DOMAIN}"
echo ""
fi
echo "  6. Verify:"
echo "       curl http://127.0.0.1:${BACKEND_PORT}/api/health"
echo ""
echo "  7. View logs:"
echo "       sudo journalctl -u embr3-server -f"
echo ""
echo "  Full guide: $APP_DIR/docs/DEPLOYMENT_GUIDE.md"
echo "============================================="
