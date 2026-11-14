# Design system: Plan A

## Overview

**North star: "The printed itinerary."** The app should feel like a well-set page from a good hotel: a serif headline, quiet labels, plenty of white space, and one confident colour. It is editorial and calm, and it stays out of the way of the plan.

- One serif headline per screen, often with a single word in italic.
- Small brass labels in capitals above headings.
- Flat surfaces separated by hairlines. Shadows only on things that float.
- Pill-shaped controls, 44px tall or more.
- Light and dark themes with the same structure.

## Colour

Components use the names, never the values. Both themes are defined in `src/index.css`.

| Name | Light | Dark | Use |
|---|---|---|---|
| `ground` | `#f7f7f5` | `#101311` | Page background |
| `surface` | `#ffffff` | `#181c1a` | Cards, fields, the mode bar |
| `ink` | `#15181b` | `#f2f1ec` | Text. Also the fill of the selected mode, day and lead card |
| `muted` | `#5b6066` | `#a3a8a4` | Secondary text |
| `line` | `#e3e3df` | `#2a302d` | Hairlines and card borders |
| `edge` | `#d9d9d4` | `#3a413d` | Borders on fields and secondary buttons |
| `ring` | `#8c9096` | `#7c837e` | The empty check circle |
| `accent` | `#1e4a3d` | `#8fc7b0` | Bottle green: primary buttons, completed checks, progress |
| `on-accent` | `#ffffff` | `#101311` | Text on accent |
| `tint` | `#e6eeea` | `#1d2b26` | Soft buttons |
| `brass` | `#7d5f27` | `#c9a96a` | Eyebrow labels only |
| `bad` | `#a8322b` | `#f08a80` | Over budget, overlaps, destructive actions |

**Rules**

- Accent is for action and completion. Do not use it for decoration.
- Brass is for eyebrow labels. It is never a fill and never body text.
- "Selected" is ink on ground reversed (`bg-ink text-ground`), not accent.
- The theme is Match device, Light or Dark, chosen in Profile and applied before first paint.

## Type

- **Serif:** Cormorant Garamond (500, 600, italic 500). Headlines, plan and item titles, hero numbers. Never below 20px; its letters are small for their size.
- **Sans:** Inter (400, 500, 600). Everything else.

| Role | Face | Size | Weight |
|---|---|---|---|
| Screen headline | Serif | 40 to 44px, line-height 1.02 to 1.05 | 600, with one italic word at 500 |
| Hero number | Serif, tabular | 40 to 56px | 600 |
| Item title | Serif | 24px | 600; 500 when done or skipped |
| Card title | Serif | 30px | 600 |
| Body | Sans | 15 to 16px | 400 |
| Detail | Sans | 13px | 400 |
| Time | Sans, tabular | 13px | 600 |
| Eyebrow | Sans | 11px, 0.14em tracking, capitals | 600 |

Inputs are 16px so iPhones do not zoom on focus. All times and money use tabular figures (`num`).

## Layout

One column, at most 512px wide, with 24px side padding. Sections are 28 to 32px apart. Inside a plan, the mode bar floats at the bottom and content keeps 112px of bottom padding to clear it. Everything respects the phone's safe areas.

## Shape and depth

- Buttons, chips, the mode bar and day indicators are full pills.
- Fields are 12px. Cards are 16px. Sheets are 28px.
- Cards are flat: `surface` with a `line` border. Only the mode bar and sheets cast a shadow.

## Components

- **Button:** 44px (52px large) pill. Primary is accent; secondary is surface with an edge border; soft is tint with accent text; danger is bad-coloured text.
- **Check:** a 28px circle in a 44px target. Empty ring to do, filled accent with a tick when done (it pops in), ring with a cross when skipped.
- **Choice:** a large card with a serif title and a hint, used for one-question screens. Selected gains an accent border and a tick.
- **Segmented:** a pill track; the selected option is ink.
- **Timeline row:** time on the left, serif title and details in the middle, check on the right. Done items are struck through and muted.
- **Gap:** a dashed tick and a muted line ("1 h 30 free"). Two hours or more of known free time becomes an Open time card with one action.
- **Mode bar:** four equal pills at the bottom of a plan: Timeline, Checklist, Budget, Map.
- **Sheet:** slides up from the bottom on phones and sits centred on wider screens. Title in serif, one primary action in the footer.

## Motion

Short and purposeful: sections rise in over 0.36s with a small stagger, sheets slide up over 0.28s, checks pop, progress bars glide. Buttons press in to 97%. A row follows the finger when swiped and springs back. All motion is off under reduced-motion.

## Gestures

- Tap the circle to complete. Tap the row to edit.
- Swipe a timeline row right to complete, left to skip. Swiping again undoes it.
- A short vibration confirms completion where the phone supports it.

## Do and don't

- **Do** lead each screen with one serif headline or one hero number.
- **Do** keep one mode on screen at a time.
- **Do** work out the arithmetic and show it.
- **Don't** put shadows on resting cards.
- **Don't** use photographs or illustration as decoration; the type carries the page.
- **Don't** use emoji as icons. Icons are thin line drawings.
- **Don't** set long text in the serif.
