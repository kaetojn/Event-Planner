# Plan A

A planner for people who like to know how the day will go. A plan holds a timeline for each day, a checklist and a budget, for a weekend away, a trip, a birthday, a wedding day or any other event.

`PRODUCT.md` says what the app is for and who uses it. `DESIGN.md` is the design system. Read both before changing the interface.

## How it fits together

| Part | Where | What it does |
|---|---|---|
| Web app | `src/`, deployed to GitHub Pages by `.github/workflows/deploy.yml` | React, TypeScript, Tailwind CSS. Works on its own, saving to the device |
| Backend | `worker/worker.js`, deployed to Cloudflare by `.github/workflows/worker.yml` | Accounts, plan storage in Workers KV, sharing, suggestions from Claude, Google Maps place search and travel times, and the Claude connector |

Nothing personal lives in this repository. Plans are stored in the Worker's KV namespace and cached in each browser.

## What it does

- A five-question start for every plan.
- Timeline by day, with the time between items worked out, open time called out and overlaps flagged.
- Tap or swipe right to complete an item; swipe left to skip it.
- Checklist with a starter list for each kind of plan, and a budget from fixed costs plus costs on the timeline.
- With an account: plans sync between devices, a view-only link needs no account to open, and people invited by email can edit.
- With `ANTHROPIC_API_KEY` set: suggestions for open time, a whole day, or anything the person describes.
- With `GOOGLE_MAPS_KEY` set: place search, travel time between stops with a leave-by time, and suggestions chosen only from real places.
- Send a plan as text, a PDF or an image.
- The Claude connector at `/mcp` lets Claude read the profile and build plans from a chat.

Still to come: a map drawn inside the app, bookings, an options list per place, the dream list, password reset and a bot check on sign-up.

## Worker setup

Secrets, set in the Cloudflare dashboard: `AUTH_SECRET` (required, any long random string), `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_KEY` (Places API (New) and Routes API enabled), and optionally `AI_DAILY_LIMIT`. The KV binding `DB` is set in `wrangler.toml`.

GitHub repository secrets for the deploy: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Code layout

```
src/
  lib/          Logic with no interface: types, time maths, the store and syncing, the Worker client
  components/   Shared pieces: buttons, sheets, fields, icons
  features/     One file per screen or mode
```

## Develop

```
npm install
npm run dev        # local server
npm run typecheck  # TypeScript
npm run build      # production build in dist/
```

Pushing to `main` builds the app and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).
