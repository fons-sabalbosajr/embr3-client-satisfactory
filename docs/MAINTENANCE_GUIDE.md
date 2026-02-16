# EMBR3 OCSM — Maintenance & Operations Guide

## Hostinger KVM 2 VPS

This guide covers day-to-day operations, maintenance tasks, and incident response for the deployed application.

---

## Table of Contents

1. [Service Management](#1-service-management)
2. [Log Management](#2-log-management)  
3. [SSL Certificate Maintenance](#3-ssl-certificate-maintenance)  
4. [Database Maintenance](#4-database-maintenance)  
5. [System Updates](#5-system-updates)  
6. [Performance Monitoring](#6-performance-monitoring)  
7. [Incident Response](#7-incident-response)  
8. [Scaling Considerations](#8-scaling-considerations)

---

## 1. Service Management

### Application (Node.js backend)

```bash
# Status
sudo systemctl status embr3-server

# Start / Stop / Restart
sudo systemctl start embr3-server
sudo systemctl stop embr3-server
sudo systemctl restart embr3-server

# View service configuration
sudo systemctl cat embr3-server

# Disable auto-start on boot
sudo systemctl disable embr3-server

# Re-enable auto-start
sudo systemctl enable embr3-server
```

### Nginx

```bash
# Status
sudo systemctl status nginx

# Reload (after config change — no downtime)
sudo nginx -t && sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx
```

### Reboot recovery

Both `embr3-server` and `nginx` are set to start automatically on boot. After a VPS reboot:

```bash
# Verify both are running
sudo systemctl status embr3-server nginx
```

---

## 2. Log Management

### Backend application logs

Logs are managed by systemd's `journald`:

```bash
# Real-time follow
sudo journalctl -u embr3-server -f

# Last N lines
sudo journalctl -u embr3-server -n 200 --no-pager

# Time-range query
sudo journalctl -u embr3-server --since "2025-01-01 00:00" --until "2025-01-02 00:00"

# Errors only
sudo journalctl -u embr3-server -p err

# Export to file
sudo journalctl -u embr3-server --since today > /tmp/backend-logs-today.txt
```

### Nginx access & error logs

```bash
# Access log (all HTTP requests)
sudo tail -f /var/log/nginx/access.log

# Error log (failures, upstreams)
sudo tail -f /var/log/nginx/error.log

# Count requests by status code
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Top 10 requesting IPs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10
```

### Log rotation

Nginx logs are rotated automatically by `logrotate`. Journald logs are limited by disk usage. To manage:

```bash
# Check journal disk usage
journalctl --disk-usage

# Trim to last 7 days
sudo journalctl --vacuum-time=7d

# Trim to 500MB
sudo journalctl --vacuum-size=500M
```

---

## 3. SSL Certificate Maintenance

### Let's Encrypt auto-renewal

Certbot installs a systemd timer for auto-renewal:

```bash
# Check timer status
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Certificate expiry check

```bash
# Check expiry dates
sudo certbot certificates

# Or via openssl
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

Certificates expire every 90 days. The auto-renewal timer runs twice daily and renews when ≤30 days remain.

---

## 4. Database Maintenance

### MongoDB Atlas Dashboard

Access at [cloud.mongodb.com](https://cloud.mongodb.com) for:
- Real-time performance metrics
- Slow query analysis
- Connection monitoring
- Automated backup management

### Manual backup (from VPS)

```bash
# Install mongodump (mongosh tools)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-database-tools

# Create backup
BACKUP_DIR="/opt/backups/mongodb/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR"

# Compress
tar -czf "${BACKUP_DIR}.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"
```

### Connection monitoring

```bash
# Check current connections from VPS
sudo journalctl -u embr3-server | grep -i "connect\|disconnect" | tail -20
```

### Network Access

When your VPS IP changes, update MongoDB Atlas → Network Access → IP Access List.

---

## 5. System Updates

### OS security patches

```bash
# Check for updates
sudo apt update

# Install security patches only
sudo apt upgrade -y --only-upgrade

# Full upgrade
sudo apt full-upgrade -y

# Reboot if kernel was updated
sudo reboot
```

### Node.js updates

```bash
# Check current version
node -v

# Update Node.js 20.x (stays on LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Rebuild node_modules after Node update
cd /opt/embr3-csm/server
sudo -u embapp npm ci --production
cd /opt/embr3-csm/front-end
sudo -u embapp npm ci
sudo -u embapp npm run build

# Restart
sudo systemctl restart embr3-server
```

### Nginx updates

```bash
sudo apt update && sudo apt install -y nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Performance Monitoring

### Quick health check

```bash
# System overview
htop

# Disk usage
df -h

# Memory
free -h

# Backend process
ps aux | grep node

# Check if backend responds
curl -s -w "\n%{http_code} %{time_total}s\n" http://127.0.0.1:5000/api/health
```

### Create a simple monitoring script

Save as `/opt/embr3-csm/deploy/healthcheck.sh`:

```bash
#!/bin/bash
# Quick health check for EMBR3 OCSM

STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health)
if [ "$STATUS" != "200" ]; then
    echo "[$(date)] ALERT: Backend returned $STATUS — restarting..."
    sudo systemctl restart embr3-server
    # Optional: send email/notification
fi
```

Add to cron for automated checks:

```bash
# Check every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/embr3-csm/deploy/healthcheck.sh >> /var/log/embr3-health.log 2>&1") | crontab -
```

---

## 7. Incident Response

### Backend is down

```bash
# 1. Check if process is running
sudo systemctl status embr3-server

# 2. Check logs for crash reason
sudo journalctl -u embr3-server -n 50 --no-pager

# 3. Check memory (OOM killer may have killed Node)
dmesg | grep -i "oom\|kill" | tail -5

# 4. Restart
sudo systemctl restart embr3-server
```

### Nginx returns 502

```bash
# Backend is down → restart it
sudo systemctl restart embr3-server

# Wait 3 seconds then test
sleep 3 && curl http://127.0.0.1:5000/api/health
```

### Disk full

```bash
# Find large files
sudo du -sh /var/log/* | sort -hr | head -10
sudo du -sh /opt/embr3-csm/* | sort -hr | head -10

# Clear old logs
sudo journalctl --vacuum-size=200M
sudo truncate -s 0 /var/log/nginx/access.log

# Remove old Node.js cache
sudo rm -rf /opt/embr3-csm/front-end/node_modules/.vite
```

### High CPU / memory

```bash
# Find top processes
top -bn1 | head -15

# Check Node.js memory usage
ps -o pid,rss,vsz,comm -p $(pgrep -f "node.*server")

# Restart if needed
sudo systemctl restart embr3-server
```

### Rate limiting triggering on legitimate users

```bash
# Check Nginx rate limit logs
grep "limiting requests" /var/log/nginx/error.log | tail -20

# Temporarily increase rate limit in Nginx config
sudo nano /etc/nginx/sites-available/embr3-csm
# Change: limit_req_zone ... rate=10r/s → rate=30r/s
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Scaling Considerations

### Current capacity (KVM 2)

| Resource | Limit | Expected Usage |
|----------|-------|----------------|
| vCPU | 2 | ~5-15% normal |
| RAM | 8 GB | ~200-500 MB (Node.js + Nginx) |
| Storage | 100 GB NVMe | ~500 MB app + logs |
| Bandwidth | Unmetered | Depends on survey traffic |

The KVM 2 plan can comfortably handle **500+ concurrent survey users**.

### When to scale up

- CPU consistently above 70%
- RAM usage above 6 GB
- Response times above 2 seconds
- Connection errors in Nginx logs

### Horizontal scaling options

1. **Upgrade VPS plan** — simplest option, add more CPU/RAM
2. **Separate frontend** — serve static files from a CDN (Cloudflare)
3. **MongoDB Atlas upgrade** — move to M10+ for better performance and automated backups
4. **Load balancer** — only needed for very high traffic

---

## Common Operations Cheatsheet

| Task | Command |
|------|---------|
| Deploy update | `cd /opt/embr3-csm && sudo ./deploy/redeploy.sh` |
| Check backend | `sudo systemctl status embr3-server` |
| View logs | `sudo journalctl -u embr3-server -f` |
| Restart all | `sudo systemctl restart embr3-server nginx` |
| Disk space | `df -h` |
| Memory | `free -h` |
| Renew SSL | `sudo certbot renew` |
| Test Nginx | `sudo nginx -t` |
| Create admin | `cd /opt/embr3-csm/server && node scripts/elevateUser.js email@example.com` |
