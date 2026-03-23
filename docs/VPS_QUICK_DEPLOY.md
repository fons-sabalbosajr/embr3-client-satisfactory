# OCSM — Quick Deploy from GitHub (Hostinger VPS Terminal)

> One-page guide for deploying updates from GitHub to the Hostinger VPS.
> For full initial setup, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

## Prerequisites

| Item | Value |
|------|-------|
| VPS IP | `72.61.125.232` |
| Domain | `embr3-onlinesystems.cloud` |
| App user | `embapp` |
| App path | `/opt/embr3-csm` |
| OCSM URL | `https://embr3-onlinesystems.cloud/ocsm/` |
| Backend port | `5001` (set in `server/.env`) |
| Node.js | v20+ (verify: `node -v`) |
| GitHub repo | `fons-sabalbosajr/embr3-client-satisfactory` |

---

## First-Time Git Setup on VPS

Run these commands **once** on the VPS to connect the app directory to GitHub.

### Option A — HTTPS (simplest, uses a Personal Access Token)

```bash
# 1. Go to https://github.com/settings/tokens → Generate new token (classic)
#    Select scopes: repo (full control)
#    Copy the token (starts with ghp_...)

# 2. On VPS, configure git
sudo -iu embapp   # switch to embapp user
cd /opt/embr3-csm

git init
git remote add origin https://github.com/fons-sabalbosajr/embr3-client-satisfactory.git
git fetch origin main
git checkout -f main    # WARNING: overwrites local files with GitHub version

# Git will ask for username/password — use:
#   Username: fons-sabalbosajr
#   Password: <paste your Personal Access Token>

# To save credentials so you don't re-enter each time:
git config credential.helper store
```

### Option B — SSH Deploy Key (more secure, no password prompts)

```bash
# 1. On VPS, generate a deploy key
sudo -iu embapp
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""

# 2. Copy the public key
cat ~/.ssh/github_deploy.pub
# → Go to GitHub repo → Settings → Deploy keys → Add deploy key
# → Paste the public key, give it a title like "VPS Deploy", check "Allow write access" if needed

# 3. Configure SSH to use this key for GitHub
cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF

# 4. Clone/init
cd /opt/embr3-csm
git init
git remote add origin git@github.com:fons-sabalbosajr/embr3-client-satisfactory.git
git fetch origin main
git checkout -f main
```

---

## Deploy Steps (Run on VPS Terminal)

Open the **Hostinger VPS Terminal** (hPanel → VPS → Terminal) or SSH in.

### Quick Deploy (one-liner)

```bash
sudo -iu embapp bash -c 'cd /opt/embr3-csm && ./deploy/redeploy.sh'
```

### Step-by-Step Deploy

```bash
# 1. Switch to app user
sudo -iu embapp
cd /opt/embr3-csm

# 2. Pull latest code from GitHub
git pull origin main

# 3. Install/update server dependencies
cd server
npm ci --production

# 4. Install frontend dependencies & build
cd ../front-end
npm ci
npm run build

# 5. Restart the backend service
sudo systemctl restart embr3-server

# 6. Verify everything is running
sudo systemctl status embr3-server          # should say "active (running)"
curl -s http://localhost:5001/api/health     # should return {"status":"ok"}
ls dist/assets/ | grep 'index-.*\.js$'      # shows the new bundle filename
```

### Frontend-Only Deploy (no backend changes)

```bash
sudo -iu embapp
cd /opt/embr3-csm/front-end
git pull origin main
npm ci
npm run build
# No restart needed — Nginx serves static files directly
```

### Backend-Only Deploy (no frontend changes)

```bash
sudo -iu embapp
cd /opt/embr3-csm
git pull origin main
cd server
npm ci --production
sudo systemctl restart embr3-server
```

---

## Important Notes

### The `.env` file is NOT in git

The server's `.env` file (`/opt/embr3-csm/server/.env`) contains secrets and is **never** pushed to GitHub.
If you need to edit it:

```bash
sudo -iu embapp
nano /opt/embr3-csm/server/.env
# After editing, restart the backend:
sudo systemctl restart embr3-server
```

Key settings in `server/.env`:
```
PORT=5001                                # Must match Nginx proxy_pass port
NODE_ENV=production
CLIENT_ORIGIN=https://embr3-onlinesystems.cloud
FRONTEND_URL=https://embr3-onlinesystems.cloud/ocsm
MONGO_URI=mongodb+srv://...             # Your MongoDB Atlas connection string
JWT_SECRET=...                          # Random secret for auth tokens
SMTP_HOST=smtp.gmail.com               # Email config
SMTP_USER=...
SMTP_PASS=...                          # Gmail App Password (16 chars)
```

See `deploy/.env.production.example` for a full template with all variables.

### Nginx Configuration

The Nginx config is at `/etc/nginx/sites-available/embr3-hr-pms`.
It serves **two apps** on the same domain:

| App | URL Path | Backend Port |
|-----|----------|-------------|
| OCSM | `/ocsm/` | 5001 |
| HRPMS | `/hrpms/` | 5000 |

If you need to edit Nginx:
```bash
sudo nano /etc/nginx/sites-available/embr3-hr-pms
sudo nginx -t          # test config (must pass!)
sudo systemctl reload nginx
```

### Allow `embapp` to restart the service without a password

By default, `embapp` doesn't have sudo privileges. Run this **once as root** so `embapp` can restart the backend without needing a password:

```bash
echo 'embapp ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart embr3-server, /usr/bin/systemctl status embr3-server, /usr/bin/systemctl stop embr3-server, /usr/bin/systemctl start embr3-server' | tee /etc/sudoers.d/embapp-service
```

If `sudo` still asks for a password when running as `embapp`, exit back to root and restart from there:

```bash
exit                                    # return to root
systemctl restart embr3-server
systemctl status embr3-server
```

### fail2ban

The VPS has fail2ban protecting SSH. If your IP gets banned (too many failed login attempts):

```bash
# From VPS terminal (Hostinger panel):
sudo fail2ban-client set sshd unbanip YOUR_IP_ADDRESS

# Check banned IPs:
sudo fail2ban-client status sshd
```

---

## Monitoring & Troubleshooting

```bash
# Live backend logs
sudo journalctl -u embr3-server -f

# Last 50 log lines
sudo journalctl -u embr3-server -n 50 --no-pager

# Backend status
sudo systemctl status embr3-server

# Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Check ports in use
sudo ss -tlnp | grep -E '5000|5001|80|443'

# Disk space
df -h

# Memory
free -h
```

---

## Workflow Summary

```
Local Machine                    GitHub                     VPS
─────────────                    ──────                     ───
1. Edit code
2. Test locally
3. git commit
4. git push origin main  ──────▷  repo updated
                                                    5. Open Hostinger Terminal
                                                    6. sudo -iu embapp
                                                    7. cd /opt/embr3-csm
                                                    8. git pull origin main
                                                    9. npm ci (server & frontend)
                                                   10. npm run build (frontend)
                                                   11. sudo systemctl restart embr3-server
                                                   12. Verify with curl & browser
```
