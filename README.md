# EMBR3 OCSM — Online Client Satisfaction Measurement

EMBR3 OCSM is the online client feedback system of the **Environmental Management Bureau Region III** (DENR, Philippines). Clients answer a short, anonymous survey after a transaction, on their phone or at the office. Staff then review the responses and generate the reports required by the **Anti-Red Tape Authority (ARTA)** under Republic Act No. 11032.

**Live:** https://embr3-onlinesystems.cloud/ocsm/ · **Current release:** v1.0.0 (see [CHANGELOG.md](CHANGELOG.md))

---

## Features

### Client survey (public, no account)
- A three-step survey: primary info, Citizen's Charter awareness, and the Service Quality Dimensions (SQD).
- Available in English and Filipino, for external and internal clients.
- Reachable by QR code or link from the landing page.

### Admin panel (staff)
- **Dashboard and Measurement Data:** browse, filter, edit and review responses.
- **Reports:** ARTA CSM reports, plus Extract Data to Excel or CSV.
- **Announcements**, and **My Account** with per-user light/dark mode and colour themes.
- **VERA:** an AI assistant (Google Gemini) that answers questions about the system and the data.

### Developer tools (Developer accounts only, enforced by the server)
- **Accounts and access:** roles (Viewer / Editor / Administrator) and staff permissions.
- **Maintenance mode:** takes the system offline for everyone except developers.
- **System & Config:** server, database and email health, plus a cache reload.
- **Data Configuration:** survey questions and services.
- **Backup, App Logs** and VERA settings.

## Tech stack

| Layer | Stack |
|-------|-------|
| Web app (`front-end/`) | React 18, Vite 7, Ant Design 5, React Router, i18next, ExcelJS |
| API (`server/`) | Node.js 20+, Express, Mongoose, Socket.IO, JWT auth |
| Database | MongoDB Atlas |
| AI assistant | Google Gemini via `@google/genai` (model chosen in settings) |
| Hosting | Ubuntu VPS: Nginx serves the built app at `/ocsm/` and proxies `/ocsm/api` to the Node service (systemd) |

## Repository layout

```
front-end/   React web app (public survey + admin panel)
server/      Express API, Mongoose models, middleware, VERA provider
deploy/      Nginx config, systemd unit, redeploy/setup scripts, .env templates
docs/        Deployment, maintenance, UAT and VERA guides
CHANGELOG.md Release notes (one entry per version tag)
```

## Getting started (local development)

**Prerequisites:**
- Node.js 20 or newer
- A MongoDB connection string (Atlas or local)

```bash
git clone https://github.com/fons-sabalbosajr/embr3-client-satisfactory.git
cd embr3-client-satisfactory
```

### 1. Server

```bash
cd server
cp ../deploy/.env.production.example .env   # then fill in your own values
npm install
npm run dev                                 # nodemon, http://127.0.0.1:5001
```

These are the minimum `server/.env` settings for local work. The template documents every option.

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for signing sign-in tokens |
| `PORT`, `SERVER_HOST`, `SERVER_PORT` | Use `5001`, `127.0.0.1`, `5001`. The web dev server reads these to find the API |
| `NODE_ENV` | Use `development` locally (the template is set to `production`) |
| `CLIENT_ORIGIN`, `FRONTEND_URL` | Browser origin and app URL, e.g. `http://localhost:5174` and `http://localhost:5174/ocsm` |
| `FRONTEND_BASE_PATH` | `/ocsm/` |
| `COLOR_SCHEME_SECRET`, `MENU_SECRET_KEY`, `SECRET_KEY` | Values for obscuring browser storage. They are sent to every visitor, so don't reuse real passwords |
| `SMTP_*` / `EMAIL_*` | Mail account for verification and password-reset emails |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional: enables VERA (the key can also be saved in Settings → VERA Assistant) |

### 2. Web app

```bash
cd front-end
npm install
npm run dev        # http://localhost:5174/ocsm/
```

`/ocsm/api` and Socket.IO are proxied to the server address in `server/.env`. Optional build-time settings, such as the public URL and the service lists, are documented in `deploy/.env.frontend.production`.

### 3. First account

Create an account on the admin sign-in page and verify it by email.

To make an account a **Developer**, set its `position` field to `Developer` directly in the database (the `users` collection). For security, no page or API request can grant it. Developer access unlocks the Developer menu. From there, Developer Settings → Accounts manages everyone else's roles.

## Build and deploy

```bash
cd front-end && npm run build    # outputs dist/, served by Nginx at /ocsm/
cd server && npm start           # node server.js
```

Production runs on a VPS. After pushing to `main`, run the redeploy script on the server. It pulls the code, installs, builds, restarts the service and checks health:

```bash
sudo -iu <app-user> bash -c 'cd <app-dir> && ./deploy/redeploy.sh'
```

The guides cover the details:
- [docs/VPS_QUICK_DEPLOY.md](docs/VPS_QUICK_DEPLOY.md): routine releases, `.env` changes, troubleshooting
- [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md): first-time server setup, Nginx, SSL, security checklist
- [docs/MAINTENANCE_GUIDE.md](docs/MAINTENANCE_GUIDE.md): operations and monitoring

## Versioning

Releases follow [semantic versioning](https://semver.org) and are tagged `vX.Y.Z`. To release:
1. Bump `version` in `front-end/package.json` and `server/package.json`.
2. Add a [CHANGELOG.md](CHANGELOG.md) entry.
3. Commit, tag and push:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin main --follow-tags
   ```
4. Run the redeploy script on the server.

The running version is shown at the bottom of the admin sidebar.

## More documentation

- [docs/UAT_CLIENT_SURVEY.md](docs/UAT_CLIENT_SURVEY.md): user-acceptance test script for the survey
- [docs/VERA_ASSISTANT.md](docs/VERA_ASSISTANT.md): how VERA works and how to configure it

## Security

- **Never commit secrets.** `.env` files, credentials and backups are git-ignored and live only on the server.
- **The `deploy/*.example` files are templates.** They contain placeholders only.
- **Access is enforced by the API, not just hidden in the UI.** Developer-only actions require a Developer account.
- **Reporting:** to report a security issue, contact the EMB Region III OCSM team privately rather than opening a public issue.

---

© Environmental Management Bureau Region III · Department of Environment and Natural Resources
