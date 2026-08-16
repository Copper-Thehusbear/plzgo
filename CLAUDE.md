# CLAUDE.md — plzgo.me

## Project

Tinder-style Bangkok travel planner. Users swipe on places → get an optimised map-based itinerary. MVP targeting lazy-planners (65% foreigners, 35% Thais). Tone: "Sassy Local Friend" — sarcastic, friendly, minimalist.

**Live:** https://plzgo-bf50c.web.app  
**Firebase project:** `plzgo-bf50c`

## Database & Seeding

### Firestore State (as of 2026-07-12) — Firestore IS the source of truth
- **`places` collection: 483 docs** — text fields complete: insight_en/th, transit_note_en/th 483/483, nearest_transit_en 455/483
- **`hotels` collection: 326 docs** — Agoda hotel data (photos, ratings, partnersearch URLs)
- **`routes` collection** — auto-saved itineraries (share permalinks)
- **`issues` collection** — monthly Explore page content (doc per `YYYY-MM`, seeded via `scripts/seed-issue-*.js`)
- **`hotels_live_cache`** — 24h cache written by the getNearbyHotels Cloud Function

### Master CSV (backup snapshot, regenerated FROM Firestore)
- **File:** `plzgo-db-task/Plzgo_MasterDB_Clean.csv` (483 rows × 69 cols)
- The original hand-maintained CSV was lost; the CSV is now an export artifact, not the source.
- Regenerate after bulk edits: `node scripts/export-master-csv.js`
- `seed-master-700.js` no longer exists — do not reference it.

### Imagery — enriched but BLOCKED by billing
- Every place has real venue photos (`image_url`, `photo_1..10`, `photos[]`) in Firebase Storage (`gs://plzgo-bf50c.firebasestorage.app/places/…`, 2.24 GB).
- **All image URLs return 403 because the project's billing account is closed.** IAM public read (allUsers:objectViewer) is already granted; re-attaching an active billing account fixes images instantly. This also gates the getNearbyHotels function (Blaze).

Note: `seed-firestore.cjs` and `seed-bangkok.cjs` are legacy — ignore them.

## Architecture Rules

### Map — always Leaflet, never Google Maps Directions API
- Map library: **Leaflet 1.9** (`import L from 'leaflet'`, `import 'leaflet/dist/leaflet.css'`)
- Tiles: **CartoDB Positron** — `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
- Do not switch to Mapbox GL JS without discussion — bundle size 6× larger, requires billing
- Route markers rendered via `L.divIcon` (inline HTML strings)
- "Navigate Here" uses single-point Google Maps URL: `https://www.google.com/maps/search/?api=1&query=LAT,LNG` — no API key, no billing

### Routing — all offline, no API cost
- `buildOptimalDays(swipedPlaces)` in `useRouting.js` does k-means → nearest-neighbour → 2-opt
- Do not call any routing API. Haversine is in `useDistance.js` — use it.
- `buildDayGeoJSON(dayBlocks)` returns a FeatureCollection (used for future layers)

### Distance — use existing haversine
- `useDistance().haversine(lat1, lng1, lat2, lng2)` returns km
- Contextual pins radius: **750 m** (defined in `useContextualPins.js`)
- Zone centroid mapping: **8 Bangkok hubs** (defined in `useZoneCentroid.js`)

### State — Pinia store is the single source of truth
- `store.swipedPlaces` — confirmed itinerary places
- `store.cardPool` — full fetched pool (set in `SwipeView.vue` after fetch, used by `useContextualPins`)
- `store.tripMode` — `'chill' | 'full' | 'tour'`
- `store.lang` — `'en' | 'th'`, persisted to `localStorage`
- Add new state here, not as component-local refs unless purely UI state

## Design System — "Transit Diagram" (locked 2026-07)

Full spec lives in `.claude/skills/plzgo-design/SKILL.md` — this section is the summary. Single source of truth for tokens is `src/style.css :root`.

| Token | Hex | Usage |
|---|---|---|
| `--paper` | `#F6F5F1` | Page backgrounds (map paper) |
| `--ink` | `#1C273D` | Text, structure, SwipeView "tunnel mode" bg |
| `--line-1` | `#FF8C42` | Day 1 route + the ONE orange CTA per screen |
| `--line-2` | `#12796F` | Day 2 route (markers + polyline must match) |
| `--line-3` | `#C2497D` | Day 3 route |
| `--signal` | `#FFD235` | Unmarked stops / golden contextual pins |
| `--hairline` | `#DEDACF` | Dividers, card borders |
| `--muted` | `#6B7280` | Secondary text |
| `--orange-text` | `#C2540A` | Orange TEXT on light bg (AA contrast) |
| `--shadow-sm` | `0 2px 8px rgba(28,39,61,.07)` | Resting depth on every `.glass-panel` card |
| `--shadow-md` | `0 10px 28px rgba(28,39,61,.12)` | Hover lift on interactive cards (hotel rows, buttons) |
| `--shadow-lift` | `0 18px 40px rgba(28,39,61,.16)` | Stronger hover lift (SwipeCard, prominent CTAs) |

**Rules:** soft shadows via `--shadow-sm/md/lift` are allowed (2026-08 amendment — was "no shadows" before this). `.glass-nav` (global) now uses real `backdrop-filter: blur(14px)` over a translucent paper background (2026-08, second amendment) — this is the one approved `backdrop-filter` use, don't add blur elsewhere without discussion. `SwipeView.vue` keeps its own scoped `.glass-nav` override (solid ink, no blur) for tunnel-mode immersion — don't remove that override. Still **no gradients-on-text**, no Fraunces/serif, no emoji in UI chrome. Cards radius 6–8px; pills/badges 999px. Fonts: IBM Plex Sans Thai (body) / IBM Plex Sans Condensed 700 (display) / IBM Plex Mono 500 (**every data number**: times, km, minutes, prices, stop codes). Microcopy metaphor: Board / Skip stop / Last stop / Unmarked stop / Interchange. Signature motion: route line draws itself on ResultView load (`.plzgo-route-draw`), and TimelineItem stops now stagger in alongside it; SwipeCard's top-card wrapper has a slow ambient idle sway (±0.7°/7s) when not being dragged; everything else changes state instantly except deliberate hover-lift on interactive cards; respect `prefers-reduced-motion`. **LandingView is the one screen allowed richer scroll-reveal/entrance motion** (marketing entry point, not a repeated-use tool surface) — don't spread that pattern to SwipeView/ResultView/HomeView/RouteView.

**Exempt:** `ExploreView.vue` is the standalone monthly magazine — it keeps its own editorial style (Fraunces/Inter, its own tokens) and is NOT part of the Transit Diagram system.

## Component Conventions

### `TimelineItem.vue`
- Renders a **StationRow** (dot on a continuous line); line color comes from the CSS var `--row-line` set by the parent day block (`:style="{ '--row-line': DAY_COLORS[dayIndex] }"`)
- Has a `theme` prop: `'dark'` (default — for ink backgrounds) | `'light'` (white/paper backgrounds). ResultView **and** RouteView both pass `theme="light"` since the 2026-07 redesign. Do not remove the prop.

### `MapCanvas.vue`
- Props: `dayBlocks` (Array, required), `contextualPins` (Array, default `[]`)
- Emits: `pin-click` with `{ place, walkMinutes, nearestName }` when a golden pin CTA is clicked
- Pass `contextualPins="[]"` in RouteView (no cardPool available for shared routes)
- The `watchEffect` on `dayBlocks` and `contextualPins` re-renders markers automatically

### `ContextPinCard.vue`
- Has a single root `<div>` (required for `<Transition>` in parent)
- Emits: `yep`, `nope`
- Parent (`ResultView`) handles the actual `store.swipeYep()` call — card just emits

### `BaseCampCard.vue`
- Props: `hotels` (Array), `zoneName` (String), `zoneCopy` (String)
- Only renders if both `zone` and `hotels.length` are truthy in ResultView

## Firestore

Collection `places` — key fields for filtering:
- `city`: always query with `where('city', '==', city)`
- `vibe_tags`: array — filter with `.some(t => t === vibe)`
- `is_universal`: boolean — `true` = shown in all vibe filters
- `type`: `"attraction" | "food" | "nightlife" | "market" | "hotel" | "shopping" | "area"`
- `time_tag`: `"Morning" | "Afternoon" | "Evening" | "Night" | "Anytime"`
- `location.latitude`, `location.longitude`: used for all map + haversine work

Collection `routes` — auto-saved on ResultView mount. The `id` becomes the `/route/:id` permalink shown to users in the green "Your route is saved" banner.

## What NOT to Do

- Do not add Google Maps Directions API — routing is done offline
- Do not change Leaflet to Mapbox without explicit discussion
- Do not put routing logic in components — it belongs in `useRouting.js`
- Do not hardcode colours outside the design system above
- Do not use `<script setup lang="ts">` — project is plain JS
- Do not remove the `theme` prop from `TimelineItem` — RouteView still uses dark theme
- Do not use `grid-template-columns` other than 1fr/2-col patterns — keep mobile-first
- Do not skip `npm run build` before deploying
