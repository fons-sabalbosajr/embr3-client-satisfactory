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

---

## 1. Architecture Overview

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
│                                  │ /api/* /socket.io/*   │
│                           ┌──────▽─────────────┐        │
│                           │  Node.js (Express)  │        │
│                           │  Port 5000          │        │
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
3. Create a database user with read/write privileges
4. Under **Network Access**, add your VPS IP address (or `0.0.0.0/0` for testing)
5. Copy the connection string — you'll need it for `MONGO_URI`

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

### 3.4 Update system packages

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 4. Automated Deployment

The fastest way to deploy. This script handles everything:

### 4.1 Upload project files to VPS

```bash
# From your LOCAL machine — upload the full project
scp -r ./embr3-client-satisfactory root@YOUR_VPS_IP:/tmp/embr3-upload
```

### 4.2 Run the setup script on the VPS

```bash
ssh root@YOUR_VPS_IP

# Move files to deployment directory
mkdir -p /opt/embr3-csm
cp -r /tmp/embr3-upload/* /opt/embr3-csm/

# Edit configuration in the script first
nano /opt/embr3-csm/deploy/setup-vps.sh
# Set DOMAIN="yourdomain.com" if you have a domain

# Run
chmod +x /opt/embr3-csm/deploy/setup-vps.sh
sudo /opt/embr3-csm/deploy/setup-vps.sh
```

### 4.3 Configure environment variables

```bash
# Copy the template and edit
cp /opt/embr3-csm/deploy/.env.production.example /opt/embr3-csm/server/.env
nano /opt/embr3-csm/server/.env
```

Fill in your actual values. See [Section 6](#6-environment-variables) for details.

### 4.4 Create frontend production env

```bash
cp /opt/embr3-csm/deploy/.env.frontend.production /opt/embr3-csm/front-end/.env.production
nano /opt/embr3-csm/front-end/.env.production
# Set VITE_APP_URL=https://yourdomain.com (or http://YOUR_VPS_IP)
```

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
sudo useradd -m -s /bin/bash embapp
sudo mkdir -p /opt/embr3-csm
sudo chown -R embapp:embapp /opt/embr3-csm
```

### 5.4 Upload and install project

```bash
# Upload files to /opt/embr3-csm (scp, rsync, or git clone)

# Backend
cd /opt/embr3-csm/server
sudo -u embapp npm ci --production

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

```bash
sudo cp /opt/embr3-csm/deploy/nginx-embr3.conf /etc/nginx/sites-available/embr3-csm
sudo ln -sf /etc/nginx/sites-available/embr3-csm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Environment Variables

### Server (`server/.env`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `production` | Enables production mode |
| `PORT` | ✅ | `5000` | Backend server port |
| `SERVER_HOST` | ✅ | `127.0.0.1` | Bind to localhost only (Nginx handles public) |
| `MONGO_URI` | ✅ | `mongodb+srv://user:pass@cluster.mongodb.net/db` | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | *(64+ char random string)* | JWT signing secret |
| `CLIENT_ORIGIN` | ✅ | `https://yourdomain.com` | CORS allowed origin |
| `FRONTEND_URL` | ✅ | `https://yourdomain.com` | Used in password reset / verification emails |
| `FORCE_SMTP` | ✅ | `true` | Force SMTP email transport |
| `SMTP_HOST` | ✅ | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | ✅ | `465` | SMTP port |
| `SMTP_SECURE` | ✅ | `true` | Use TLS |
| `SMTP_USER` | ✅ | `your@gmail.com` | SMTP username |
| `SMTP_PASS` | ✅ | `xxxx xxxx xxxx xxxx` | Gmail App Password |
| `EMAIL_USER` | ✅ | `your@gmail.com` | Email sender address |
| `EMAIL_PASS` | ✅ | `xxxx xxxx xxxx xxxx` | Same as SMTP_PASS |
| `EMAIL_FROM` |  | `EMB Region III Online CSM Portal` | Display name in emails |
| `MENU_SECRET_KEY` |  | *(any string)* | Menu obfuscation key |
| `SECRET_KEY` |  | *(any string)* | Client-side encryption key |
| `COLOR_SCHEME_SECRET` |  | *(any string)* | Theme persistence key |

### Generate a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (`front-end/.env.production`)

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
sudo certbot --nginx -d yourdomain.com

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
- **Frontend**: Open `http://YOUR_VPS_IP` (or `https://yourdomain.com`)
- **Backend health**: `curl http://localhost:5000/api/health`
- **Admin panel**: Navigate to `/admin`
- **Survey**: Navigate to `/client`

---

## 9. Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

**Important**: Port 5000 is NOT opened to the public. Nginx proxies requests internally.

---

## 10. Verifying the Deployment

Run these checks after deployment:

```bash
# 1. Backend is running
sudo systemctl status embr3-server

# 2. Backend responds on localhost
curl -s http://127.0.0.1:5000/api/health
# Expected: {"status":"ok"}

# 3. Nginx is running
sudo systemctl status nginx

# 4. Frontend loads
curl -s -o /dev/null -w "%{http_code}" http://YOUR_VPS_IP/
# Expected: 200

# 5. API through Nginx
curl -s http://YOUR_VPS_IP/api/health
# Expected: {"status":"ok"}

# 6. SSL (if domain configured)
curl -s https://yourdomain.com/api/health
# Expected: {"status":"ok"}

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
sudo -u embapp git pull

# Rebuild backend
cd server && sudo -u embapp npm ci --production

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
ps aux | grep node
```

---

## 13. Backup & Restore

### MongoDB Atlas
MongoDB Atlas provides automatic daily backups (on M10+ clusters). For M0/free:

```bash
# Manual backup using mongodump
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/db" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/db" /backups/20260216/
```

### Application files

```bash
# Backup env and uploads
sudo tar -czf /backups/embr3-env-$(date +%Y%m%d).tar.gz /opt/embr3-csm/server/.env
```

---

## 14. Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u embr3-server -n 50 --no-pager

# Common causes:
# - Missing .env file or MONGO_URI/JWT_SECRET not set
# - Port 5000 already in use: sudo lsof -i :5000
# - Node.js version too old: node -v (needs 20+)
```

### Nginx returns 502 Bad Gateway

```bash
# Backend is not running
sudo systemctl status embr3-server

# Wrong proxy port — ensure server/.env has PORT=5000
grep PORT /opt/embr3-csm/server/.env

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
grep -A5 "socket.io" /etc/nginx/sites-available/embr3-csm

# Check backend Socket.IO is listening
curl http://127.0.0.1:5000/socket.io/?EIO=4&transport=polling
```

### Emails not sending

```bash
# Check backend logs for SMTP errors
sudo journalctl -u embr3-server | grep -i "mail\|smtp\|email"

# Verify Gmail:
# 1. 2-Step Verification is ENABLED on the Gmail account
# 2. App Password is generated (Security → App Passwords)
# 3. App Password is exactly 16 characters in .env (no spaces)
```

### MongoDB connection failed

```bash
# Test from VPS
node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI || 'YOUR_URI')
    .then(() => { console.log('Connected!'); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
"

# Common causes:
# - VPS IP not whitelisted in MongoDB Atlas Network Access
# - Wrong username/password in connection string
# - Missing database name in URI
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
| Health check | `curl http://localhost:5000/api/health` |
