# plzgo.me

> Stop overthinking. Start going.

Tinder-style travel planner for Bangkok. Swipe on places, get an optimised day-by-day route with an embedded map — no sign-up required.

**Live:** https://plzgo-bf50c.web.app · https://plzgo.me

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vue 3 + Vite |
| Styling | Tailwind CSS |
| State | Pinia |
| Map | Leaflet 1.9 + CartoDB Positron tiles (free, no API key) |
| Database | Firebase Firestore |
| Hosting | Firebase Hosting (project: `plzgo-bf50c`) |
| Distance calc | Haversine (offline — no Google Maps API cost) |

---

## Design System

**60-30-10 rule:**

| Role | Colour | Hex |
|---|---|---|
| 60% Background | Cream White | `#FDFCF8` |
| 30% Structure / Typography | Midnight Blue | `#1E293B` |
| 10% CTA / Highlights | Vibrant Orange | `#FF8C42` |

Dark theme (`#1B2B4B` navy) is kept only in `SwipeView` + `SwipeCard` to preserve the swiping energy. All other views use cream.

---

## Project Structure

```
src/
├── views/
│   ├── HomeView.vue          # Landing — vibe picker, trip config, CTA
│   ├── SwipeView.vue         # Card deck — swipe to curate places
│   ├── ResultView.vue        # Map + itinerary — main output
│   └── RouteView.vue         # Shared route viewer (/route/:id)
│
├── components/
│   ├── MapCanvas.vue         # Leaflet map — route markers + golden pins
│   ├── SwipeCard.vue         # Tinder-style swipe card (dark theme)
│   ├── ContextPinCard.vue    # Bottom-sheet card for nearby spot suggestions
│   ├── BaseCampCard.vue      # Hotel upsell — centroid-based zone recommendation
│   ├── TimelineItem.vue      # Single itinerary row (theme: 'dark' | 'light')
│   ├── NavBar.vue            # Fixed top nav — logo, lang toggle, start over
│   └── DonationModal.vue     # Ko-fi donation modal
│
├── composables/
│   ├── useRouting.js         # k-means + nearest-neighbour + 2-opt (offline TSP)
│   ├── useDistance.js        # Haversine formula, slotAnytimePlaces helper
│   ├── useContextualPins.js  # 750 m radius nearby-spot suggestions
│   ├── useZoneCentroid.js    # Maps swipe centroid → nearest Bangkok zone
│   ├── useFirestore.js       # Firestore queries, card pool fetch, time filtering
│   └── useAnalytics.js       # Event tracking
│
├── stores/
│   └── useTripStore.js       # Pinia — swipedPlaces, cardPool, tripMode, lang
│
└── router/
    └── index.js              # /, /swipe, /route, /route/:id
```

---

## User Flow

```
HomeView → SwipeView → ResultView
   │           │            │
Pick vibe   Swipe cards  Leaflet map + itinerary panel
Pick mode   (TSP route)  ├─ Route markers (numbered)
Pick days                ├─ Golden pins (contextual spots)
                         ├─ ContextPinCard (swipe to add)
                         ├─ BaseCampCard (hotel upsell)
                         └─ Copy permalink → RouteView (/route/:id)
```

---

## Routing Algorithm

All computation is **offline** — no Google Maps Directions API.

1. **k-means clustering** — splits places into 1–3 day groups by GPS coordinates
2. **Nearest-neighbour** — greedy TSP starter within each cluster
3. **2-opt** — local search to reduce total travel distance
4. **Time-aware sort** — Morning → Afternoon → Evening → Night ordering

---

## Map Architecture

- **Tiles:** CartoDB Positron — clean white style, no API key, free
- **Route markers:** Numbered circles — orange (Day 1) / blue (Day 2) / teal (Day 3)
- **Golden pins:** Pulsing `#FFD235` markers for contextual nearby suggestions
- **InfoWindow:** Click marker → popup with DNA description + "Navigate Here" (single-point Google Maps URL, no API call)

---

## Smart Contextual Pins

After route generation, the app surfaces up to 5 "hidden spots" from the original card pool within **750 m** of any swiped place.

```
Golden pin on map
  → Click → tooltip (name, walk time, sassy hook)
    → "See full details" → ContextPinCard slides up
      → Swipe right → swipeYep() → added to itinerary
      → Swipe left  → dismissed
```

---

## Trip Modes

| Mode | Yep cap | Days | Notes |
|---|---|---|---|
| `chill` | 5 | 1 | Universal only, max 90 min duration |
| `full` | 12 | 3 | All types, all durations |
| `tour` | 6 | 1 | Universal only, max 60 min, no nightlife |

---

## Firestore Schema

### `places`

```js
{
  city, zone,                          // "Bangkok", "สีลม"
  name, name_en,                       // TH + EN names
  type,                                // "attraction" | "food" | "nightlife" | "market" | "hotel" | "shopping" | "area"
  vibe_tags: string[],                 // ["chill","photo","foodie",…]
  is_universal: boolean,
  time_tag,                            // "Morning"|"Afternoon"|"Evening"|"Night"|"Anytime"
  description_tourist, description,    // EN + TH sassy copy
  location: { latitude, longitude },
  duration_minutes, opening_hours,
  price_range, price_thb,
  image_url, images: string[],
  affiliate_link,                      // Agoda/Klook deep link
  transit: { bts, mrt, boat, bus[], nearest_transit, walk_from_transit },
  hotel: { stars },
}
```

### `routes`

```js
{
  id,          // auto — used as /route/:id permalink
  city, vibe, mode, days,
  places: Place[],     // snapshot at save time
  createdAt: Timestamp,
}
```

Routes are saved automatically when `ResultView` mounts. The permalink is surfaced to the user via the green "Your route is saved" banner.

---

## Setup

```bash
npm install
cp .env.local.example .env.local   # add Firebase keys
npm run dev
```

### `.env.local`

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

No Google Maps API key needed. The map uses Leaflet + CartoDB free tiles. Google Maps is only used for "Navigate Here" deep links (no API calls).

---

## Deploy

```bash
npm run build
firebase deploy --only hosting --project plzgo-bf50c
```

---

## Seed Data

The project uses a Master Database for all place data.

```bash
# Main seeding from enriched CSV
node seed-firestore.cjs

# Legacy/Specific seeds
node seed-bangkok.cjs
node scripts/fill-transit-batch.cjs
```

**Database Status:**
- **Master File:** `plzgo-db-task/Plzgo_MasterDB_Clean.csv`
- **Completeness:** Textual data is 100% complete (DNA insights, transit, vibes).
- **Progress Tracking:** See `DATABASE_PROGRESS.md` for detailed field status.

---

## Monetisation

| Placement | Partner | Trigger |
|---|---|---|
| BaseCampCard "Book" button | Agoda | Centroid zone hotel match |
| BaseCampCard "More on Agoda →" | Agoda | Per-hotel affiliate URL |
| BaseCampCard "Klook deals →" | Klook | Zone-based search URL |
| TimelineItem "Check rooms →" | Agoda | Hotel-type place affiliate link |

All clicks tracked via `trackCTA()` in `useAnalytics.js`.
