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
echo "[6/8] Creating systemd service..."
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

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_DIR}/server
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable embr3-server

# --------------- 7. Nginx reverse proxy -------------------------------------
echo "[7/8] Configuring Nginx..."
NGINX_SERVER_NAME="${DOMAIN:-_}"

cat > /etc/nginx/sites-available/embr3-csm <<EOF
server {
    listen 80;
    server_name ${NGINX_SERVER_NAME};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    # Frontend static files
    root ${APP_DIR}/front-end/dist;
    index index.html;

    # API & WebSocket proxy to Node backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
        proxy_connect_timeout 10s;

        # Rate limiting (additional nginx layer)
        limit_req zone=api burst=20 nodelay;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    # SPA fallback — serve index.html for all non-file routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting zone
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
EOF

ln -sf /etc/nginx/sites-available/embr3-csm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# --------------- 8. Firewall -------------------------------------------------
echo "[8/8] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "============================================="
echo " Deployment setup complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Copy your server .env to: $APP_DIR/server/.env"
echo "     Update these values for production:"
echo "       NODE_ENV=production"
echo "       SERVER_HOST=127.0.0.1"
echo "       SERVER_PORT=5000"
echo "       CLIENT_ORIGIN=https://${DOMAIN:-YOUR_DOMAIN}"
echo "       FRONTEND_URL=https://${DOMAIN:-YOUR_DOMAIN}"
echo ""
echo "  2. Start the backend:"
echo "       sudo systemctl start embr3-server"
echo "       sudo systemctl status embr3-server"
echo ""
if [ -n "$DOMAIN" ]; then
echo "  3. Enable HTTPS with Let's Encrypt:"
echo "       sudo certbot --nginx -d ${DOMAIN}"
echo ""
fi
echo "  4. View logs:"
echo "       sudo journalctl -u embr3-server -f"
echo ""
echo "  5. To redeploy after code changes:"
echo "       cd $APP_DIR && sudo -u $APP_USER ./deploy/redeploy.sh"
echo "============================================="
