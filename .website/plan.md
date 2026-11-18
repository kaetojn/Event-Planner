# Plan A — website plan
Job: update · Stack: React 19.2.8 + Vite 7.3.8 + TypeScript 5.9 + Tailwind CSS 4.3.3 (from `package.json`; verified with a green production build and typecheck) · Mode: Operate

## Decisions
- Refine the existing “printed itinerary” visual identity instead of replacing it — because `DESIGN.md` is coherent and product-specific; the request confirmed this direction. (user)
- Cover the full app surface: home, plan workspace and its modes, plan creation, profile, sharing, and public view — because the request is for the Plan A website rather than a named screen. (director)
- Keep motion subtle and feedback-led — because Plan A is an operate-mode, phone-first planning tool and its documented design system already limits motion to state changes. (director)
- Preserve the current React/Vite/Tailwind component approach and avoid adding dependencies — because the project has no overlapping UI libraries and its shared primitives already cover its controls. (director)
- Use the existing editorial type, bottle-green accent, and flat/hairline surface vocabulary as the design authority — because it matches the product’s calm, trustworthy planning task. (director)

## Findings
- Shared page-shell and header utility strings repeat across primary screens — `src/features/Home.tsx`, `NewPlan.tsx`, `Profile.tsx`, and `PlanView.tsx`; this makes cross-screen rhythm harder to tune. Impact: visual consistency / maintainability. Effort: small.
- Timeline, checklist, budget, and map modes have separate visual structures without a shared content-header pattern. Impact: scanability / visual consistency. Effort: medium.
- The home screen’s primary action and empty state are strong, but returning planners have little at-a-glance distinction between upcoming, active, and past plans. Impact: visual hierarchy. Effort: medium.
- The app uses an intentional editorial system, but dense functional screens need more consistent group boundaries, summaries, and progress feedback to make the plan legible at a glance. Impact: visual / functional. Effort: medium.
- The checkout lacked dependencies and a lockfile. Dependencies were installed at the user’s direction; build and typecheck now pass, and `package-lock.json` is new. Impact: release confidence. Effort: done for this run.
- Screenshot and measured-reference evidence could not be captured: the local server cannot persist in this execution environment and the required browser client script is missing. Impact: verification only. Effort: deferred until browser access is repaired.

## Tasks
| # | Task | Skill(s) | Depends on | Status |
|---|---|---|---|---|
| 1 | Capture the refreshed page shell, heading rhythm, tokens and reusable interaction states | impeccable extract → proof-of-work | — | implemented — screenshot pending |
| 2 | Refine Home and plan creation for stronger orientation, plan status and first-run guidance | impeccable shape → build → proof-of-work | 1 | implemented — screenshot pending |
| 3 | Refine the plan workspace, timeline and four modes into a clearer shared information hierarchy | impeccable shape → build → proof-of-work | 1 | implemented — screenshot pending |
| 4 | Refine profile, sharing and public itinerary surfaces for coherent secondary flows | impeccable shape → build → proof-of-work | 1 | implemented — screenshot pending |
| 5 | Add restrained state-feedback motion and reduced-motion-safe transitions | impeccable animate → CSS → proof-of-work | 2, 3, 4 | implemented — screenshot pending |
| 6 | Verify every in-scope flow, audit/polish the UI, typecheck and build | impeccable audit → impeccable polish → proof-of-work | 2, 3, 4, 5 | build + typecheck + detector complete; browser QA pending |

## Deferred
- Measured reference specification in `.website/references.md` — blocked by missing browser client integration.
- Phone and desktop screenshots — blocked by the local-server/browser limitation; required before final visual sign-off.
- Worker modularization and CI hardening — worthwhile code-health work, but not needed to safely deliver this design refinement.
