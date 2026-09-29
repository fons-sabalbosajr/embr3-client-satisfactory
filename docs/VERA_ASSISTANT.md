# VERA — Virtual Evaluation & Response Assistant

VERA is the OCSM's in-app assistant. Unlike a help-desk bot, the admin-side VERA is an
**insight analyst**: every answer is grounded in live aggregates computed from the
survey collection (response volume, SQD scores per dimension, Citizen's Charter
awareness, top services, customer mix, monthly trend, latest remarks) and written
as a short brief — headline → key figures → what it means → suggested action.

| Surface | Route | Who | What it answers |
| --- | --- | --- | --- |
| Admin widget (bottom-right of every admin page) | `POST /api/vera/chat` | any logged-in user | Survey figures, trends, remarks, ARTA scoring, how to use each admin page |
| Dashboard card | — | any logged-in user | Rotating tips; "Ask VERA" opens the widget with a seeded question |
| Landing-page widget | `POST /api/vera/public-chat` | anonymous | What the survey is, how long it takes, privacy, survey types, languages — **no data** |
| Settings → VERA Assistant | `GET/PUT /api/vera/settings` | Manage Users permission or Developer | Provider, model, key, tone, starters, live-data window, limits, logging |

## Modes

* **Rule-based (default, no key)** — VERA still answers data questions from the live
  figures (weakest/strongest dimension, services, awareness, remarks, counts, scores)
  and how-to questions from its help library (`server/utils/veraKnowledge.js`).
* **Model** — choose Anthropic (Claude) or Google Gemini in the settings page and
  paste an API key. The key is stored AES-256-GCM encrypted (`server/utils/secretBox.js`)
  and is never returned to the browser. If a model call fails VERA degrades to the
  rule-based answer and flags it.

## Server environment (optional)

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Takes precedence over a key stored from the UI |
| `ANTHROPIC_MODEL` / `GEMINI_MODEL` | Default model when none is set in the UI |
| `SECRET_ENCRYPTION_KEY` | 64 hex chars used to encrypt the stored key (falls back to a key derived from `JWT_SECRET`) |

Claude requests use adaptive thinking with the configured effort, and opt into
server-side refusal fallbacks (`server-side-fallback-2026-07-01`), retrying once in
the plain shape if the deployment rejects the beta.

## Guard rails

* Input sanitised and capped (1,000 chars); output rendered as plain text.
* Credentials / env / connection-string questions are refused for every role.
* Admin VERA reports aggregates only — it refuses to look up a named client's contact details.
* Public VERA never receives insights; data questions get a fixed "no access" reply.
* Rate limits: 40 req/min per IP on `/api/vera`, a per-visitor window on the public chat,
  a per-user daily limit (settings), and an 8-second duplicate guard.
* Usage is written to the `Log` collection with `type: "vera"` (metadata by default).

## Files

```
server/routes/vera.js            endpoints
server/utils/veraAssistant.js    guards, retrieval, prompt, fallback
server/utils/veraInsights.js     live aggregates + rule-based briefs
server/utils/veraKnowledge.js    admin + public help library
server/utils/veraProvider.js     Anthropic / Gemini adapter, masked status
server/models/AppSettings.js     settings document (vera sub-schema)
front-end/src/components/Vera/   VeraChat, VeraCard, VeraFlameIcon
front-end/src/components/Settings/VeraSettings/
```

`server/utils/responseClassifier.js` mirrors `front-end/src/utils/responseClassifier.js`
— keep both in sync when survey option wording changes.
