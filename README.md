# Plan A

A planner for people who like to know how the day will go. A plan holds a timeline for each day, a checklist and a budget, for a weekend away, a trip, a birthday, a wedding day or any other event.

`PRODUCT.md` says what the app is for and who uses it. `DESIGN.md` is the design system. Read both before changing the interface.

## Where things stand

Working now, saved on the device:

- A five-question start for every plan.
- Timeline by day, with the time between items worked out, open time called out and overlaps flagged.
- Tap or swipe right to complete an item; swipe left to skip it.
- Checklist with a starter list for each kind of plan.
- Budget from fixed costs plus costs on the timeline.
- Map mode that lists the day's stops and opens the route in Google Maps.
- Send as text and Save as PDF.
- Profile and interests, and light and dark themes.

Not built yet: accounts and syncing, share links and invitations, suggestions from Claude, place search and travel times, and the Claude connector. These need the Cloudflare Worker.

## Code layout

```
src/
  lib/          Logic with no interface: types, time maths, the store, starter lists
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
