---
name: Plan A
description: A measured architectural schedule for complex days, with flights treated as information-dense travel documents.
colors:
  limestone-ground: "#eae9e8"
  limestone-surface: "#f4f2ef"
  graphite-ink: "#0b0b0b"
  zinc-muted: "#5c5c59"
  zinc-line: "#aaa9a4"
  zinc-edge: "#8f8f8a"
  zinc-ring: "#696a66"
  aged-brass: "#887748"
  brass-tint: "#ded9cb"
  on-brass: "#ffffff"
  limestone-wash: "#e2e0dc"
  oxide-error: "#9a3f32"
  night-ground: "#151614"
  night-surface: "#1c1d1a"
  chalk-ink: "#eceae4"
  night-muted: "#aaa9a2"
  night-line: "#454640"
  night-edge: "#64645d"
  night-ring: "#8b8b83"
  night-brass: "#b39b60"
  night-brass-label: "#c1a76a"
  night-tint: "#2d2b23"
  on-night-brass: "#11120f"
  night-wash: "#20211e"
  night-error: "#ef8a7b"
typography:
  display:
    fontFamily: "Finlandica, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Finlandica, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Finlandica, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Lato, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.005em"
  label:
    fontFamily: "Lato, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.2em"
rounded:
  none: "0px"
  check: "2px"
  icon: "3px"
  control: "4px"
  container: "6px"
  sheet-desktop: "8px"
  sheet-mobile-top: "12px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.aged-brass}"
    textColor: "{colors.on-brass}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.limestone-surface}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.limestone-surface}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "48px"
  check:
    backgroundColor: "{colors.aged-brass}"
    textColor: "{colors.on-brass}"
    rounded: "{rounded.check}"
    size: "24px"
  mode-active:
    backgroundColor: "{colors.aged-brass}"
    textColor: "{colors.on-brass}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "48px"
---

# Design System: Plan A

## Overview

**Creative North Star: "The Architect's Schedule"**

Plan A is a measured architectural schedule, not a stack of soft lifestyle cards. Its defining move is a continuous itinerary grid whose precision makes complex days feel composed: a compact trip header, a measured date index, a fixed time rail, and calm chronological rows that preserve the shape of the day.

The visual world is limestone, graphite, zinc, and aged brass. Finlandica supplies condensed editorial authority; Lato handles instructions and dense operational detail. Space, rules, and alignment create hierarchy. Flights alone may expand into boarding-pass modules because that topology improves travel scanning; nothing else borrows airport costume.

**Key Characteristics:**

- Continuous ruled schedules instead of floating activity cards.
- Rectilinear 0–6px geometry for ordinary interface elements.
- Finlandica headlines and titles paired with compact Lato notation.
- Aged brass reserved for selection, completion, primary action, and flight indexing.
- Light and dark themes that preserve identical hierarchy and interaction semantics.
- Information-dense flight tickets inside an otherwise unboxed itinerary.

## Colors

The palette reads like drafting materials: limestone paper, graphite type, zinc rules, and a restrained aged-brass indexing colour.

### Primary

- **Aged Brass:** The scarce action colour. Use it for selected dates and modes, primary actions, completed checks, progress, focus outlines, and the flight index strip.
- **Night Brass:** The dark-theme counterpart, tuned for contrast on near-black limestone rather than decorative warmth.

### Secondary

- **Oxide Error:** Reserved for destructive actions, overlaps, and over-budget states. It never substitutes for brass as a general accent.

### Neutral

- **Limestone Ground / Night Ground:** The continuous page field.
- **Limestone Surface / Night Surface:** Slightly differentiated controls, fields, and bounded modules.
- **Graphite Ink / Chalk Ink:** Primary type, strong rules, and selected inverse states.
- **Zinc Muted / Night Muted:** Secondary facts, annotations, and inactive navigation.
- **Zinc Line, Edge, and Ring:** A three-step structural hierarchy for hairlines, control outlines, and incomplete checks.
- **Limestone Wash / Night Wash:** Hover feedback that does not create a new layer.
- **Brass Tint / Night Tint:** Quiet contextual emphasis around route guidance and soft actions.

**The Scarce Brass Rule.** Brass communicates action, selection, completion, or flight indexing. Do not spend it on decoration or ordinary body copy.

**The Semantic Parity Rule.** Dark mode changes values, never roles: every light token has the same purpose and hierarchy at night.

## Typography

**Display Font:** Finlandica (with Arial Narrow and system sans fallbacks)

**Body Font:** Lato (with system sans fallbacks)

**Character:** Finlandica is condensed, architectural, and editorial without becoming ceremonial. Lato stays open and practical at small sizes, making dense times, costs, labels, and form guidance easy to scan.

### Hierarchy

- **Display** (700, 42px, 0.98 line-height): Screen and plan titles; one restrained italic phrase may use weight 500.
- **Headline** (700, 28–30px, 1–1.15 line-height): Card titles, empty states, sheet titles, and summary statements.
- **Title** (700, 24px, 1.05 line-height): Ordinary itinerary activities; completed or skipped items soften to weight 500.
- **Body** (400, 15–16px, relaxed line-height): Instructions, details, form values, and explanatory text. Inputs remain 16px to prevent mobile focus zoom.
- **Detail** (400–700, 13px): Times, destinations, costs, route notes, and metadata.
- **Label** (700, 9–11px, 0.12–0.2em tracking, uppercase): Categories, eyebrows, ticket fields, and mode navigation.

Times, dates, durations, and money use tabular figures. Airport codes use Finlandica at display scale, while the associated field labels remain Lato.

**The Two-Face Rule.** Finlandica names and summarizes; Lato explains and operates. Do not set long instructions or dense form copy in Finlandica.

## Layout

Plan A is phone-first and centred within a 620px maximum content frame. The base inset is 20px and increases to 32px at the small breakpoint (640px). Vertical structure is carried by full-width rules, consistent 16–24px internal spacing, and 32px section intervals rather than independent card margins.

Inside a plan, the first viewport moves from a compact action header to plan title and metadata, then to a horizontally scrollable date index. The timeline is a measured two-column schedule: a 64px time rail on narrow screens, 76px from 640px upward, and flexible content to the right. Ordinary items stay as unboxed ruled rows. Gaps and route guidance align to the content column so the time rail remains continuous.

The four-mode navigation is fixed to the bottom, constrained to the same 620px frame, and divided into equal rectilinear cells. Plan content reserves 96px beneath itself and all bottom-aligned surfaces include the device safe area. Wider screens do not become dashboards; they preserve the single-job column, expose secondary header actions, and centre sheets as dialogs.

Forms use one-column flow by default, paired two-column date/time or amount fields where the content remains legible. Overflowing category and date indexes scroll horizontally without forcing the page wider. Print removes application navigation, resolves the palette to white paper and black ink, and preserves break-safe itinerary sections.

**The Continuous Grid Rule.** New itinerary content must align to the existing time rail and rules; do not introduce a floating card merely to group ordinary activity data.

## Elevation & Depth

The system is flat by default. Resting rows, plan summaries, fields, selectors, date cells, and navigation use tone, borders, and spacing instead of shadows. The only persistent shadow belongs to modal containment: a bottom sheet or centred dialog uses one broad ambient shadow over a dimmed backdrop. Autocomplete menus may use the same floating-layer logic.

Motion supplies momentary depth: buttons lift by 1px on hover and compress on press; schedule sections rise 10px with a brief blur; sheets enter from 24px below; checks pop from reduced scale. State transitions run in roughly 180–420ms, with the exponential easing curve used for entrances and spring-back. All animations and transitions are disabled under `prefers-reduced-motion: reduce`.

**The Rules-Before-Shadows Rule.** If a border, tonal change, or spacing break can express the hierarchy, use it. Shadows mean that a surface is temporarily above the page.

## Shapes

The ordinary form language is square or barely eased. Checks use 2px corners, icon controls 3px, buttons and fields 4px, and larger bounded containers no more than 6px. Tailwind aliases such as `rounded-full`, `rounded-xl`, and `rounded-2xl` intentionally resolve to this 4–6px architectural scale; they do not create pills or soft cards.

Sheets are the single containment exception: the phone bottom sheet rounds only its exposed top corners to 12px, while the centred desktop dialog uses 8px. Progress bars and the small “today” indicator may be circular because they are signals, not containers. Flight-ticket edge notches are functional perforation cues and never migrate to other components.

**The Rectilinear Default Rule.** Every new control or container starts at 0–4px and may reach 6px only when its scale needs it.

**The Ticket Exception Rule.** Perforations, cut-outs, airport-code typography, and indexed colour strips belong only to flight entries.

## Components

Components feel precise, restrained, and thumb-ready. Interactive controls keep a minimum 44px target; visible focus uses a 2px brass outline with 2px offset, or a brass border plus restrained focus ring inside fields.

### Buttons

- **Shape:** Rectilinear control corners (4px), 44px standard height or 52px large, with bold Lato labels.
- **Primary:** Aged-brass fill with high-contrast on-brass text; use for the single main action in a context.
- **Secondary:** Limestone surface with a zinc edge; hover strengthens the border to graphite.
- **Soft / Ghost / Danger:** Brass tint for contextual action, unbounded graphite for quiet action, and oxide text for destructive action.
- **Hover / Focus / Disabled:** Hover lifts 1px, press returns to the plane and scales to 98%, focus remains explicit, and disabled controls keep their footprint at 50% opacity.

### Choice and segmented controls

- **Choice:** A large 4px bordered answer with Finlandica title, compact hint, and square check. Selection uses a brass border and a second 1px ring.
- **Segmented:** A 4px outer frame with 2px cells separated by zinc rules. The selected cell is graphite-on-limestone inverse, reserving brass for higher-priority selection surfaces.
- **Category selectors:** Horizontally scrollable 44px controls whose inherited `rounded-full` alias resolves to 4px, never a capsule.

### Cards / Containers

- **Plan summaries:** Bounded 4px surfaces with a narrow brass or zinc index strip, strong internal rule, and no shadow.
- **Open time:** A full-width ruled insert aligned after the time rail, not a floating card.
- **Ordinary schedule row:** Unboxed, border-top separated, with time at left, category/title/detail in the middle, and a square completion control at right.
- **Flight ticket:** The only boarding-pass module. It uses a brass index strip, prominent airport codes, local departure and arrival times, duration, restrained circular edge notches, and a dashed cut line. It must never invent gate, terminal, status, or live operational data.

### Inputs / Fields

- **Style:** 48px limestone-surface fields with 4px corners, zinc edge, 12px horizontal inset, 16px text, and clear labels above.
- **Focus:** Border changes to brass and a low-opacity 2px brass ring appears; the global fallback outline remains visible for keyboard navigation.
- **Error / Disabled:** Error help uses oxide; disabled controls preserve legibility and do not accept pointer input.
- **Grouping:** Related flight timing and airport fields are separated by full-width rules, not nested cards.

### Sheets

- **Mobile:** Bottom-aligned, maximum 92dvh, square lower edge, 12px exposed top corners, scrollable body, fixed header/footer, and safe-area-aware padding.
- **Desktop:** Centred within a 576px maximum width with an 8px radius and full border.
- **Behaviour:** Focus moves into the modal, Escape and backdrop close it, background scrolling is locked, and footer actions remain visible.

### Navigation

- **Date index:** A ruled horizontal strip of 48px cells. The selected date is brass-filled; unselected dates are muted with wash hover feedback.
- **Mode navigation:** Four equal 48px cells fixed to the bottom, uppercase tracked Lato labels, strong top and bottom rules, brass active cell, and safe-area clearance.
- **Back and add controls:** 44px square icon targets; the add control may carry the primary brass fill.

### Completion and gesture states

- **Check:** A 24px square inside a 44px target. Todo is an outlined zinc square, done is filled brass with a tick, and skipped retains an outline with a cross.
- **Timeline gesture:** Swiping right completes and left skips; movement is clamped, springs back, and may provide a short vibration. Tapping the row edits without competing with the check target.
- **Status treatment:** Done titles become muted and struck through; skipped titles mute without a strike. State is never conveyed by colour alone.

## Do's and Don'ts

### Do:

- **Do** preserve the continuous time rail and chronological rules when adding itinerary data.
- **Do** use Finlandica for titles, airport codes, and summary numbers while keeping operational copy in Lato.
- **Do** keep brass scarce and semantic: action, selection, completion, focus, and flight indexing.
- **Do** maintain role-for-role parity across light and dark themes.
- **Do** expose local departure and arrival context for flights without losing the larger day.
- **Do** retain 44px minimum targets, visible keyboard focus, semantic pressed/current states, modal focus handling, and reduced-motion support.

### Don't:

- **Don't** turn ordinary activities, gaps, or form groups into soft lifestyle cards.
- **Don't** use pill geometry for containers or controls; Tailwind radius aliases must continue to resolve to the architectural 4–6px scale.
- **Don't** apply boarding-pass styling, perforations, airport codes, or ticket cut-outs to anything except a flight.
- **Don't** invent live flight facts such as gates, terminals, delays, or status.
- **Don't** add shadows to resting content or introduce decorative gradients, photography, or illustration.
- **Don't** let a desktop viewport turn the plan into a multi-panel dashboard; one mode remains the one job on screen.
