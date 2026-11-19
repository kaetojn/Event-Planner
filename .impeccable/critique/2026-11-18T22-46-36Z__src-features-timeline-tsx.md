---
target: ItemSheet shown in the supplied iPhone screenshot
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/Kaeto/Documents/Claude/Event-Planner/src/features/Timeline.tsx"
target_fingerprint: "sha256:276b1f8471b8b9ba02997237f254a683c2a18452238c13983aded24d2da333fa"
target_path: /Users/Kaeto/Documents/Claude/Event-Planner/src/features/Timeline.tsx
timestamp: 2026-11-18T22-46-36Z
slug: src-features-timeline-tsx
closed: true
---
# ItemSheet critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2/4 | Add is disabled without explaining why; completion feedback is implicit. |
| 2 | Match system / real world | 3/4 | Labels are plain, but the always-visible date-range model feels like implementation detail. |
| 3 | User control and freedom | 2/4 | Dismissal can discard a draft; removal lacks confirmation or undo. |
| 4 | Consistency and standards | 3/4 | Strong Plan A tokens, undermined by the broken category rail and heavy nested panels. |
| 5 | Error prevention | 2/4 | Date validation exists, but draft loss and unexplained disabled states remain. |
| 6 | Recognition rather than recall | 2/4 | Defaults and labels help, but seven categories are visually illegible in the screenshot. |
| 7 | Flexibility and efficiency | 2/4 | Smart defaults help, yet the common title-and-time path competes with the whole schema. |
| 8 | Aesthetic and minimalist design | 2/4 | The opening is refined; clipped chips and dense outline-on-outline fields dilute it. |
| 9 | Error recovery | 2/4 | End-time errors are specific, while most failure states remain silent. |
| 10 | Help and documentation | 1/4 | There is no clear statement of what is required or how little is needed. |
| **Total** | | **21/40** | **Acceptable; significant improvement needed** |

## Design Specificity Verdict

**Authored shell, generic workflow.** The Cormorant title, brass date, near-black editorial palette, rounded sheet, and bottle-green footer clearly belong to Plan A. Below that branded opening, the experience becomes a conventional settings form that exposes classification, timing model, date range, place, cost, and note at once. The product promise is “as quick as a note,” but the workflow feels like completing a record.

The deterministic scan returned `[]`: zero findings in `src/features/Timeline.tsx`. That is not a clean visual verdict. It means the detector has no syntactic rule for the runtime clipping, horizontal overflow, hierarchy, and information-density failures visible in the supplied iPhone screenshot. Browser inspection at 390 × 844 reproduced the active ItemSheet. No overlay was injected because the available browser evaluation surface is read-only.

## Overall Impression

The sheet opens beautifully, then immediately looks broken. The category selector has collapsed into unlabeled curved slivers, the timing card consumes most of the screen for a same-day item, and the fixed footer visually cuts into the lower fields. The single biggest opportunity is to restore the product promise: make ordinary item entry title + time first, and reveal exceptional details only when needed.

## What’s Working

- The editorial opening is recognizably Plan A: strong serif title, brass date, quiet dark surface, restrained green action.
- The close control, segmented selector, and fixed Add action have large mobile targets and good thumb-zone placement.
- Useful defaults reduce typing: the active day carries in, the start time follows the preceding item, and plan detail selects time versus part-of-day.

## Priority Issues

### [P1] The category rail is visually broken

**Why it matters:** The screenshot shows only clipped curved slivers where category icons and labels should be. Users cannot understand or choose the category, and the first novel control looks like a rendering defect.

**Fix:** Give the rail a stable visible block size, keep the selected chip fully visible, and use a deliberate trailing cut-off or edge fade only as an overflow cue. Prefer four common categories plus More if seven cannot remain legible.

**Suggested command:** `$impeccable adapt ItemSheet category rail`

### [P1] The form contradicts “as quick as a note”

**Why it matters:** A small action feels like paperwork. Classification, naming, timing mode, four date/time fields, location, cost, and note all compete before the first item is saved.

**Fix:** Default category to Activity and make the first view What + compact start + Add. Move end/duration, category, location, cost, and note behind More details; reveal category-specific fields after Flight, Stay, or Transport is chosen.

**Suggested command:** `$impeccable distill ItemSheet`

### [P2] The timing model exposes implementation detail

**Why it matters:** The active day is already stated, yet Start date and End date repeat it. End date remains visible without an end time. Ordinary same-day activities look like multi-day records.

**Fix:** Show one compact Starts control. Reveal Ends only on request, and show a second date only when crossing midnight or for inherently multi-day categories.

**Suggested command:** `$impeccable layout ItemSheet timing`

### [P2] Validation, draft safety, and completion feedback are too implicit

**Why it matters:** Add is disabled without saying what is missing; What is not identified as required; dismissal can lose work; successful save is only implied by the sheet disappearing.

**Fix:** State “Title and start time are all you need,” focus and explain the missing field on submit, preserve or confirm dirty drafts, and highlight the inserted row with a brief Undo affordance.

**Suggested command:** `$impeccable clarify ItemSheet validation` then `$impeccable harden ItemSheet`

## Persona Red Flags

**Jordan, first-time planner:** The clipped category row looks like a rendering failure. Equal visual weight across optional fields hides the simple path. The disabled Add button gives no recovery instruction.

**Sam, accessibility-dependent user:** Seven horizontally scrolling category buttons create a long tab sequence while their visual labels are clipped. Specific validation is not announced. Dialog semantics and large touch targets are good foundations, but focus trapping/restoration and live status need verification.

**Casey, distracted mobile user:** Horizontal category discovery and vertical sheet scrolling compete. A backdrop tap can discard the draft. Cost and Note are squeezed into half-width controls just above the fixed footer, making the form appear cut off.

## Minor Observations

- “End time (optional)” wraps awkwardly and unbalances the timing grid.
- A bordered timing card containing bordered inputs creates a heavy settings-panel texture.
- Cost and Note appear clipped by the footer; Note should be full width and multiline.
- The dimmed Edit, Share, and plus controls remain visually noisy behind a very tall sheet.
