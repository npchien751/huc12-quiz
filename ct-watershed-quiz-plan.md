# Connecticut HUC-12 Watershed Quiz App — Build Plan

## Overview

A map-based quiz app for memorizing the names and locations of Connecticut's ~169 HUC-12 subwatersheds. The user sees a map of Connecticut divided into watershed polygons. They tap a polygon, and the watershed name is revealed. Multiple quiz modes test recall in both directions (name → location, location → name).

Target platform: Android (phone-first), with potential web fallback. Built with React Native + Expo for fast iteration and cross-platform optionality.

---

## Data Pipeline

### Source

The polygon geometries come from the USGS Watershed Boundary Dataset (WBD), which is public domain. The authoritative service endpoint is:

```
https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/6
```

Layer 6 is the 12-digit HU (Subwatershed) level. It supports spatial and attribute queries returning JSON with full polygon geometry.

### Extraction Steps

1. **Query the USGS ArcGIS REST endpoint** for all HUC12 polygons that intersect Connecticut's bounding box. Use a spatial query with `geometry` set to Connecticut's envelope (approx `xmin=-73.73, ymin=40.95, xmax=-71.78, ymax=42.05` in WGS84) and `spatialRel=esriSpatialRelIntersects`. Request fields: `huc12`, `name`, `states`. Request geometry in WGS84 (`outSR=4326`). The endpoint has a `maxRecordCount` of 2000, which is sufficient for CT's ~169 HUC12s. Use `resultRecordCount=500` and pagination (`resultOffset`) if needed.

2. **Filter to Connecticut-relevant watersheds.** Some returned polygons will be entirely in MA, NY, or RI. Keep any polygon where `states` contains `CT` or where the polygon geometry intersects the Connecticut state boundary. A simple approach: keep all polygons from the query, then clip or flag those that only partially overlap CT.

3. **Simplify geometries for mobile performance.** Raw WBD polygons are high-resolution. Use `mapshaper` or Turf.js `simplify()` to reduce vertex count. Target ~500-1000 vertices per polygon (from potentially 5000+). Visually validate that simplified boundaries still look correct at phone screen zoom levels. Aim for a total GeoJSON file under 2 MB.

4. **Produce a static GeoJSON asset file** (`ct_huc12.geojson`) with this structure per feature:
   ```json
   {
     "type": "Feature",
     "properties": {
       "huc12": "010802050801",
       "name": "Blackledge River",
       "huc8_name": "Lower Connecticut",
       "huc8_code": "01080205"
     },
     "geometry": { "type": "Polygon", "coordinates": [...] }
   }
   ```
   The `huc8_name` and `huc8_code` fields are derived from the first 8 digits of the HUC12 code. These are the parent basins used for grouping/filtering in the UI.

5. **Precompute label points.** For each polygon, compute the centroid (or better, a `polylabel` point-of-inaccessibility for concave shapes). Store as `label_lat`, `label_lng` in properties. These are used to position name labels on the map.

### Data file: `data/ct_huc12.geojson`

Bundle this as a static asset in the app. No network request needed at runtime for the base quiz data.

### Reference: Connecticut HUC-8 Basins

The ~169 HUC12 watersheds nest into 9 HUC-8 parent basins that touch Connecticut:

| HUC-8 Code | Name | Approx HUC12 Count |
|---|---|---|
| 01080205 | Lower Connecticut | 33 |
| 01080207 | Farmington | 14 |
| 01090005 | Pawcatuck-Wood | 3 |
| 01100001 | Quinebaug | 22 |
| 01100002 | Shetucket | 17 |
| 01100003 | Thames | 12 |
| 01100004 | Quinnipiac | 17 |
| 01100005 | Housatonic | 40 |
| 01100006 | Saugatuck | 13 |

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React Native + Expo (SDK 52+) | Cross-platform, fast dev cycle, OTA updates, easy Android APK builds via EAS |
| Map | `react-native-maps` (Google Maps provider) | Native performance for polygon rendering, tap detection on shapes |
| GeoJSON rendering | `<Polygon>` components from react-native-maps | Direct polygon fill/stroke, onPress per polygon |
| State management | Zustand | Lightweight, no boilerplate, good for quiz state + progress persistence |
| Local persistence | `expo-sqlite` or `@react-native-async-storage/async-storage` | Save quiz history, best scores, learning progress |
| Geometry processing (build-time) | `@turf/turf` + `mapshaper` CLI | Simplification, centroid computation, clipping |
| Testing | Jest + React Native Testing Library | Unit tests for quiz logic, snapshot tests for screens |
| Build/deploy | EAS Build (Expo) | Produces `.apk` / `.aab` for Android without local Android Studio setup |

---

## App Architecture

```
src/
├── app/                    # Expo Router screens
│   ├── index.tsx           # Home / basin picker
│   ├── quiz.tsx            # Main quiz screen (map + interaction)
│   └── stats.tsx           # Progress & score history
├── components/
│   ├── WatershedMap.tsx    # Map with polygon overlays
│   ├── QuizHUD.tsx         # Timer, score, progress bar overlay
│   ├── BasinPicker.tsx     # Select which basin(s) to quiz
│   ├── ResultsModal.tsx    # End-of-quiz summary
│   └── NameLabel.tsx       # Floating label on revealed polygons
├── data/
│   └── ct_huc12.geojson    # Static bundled geodata
├── lib/
│   ├── quiz-engine.ts      # Quiz logic: mode, scoring, timing
│   ├── store.ts            # Zustand store
│   └── geo-utils.ts        # Centroid lookup, point-in-polygon (if needed)
├── hooks/
│   ├── useQuiz.ts          # Quiz state hook
│   └── useProgress.ts     # Persistent progress tracking
└── constants/
    ├── basins.ts           # HUC8 metadata, colors
    └── theme.ts            # Colors, typography
```

---

## Quiz Modes

### Mode 1: Explore (Free Play)

- All polygons visible on map with neutral fill color, grouped by HUC-8 basin color.
- Tap any polygon to reveal its name as a floating label.
- Tap again (or tap elsewhere) to hide the label.
- No timer, no scoring. Pure study mode.
- Optional: toggle to show all names at once as a reference map.

### Mode 2: Tap to Name (Location → Name)

- All polygons visible but unnamed. Colored by HUC-8 basin.
- A random watershed name appears at the top of the screen: **"Tap: Blackledge River"**
- Player taps the polygon they think matches.
- Correct: polygon turns green, name label appears, score increments. Next prompt after 1s.
- Wrong: tapped polygon flashes red briefly. The correct polygon pulses/highlights to teach. -1 point penalty (optional).
- Timer counts down. Default time scaled by watershed count (same logic as typing quiz).
- End state: all polygons colored green (found) or red (missed), with names shown.

### Mode 3: Name the Tap (Name → Location)

- A random polygon is highlighted/pulsing on the map.
- Player types or selects the watershed name from a filtered list.
- Correct: polygon turns green with label. Next.
- Wrong: show correct answer briefly.

### Mode 4: Speed Round (Sporcle-style)

- Timer running. All polygons visible, unnamed.
- Text input at bottom. Type any watershed name — if it matches an unnamed polygon, that polygon reveals and turns green.
- Goal: name as many as possible before time runs out.
- This is the original typing quiz but with the map as the visual grid instead of text cells.

### Recommended default: Start with Mode 1 (Explore) to learn, then Mode 2 (Tap to Name) for active recall.

---

## Screen Designs

### Home Screen

- Title: "CT Watershed Quiz"
- Map thumbnail of Connecticut showing the 9 HUC-8 basins in distinct colors
- Basin selector: tap a basin to filter, or "All" for full state
- Mode selector: Explore / Tap to Name / Name the Tap / Speed Round
- Stats summary: "You've learned 47/169 watersheds"
- Start button

### Quiz Screen

- Full-screen map centered on selected basin (or full CT)
- Top overlay (translucent bar):
  - Current prompt (Mode 2: "Tap: Pomperaug River")
  - Score: "12 / 40"
  - Timer: "3:42"
- Bottom overlay:
  - Mode 3/4: text input field
  - Give Up button (small, bottom-right)
- Map interaction:
  - Polygons are `<Polygon>` components with `onPress` handlers
  - Fill colors: neutral (unrevealed), green (correct), red (missed/wrong), highlight (current prompt)
  - Name labels appear at centroid of revealed polygons

### Results Screen (Modal)

- Score: "28 / 40 (70%)"
- Time taken or time remaining
- Mini-map showing green (got it) vs red (missed)
- List of missed watersheds with "Study These" button
- "Retry" / "Change Basin" / "Home" buttons

### Stats Screen

- Per-basin progress bars
- Overall completion percentage
- History of quiz attempts (date, mode, basin, score)
- "Weakest watersheds" — ones most frequently missed
- Streak tracker

---

## Map Rendering Details

### Polygon Styling

Each HUC-8 basin gets a distinct hue. Within a basin, all HUC-12 polygons share the same hue but vary slightly in lightness for visual separation.

```typescript
const BASIN_COLORS: Record<string, string> = {
  "01080205": "#3b82f6", // Lower Connecticut — blue
  "01080207": "#10b981", // Farmington — emerald
  "01090005": "#a855f7", // Pawcatuck-Wood — purple
  "01100001": "#f59e0b", // Quinebaug — amber
  "01100002": "#ef4444", // Shetucket — red
  "01100003": "#06b6d4", // Thames — cyan
  "01100004": "#8b5cf6", // Quinnipiac — violet
  "01100005": "#22c55e", // Housatonic — green
  "01100006": "#f97316", // Saugatuck — orange
};
```

Polygon states and their visual treatment:

| State | Fill | Stroke | Opacity |
|---|---|---|---|
| Unrevealed (quiz) | Basin color | White | 0.3 fill, 1.0 stroke |
| Highlighted (current prompt) | Basin color | Yellow | 0.6 fill, pulsing |
| Correct | Green (#22c55e) | White | 0.5 fill |
| Wrong/Missed | Red (#ef4444) | White | 0.4 fill |
| Revealed (explore) | Basin color | White | 0.5 fill + name label |

### Camera / Viewport

- Default: fit all of Connecticut with ~10% padding. Approx center: `41.55, -72.75`, zoom ~8.5.
- When a single basin is selected, fit camera to that basin's bounding box.
- Allow pinch-to-zoom and pan during quiz (important for small polygons in dense areas like Saugatuck).
- On correct answer, optionally animate camera to briefly center the revealed polygon.

### Name Labels

- Use `<Marker>` components at precomputed label points.
- Show a small callout or simple text overlay with the watershed name.
- Font size should scale with zoom level (or use a fixed small size that's readable at basin-level zoom).
- Labels only appear for revealed/answered polygons.
- In Explore mode with "show all" toggle, render all labels (may need collision avoidance or dynamic font sizing).

---

## Quiz Engine Logic (`lib/quiz-engine.ts`)

```typescript
interface QuizState {
  mode: "explore" | "tap-to-name" | "name-the-tap" | "speed-round";
  basin: string | "all";              // HUC8 code or "all"
  watersheds: Watershed[];            // Filtered list for this quiz
  queue: Watershed[];                 // Remaining to quiz (shuffled)
  current: Watershed | null;          // Current prompt
  found: Set<string>;                 // HUC12 codes answered correctly
  missed: Set<string>;                // HUC12 codes answered wrong or timed out
  score: number;
  timeRemaining: number;              // seconds
  startedAt: number;                  // timestamp
  status: "idle" | "active" | "finished";
}

interface Watershed {
  huc12: string;
  name: string;
  huc8Code: string;
  huc8Name: string;
  labelLat: number;
  labelLng: number;
}
```

Key logic:

- **Shuffling**: Fisher-Yates shuffle on the filtered watershed list.
- **Matching (typing modes)**: Normalize input (lowercase, strip non-alphanumeric) and compare against normalized watershed names. Accept partial matches for compound names (e.g., typing "blackledge" matches "Blackledge River").
- **Scoring**: +1 per correct. Optional -0.5 per wrong tap in Mode 2. No penalty in Speed Round.
- **Timer**: Scaled by watershed count — 2 min for ≤5, 5 min for ≤20, 10 min for ≤50, 20 min for all 169.
- **Completion**: Quiz ends when timer hits 0 or all watersheds answered.

---

## Persistence & Progress

Use `expo-sqlite` for structured data:

```sql
CREATE TABLE quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL,
  basin TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE TABLE watershed_stats (
  huc12 TEXT PRIMARY KEY,
  times_correct INTEGER DEFAULT 0,
  times_missed INTEGER DEFAULT 0,
  last_seen TEXT
);
```

This enables:

- "Weakest watersheds" = highest `times_missed / (times_correct + times_missed)` ratio
- Spaced repetition potential: prioritize watersheds not seen recently or with low accuracy
- Progress tracking: a watershed is "learned" when `times_correct >= 3` and accuracy > 80%

---

## Build & Deploy

### Local Development

```bash
npx create-expo-app ct-watershed-quiz --template blank-typescript
cd ct-watershed-quiz
npx expo install react-native-maps expo-sqlite @react-native-async-storage/async-storage
npm install zustand @turf/turf
```

### Data Preparation Script (`scripts/prepare-geodata.ts`)

```bash
# 1. Fetch from USGS
curl "https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/6/query?\
where=states+LIKE+%27%25CT%25%27&\
outFields=huc12,name,states&\
returnGeometry=true&\
outSR=4326&\
f=geojson&\
resultRecordCount=500" -o raw_ct_huc12.geojson

# 2. Simplify with mapshaper
npx mapshaper raw_ct_huc12.geojson \
  -simplify dp 15% \
  -o ct_huc12_simplified.geojson

# 3. Run enrichment script to add huc8_name, label points
npx ts-node scripts/enrich-geojson.ts ct_huc12_simplified.geojson src/data/ct_huc12.geojson
```

The enrichment script should:
- Parse each feature's `huc12` to extract the HUC-8 prefix and look up basin name
- Compute centroid or polylabel for each polygon
- Add `huc8_name`, `huc8_code`, `label_lat`, `label_lng` to properties
- Write final GeoJSON

### Android Build

```bash
# Configure EAS
npx eas-cli build:configure

# Build APK for testing
npx eas-cli build --platform android --profile preview

# Build AAB for Play Store
npx eas-cli build --platform android --profile production
```

### Expo Config (`app.json` key fields)

```json
{
  "expo": {
    "name": "CT Watershed Quiz",
    "slug": "ct-watershed-quiz",
    "version": "1.0.0",
    "android": {
      "package": "com.yourname.ctwsquiz",
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon-foreground.png",
        "backgroundColor": "#0a0e17"
      },
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

Note: A Google Maps API key is required for `react-native-maps` on Android. Free tier covers typical personal use. Alternatively, consider `react-native-maplibre-gl` with free OpenStreetMap tiles to avoid API key management entirely.

---

## Implementation Phases

### Phase 1: Data + Explore Mode (MVP)

- [ ] Fetch and simplify CT HUC12 GeoJSON
- [ ] Set up Expo project with react-native-maps
- [ ] Render all polygons on map, colored by HUC-8 basin
- [ ] Tap polygon → show name label (Explore mode)
- [ ] Basin picker to filter/zoom to a single basin
- [ ] Toggle "show all names" in Explore mode

### Phase 2: Tap to Name Quiz

- [ ] Quiz engine: shuffle, timer, scoring
- [ ] "Tap to Name" mode: show name prompt, detect polygon tap
- [ ] Correct/wrong visual feedback (color transitions)
- [ ] Results modal with score and missed list
- [ ] HUD overlay (timer, score, progress bar)

### Phase 3: Additional Modes + Persistence

- [ ] "Name the Tap" mode with text input + highlighted polygon
- [ ] "Speed Round" mode (typing with map reveal)
- [ ] SQLite persistence for quiz history and per-watershed stats
- [ ] Stats screen with progress bars and weakest watersheds

### Phase 4: Polish + Android Release

- [ ] Animations: polygon pulse, camera fly-to on correct answer
- [ ] Haptic feedback on correct/wrong (Expo Haptics)
- [ ] Adaptive icon and splash screen
- [ ] EAS Build for Android APK
- [ ] Beta test on physical device, tune polygon tap targets
- [ ] Optional: spaced repetition mode that resurfaces weak watersheds

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Small polygons hard to tap on phone | Poor UX, frustration | Allow pinch-to-zoom; increase tap target with invisible expanded hitbox; show "tap was close" feedback |
| GeoJSON too large, slow map render | Laggy scrolling/zoom | Simplify aggressively; test on low-end Android; consider MapLibre vector tiles if needed |
| Google Maps API key management | Build complexity | Use MapLibre + OSM as free alternative; or embed key via `.env` + EAS secrets |
| Watershed names ambiguous (e.g., duplicates like "Little River" appears 3x) | Quiz confusion | Disambiguate in UI by showing parent basin name; in tap mode, highlight the specific polygon |
| USGS endpoint changes or is unavailable | Stale data | GeoJSON is bundled at build time, not fetched at runtime; re-run data pipeline periodically |
| Cross-border watersheds (partial CT coverage) | Visual confusion at state edges | Clip polygons to CT boundary or show CT state outline as visual anchor |

---

## Optional Enhancements (Post-V1)

- **Web version**: Export the React Native code to web via Expo Web, or rebuild as a standalone React app with Leaflet/MapLibre GL JS.
- **Spaced repetition**: Implement SM-2 or similar algorithm using `watershed_stats` to create adaptive study sessions.
- **Social/competitive**: Share scores, leaderboards for "All CT" speed round.
- **Offline-first**: Already offline by design (bundled GeoJSON, local SQLite). No network needed after install.
- **Additional states**: The data pipeline generalizes to any US state — parameterize the USGS query by state.
- **Audio pronunciation**: Some watershed names (Quinebaug, Shetucket, Poquetanuck) have non-obvious pronunciations. Add audio clips or phonetic guides.
