# Plan A — website plan
Job: update · Stack: React 19.2.8 + Vite 7.3.8 + TypeScript 5.9 + Tailwind CSS 4.3.3 (from `package.json`; verified with a green production build and typecheck) · Mode: Operate

## Decisions
- Replace the incumbent rounded “printed itinerary” system with The Architect’s Schedule as the app-wide design base: limestone ground, graphite ink, zinc rules, restrained aged-brass accents, architectural typography, flat surfaces, and 0–6px control geometry — because the user chose its precise, luxurious restraint. (user)
- Treat flights as the sole Departure Ledger exception inside that same system: flight rows use boarding-pass structure, large airport codes, tabular local times, perforation logic, and compact connection segments; ordinary activities remain measured architectural schedule rows — because flights should be visually emphasized without turning the whole planner into an airport board. (user)
- Refine the existing “printed itinerary” visual identity instead of replacing it — because `DESIGN.md` is coherent and product-specific; the request confirmed this direction. (user)
- Cover the full app surface: home, plan workspace and its modes, plan creation, profile, sharing, and public view — because the request is for the Plan A website rather than a named screen. (director)
- Keep motion subtle and feedback-led — because Plan A is an operate-mode, phone-first planning tool and its documented design system already limits motion to state changes. (director)
- Preserve the current React/Vite/Tailwind component approach and avoid adding dependencies — because the project has no overlapping UI libraries and its shared primitives already cover its controls. (director)
- Use the existing editorial type, bottle-green accent, and flat/hairline surface vocabulary as the design authority — because it matches the product’s calm, trustworthy planning task. (director)
- Add travel intelligence as a focused product extension, preserving the current visual world — because the requested work changes planning capability, not Plan A’s identity. (user)
- Give itinerary items a semantic category with a small, consistent icon (including flights, stays, transport, bookings and activities) — because category must improve scanning rather than decorate rows with arbitrary emoji. (director)
- Model timed events as a date/time range with optional departure and arrival time zones — because flights and overnight travel can cross dates and zones; a fixed one-day `HH:MM` item cannot represent that truth. (director)
- Use calendar export, not calendar account sync: generate an `.ics` file for Apple/Outlook and a prefilled Google Calendar link — because it is private, interoperable and does not require OAuth credentials. (director)
- Store home address and trip stay/address as optional private planning data; retain a “TBD” stay state — because airport routing needs real origins, while a trip may not have accommodation decided yet. (director)

## Findings
- Shared page-shell and header utility strings repeat across primary screens — `src/features/Home.tsx`, `NewPlan.tsx`, `Profile.tsx`, and `PlanView.tsx`; this makes cross-screen rhythm harder to tune. Impact: visual consistency / maintainability. Effort: small.
- Timeline, checklist, budget, and map modes have separate visual structures without a shared content-header pattern. Impact: scanability / visual consistency. Effort: medium.
- The home screen’s primary action and empty state are strong, but returning planners have little at-a-glance distinction between upcoming, active, and past plans. Impact: visual hierarchy. Effort: medium.
- The app uses an intentional editorial system, but dense functional screens need more consistent group boundaries, summaries, and progress feedback to make the plan legible at a glance. Impact: visual / functional. Effort: medium.
- The checkout lacked dependencies and a lockfile. Dependencies were installed at the user’s direction; build and typecheck now pass, and `package-lock.json` is new. Impact: release confidence. Effort: done for this run.
- Browser QA now covers the signed-out home, sample plan, plan editing, flight entry, item/plan calendar actions, and phone/desktop layouts. The browser console remained free of application errors. Impact: release confidence. Effort: done for this run.

## Tasks
| # | Task | Skill(s) | Depends on | Status |
|---|---|---|---|---|
| 1 | Capture the refreshed page shell, heading rhythm, tokens and reusable interaction states | impeccable extract → proof-of-work | — | done |
| 2 | Refine Home and plan creation for stronger orientation, plan status and first-run guidance | impeccable shape → build → proof-of-work | 1 | done |
| 3 | Refine the plan workspace, timeline and four modes into a clearer shared information hierarchy | impeccable shape → build → proof-of-work | 1 | done |
| 4 | Refine profile, sharing and public itinerary surfaces for coherent secondary flows | impeccable shape → build → proof-of-work | 1 | done |
| 5 | Add restrained state-feedback motion and reduced-motion-safe transitions | impeccable animate → CSS → proof-of-work | 2, 3, 4 | done |
| 6 | Verify every in-scope flow, audit/polish the UI, typecheck and build | impeccable audit → impeccable polish → proof-of-work | 2, 3, 4, 5 | done |
| 7 | Extend plan and item data models for categories, editable trip dates, stay/home locations, multi-day ranges and time zones; migrate saved local plans safely | build → proof-of-work | — | done |
| 8 | Build flight-first entry/editing: category picker, airline/flight details, departure/arrival date-times and zones, plus polished aligned date/time controls | impeccable shape → build → proof-of-work | 7 | done |
| 9 | Add travel-mode planning: home-to-airport and arrival-airport-to-stay legs, place/address fallback, and a clear “stay TBD” state; suggest leave-by time only when route data is available | build → proof-of-work | 7 | done |
| 10 | Add calendar handoff for individual items and complete plans (`.ics` and Google Calendar prefill) | build → proof-of-work | 7 | done |
| 11 | Add plan editing (title, destination, dates) with day/item migration, and swipe-to-reveal plan deletion with a confirmation safeguard | impeccable shape → build → proof-of-work | 7 | done |
| 12 | Add an in-app sync/refresh control and clearly communicate when plan updates were last checked | build → proof-of-work | 7 | done |
| 13 | Verify cross-date, cross-zone, edited-date, calendar, shared-plan, deletion and refresh flows; typecheck and build | impeccable audit → proof-of-work | 8, 9, 10, 11, 12 | done |
| 14 | Put a reliable app-version refresh action in Settings/Profile for iPhone Add to Home Screen mode, syncing account data first and preserving the current screen | build → proof-of-work | 12 | done |
| 15 | Repair the iPhone ItemSheet category collapse and distill ordinary item entry to title + start first, with progressive disclosure for category, end, place, cost and note | impeccable distill → adapt → clarify → proof-of-work | 8 | done |
| 16 | Keep iOS keyboard focus stable while entering airport codes and vertically center Safari's native date/time values | impeccable adapt → harden → proof-of-work | 8, 15 | done |
| 17 | Stop the shared sheet from resetting focus after every controlled-field update on mobile and replace free-text time zones with native dropdowns | impeccable adapt → harden → proof-of-work | 16 | done |
| 18 | Populate flight time-zone dropdowns from the full browser IANA database and show date-aware UTC offsets | impeccable harden → clarify → proof-of-work | 17 | done |
| 19 | Distill Profile around planning preferences, add trustworthy save feedback and a product-specific planning-style summary, then polish secondary settings | impeccable distill → delight → polish → proof-of-work | 4 | done |
| 20 | Show home-departure guidance only on the trip's first flight, reserve arrival transfer for the final connected outbound flight, and add a luggage-aware leave-home placeholder and buffer | impeccable harden → clarify → proof-of-work | 9 | done |
| 21 | Replace the whole-app visual system with The Architect’s Schedule, including rectilinear controls, measured grids, restrained radii, and cohesive light/dark tokens | impeccable overdrive → build → proof-of-work | 1–20 | done |
| 22 | Build a Departure Ledger flight treatment inside the architectural timeline while keeping non-flight activities in the base schedule language | impeccable shape → build → proof-of-work | 21 | done |
| 23 | Verify all primary routes at phone and desktop sizes, run detector and independent finish review, then document the shipped system | impeccable audit → finish review → document | 21, 22 | done |

## Direction contract

**THESIS:** Plan A is a measured architectural schedule, not a stack of soft lifestyle cards. Its defining move is a continuous itinerary grid whose precision makes complex days feel composed. Flights may become boarding passes, but no other content borrows airport costume.

**OWN-WORLD:** Limestone ground, graphite ink, zinc secondary text and hairlines, with aged brass used sparingly for selection and flight indexing. Geometry is square or 4–6px, typography is architectural and editorial, and depth comes from rules and spacing rather than shadows.

**STORY:** The planner immediately sees the trip’s structure, reads ordinary activities as a calm chronological schedule, and recognizes flights as information-dense travel documents. They can scan local times, connections, and the next action without losing the larger day.

**FIRST VIEWPORT:** A compact trip header and measured date index lead into a two-column time rail. Activities are unboxed ruled rows. Flights alone expand into boarding-pass modules with airport codes, departure/arrival details, and a completion control. Rectilinear mode navigation anchors the bottom.

**FORM:** The Architect’s Schedule is the chosen assigned direction, first in the ordered set, from seed `f3d4a487`. Departure Ledger donates only the flight-entry topology. Approved comp: `.impeccable/mocks/hybrid-ledger-grid.png`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Deferred
- Worker modularization and CI hardening — worthwhile code-health work, but not needed to safely deliver this design refinement.
- Full calendar account sync, automatic flight-status data, and live traffic prediction — require separate provider access, API keys, data policies and ongoing error handling. The first release will make route/departure time visible only when the existing Maps integration can supply it.
