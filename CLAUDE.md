# Setup instructions for Claude

You are helping the user run **aka** — a local web app that searches their company directory (Humaans) and links each person to their Slack profile. Everything runs on the user's machine; nothing is deployed.

Your job: get the app running locally at `http://localhost:3000`. Follow the steps below in order. Ask the user only the questions explicitly listed — don't invent extras.

---

## What the user gets when it works

A page with a search box. They type "Sasha designer" and get a ranked list of matching colleagues with role, location, and an "Open in Slack →" button on each card.

---

## Prerequisites

- **Node.js ≥ 16** — check with `node --version`. If missing, ask the user to install from https://nodejs.org.
- **A Humaans Personal Access Token** — required. The user gets it from `Settings → API` in their Humaans workspace. Without this, the app cannot fetch employee data.
- **A Slack `users.list` dump (optional)** — a JSON file with workspace members. Without it the app still works but the "Open in Slack" buttons will show "No Slack profile". See the Slack dump section below for how to obtain.

---

## Step 1 — Install dependencies

```bash
npm install
```

This is safe to re-run. It only downloads packages into `node_modules/`.

---

## Step 2 — Create `.env` from the example

If `.env` already exists, **do not overwrite it**. Otherwise:

```bash
cp .env.example .env
```

Then open `.env` and ask the user to fill in:

| Variable | Required | Notes |
|---|---|---|
| `HUMAANS_API_KEY` | **Yes** | Personal Access Token from Humaans Settings → API |
| `SLACK_WORKSPACE` | No, but recommended | Your Slack workspace subdomain (e.g. for `manychat.slack.com`, set to `manychat`). Defaults to `manychat`. |
| `SLACK_USERS_FILE` | No | Path to the Slack users dump. Defaults to `./data/slack_users.json`. |
| `PORT` | No | Default `3000`. |
| `NICKNAME_FILE_PATH` | No | Default `./data/names.json` (already committed). |

The `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN`, `SLACK_CHANNEL_ID` variables at the bottom of `.env.example` are **only** needed if the user wants to run the original Slack bot (`npm run bot`). For the web UI they can be left blank.

**You cannot read `.env` directly** (permission-restricted in most environments). Ask the user to confirm the values are saved, or to paste back the non-secret ones if you need to verify.

---

## Step 3 — (Optional) Add the Slack users dump

If the user wants real Slack profile links, they need to drop a JSON file at `data/slack_users.json`. **This file is in `.gitignore`** — do not commit it; it contains employee emails.

Acceptable file formats (the loader auto-detects):
- Raw response from Slack's `users.list` API: `{ "members": [...], "response_metadata": {...} }`
- Raw response from `admin.users.list`: `{ "results": [...], "next_marker": "..." }`
- A bare JSON array of user objects

Each user object must have at least `id` and `profile.email`. Bots, deleted users, and `USLACKBOT` are filtered automatically.

**Pagination matters.** Slack returns ~50–200 users per page. If the dump only has one page (e.g. 50 entries) you'll only get Slack links for ~50 colleagues. The dump needs to follow `next_cursor` / `next_marker` until exhausted, concatenating all pages into a single `results` (or `members`) array.

If the user doesn't have a dump yet, that's fine — skip this step. The app will run, just without working Slack buttons.

---

## Step 4 — Start the server

```bash
npm start
```

Expected output:

```
🔄 Syncing Humaans...
✅ Loaded N Slack users from ./data/slack_users.json    (or warning if no file)
✅ Synced 417 employees
🌐 aka search UI: http://localhost:3000
```

The Humaans sync takes a few seconds (3 API calls — people, job-roles, locations). It runs **once at startup**; to refresh data, restart the server.

Tell the user to open `http://localhost:3000` in their browser.

---

## Step 5 — Verify it works

Curl the API to confirm the search returns results:

```bash
curl -s 'http://localhost:3000/api/search?q=designer' | head -c 200
```

You should see a JSON response with `"count"` > 0 and a `results` array. If the user provided a Slack dump, some results should have a non-null `slackProfileUrl` field.

---

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `❌ Humaans sync failed: 401` or `403` | Wrong / expired `HUMAANS_API_KEY` | Regenerate in Humaans Settings → API |
| `❌ Humaans sync failed: ENOTFOUND` | Network / DNS issue | Check connectivity, retry |
| `✅ Loaded 0 Slack users` despite a non-empty file | File format not recognized | Check the file has `members`, `results`, `data`, or `users` as the top-level array key, or is a bare array |
| All cards show "No Slack profile" | Either no dump file, or none of the emails match | Verify `data/slack_users.json` exists and that the emails inside match the `@manychat.com` (or your domain) emails in Humaans |
| Some cards show "No Slack profile" but others don't | Dump only contains one page of users | Re-export with full pagination |
| Server prints `Nicknames file not found` | `NICKNAME_FILE_PATH` points somewhere that doesn't exist | Default is `./data/names.json` which is committed — set the env var correctly or remove it |
| Search returns 0 results for a real name | Person's `status` in Humaans isn't `active`, or their job-role's `effectiveDate` is in the future | Expected — only active employees with a current role are searchable |

---

## What the codebase contains (so you can answer follow-up questions)

```
src/
  server.js        # HTTP server (Node http module, no Express) — entry for `npm start`
  search.js        # findPeople(query) → scored matches; searchPerson() → string for CLI/bot
  humaans.js       # Humaans API client, paginates /people /job-roles /locations
  slack-users.js   # Loads workspace members from local JSON file (or Slack API if token set)
  cli.js           # Terminal interface — `npm run search -- "<query>"`
  index.js         # Original Slack bot (Bolt + Socket Mode) — only `npm run bot`
data/
  names.json       # Russian/Ukrainian nickname dictionary (committed)
  slack_users.json # Slack users dump — provided by user, gitignored
public/
  index.html       # Single-page web UI served at /
```

The web UI is the primary workflow. The Slack bot (`npm run bot`) is legacy and requires `xapp-` + `xoxb-` tokens; do not set it up unless the user explicitly asks.

---

## Things to ask the user (only when needed)

- **At Step 2**, if `.env` is missing: "Do you have a Humaans API token? I'll need it to fetch employee data."
- **At Step 3**, if `data/slack_users.json` is missing: "Do you have a Slack users.list dump to drop in? Without it, the app works but Slack profile buttons will be inactive. Want to skip for now?"
- **At Step 4**, if startup fails: read the error message and use the troubleshooting table above before asking the user.

Don't ask about: ports, file paths, nickname file location, or anything else with a sensible default.
