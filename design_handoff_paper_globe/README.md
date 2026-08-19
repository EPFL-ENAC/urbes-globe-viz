# Handoff: "Paper Globe" — the target feel for URBES Globe Viz

A design-direction handoff for an agent (Claude Code) working in the **urbes-globe-viz**
frontend (`Vue 3 + TypeScript · Quasar · MapLibre GL · Deck.gl · Vite`).

It describes the **feel** to recreate — the "2A / Paper globe" proposal — and maps it onto the
**files and tokens that already exist in `frontend/`**, so you change the right places. It is
**not** a spec to copy pixel-for-pixel, and **not** a brief to rebuild every screen. Apply the
feel to the existing landing and project views using the app's established patterns.

> This supersedes the dark-theme aesthetic described in `frontend/design.md`. Where that doc
> says "dark theme, pure black, Inter/Nunito, uppercase, scale-up on hover," prefer the feel
> below: near-white paper ground, Suisse Int'l, sentence case, colour-only hovers.

---

## About the file in this bundle

`paper-globe-reference.html` is a **design reference** — a self-contained HTML prototype of the
landing, with a live MapLibre globe. Open it in a browser to see the target. It shows intent
(proportions, colour, type, motion), not production code. Recreate that intent in the existing
Vue + Quasar components; don't ship the HTML.

---

## The feel in one paragraph

**Ink on near-white paper.** The real, interactive globe (the existing `Globe3D`) rendered as a
_pale plan_ — light-grey land, thin dark coastlines — with a crisp **white text panel breaking
its edge**. Type is **Suisse Int'l**: one oversized **Light** headline in **sentence case**, body
in regular grey, and tiny **uppercase monospace micro-labels** for eyebrows and metadata.
Everything is **square-cornered**, separated by **1px hairlines**, and carries **no shadow**. The
**violet accent** the app already uses (`#A078F0`) appears only where it means something — the
project markers on the globe and the **"Explore the atlas →" text link**. **No gradients. No card
lifts.** Calm, editorial, unmistakably EPFL Architecture Hub.

The five sections below are the rules that produce that feel; each says **where in `frontend/` it
applies.**

---

## Where the feel lives in the repo

| Concern                                               | File(s) to touch                                               |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| Palette, default theme, fonts, link defaults          | `src/style.css` (the `:root` token block)                      |
| Quasar brand colours, radius, elevation, ripple       | `src/quasar-variables.sass` + Quasar config in `src/main.ts`   |
| Hero headline + the primary call-to-action            | `src/components/features/HeroSection.vue`                      |
| Project carousel cards + hover                        | `src/components/common/ProjectCard.vue`                        |
| Landing layout (panel over globe, carousel placement) | `src/pages/GlobeView.vue`                                      |
| Globe paint (land / coastline / markers)              | `src/components/features/Globe3D.vue`, `src/config/basemap.ts` |

The app already keys everything off CSS custom properties (`--color-*`) and a violet
`$primary`. **Retune those existing tokens — don't introduce a parallel set.**

---

## 1 · Colour & accent

**Near-white ground, monochrome ink, the existing violet accent — used sparingly.**

The biggest move is making the **light, near-white palette the default**. Today `:root` in
`src/style.css` defaults to dark (`--color-bg: #000000`) with a `[data-theme="light"]` override.
For the paper feel, the light palette becomes the base and its ground is **`#FDFDFD`**, not pure
white (pure white is reserved for the panels/cards that sit _on_ the ground). Violet stays
_rationed_: globe markers, links, the emphasised headline word, and active states (selected chip,
filled pagination dot) — never a fill behind large areas or sprayed across chrome.

Target values, mapped onto the existing token names in `src/style.css`:

```css
:root {
  /* make THIS the default palette (light-first) */
  --color-bg: #fdfdfd; /* page ground — near-white, never pure #fff */
  --color-surface: #ffffff; /* panels / cards that sit on the ground (solid, not translucent) */
  --color-surface-raised: #ffffff;
  --color-text: #141414; /* ink — headings, active text */
  --color-text-muted: #8e8e8e; /* grey — body, secondary, inactive */
  --color-border: #ececec; /* hairline separators & borders */
  --color-border-strong: #b6b6b6;

  /* accent — already correct; keep */
  --color-accent: #a078f0; /* markers, links, emphasised word, active state */
  --color-accent-strong: #8a5cf0; /* hover / active of the accent */
  --color-accent-soft: #ece3fd; /* faint selection wash / row hover only */
  --color-on-accent: #ffffff;

  --color-map-bg: #f1f1f1; /* the paper-globe sphere (see §6) */
}
```

> `#A078F0` on `#FDFDFD` is fine for a 16px medium-weight link and for the markers. If you keep a
> `[data-theme="dark"]`, leave its values as-is — this is about the **default** experience.

Globe paint (the pale ink-on-paper plan — apply in `Globe3D.vue` / `basemap.ts`):

```js
// background sphere → light grey, land → lighter grey, coastline → near-black hairline
{ id: 'bg',   type: 'background', paint: { 'background-color': '#F1F1F1' } },
{ id: 'land', type: 'fill',       paint: { 'fill-color': '#E4E4E4' } },
{ id: 'coast',type: 'line',       paint: { 'line-color': '#161616', 'line-width': 0.6 } },
// project markers — the only colour on the map
{ id: 'markers', type: 'circle', paint: {
    'circle-radius': 5, 'circle-color': '#A078F0',
    'circle-stroke-color': '#FDFDFD', 'circle-stroke-width': 1.4 } }
```

**Don't:** introduce red or status reds as chrome, add gradients, or use coloured surfaces.
Dataset legends keep their own earned data palettes (the temperature ramp, density ramp) — that's
data, not chrome, and is exempt from the "violet only" rule.

---

## 2 · Typography

**Suisse Int'l everywhere; one Light display headline in sentence case; monospace for
micro-labels.**

Today the app uses **Inter** (`src/style.css` `:root`) and **Nunito** (in `HeroSection.vue`). For
the feel, self-host **Suisse Int'l** and make it the single primary face; remove Inter/Nunito as
the visible faces. Add a **monospace** variable for the micro-label role, which the app currently
has no equivalent for.

```css
:root {
  --font-sans: "Suisse Int'l", Arial, "Helvetica Neue", Helvetica, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
}
```

Three roles only — display, body, micro-label — and they never blur together.

| Role            | Use                                                                           | Spec                                                                                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display**     | Hero headline, big section titles                                             | `--font-sans`, **weight 300 (Light)**, `clamp(2.875rem, 5vw, 4rem)`, `line-height: 1.0`, `letter-spacing: -0.025em`. **Sentence case** — drop the `text-transform: uppercase` currently on `.hero-title`. The single emphasised word is set in `--color-accent`. |
| **Body**        | Paragraphs, descriptions                                                      | `--font-sans`, weight 400, `15–16px`, `line-height: 1.55`, colour `--color-text-muted` (ink only when it must carry weight). Replaces the Nunito `.hero-body`.                                                                                                   |
| **Micro-label** | Eyebrows, metadata, column heads, captions, the "Projects" heading, card year | `--font-mono`, `10–12px`, `letter-spacing: 0.12–0.16em`, `text-transform: uppercase`, colour `--color-text-muted`. This monospace+tracked+uppercase tag is the **signature** of the system — use it for every small structural label.                            |

```css
.eyebrow {
  /* "URBES GLOBE · EPFL", "PROJECTS — 6", card meta */
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.hero-title {
  font-family: var(--font-sans);
  font-weight: 300;
  text-transform: none; /* was uppercase */
  font-size: clamp(2.875rem, 5vw, 4rem);
  line-height: 1;
  letter-spacing: -0.025em;
}
.hero-title em {
  font-style: normal;
  color: var(--color-accent);
}
```

Suisse Int'l (weights 300–700 + Light/Medium italics) is bundled in the design system at
`_ds/epfl-design-system-architecture-vibe-28a46a3b-2361-4821-abcc-e3e018e64b0a/fonts/`. Copy those
`.ttf`s into the app and declare them with `@font-face`. Do **not** keep Inter/Roboto/Nunito as the
primary face.

**Don't:** bold the display headline (it must be Light), set micro-labels in the sans face, or use
Title/UPPER case for the headline (sentence case, with uppercase reserved for the mono labels).

---

## 3 · Shape & separators

**Square corners, 1px hairlines, zero shadow.** Structure comes from rules, not elevation.

- **Square everything.** Set Quasar's radius to 0 and stop using rounded/elevated variants.
- **Separators are hairlines:** header edge, list rows, card outlines, panel borders are all
  `1px solid var(--color-border)`. The app's `ProjectCard` already uses
  `outline: 1px solid var(--color-border-strong); outline-offset: -1px;` on the thumb — that's the
  right pattern; just point the colour at the lighter `--color-border` hairline.
- **No shadows.** `src/style.css` still gives `.maplibregl-ctrl-group` a `box-shadow` — swap any
  elevation for a 1px border. Cards/panels never lift.
- **Circles (`border-radius: 50%`) are reserved** for the round map markers and the pagination
  dots (`HeroSection`'s `.dot` already does this). Everything rectangular stays square.

```sass
// src/quasar-variables.sass
$generic-border-radius: 0
$button-border-radius:  0
$rounded-borders:       0
$shadow-1: none
$shadow-2: none
$shadow-3: none
```

**Don't:** round a corner, add a shadow to lift a card/panel, or use a filled box where a hairline
separates just as clearly.

---

## 4 · Links over buttons · calm motion

**Prefer a violet text link with a trailing arrow to a filled button. Hovers change colour only —
never scale, lift, or shadow.**

This is the headline interaction change. The primary call-to-action becomes a **text link**, not a
solid button. In `HeroSection.vue` the current outro `q-btn` ("Visit Urbes Lab", `unelevated`,
uppercase, accent fill) should read as a text link, and the landing's main "Explore the atlas"
action is a link too:

```html
<!-- text-link CTA (Quasar) -->
<q-btn
  flat
  no-caps
  :ripple="false"
  class="atlas-link"
  label="Explore the atlas"
  icon-right="arrow_forward"
/>
```

```css
.atlas-link {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 16px;
  color: var(--color-accent);
  text-transform: none;
  padding: 0;
  transition: color 0.15s ease-in-out;
}
.atlas-link:hover {
  color: var(--color-accent-strong);
}
.atlas-link :deep(.q-icon) {
  transition: transform 0.15s ease-in-out;
}
.atlas-link:hover :deep(.q-icon) {
  transform: translateX(4px);
} /* the only motion: arrow nudges 4px */
```

Reserve a **filled** button (`background: var(--color-accent); color: var(--color-on-accent);
square; no shadow; sentence case`) for the single strongest action _inside_ a detail/map view
("Open full map →"). On the landing or in a list, default to the text link.

**Motion vocabulary** — colour and 1-step transitions only:

- Allowed: colour fades, border-colour changes, the 4px arrow nudge, the globe's gentle idle
  auto-rotation (which **pauses for good** the moment the user drags it — the app already does this).
- **Never:** `transform: scale()` / `translateY()` lifts on hover, drop-shadow on hover, spring/
  bounce easing, parallax.

**Concrete fix in `ProjectCard.vue`:** the card currently hovers with
`transform: scale(1.05)`. Replace that with a **colour-only** hover — the thumbnail outline and the
title turn violet, nothing moves:

```css
/* replaces .project-card:hover { transform: scale(1.05) } */
.project-card {
  transition: none;
}
.project-card:hover .card-image,
.project-card-highlighted .card-image {
  outline-color: var(--color-accent);
}
.project-card:hover .card-title,
.project-card-highlighted .card-title {
  color: var(--color-accent);
}
```

### Quasar specifics

Quasar defaults to rounded corners, ripple, and elevation — all off-direction. Disable globally in
`src/main.ts` and per-use:

```js
// src/main.ts
app.use(Quasar, { config: { ripple: false } });
```

```html
<q-btn flat no-caps square :ripple="false" ... />
<!-- links + most actions -->
<q-btn
  unelevated
  no-caps
  square
  :ripple="false"
  color="primary"
  text-color="white"
  ...
/>
<!-- rare filled action -->
```

Use `flat`/`unelevated`, `no-caps`, `square`, `:ripple="false"` on every `q-btn`; keep `q-card`
`flat bordered` (never `:elevation`).

---

## 5 · Layout — the panel that breaks the globe's edge

**The signature move: a white text panel sitting _over_ the globe, breaking its edge.** The globe
is pushed to the right (and slightly off the right edge); the headline panel is a white rectangle
with a 1px border anchored to the left, overlapping the map. This is a re-layout of `GlobeView.vue`

- `HeroSection.vue` (which today overlay the hero text on the full-bleed globe).

```
┌─────────────────────────────────────────────────────────┐
│  EPFL │ URBES                       Explore  About  Lab↗ │  ← header, no shadow, 26px/56px pad
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────┐                                   │
│  │ URBES GLOBE · EPFL │            ╱‾‾‾‾‾‾‾‾╲             │  ← white panel overlaps the
│  │ Decoding the       │          (   GLOBE    )          │     globe; globe bleeds off
│  │ physics of cities  │           ╲________╱             │     the right edge
│  │ …body…             │              • • violet markers  │
│  │ Explore the atlas →│                                  │
│  └───────────────────┘                  © MapLibre · drag │
├─────────────────────────────────────────────────────────┤
│  PROJECTS — 6                                        ‹  › │  ← carousel: square thumbs,
│  [▣][▣][▣][▣][▣][▣]                       • ○ ○            │     mono captions, dot pagination
└─────────────────────────────────────────────────────────┘
```

Panel + globe placement (desktop):

```css
.hero-panel {
  /* the white rectangle, anchored left, over the globe */
  position: absolute;
  left: 56px;
  top: 50%;
  transform: translateY(-50%);
  width: 560px;
  max-width: 46vw;
  background: var(--color-surface);
  border: 1px solid var(--color-border); /* 1px hairline, square, no shadow */
  padding: 52px;
  z-index: 3;
  pointer-events: auto;
}
.globe-layer {
  /* size larger than its column, push off-edge */
  position: absolute;
  right: -60px;
  top: 50%;
  transform: translateY(-50%);
  width: 62vw;
  max-width: 920px;
  height: 92%;
}
```

**Projects carousel** (the existing `.projects-list` flex row in `GlobeView.vue` is already the
right structure — restyle, don't rebuild):

- Square thumbnails, `~158px`, each `outline: 1px solid var(--color-border); outline-offset: -1px;`
  (overflow hidden). The duotone-purple thumbnail filter already in `ProjectCard.vue`
  (`grayscale → sepia → hue-rotate(~220deg)`) is **on-feel** — keep it so the strip reads as one
  violet-grey family.
- Under each thumb: title in `--font-sans` 500 / 15px, then a **mono micro-label** meta line
  (`INFRA · 2023`) — upgrade the current plain `.card-year` to the mono treatment.
- A header row above the strip: a mono `PROJECTS — 6` label left, `‹ ›` arrows right (replace the
  hidden `.projects-heading`).
- Round pagination dots below, centred, `9px`; active dot `--color-accent`, rest `--color-border`.

**Header / nav:** brand lockup `EPFL │ URBES` (bold `EPFL`, 1px divider, medium `URBES`),
right-aligned nav links with `gap`; current section in ink, the rest grey; **no shadow / heavy
border** — it sits directly on the ground. (`design.md` already calls for "white text, no buttons,
hover underline" nav — keep that intent, recoloured to ink-on-paper.)

The mobile layout (`@media (max-width: 767px)` blocks in `GlobeView.vue`/`HeroSection.vue`) can keep
its stacked, blurred-globe-background approach — just inherit the new palette, fonts, sentence-case
title, and colour-only interactions.

---

## Quick checklist

- [ ] Light, near-white palette is the **default**; `--color-bg: #FDFDFD`, panels/cards solid `#FFFFFF` + 1px `#ECECEC` border, no shadow.
- [ ] Violet only on markers, links, the emphasised word, and active states. No red/gradients as chrome.
- [ ] Primary face is **Suisse Int'l** (Inter/Nunito removed); a `--font-mono` exists for micro-labels.
- [ ] Hero headline is Suisse **Light**, **sentence case** (uppercase removed), one violet word.
- [ ] Every small label is uppercase tracked **monospace** (eyebrow, "PROJECTS — 6", card meta).
- [ ] Quasar radius/elevation/ripple disabled; every corner square.
- [ ] Primary CTA is a **violet text link with a → that nudges 4px on hover**, not a filled button.
- [ ] `ProjectCard` hover is **colour-only** (outline + title go violet); the `scale(1.05)` is gone.
- [ ] Globe is a pale ink-on-paper plan with a white panel breaking its edge; idle auto-spin pauses on drag.
- [ ] Projects ride the square-thumb carousel with mono captions and round dot pagination.

## Files

- `paper-globe-reference.html` — self-contained landing prototype with the live globe (open in a browser).
- `README.md` — this document.
