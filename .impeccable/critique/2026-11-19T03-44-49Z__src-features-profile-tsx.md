---
target: profile page design
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/Kaeto/Documents/Claude/Event-Planner/src/features/Profile.tsx"
target_fingerprint: "sha256:b3b99b0e5a81befefdd1886f61484a6a35afe586b06179a672e15405db087a3f"
target_path: /Users/Kaeto/Documents/Claude/Event-Planner/src/features/Profile.tsx
timestamp: 2026-11-19T03-44-49Z
slug: src-features-profile-tsx
---
# Profile page design critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2/4 | Login and refresh show busy states, but profile autosave has no saved, saving, offline, or sync feedback. |
| 2 | Match system / real world | 3/4 | Copy is mostly warm and plain; feature-setup language leaks implementation detail. |
| 3 | User control and freedom | 2/4 | Back navigation and reversible toggles work, but autosaved edits have no undo and sign-out consequences are unclear. |
| 4 | Consistency and standards | 4/4 | Typography, spacing, controls, and selected states closely follow Plan A's system. |
| 5 | Error prevention | 2/4 | Required fields and erase confirmation help; sync and sign-out failure paths are not safely prevented. |
| 6 | Recognition rather than recall | 3/4 | Labels and options are visible, but account recovery and action consequences are missing. |
| 7 | Flexibility and efficiency | 2/4 | Autosave and chip toggles are efficient, but the long page lacks summary or shortcuts. |
| 8 | Aesthetic and minimalist design | 2/4 | Clean visual treatment is diluted by unrelated maintenance sections and 12 simultaneous interest choices. |
| 9 | Error recognition and recovery | 1/4 | Raw authentication errors may surface; autosave, place lookup, and sign-out failures lack recovery. |
| 10 | Help and documentation | 2/4 | Useful intro copy exists, but password recovery, privacy, and sync help are absent. |
| **Total** | | **23/40** | **Acceptable — strong visual foundation, significant trust and IA work needed.** |

## Design Specificity Verdict

**Visually authored, interactionally generic.** The Cormorant headline, italic emphasis, brass eyebrows, bottle-green action, hairlines, and generous spacing are recognizably Plan A. The information architecture is a generic settings stack combining authentication, personalization, appearance, app refresh, storage management, diagnostics, and account actions. The missed opportunity is to make Profile feel like “teach Plan A how you like to spend a day,” then demonstrate what it learned.

The deterministic detector returned zero findings for `src/features/Profile.tsx`. That confirms the page avoids the detector's catalogued anti-patterns, but does not contradict the human review: the problems are product hierarchy, trust, recovery, and cognitive load rather than rule-level styling violations. Browser evidence at 390×844 found no horizontal overflow; inputs were 342×48, the primary button 342×52, and other controls at least 44px high.

No visual overlay was available because the browser surface did not permit mutable script injection. Evidence instead came from fresh-tab DOM snapshots, top/lower screenshots, and layout metrics.

## Overall Impression

The page opens calm, premium, and trustworthy, then loses that confidence by turning into a long administrative stack. Its single biggest opportunity is to separate preference-building from app/account maintenance and make saving/syncing visibly trustworthy.

## What's Working

- The printed-itinerary visual language is unusually coherent and clearly belongs to Plan A.
- Account copy anticipates a real fear: device-only plans and account migration are explained directly.
- The mobile/accessibility floor is solid: 16px inputs, 44px targets, programmatic labels, visible focus, `aria-pressed`, and `role="alert"`.

## Cognitive Load

**High: 5 of 8 checklist failures.** Single focus, chunking, one-thing-at-a-time, minimal choices, and progressive disclosure fail. Grouping, visual hierarchy, and working-memory continuity pass. The clearest violation is the 12-option interest wall, well above the four-item working-memory guideline.

## Emotional Journey

The opening is warm and reassuring. The middle remains visually confident, but the experience falls into maintenance language, invisible autosave, exact-address privacy uncertainty, and feature diagnostics. Both variants end on loss-oriented actions—Erase or Sign out—rather than successful personalization. The page promises safety and automatic saving without visibly proving either.

## Priority Issues

### [P1] Autosave and sign-out do not earn trust

**Why it matters:** “Changes save as you make them” has no saved/saving/offline proof. Sign-out can clear local state after a failed push, which is especially dangerous on mobile networks.

**Fix:** Add a compact status near the heading: Saved, Saving…, or Offline — changes are on this device. Require confirmed sync before clearing local data; on failure, keep data and offer Try again or an explicitly explained offline sign-out path.

**Suggested command:** `$impeccable harden`

### [P1] Account recovery and actionable errors are missing

**Why it matters:** “Plans safe” is not credible without Forgot password. Raw API error messages risk technical, vague, or inconsistent recovery text.

**Fix:** Add Forgot password beside Password. Map common failures to field-level plain-language messages, preserve entered values, and distinguish incorrect credentials, offline state, and server failure.

**Suggested command:** `$impeccable clarify`

### [P2] The page violates the one-job-per-screen principle

**Why it matters:** Authentication or personalization competes with theme, refresh, diagnostics, storage management, and destructive account actions.

**Fix:** Separate Your preferences, Appearance & app, and Account & device. Keep Profile centred on preference signals; move refresh/version mechanics and destructive controls into settings.

**Suggested command:** `$impeccable distill`

### [P2] The 12-interest wall is unstructured

**Why it matters:** Every chip has equal weight, users do not know how many to select, and the screen feels like profile administration rather than teaching Plan A their taste.

**Fix:** Group interests into 3–4 human categories, say “Pick a few,” progressively reveal more, and show a selected summary or “Suggestions will favour…” preview.

**Suggested command:** `$impeccable shape`

### [P2] Personal-data context and feature promises are weak

**Why it matters:** Exact home address is sensitive, but its purpose appears only as disappearing placeholder text. Signup promises suggestions while the profile can later say they are not set up.

**Fix:** Add persistent privacy/use guidance, ask whether city is sufficient before exact address, make benefits conditional on feature availability, and replace setup diagnostics with user-facing outcomes.

**Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Jordan — first-timer:** No password recovery; no guidance on how many interests to choose; no confirmation that autosaved edits are safe; exact-address request lacks persistent reassurance; feature setup language sounds like Jordan must solve an admin problem.

**Sam — accessibility-dependent:** Strong input/label/focus fundamentals, but autosave is not announced; sign-out busy state is not named; 12 chips create a long repetitive tab sequence; place lookup failures are silent.

**Casey — distracted mobile user:** The signed-in page is too long for interrupted use; the interest wall demands sustained attention; sync status is invisible on slow connections; sign-out risks local data after failed sync; maintenance controls are buried far below the main task.

## Minor Observations

- “Used for airport travel time” should be persistent helper text, not a placeholder.
- Replace “One moment” with “Signing in…” or “Creating account…”.
- Add show/hide password on phones.
- The danger button is visually quiet enough to resemble an ordinary secondary action.
- Theme switching is clear, but does not belong inside authentication.
- Interest selection needs a selected count or sufficiency cue.
- The screen should not end emotionally on Sign out or Erase.

## Questions to Consider

- What if Profile had one purpose: teach Plan A your ideal day?
- What if the page ended with a live preview of how suggestions changed?
- Does Plan A need an exact home address before airport travel time is requested?
- Can the product call plans safe before visibly proving sync and recovery?
- What changes if the interest picker asks for three strong signals rather than twelve equal choices?
