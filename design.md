# Design — いばしょ・きっかけ MAP

A locked design system for this site. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

Produced by `hallmark study` → `hallmark redesign` (multi-page flow), 2026-08-01.

## Provenance

- **Source mode**: url
- **Primary reference (structural backbone)**: `https://qulii.jp/`
- **Secondary axes**: `https://go.goinc.jp/` (section-head device),
  `https://mirai-creatorz.com/` (card category colour tab)
- **Status**: public references the user cited for inspiration on their own site.

Hallmark's `study` rule is **one source, one diagnosis** — blending several
references produces template-soup. qulii is the backbone because its *role*
matches: same audience (中高生), same content (校外の機会), same core
interaction (検索 → 一覧 → 1件). GO and mirai contribute one axis each.

**Nothing is copied.** The DNA taken is structural (macrostructure, section-head
shape, card composition, colour-band rhythm). Every token value in `tokens.css`
was solved here for WCAG AA, not lifted from a reference. qulii loads Lato +
Montserrat; both are on Hallmark's banned-defaults list, so only the type
*roles* carry forward.

**Known blind spot**: URL mode cannot judge rhythm from HTML. Density and
asymmetry were read from a screenshot pass over all three references.

## Genre

editorial-adjacent consumer directory. Bright, multi-colour, high-contrast.
Tone: 中高生に開かれた公共メディア. Audience: 中学生・高校生と、その保護者・教員.
Primary job: 「やってみたいこと」と地域から絞り込み、1件の公式情報に到達する.

## Macrostructure family

- **Discovery page** (`index.html`): **Ecosystem Index** — hero → promo → three
  discovery surfaces, each on its own colour band.
- **App pages** (`search.html`, `spot.html`): **Portfolio Grid** — filterable
  cards are the content.
- **Content pages** (`guide` `faq` `teachers` `contact`): **Long Document**.

## Signature devices (the studied DNA)

1. **Header search** (qulii) — a search field lives in the header on every page
   except `search.html`, which has its own. Submits to `search.html?q=`, a
   parameter the page already handles.
2. **Section head** (GO) — a short rule, a small JP label, then a large
   decorative EN word beneath. Markup is
   `<h2 class="section-head"><span class="sh-ja">…</span><span class="sh-en" aria-hidden="true">…</span></h2>`.
   **The EN is `aria-hidden`** so the heading's accessible name stays Japanese.
3. **Full-bleed colour bands** (qulii) — sections are separated by colour, not
   by whitespace alone: `.band` + `.band-tint-warm` / `.band-tint-cool` /
   `.band-ink`. Rhythm on the home page is warm → paper → cool → ink.
4. **Marker highlight** (qulii) — a phrase in the hero headline sits on a
   yellow band drawn at x-height, never at the baseline. Measured 12.74:1.
5. **Card category tab** (mirai) — a 4px bar in the card's category colour
   across the top of its photo.
6. **Hashtag tag row** (qulii) — field tags render as `#tag` in the category
   colour, no chip boxes.

## Theme

Surfaces are near-white warm neutral. **Every text colour is solved to clear
4.5:1 against the darkest light surface (`--color-paper-3`)**, and every band
fill clears 4.5:1 with cream text on it — so there are no per-surface
exceptions anywhere in `styles.css`.

```
--color-paper       oklch(98.5% 0.005 70)
--color-paper-2     oklch(96.5% 0.010 68)
--color-paper-3     oklch(93.5% 0.016 66)
--color-border-ctl  oklch(62.0% 0.030 62)   controls — 3:1 on paper-3
--color-muted       oklch(52.0% 0.030 62)
--color-ink-2       oklch(36.0% 0.032 60)
--color-ink         oklch(21.0% 0.020 60)
--color-accent      oklch(53.5% 0.175  45)  orange — primary
--color-accent-2    oklch(52.0% 0.150 250)  blue — secondary
--band-warm / --band-cool / --band-ink      full-bleed fills (cream text)
--tint-warm / --tint-cool                   soft bands (ink text)
--marker            oklch(89.0% 0.120 79)   the highlight band
```

### Duo accent

qulii runs orange against blue. Orange carries primary actions, counts, and the
first ornament; blue carries the promo block and the secondary state. Never
both inside one filled element.

### Category colour system

Six hues mirroring `shared.js` `catKey` — **functional, not decorative**.
Applied to the category strip (top bar + label), and to each card's top tab,
location pin and hashtag tags. All clear 4.5:1 as text on all three surfaces.

```
--cat-nature oklch(50% 0.150 150)   --cat-arts    oklch(44.5% 0.115  78)
--cat-science oklch(52% 0.155 255)  --cat-startup oklch(52.5% 0.165 300)
--cat-community oklch(54% 0.155 10) --cat-sports  oklch(47.5% 0.125 195)
```

## Typography

Two families.

- **Body + every heading**: `Noto Sans JP`, weight-driven **400 / 500 / 700 / 900**
  (the GO approach — hierarchy from weight, not from a second face).
- **Decorative EN + tabular figures**: `Bricolage Grotesque` 400–800 variable.
  Two roles only: the big EN section words / small EN labels, and any figure
  that needs `tabular-nums` (件数・距離・手順番号).

Headings are roman. `font-style: italic` is banned on every heading and label.

## Spacing · radius · elevation

4-point named scale. Radius 8px controls / 10px cards / pill for chips and
buttons (qulii's register). Elevation is a **soft lift** (`--shadow-card` /
`--shadow-lift`), not a hard offset.

The shared page shell is 1280px. Long-form prose remains capped at 68ch, while
photography, result grids, document components and form layouts may use the
available shell width. Organization detail pages use the 64rem wide measure.
This separation keeps reading lines comfortable without leaving useful desktop
space empty.

## Motion

- Easings `--ease-out` / `--ease-in` / `--ease-in-out`; never the browser default.
- Durations 120 / 200 / 320ms.
- No scroll-triggered reveals. **GO ships `inView-fadeIn` on 45 elements and
  `transition:all` 12 times — deliberately not carried over.**
- Focus rings appear instantly; `outline` is never transitioned.
- Reduced-motion collapses everything to a ≤150ms opacity change.

## Home map interaction

- The Japan silhouette is north-up and uses a latitude-aware physical aspect
  ratio instead of the former horizontally stretched projection. Okinawa is a
  labelled right-bottom inset so the mainland can occupy more of the available
  width without a tall empty tail. Each region has its own quiet warm cartographic
  fill; hover strengthens its outline and selection alone becomes vivid orange.
- The Japan map is a preview surface: selecting a region opens a narrow floating
  list inside the map with three region picks, using the AREA PICKS selection rule.
- Each row is limited to a circular photo, name, category, and short location.
  Full provenance, tags, eligibility, descriptions, and external actions stay on
  the detail page and the full AREA PICKS cards.
- The adjacent text region index remains the explicit route to the full filtered
  result list. This keeps preview and exhaustive search as separate actions.
- The popover stays at 280px or narrower, is positioned within the map boundary,
  and never adds a page-wide backdrop. It supports keyboard focus, Escape, a
  visible close control, outside-click dismissal, and selected-region state.

## Search filters

- Keyword search is the primary control. All structured filters live in one
  native disclosure immediately below it and remain collapsed by default.
- A compact `3問で診断` launch sits beside the keyword field. It opens the same
  diagnosis used by the lower-page CTA, so the search page has an immediate
  guided path without duplicating the quiz implementation.
- The closed disclosure shows a short, live summary of selected conditions.
  Inside, the three filter families use a quiet underline tab treatment rather
  than competing filled pills; individual filter values remain touch-safe chips.

## CTA voice

Primary = orange pill, cream text. Secondary = cream pill, ink text. Tertiary =
underlined text link. Buttons and nav links never wrap (`white-space: nowrap`),
and every control is ≥44px tall.

## What pages MUST share

Header (brand · search · links), the section-head device, the band rhythm, the
duo accent, the category colour system, the audience signal system, the colophon
footer. Public cards do not display editorial publication-status badges. Their
top-right photo labels classify `targets` as 中学生 (warm vermilion tint),
高校生 (dark ink), or その他 (neutral). Records for both school stages show two
labels; the full target list remains on the detail page.

## Favorites

- Cards keep the save action inside the photograph as a 44 px heart button, so
  no new metadata row is added to the already information-dense card body.
- The header shows the saved count on every page. Search adds one explicit
  `気になる` filter and a dedicated empty state.
- Favorites use `localStorage` and therefore stay in the current browser only.
  The interface must not imply account sync or cross-device persistence.
- Search can create a compact `?list=` URL containing up to 60 valid record IDs.
  Opening that link shows the same shortlist without importing it into the
  recipient's local favorites. Treat possession of the URL as access to the list.

## Calendar handoff

- Source records currently have no dependable structured event date or deadline.
  Detail views therefore ask the visitor to enter a date they confirmed on the
  official site instead of guessing or silently pre-filling one.
- The handoff downloads a standards-based `.ics` file with the record name,
  location, detail URL, a selectable `VALARM` reminder, and a note to recheck
  the official source. It works without accounts or a third-party calendar
  integration.
- The calendar action stays in detail actions; cards remain dedicated to
  discovery and saving.

## Photography policy

- Organization-specific photography is discovered only from each record's
  official URL or its listed public information-source URL. Every adopted
  candidate carries `imageSourceUrl`, `imageKind`, `imageCheckedAt`, and the
  editorial state `公開前に利用条件確認`; the machine-readable audit trail is
  `image-sources.json`.
- Cards label official candidates **「公式サイト掲載」**. Spot/detail views
  link back to the source page. External images use `referrerpolicy=no-referrer`
  and fall back to a local field image when loading fails.
- If no suitable official candidate is found, use one of six locally generated
  documentary-style field images and label it **「イメージ写真」**. Never
  generate a photograph and imply that it depicts a particular organization.
- The four Long Document pages and the home hero may use locally generated
  editorial images. They must include literal, visible image captions and
  truthful alt text describing them as imagery.
- Local generated assets are JPEG, 3:2, 1536×1024, quality 84. A restrained
  saturation/contrast grade in `styles.css` integrates them with the existing
  warm public-media palette.

## Known deviations

- **Emoji remain as legacy metadata in the 34-entry `FIELD_STYLE` map**, but are
  no longer rendered as map controls. Map locations use six consistent SVG
  pictograms with a visible legend. Numeric marker clustering is disabled;
  records at the same rounded coordinate fan out in screen space so every
  location remains individually selectable without changing its stored
  latitude and longitude.
- **Legacy generated PNGs remain in `img/` but are no longer referenced.** They
  are retained to avoid destructive asset deletion. Current UI surfaces use
  sourced official-site candidates where a plausible photo was found, and
  clearly labelled generated editorial imagery everywhere else.

## Exports

`tokens.css` at the project root. This is a vanilla-HTML project with no
Tailwind, no DTCG pipeline and no shadcn/ui, so no other export format is
generated.
