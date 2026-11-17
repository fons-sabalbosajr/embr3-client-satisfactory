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

Open the **Hostinger VPS Terminal** (hPanel → VPS → Terminal) or SSH in. The
terminal logs you in as `root`.

> **Ground rules (each one has broken a deploy before):**
> - **Run git and npm as `embapp`, never as root.** Root-owned files in
>   `.git`, `node_modules` or `dist` make the next pull fail with
>   `insufficient permission for adding an object to repository database`.
> - **Keep `sudo -iu embapp bash -c '…'` commands on one line.** A command
>   split with `\` line breaks fails with `cd: too many arguments`, because
>   `sudo -i` re-escapes the text.
> - **Never run `npm audit fix` / `npm audit fix --force` on the VPS.** It
>   rewrites `package.json` (it once downgraded `exceljs` 4 → 3, which breaks
>   the exports) and blocks the next pull. Fix audit warnings on your PC, test,
>   and release.
> - **Don't edit tracked files on the VPS.** Change them locally and push.
>   Only `server/.env` and `front-end/.env.production` live on the VPS.

### Quick Deploy (one-liner, run as root)

```bash
sudo -iu embapp bash -c 'cd /opt/embr3-csm && ./deploy/redeploy.sh'
```

`redeploy.sh` does all of this:
1. Fetches `main` and the release tags, then fast-forwards.
2. Runs `npm ci` for the server and the front end.
3. Builds the front end and restarts `embr3-server`.
4. Waits for `/api/health`.

It ends with:

```
✅ Redeployment complete — now running v1.0.0
```

If the API doesn't come up, it prints a warning and exits with an error.

### After deploying

```bash
curl -s http://127.0.0.1:5001/api/health; echo           # {"status":"ok"}
curl -s http://127.0.0.1:5001/api/system/status; echo    # "enabled":false unless maintenance is on
sudo -iu embapp git -C /opt/embr3-csm describe --tags     # e.g. v1.0.0
```

Then in the browser:
1. Hard-refresh (Ctrl+Shift+R).
2. Check the version at the bottom of the admin sidebar.

### Step-by-Step Deploy

```bash
# 1. Switch to app user (from root)
sudo -iu embapp
cd /opt/embr3-csm

# 2. Pull latest code and tags from GitHub
git fetch --tags origin
git pull --ff-only origin main

# 3. Install/update server dependencies
cd server
npm ci --omit=dev

# 4. Install frontend dependencies & build
cd ../front-end
npm ci
npm run build

# 5. Restart the backend service
sudo systemctl restart embr3-server

# 6. Verify everything is running
sudo systemctl status embr3-server          # should say "active (running)"
curl -s http://127.0.0.1:5001/api/health     # should return {"status":"ok"}
git describe --tags                          # the version now running
```

### Frontend-Only or Backend-Only Deploy

Most releases change both sides, and the server and front end must match: a
new front end calls API routes that an old server doesn't have. Use the full
deploy unless you're sure only one side changed.

```bash
# Frontend only — no restart needed, Nginx serves dist/ directly
sudo -iu embapp bash -c 'cd /opt/embr3-csm && git pull --ff-only origin main && cd front-end && npm ci && npm run build'

# Backend only
sudo -iu embapp bash -c 'cd /opt/embr3-csm && git pull --ff-only origin main && cd server && npm ci --omit=dev && sudo systemctl restart embr3-server'
```

---

## When a Deploy Fails

### `Your local changes … would be overwritten by merge`

Someone edited tracked files on the VPS. Look first:

```bash
sudo -iu embapp bash -c 'cd /opt/embr3-csm && git status --short && git diff --stat'
```

- **`0` lines changed** (only the file mode differs): set
  `core.fileMode false` (see below).
- **Changes to `package.json` or `package-lock.json`**: almost always left
  by `npm install` or `npm audit fix`. Don't keep them.

Set them aside (recoverable) and deploy:

```bash
sudo -iu embapp bash -c 'cd /opt/embr3-csm && git stash push -m vps-local-$(date +%Y%m%d) && git pull --ff-only origin main && chmod +x deploy/*.sh && ./deploy/redeploy.sh'
```

`git stash list` shows what was set aside. Once the site checks out:

```bash
sudo -iu embapp git -C /opt/embr3-csm stash drop
```

### `insufficient permission for adding an object to repository database`

A git or npm command was run as root. Check what's affected, then give the
folder back to `embapp`:

```bash
find /opt/embr3-csm -not -user embapp -printf '%u %p\n' 2>/dev/null | grep -v '/node_modules/' | head -20
chown -R embapp:embapp /opt/embr3-csm
chmod 600 /opt/embr3-csm/server/.env
```

Then run the Quick Deploy again.

### `cd: too many arguments`

The `sudo -iu embapp bash -c '…'` command was split over several lines.
Paste it as a single line.

### Permission-only changes on every pull

Make git ignore file-mode differences on the VPS (once):

```bash
sudo -iu embapp git -C /opt/embr3-csm config core.fileMode false
```

### Deploy finished but the site looks old

1. Hard-refresh the browser.
2. Check that `git describe --tags` shows the new version.
3. Check that `ls /opt/embr3-csm/front-end/dist/assets | grep '^index-.*\.js$'`
   changed.

---

## Important Notes

### The `.env` file is NOT in git

The server's `.env` file (`/opt/embr3-csm/server/.env`) contains secrets and is **never** pushed to GitHub.
It must stay owned by `embapp` with mode `600`.

1. Back up the file (`-p` keeps owner and mode; `.gitignore` already ignores the backup):

   ```bash
   cp -p /opt/embr3-csm/server/.env /opt/embr3-csm/server/.env.bak-$(date +%Y%m%d)
   ```

2. Edit it, either by hand or with commands.

   By hand (as `embapp`):

   ```bash
   sudo -u embapp nano /opt/embr3-csm/server/.env
   ```

   Or set variables without opening an editor. This replaces existing values
   and adds missing ones:

   ```bash
   ENV=/opt/embr3-csm/server/.env
   sudo -u embapp sed -i -e '$a\' "$ENV"
   for kv in GEMINI_MODEL=gemini-3.5-flash GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite; do
     k=${kv%%=*}
     if grep -q "^$k=" "$ENV"; then sudo -u embapp sed -i "s|^$k=.*|$kv|" "$ENV"
     else echo "$kv" | sudo -u embapp tee -a "$ENV" >/dev/null; fi
   done
   ```

3. Check the result without printing secrets:

   ```bash
   grep -E '^GEMINI_(MODEL|FALLBACK_MODEL)=' "$ENV"
   grep -q '^GEMINI_API_KEY=..' "$ENV" && echo "Gemini key: set" || echo "Gemini key: not in .env"
   ls -l "$ENV"      # -rw------- embapp embapp
   ```

4. Restart so the new values load. `redeploy.sh` also does this.

   ```bash
   sudo systemctl restart embr3-server
   ```

The VERA Gemini key may live in the database instead of the `.env`, since it
can be saved encrypted in Settings → VERA Assistant. If "not in .env" shows
above, check that page. The model picked there also overrides `GEMINI_MODEL`.

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
GEMINI_MODEL=gemini-3.5-flash          # VERA default model
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
```

See `deploy/.env.production.example` for a full template with all variables.

### Versions and releases

Each release is a git tag such as `v1.0.0`, and [CHANGELOG.md](../CHANGELOG.md) lists what changed.

To release:
1. Bump `version` in `front-end/package.json` and `server/package.json`.
2. Add a CHANGELOG entry.
3. Commit, then tag and push:
   ```bash
   git tag -a v1.0.1 -m "v1.0.1"
   git push origin main --follow-tags
   ```
4. On the VPS, run the Quick Deploy. It ends with the version it deployed.

To check what the VPS is running: `sudo -iu embapp git -C /opt/embr3-csm describe --tags`. The admin sidebar footer shows the same version.

| Release | Date | Notes |
|---------|------|-------|
| v1.0.0 | 2026-11-17 | First versioned release, deployed to production |

To roll back to an earlier release (front end and server together, as `embapp`):
```bash
sudo -iu embapp
cd /opt/embr3-csm && git checkout v1.0.0
cd server && npm ci --omit=dev && cd ../front-end && npm ci && npm run build
sudo systemctl restart embr3-server
# Afterwards, return to the latest: cd /opt/embr3-csm && git checkout main && ./deploy/redeploy.sh
```

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
2. Test locally (npm run build)
3. Bump versions + CHANGELOG
4. git commit
5. git tag -a vX.Y.Z
6. git push origin main
   --follow-tags         ──────▷  repo + tag updated
                                                    7. Open Hostinger Terminal (root)
                                                    8. (only if .env changes) back up + edit server/.env
                                                    9. sudo -iu embapp bash -c 'cd /opt/embr3-csm && ./deploy/redeploy.sh'
                                                       → pull, npm ci, build, restart, health check
                                                   10. curl /api/health + /api/system/status
                                                   11. Browser: hard-refresh, check sidebar version
```

There is no GitHub Actions pipeline. "CI/CD" here means: push to GitHub, then
run `redeploy.sh` on the VPS.
