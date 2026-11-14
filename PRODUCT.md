# Product

## Platform

Web, phone-first. It is meant to be added to the home screen. Desktop is secondary.

## Name

Plan A. It is planning for the type A: the person who writes the itinerary.

## Users

The person in a couple or group who plans things, and plans them properly: by the hour or the half hour, with costs. They share the plan with a partner or a few collaborators. People who are only shown a plan should never need an account.

Anyone can create an account. The first user is the owner.

## Product purpose

Today this person plans in a notes app: a heading per day, a line per time, a cost breakdown at the bottom, ticked off or struck through as the day goes. The notes work, but everything around them is manual: working out gaps and travel time, finding things to do nearby, adding up costs, and keeping a shared copy current.

Plan A keeps the note's simplicity and does that work for them. Success is a plan that takes minutes to draft, that the planner trusts on the day, and that a partner can open from a link.

The jobs, in priority order:

1. **Lay out the days.** A timeline per day at the level of detail the planner wants.
2. **Fill the gaps well.** Suggestions that fit the person, the place and the open time.
3. **Keep the day on track.** Check things off, skip things, and see what is next.
4. **Know the cost.** A running total against a budget.
5. **Share it.** A link to view, an invitation to edit, a PDF or image to keep.

## What a plan is

- **Kinds:** weekend away, trip, birthday, wedding, or any other event.
- **Three levels of detail,** chosen per plan and mixable per item: by the half hour, only the fixed points, or morning, afternoon and evening.
- **Items** have a time or a part of the day, and optionally an end, a place, a cost and a note. An item is to do, done or skipped.
- **Four modes,** one on screen at a time: Timeline, Checklist, Budget, Map. Timeline is the default. Map is secondary and is never the first thing shown.
- **Still to come inside a plan:** bookings (flights and stays), a list of options per place to pull from, and travel time between stops.

## The profile

Name, home city, interests, pace, spending style and things to avoid. It exists to steer suggestions. A dream list of places and the person's own ratings of past stays are planned as further signals.

## AI

Suggestions are a first-class part of the product, not an add-on. They must come from real place data, because models get opening hours, prices and distances wrong. There are two routes to the same plan data: buttons inside the app (which use the Claude API through the Worker), and a Claude connector (which lets the owner plan in a Claude chat on their subscription).

## Constraints

- **Stack:** React 19, TypeScript, Tailwind CSS 4, Vite and Jotai, deployed to GitHub Pages. The backend will be one Cloudflare Worker with Workers KV.
- **Data:** nothing personal lives in this repository. Sample content is invented.
- **Locale:** en-CA, dollars, 12-hour times.
- `src/lib` stays free of interface code.

## Voice

Plain, warm and brief, in the second person. Sentence case. Say what will happen ("This sets how new items are added"). No exclamation marks, no travel-brochure language.

## Principles

1. **One job per screen.** Modes exist so that nothing competes with the timeline.
2. **As quick as a note.** Adding an item takes a title and a time. Everything else is optional.
3. **Do the arithmetic.** Gaps, overlaps, totals and what is left are worked out and shown, never left to the planner.
4. **Satisfying to finish.** Completing something should feel good under the thumb.
5. **Never invent facts.** No made-up places, times, prices or reviews.
