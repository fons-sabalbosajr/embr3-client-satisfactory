# EMB Region III — Online Client Satisfaction Measurement

## Hostinger KVM 2 VPS Deployment Guide

This guide walks through deploying the EMBR3 OCSM application to a **Hostinger KVM 2 VPS** (2 vCPU, 8 GB RAM, 100 GB NVMe) running Ubuntu 22.04 or 24.04 LTS.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)  
2. [Prerequisites](#2-prerequisites)  
3. [VPS Initial Setup](#3-vps-initial-setup)  
4. [Automated Deployment](#4-automated-deployment)  
5. [Manual Deployment](#5-manual-deployment)  
6. [Environment Variables](#6-environment-variables)  
7. [SSL / HTTPS Setup](#7-ssl--https-setup)  
8. [Starting the Application](#8-starting-the-application)  
9. [Firewall Configuration](#9-firewall-configuration)  
10. [Verifying the Deployment](#10-verifying-the-deployment)  
11. [Updating / Redeploying](#11-updating--redeploying)  
12. [Monitoring & Logs](#12-monitoring--logs)  
13. [Backup & Restore](#13-backup--restore)  
14. [Troubleshooting](#14-troubleshooting)  
15. [Security Checklist](#15-security-checklist)

---

## 1. Architecture Overview

> **How the live EMB R3 VPS actually runs:** OCSM is one of six applications
> sharing `embr3-onlinesystems.cloud`, served under the `/ocsm/` path prefix on
> backend port **5001**. Bare `/api/` and `/socket.io/` at the domain root belong
> to **HRPMS** on port 5000, and `/` redirects to `/hrpms/`. See
> `deploy/nginx-embr3.conf` for the routing and its constraints.
>
> The diagram below describes a **dedicated single-app host**, which is what
> `deploy/setup-vps.sh` builds.

```
┌─────────────────────────────────────────────────────────┐
│  Hostinger KVM 2 VPS  (Ubuntu 22.04/24.04 LTS)         │
│                                                         │
│  ┌──────────┐   :80/443   ┌────────────────────┐        │
│  │  Client   │──────────▷│     Nginx           │        │
│  │ (Browser) │            │  • static files     │        │
│  └──────────┘             │  • reverse proxy    │        │
│                           │  • gzip / cache     │        │
│                           │  • SSL termination  │        │
│                           └──────┬─────────────┘        │
│                                  │ /ocsm/api/*           │
│                                  │ /ocsm/socket.io/*     │
│                           ┌──────▽─────────────┐        │
│                           │  Node.js (Express)  │        │
│                           │  Port 5001          │        │
│                           │  + Socket.IO        │        │
│                           └──────┬─────────────┘        │
│                                  │                       │
│                           ┌──────▽─────────────┐        │
│                           │  MongoDB Atlas      │        │
│                           │  (cloud cluster)    │        │
│                           └────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

| Component | Technology | Details |
|-----------|-----------|---------|
| Frontend  | React 18 + Vite | Ant Design + Mantine UI, built to static files |
| Backend  | Node.js 20 + Express 5 | REST API + Socket.IO for real-time updates |
| Database | MongoDB Atlas | Cloud-hosted, connection via `MONGO_URI` |
| Web Server | Nginx | Reverse proxy, TLS, static assets, gzip |
| Process Manager | systemd | Auto-restart, boot-start, logging |

---

## 2. Prerequisites

### On your local machine
- Git installed
- Project source code ready to upload
- MongoDB Atlas cluster created (free M0 tier works)
- Gmail App Password generated (for email verification)

### Hostinger VPS
- **Plan**: KVM 2 (2 vCPU / 8 GB RAM / 100 GB NVMe)
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS
- **Root/sudo access** via SSH
- **Domain (optional)**: DNS A record pointing to VPS IP

### MongoDB Atlas Setup
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster (M0)
3. Create a dedicated database user with only the privileges required by this application
4. Under **Network Access**, allow only your VPS public IP address
   - Avoid `0.0.0.0/0`; use it only during a short, supervised test window, then remove it immediately
5. Copy the connection string and store it only in `server/.env` on the VPS — never commit it to Git, paste it into issues, or include it in screenshots

---

## 3. VPS Initial Setup

### 3.1 Connect via SSH

```bash
ssh root@YOUR_VPS_IP
```

### 3.2 Create a non-root user (recommended)

```bash
adduser deploy
usermod -aG sudo deploy
```

### 3.3 Set up SSH key authentication (recommended)

```bash
# On your LOCAL machine:
ssh-copy-id deploy@YOUR_VPS_IP
```

After confirming that key-based login works, harden SSH:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sudo sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
```

Keep your current SSH session open and verify a new `deploy@YOUR_VPS_IP` login before closing it.

### 3.4 Update system packages

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 4. Automated Deployment

The fastest way to deploy. This script handles everything:

### 4.1 Upload project files to VPS

```bash
# From your LOCAL machine — upload the full project over SSH as the non-root deploy user
rsync -az --delete ./embr3-client-satisfactory/ deploy@YOUR_VPS_IP:/tmp/embr3-upload/
```

### 4.2 Run the setup script on the VPS

```bash
ssh deploy@YOUR_VPS_IP

# Move files to deployment directory
sudo mkdir -p /opt/embr3-csm
sudo rsync -a /tmp/embr3-upload/ /opt/embr3-csm/
sudo chown -R embapp:embapp /opt/embr3-csm

# Edit configuration in the script first
sudo nano /opt/embr3-csm/deploy/setup-vps.sh
# Set DOMAIN="yourdomain.com" if you have a domain

# Run
sudo chmod +x /opt/embr3-csm/deploy/setup-vps.sh
sudo /opt/embr3-csm/deploy/setup-vps.sh
```

### 4.3 Configure environment variables

```bash
# Copy the template and edit with strict file permissions
sudo install -o embapp -g embapp -m 600 /opt/embr3-csm/deploy/.env.production.example /opt/embr3-csm/server/.env
sudo -u embapp nano /opt/embr3-csm/server/.env
```

Fill in your actual values. See [Section 6](#6-environment-variables) for details.

### 4.4 Create frontend production env

```bash
sudo install -o embapp -g embapp -m 600 /opt/embr3-csm/deploy/.env.frontend.production /opt/embr3-csm/front-end/.env.production
sudo -u embapp nano /opt/embr3-csm/front-end/.env.production
# Set VITE_APP_URL=https://yourdomain.com
```

Avoid using `http://YOUR_VPS_IP` for production because browsers, cookies, and credentials are safer over HTTPS.

### 4.5 Rebuild frontend with production env

```bash
cd /opt/embr3-csm/front-end
sudo -u embapp npm run build
```

### 4.6 Start the application

```bash
sudo systemctl start embr3-server
sudo systemctl status embr3-server
```

---

## 5. Manual Deployment

If you prefer step-by-step control:

### 5.1 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should show v20.x
npm -v
```

### 5.2 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 5.3 Create application user

```bash
sudo useradd -r -m -s /usr/sbin/nologin embapp
sudo mkdir -p /opt/embr3-csm
sudo chown -R embapp:embapp /opt/embr3-csm
sudo chmod 750 /opt/embr3-csm
```

### 5.4 Upload and install project

```bash
# Upload files to /opt/embr3-csm (rsync or git clone over SSH).
# Do not upload .env files to GitHub or public locations.

# Backend
cd /opt/embr3-csm/server
sudo -u embapp npm ci --omit=dev

# Frontend
cd /opt/embr3-csm/front-end
sudo -u embapp npm ci
sudo -u embapp npm run build
```

### 5.5 Configure systemd service

```bash
sudo cp /opt/embr3-csm/deploy/embr3-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable embr3-server
```

### 5.6 Configure Nginx

> ⚠️ **On the existing EMB R3 VPS, do not follow the commands below.** That host
> serves six applications from one shared server block at
> `/etc/nginx/sites-available/embr3-hr-pms`. Installing a second site file that
> claims the same `server_name` will shadow or break the others. Edit the shared
> file by hand instead, using `deploy/nginx-embr3.conf` as the reference for the
> OCSM blocks:
>
> ```bash
> sudo nano /etc/nginx/sites-available/embr3-hr-pms
> sudo nginx -t && sudo systemctl reload nginx
> ```
>
> `deploy/nginx-embr3.conf` is an excerpt of `location` blocks, not a complete
> site file — it cannot be copied into `sites-available` as-is.

For a **dedicated host running only OCSM**, generate a complete config with
`deploy/setup-vps.sh`, then enable TLS:

```bash
sudo ./deploy/setup-vps.sh
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 6. Environment Variables

### Server (`server/.env`)

Do not commit this file. It must be owned by the application user and readable only by that user:

```bash
sudo chown embapp:embapp /opt/embr3-csm/server/.env
sudo chmod 600 /opt/embr3-csm/server/.env
```

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `production` | Enables production mode |
| `PORT` | ✅ | `5001` | Backend port. 5000 is HRPMS on the shared VPS |
| `SERVER_HOST` | ✅ | `127.0.0.1` | Bind to localhost only (Nginx handles public) |
| `MONGO_URI` | ✅ | `<mongodb-atlas-uri-from-secret-store>` | MongoDB Atlas connection string; never paste real credentials into docs, tickets, screenshots, shell history, or Git |
| `JWT_SECRET` | ✅ | `<64-plus-character-random-secret>` | JWT signing secret |
| `CLIENT_ORIGIN` | ✅ | `https://yourdomain.com` | CORS allowed origin; use HTTPS in production |
| `FRONTEND_URL` | ✅ | `https://yourdomain.com` | Used in password reset / verification emails |
| `FORCE_SMTP` | ✅ | `true` | Force SMTP email transport |
| `SMTP_HOST` | ✅ | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | ✅ | `465` | SMTP port |
| `SMTP_SECURE` | ✅ | `true` | Use TLS |
| `SMTP_USER` | ✅ | `<smtp-account-email>` | SMTP username |
| `SMTP_PASS` | ✅ | `<smtp-app-password>` | SMTP app password; never reuse your account password |
| `EMAIL_USER` | ✅ | `<sender-email>` | Email sender address |
| `EMAIL_PASS` | ✅ | `<smtp-app-password>` | Same secret as `SMTP_PASS`, if required by the app |
| `EMAIL_FROM` |  | `EMB Region III Online CSM Portal` | Display name in emails |
| `MENU_SECRET_KEY` |  | `<random-secret>` | Menu obfuscation key |
| `SECRET_KEY` |  | `<random-secret>` | Client-side encryption key |
| `COLOR_SCHEME_SECRET` |  | `<random-secret>` | Theme persistence key |

### Generate strong secrets

```bash
# JWT_SECRET, MENU_SECRET_KEY, SECRET_KEY, COLOR_SCHEME_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

If any real value was ever committed, shared in chat, pasted into an issue, or exposed in logs, rotate it immediately before continuing.

### Frontend (`front-end/.env.production`)

Values prefixed with `VITE_` are bundled into the browser build and are public. Do not put secrets in frontend environment variables.

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_APP_URL` | ✅ | `https://yourdomain.com` | Public URL for QR codes |

> **Note**: In production with Nginx, the frontend is served as static files. `VITE_API_BASE` does **not** need to be set because API calls use the relative `/api` prefix, and Nginx proxies them to the backend.

---

## 7. SSL / HTTPS Setup

### Using Let's Encrypt (free)

```bash
# Install certbot (already included in setup script)
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically. Test it:
sudo certbot renew --dry-run
```

### DNS Setup
Point your domain's **A record** to your VPS IP address:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `YOUR_VPS_IP` | 300 |
| A | www | `YOUR_VPS_IP` | 300 |

---

## 8. Starting the Application

```bash
# Start the backend
sudo systemctl start embr3-server

# Check status
sudo systemctl status embr3-server

# The frontend is served automatically by Nginx from /opt/embr3-csm/front-end/dist
```

### Verify
- **Frontend**: Open `https://yourdomain.com/ocsm/` on the shared EMB R3 VPS, or `https://yourdomain.com` on a dedicated OCSM host
- **Backend health**: `curl http://127.0.0.1:5001/api/health`
- **Admin panel**: Navigate to `/ocsm/admin` on the shared EMB R3 VPS, or `/admin` on a dedicated OCSM host
- **Survey**: Navigate to `/ocsm/client` on the shared EMB R3 VPS, or `/client` on a dedicated OCSM host

---

## 9. Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

**Important**: Backend ports must not be opened to the public. On the shared VPS, OCSM port `5001` and HRPMS port `5000` should only be reachable locally through Nginx.

---

## 10. Verifying the Deployment

Run these checks after deployment:

```bash
# 1. Backend is running
sudo systemctl status embr3-server

# 2. Backend responds on localhost
curl -s http://127.0.0.1:5001/api/health
# Expected: {"status":"ok"}

# 3. Nginx is running
sudo systemctl status nginx

# 4. Frontend loads over HTTPS
curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/ocsm/
# Expected: 200

# 5. API through Nginx on the shared VPS path prefix
curl -s https://yourdomain.com/ocsm/api/health
# Expected: {"status":"ok"}

# 6. SSL certificate and redirect
curl -I http://yourdomain.com/ocsm/
# Expected: 301/308 redirect to https://yourdomain.com/ocsm/

# 7. WebSocket connectivity
# Open browser → F12 → Network → WS tab → check socket.io connection
```

---

## 11. Updating / Redeploying

### Using the redeploy script

```bash
# Upload new files to /opt/embr3-csm, then:
cd /opt/embr3-csm
sudo -u embapp ./deploy/redeploy.sh
```

### Manual update

```bash
cd /opt/embr3-csm

# Pull latest code (if using git)
sudo -u embapp git pull --ff-only

# Rebuild backend
cd server && sudo -u embapp npm ci --omit=dev

# Rebuild frontend
cd ../front-end && sudo -u embapp npm ci && sudo -u embapp npm run build

# Restart backend
sudo systemctl restart embr3-server
```

### Zero-downtime considerations
The systemd service has `Restart=always` and `RestartSec=5`. During restart there will be ~2-3 seconds of downtime for API calls. Frontend static files remain available throughout.

---

## 12. Monitoring & Logs

### Backend logs

```bash
# Follow real-time logs
sudo journalctl -u embr3-server -f

# Last 100 lines
sudo journalctl -u embr3-server -n 100

# Logs since today
sudo journalctl -u embr3-server --since today

# Logs from last hour
sudo journalctl -u embr3-server --since "1 hour ago"
```

Do not paste full logs into public issues or chat. Redact tokens, emails, MongoDB URIs, SMTP credentials, reset links, and any request bodies containing personal data.

### Nginx logs

```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log
```

### System resources

```bash
# CPU, memory, disk
htop
df -h
free -h

# Node.js process
pgrep -a node
```

---

## 13. Backup & Restore

### MongoDB Atlas
MongoDB Atlas provides automatic daily backups on paid clusters. For free/shared clusters, use manual exports and store them encrypted with strict permissions.

```bash
# Create a root-only backup directory
sudo install -d -m 700 /backups

# Prompt for the URI so it is not saved in shell history.
# Do not paste real credentials directly into this guide, Git, tickets, or screenshots.
read -rsp "MongoDB URI: " MONGO_URI; echo
mongodump --uri="$MONGO_URI" --archive="/backups/embr3-$(date +%Y%m%d).archive" --gzip
unset MONGO_URI

# Restore from an encrypted/private backup location
read -rsp "MongoDB URI: " MONGO_URI; echo
mongorestore --uri="$MONGO_URI" --archive="/backups/embr3-YYYYMMDD.archive" --gzip --drop
unset MONGO_URI
```

For higher-security environments, run backup and restore commands from a locked-down admin host and rotate database credentials after emergency restores.

### Application files

```bash
# Backup env and uploads into a root-readable-only archive
sudo install -d -m 700 /backups
sudo tar --warning=no-file-changed -czf /backups/embr3-env-$(date +%Y%m%d).tar.gz /opt/embr3-csm/server/.env
sudo chmod 600 /backups/embr3-env-*.tar.gz
```

Do not copy `.env` backups to public storage, Git repositories, shared drives, or unencrypted laptops.

---

## 14. Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u embr3-server -n 50 --no-pager

# Common causes:
# - Missing .env file or MONGO_URI/JWT_SECRET not set
# - Port 5001 already in use: sudo lsof -i :5001
# - Node.js version too old: node -v (needs 20+)
```

### Nginx returns 502 Bad Gateway

```bash
# Backend is not running
sudo systemctl status embr3-server

# Wrong proxy port — ensure server/.env has PORT=5001 without printing secrets
grep '^PORT=' /opt/embr3-csm/server/.env

# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log
```

### Frontend shows blank page

```bash
# Check if dist folder exists and has files
ls -la /opt/embr3-csm/front-end/dist/

# Rebuild if needed
cd /opt/embr3-csm/front-end
sudo -u embapp npm run build
```

### Socket.IO not connecting

```bash
# Ensure Nginx websocket proxy is configured
grep -A5 "socket.io" /etc/nginx/sites-available/embr3-hr-pms

# Check backend Socket.IO is listening
curl 'http://127.0.0.1:5001/socket.io/?EIO=4&transport=polling'
```

### Emails not sending

```bash
# Check backend logs for SMTP errors and redact sensitive output before sharing
sudo journalctl -u embr3-server | grep -i "mail\|smtp\|email"

# Verify Gmail:
# 1. 2-Step Verification is ENABLED on the Gmail account
# 2. App Password is generated (Security → App Passwords)
# 3. App Password is stored only in /opt/embr3-csm/server/.env with chmod 600
```

### MongoDB connection failed

```bash
# Test from VPS without hard-coding credentials
cd /opt/embr3-csm/server
sudo -u embapp node -r dotenv/config -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI)
    .then(() => { console.log('Connected!'); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
"

# Common causes:
# - VPS IP not whitelisted in MongoDB Atlas Network Access
# - Wrong username/password in connection string
# - Missing database name in URI
# - Credentials were rotated but server/.env was not updated
```

### High memory usage

```bash
# Check what's using memory
free -h
ps aux --sort=-%mem | head -5

# Restart the backend
sudo systemctl restart embr3-server
```

---

## 15. Security Checklist

Before going live:

- [ ] No real secrets are committed in Git history, docs, issues, screenshots, or chat messages
- [ ] Any secret that may have been exposed has been rotated (`MONGO_URI`, `JWT_SECRET`, SMTP app passwords, API keys)
- [ ] `server/.env` exists only on the VPS and is `chmod 600`
- [ ] Frontend `VITE_*` variables contain only public values
- [ ] MongoDB Atlas Network Access allows only the VPS public IP, not `0.0.0.0/0`
- [ ] MongoDB Atlas database user has least-privilege permissions for the application database
- [ ] SSH root login and password authentication are disabled after key-based access is confirmed
- [ ] UFW allows only SSH, HTTP, and HTTPS; backend ports are private
- [ ] Production URLs use HTTPS, and HTTP redirects to HTTPS
- [ ] Logs and backups are redacted/encrypted before sharing or moving off-server
- [ ] `.env`, backup archives, and uploads are excluded from Git and public storage

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start backend | `sudo systemctl start embr3-server` |
| Stop backend | `sudo systemctl stop embr3-server` |
| Restart backend | `sudo systemctl restart embr3-server` |
| View status | `sudo systemctl status embr3-server` |
| View live logs | `sudo journalctl -u embr3-server -f` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Test Nginx config | `sudo nginx -t` |
| Renew SSL | `sudo certbot renew` |
| Check disk space | `df -h` |
| Rebuild frontend | `cd /opt/embr3-csm/front-end && npm run build` |
| Health check | `curl http://127.0.0.1:5001/api/health` |
