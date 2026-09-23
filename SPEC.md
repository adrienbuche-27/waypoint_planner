# Waypoint Planner: Project Spec for Claude Code

A private, local-first web app to plan waypoint missions for a **DJI Air 3S** flown with a **DJI RC 2** controller. The app designs missions on a map and exports them as **DJI WPML `.kmz`** files that are side-loaded into DJI Fly.

> **How to use this file:** put it at the repo root (as `SPEC.md`, or merge the key rules into `CLAUDE.md`). Work milestone by milestone and do not start a milestone before the previous one's acceptance criteria pass.

---

## 1. Context and hard constraints

- **No SDK path.** The Air 3S is not supported by DJI's Mobile SDK, so the app **cannot** talk to the drone or controller. Its only output is a `.kmz` file.
- **The mission is loaded by swapping a file.**
  1. In DJI Fly on the RC 2, the user creates a dummy waypoint mission and saves it.
  2. The RC 2 is connected to a computer over USB-C. The mission lives at `Android/data/dji.go.v5/files/waypoint/<UUID>/<UUID>.kmz`.
  3. The user replaces that `.kmz` with the exported file, **keeping the exact same filename**.
  4. DJI Fly is reopened and the mission is loaded.
- **Supported mission type:** DJI Fly only runs **waypoint** missions (`templateType = waypoint`). There is no "mapping area" type, so photogrammetry grids **must be converted into plain waypoints** with photo actions.
- **Height mode:** altitude is **relative to the takeoff point** (`relativeToStartPoint`). No terrain following in v1.
- **Electronic shutter:** for mapping, the default capture mode is **stop, then hover, then take photo** at each capture point. Taking photos while moving is a later, optional, experimental mode.
- **Regulatory guardrails (EU Open category):** by default, warn when a mission goes above **120 m** relative altitude. Show visual line of sight (VLOS) as a reminder, not as enforcement.
- **Fully static app.** No backend in v1. The build output must run from any static host or from a local folder. Keep the code structured so a backend (to sync missions and serve terrain data) can be added later without touching the UI.

### Unknowns: verify, do not guess

The WPML dialect DJI Fly accepts for the Air 3S is **not fully documented**. Treat the following as unknowns until they are checked against a real file:

- The exact `droneEnumValue` / `droneSubEnumValue` and payload enums for the Air 3S.
- The WPML namespace version DJI Fly writes (e.g. `http://www.dji.com/wpmz/1.0.x`).
- Which actions DJI Fly actually runs: `takePhoto`, `hover`, `gimbalRotate`, `rotateYaw`, `startRecord`, `stopRecord`, interval-shooting triggers.
- The maximum number of waypoints accepted. Make this a config constant with a conservative default, and warn when it is exceeded.
- Whether the mission folder holds other files (e.g. a preview image) that must stay consistent.

**Golden reference rule:** the user will place one or more `.kmz` files created by DJI Fly on the RC 2 in `reference/`. The exporter must be **derived from and tested against these files**. Keep every field of the reference that the app does not explicitly control, and never invent enum values. If `reference/` is empty, stop and ask the user for a file before implementing the exporter.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Build | Vite + TypeScript (strict) |
| UI | React 18 + a lightweight state store (Zustand) |
| Map | MapLibre GL JS + drawing plugin (e.g. `@mapbox/mapbox-gl-draw` or `terra-draw`) |
| Geometry | Turf.js (projection, clipping, bearings, distances in metres) |
| KMZ | JSZip; XML built with a small typed builder (no string soup), parsed with `DOMParser` |
| Storage | IndexedDB via Dexie, behind a `MissionRepository` interface |
| Offline | PWA (vite-plugin-pwa), caching the app shell and recently viewed tiles |
| Tests | Vitest (unit, snapshot), optional Playwright for smoke end-to-end tests |
| Lint/format | ESLint + Prettier |

**Map sources** are configurable in `src/config/mapSources.ts`: one satellite/orthophoto layer and one street layer at minimum. Support adding WMTS/XYZ sources (e.g. national orthophoto services) through config only. Show attribution correctly.

---

## 3. Architecture

```
src/
  domain/            # pure TS, no DOM, no React: fully unit-tested
    types.ts         # Mission, Waypoint, Action, CameraProfile, ...
    camera.ts        # camera profiles + GSD math
    planners/
      manual.ts      # manual waypoints -> Waypoint[]
      grid.ts        # polygon + params -> Waypoint[]
      repeat.ts      # repeatable-shot helpers
    estimates.ts     # distance, duration, photo count, battery %
    validate.ts      # altitude limits, waypoint count, speed bounds...
  wpml/
    model.ts         # typed WPML structures
    build.ts         # Mission -> template.kml + waylines.wpml (XML strings)
    parse.ts         # .kmz -> Mission (import, and for tests)
    kmz.ts           # zip/unzip with JSZip
  storage/
    MissionRepository.ts   # interface
    IndexedDbRepository.ts # Dexie implementation
  terrain/
    TerrainProvider.ts     # interface (future)
    NullTerrainProvider.ts # returns undefined -> no adjustment
  ui/
    map/ ...         # MapLibre wrapper, layers, draw tools
    panels/ ...      # mission list, parameter forms, waypoint table
    export/ ...      # export dialog + side-loading instructions
  config/
    mapSources.ts
    limits.ts        # MAX_ALT_M=120, MAX_WAYPOINTS, speeds...
reference/           # golden KMZ files from DJI Fly (user-provided)
```

**Rules:**
- `domain/` and `wpml/` contain **pure functions** only. The UI calls them; they never call the UI.
- All distances are in metres, angles in degrees, speeds in m/s, and coordinates are WGS84 `{ lat, lng }`. Note that KML writes coordinates as `lng,lat`.
- All persistence goes through `MissionRepository`, so a future `HttpRepository` can be swapped in.

---

## 4. Domain model

```ts
export type Action =
  | { type: 'hover'; seconds: number }
  | { type: 'photo' }
  | { type: 'startVideo' }
  | { type: 'stopVideo' }
  | { type: 'gimbal'; pitchDeg: number }      // -90 = nadir
  | { type: 'yaw'; headingDeg: number };

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  altM: number;                 // relative to takeoff
  speedMs: number;
  headingMode: 'followRoute' | 'fixed' | 'poi';
  headingDeg?: number;          // when fixed
  gimbalPitchDeg: number;
  actions: Action[];            // executed in order on arrival
}

export interface CameraProfile {
  id: 'air3s-wide' | 'air3s-tele' | string;
  label: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  focalLengthMm: number;        // real focal length, not 35mm-equivalent
  imageWidthPx: number;
  imageHeightPx: number;
  minPhotoIntervalS: number;
}

export interface GridParams {
  polygon: GeoJSON.Polygon;
  camera: CameraProfile['id'];
  targetGsdCmPx?: number;       // either GSD...
  altitudeM?: number;           // ...or altitude drives the other
  frontOverlap: number;         // 0..1, default 0.75
  sideOverlap: number;          // 0..1, default 0.65
  flightDirectionDeg: number;   // line bearing; UI offers "auto" = longest edge
  speedMs: number;
  hoverBeforePhotoS: number;    // default 1.0
  marginM: number;              // extend lines past polygon edge, default 0
  gimbalPitchDeg: number;       // default -90
  crosshatch: boolean;          // second pass at +90°, default false
}

export interface Mission {
  id: string;
  name: string;
  kind: 'manual' | 'grid' | 'repeat';
  createdAt: string;
  updatedAt: string;
  params?: GridParams | Record<string, unknown>;  // source of truth for generated missions
  waypoints: Waypoint[];        // derived for grid, edited for manual
  finishAction: 'goHome' | 'hover' | 'land';
  rcLostAction: 'goBack' | 'hover' | 'land';
  notes?: string;
  flights?: FlightLogEntry[];
}

export interface FlightLogEntry {
  id: string;
  date: string;
  exportedFileHash: string;     // proves exactly which KMZ was flown
  notes?: string;
}
```

**Camera profiles:** create `air3s-wide` (1-inch sensor, 24 mm equivalent) and `air3s-tele` (70 mm equivalent). **Fill in the exact sensor dimensions, real focal lengths and pixel sizes from DJI's official Air 3S specs and cite the source in a code comment.** Do not rely on remembered numbers. Keep profiles editable in the UI, since they differ by photo mode (e.g. 12 MP vs 50 MP).

---

## 5. Grid planner algorithm

Inputs: `GridParams` and `CameraProfile`. Orientation convention: the image's **long side runs across the flight line**.

1. **GSD and altitude** (use whichever the user gave):
   - `altitudeM = gsdM * focalMm * imageWidthPx / sensorWidthMm`
   - `gsdM = altitudeM * sensorWidthMm / (focalMm * imageWidthPx)`
2. **Ground footprint:** `footW = gsdM * imageWidthPx` (across track) and `footH = gsdM * imageHeightPx` (along track).
3. **Spacing:** `lineSpacing = footW * (1 - sideOverlap)` and `shotSpacing = footH * (1 - frontOverlap)`.
4. **Lines:**
   - Project the polygon into a local metric frame (e.g. an equirectangular projection around the centroid, or Turf).
   - Rotate by `-flightDirectionDeg`.
   - Generate horizontal lines at `lineSpacing` covering the bounding box and clip them to the polygon, extended by `marginM`.
   - Rotate back and unproject.
5. **Capture points:** along each clipped line, place points every `shotSpacing`, always including both ends. Reverse every other line so the drone flies back and forth.
6. **Waypoints:** every capture point becomes a waypoint with `[hover(hoverBeforePhotoS), photo]`. The first waypoint also gets `gimbal(gimbalPitchDeg)`. Heading is fixed to the line bearing so the image orientation stays consistent.
7. **Crosshatch** (optional): repeat steps 4 to 6 at `flightDirectionDeg + 90` and append.
8. **Validation:** check the waypoint count, altitude limit, minimum photo interval against speed (`shotSpacing / speedMs >= minPhotoIntervalS` when moving), and estimated duration.

**Estimates** (`estimates.ts`): total path length, flight time (`distance / speed + hovers + a fixed penalty per turn`), photo count, and battery percentage against a **configurable usable flight time** (conservative default, editable by the user). Show a clear warning above 80 % of one battery, and suggest splitting the mission.

**Mission splitting** (later in Milestone 2): split a grid into N sub-missions at line boundaries, each within the waypoint and battery limits. Each sub-mission is exported as its own KMZ.

---

## 6. WPML export

A `.kmz` is a zip with this structure:

```
wpmz/
  template.kml
  waylines.wpml
```

- `template.kml`: mission config (fly-to-wayline mode, finish action, RC-lost behaviour, drone info) and the template `Folder` with `Placemark`s.
- `waylines.wpml`: the executable wayline, with per-waypoint `executeHeight`, speed, heading params, turn params and `actionGroup`s (trigger `reachPoint`, mode `sequence`).

**Implementation steps:**
1. Write `wpml/parse.ts` first and round-trip the golden reference files: parse, then rebuild, then compare semantically after normalising timestamps and whitespace.
2. Only then write `build.ts`, **starting from the reference structure**. Fields the app does not control are copied from a template built from the reference.
3. Snapshot-test the generated XML for each fixture mission.
4. Generate action group IDs and waypoint indices sequentially from 0.

**Export dialog:**
- Mission summary.
- Warnings from `validate.ts`.
- A filename field. The user pastes the dummy mission's UUID so the file is named `<UUID>.kmz`.
- Download button.
- A collapsible, step-by-step side-loading guide (section 1).
- On export, store the SHA-256 of the file in the mission (used by the flight log).

**Import:** support importing any `.kmz` (from DJI Fly or from this app) into a `manual` mission. This also serves as a debugging tool.

---

## 7. Repeatable shots

- Any mission can be **locked**. A locked mission's waypoints and export are frozen, and editing it means duplicating it into a new version.
- **Re-export is deterministic:** same mission gives the same XML, with only allowed metadata such as timestamps changing. Test this.
- **Flight log per mission:** date, file hash and notes. Show the history in the mission panel.
- **Per-waypoint shot presets:** fixed heading, gimbal pitch, hover and photo, or start/stop video between two waypoints. These are used for before/after and timelapse missions.
- Show a note in the UI that repeat accuracy is GPS-limited (a few metres) and that ground markers help align shots.

---

## 8. UI

- **Layout:** the map fills the screen. A left panel lists missions (search, duplicate, lock, delete, import). A right panel shows the selected mission's parameters and a waypoint table.
- **Manual mode:** click to add, drag to move, and select a waypoint to edit its altitude, speed, heading, gimbal and actions. The polyline shows direction arrows and waypoint numbers.
- **Grid mode:** draw or edit a polygon. The parameter form recomputes waypoints live (debounced). Show the lines, capture points, the footprint of the first photo, and a live stats bar (GSD, altitude, photo count, time, battery %, warnings).
- **General:** metric units, dark/light theme, fully usable on a laptop. It only needs to be readable on a tablet.
- **Validation:** problems (above 120 m, too many waypoints, photo interval too short, battery) appear inline, and export is blocked on hard errors.

---

## 9. Storage

- `MissionRepository`: `list()`, `get(id)`, `save(mission)`, `delete(id)`, `exportAll(): Blob`, `importAll(blob)`.
- The Dexie implementation uses schema versioning from day one.
- Backup/restore of the whole library as JSON, since browser storage can be wiped.

---

## 10. Milestones and acceptance criteria

### M0: Scaffold
- Vite + React + TS strict, ESLint/Prettier, Vitest, basic MapLibre map with a satellite layer, `limits.ts` and `mapSources.ts`.
- ✅ `npm run build` produces a static `dist/` that works when opened from a local static server.

### M1: Manual missions and KMZ round-trip *(highest priority: proves the whole chain)*
- Golden reference KMZ from `reference/` parsed and round-tripped in tests.
- Manual waypoint editing, export to `.kmz`, import from `.kmz`.
- ✅ A 5-waypoint mission exported by the app loads in DJI Fly on the RC 2 after the file swap, and shows the correct points, altitudes and actions. **This check is done manually by the user; ask them to confirm before moving on.**

### M2: Grid planner
- Everything in section 5, including estimates, validation and the stats bar. Mission splitting comes last.
- ✅ Unit tests cover the GSD/altitude round-trip, line spacing, photo count on a known rectangle, alternating line direction, and polygon clipping on a concave shape.
- ✅ A small grid (about 50 m × 50 m) flies correctly in the field. **Confirmed by the user.**

### M3: Repeatable shots and library
- Locking, versioning, flight log, deterministic re-export, JSON backup/restore.
- ✅ Test: exporting a locked mission twice gives identical XML, apart from allowed metadata.

### M4: PWA and polish
- Offline app shell, tile caching, installable app, and UX refinements.

### Later (not in scope now)
- `TerrainProvider` backed by a DEM (e.g. Copernicus GLO-30 tiles), used to adjust each waypoint's altitude to keep ground resolution constant.
- Optional backend (`HttpRepository`) for mission sync and terrain caching.
- Experimental interval shooting while moving, if DJI Fly supports it.
- Oblique / facade capture patterns.

---

## 11. Working agreements for Claude Code

- Before implementing anything involving WPML, **read the files in `reference/`**. If a needed field or enum isn't there, **ask; don't invent it.**
- Keep `domain/` and `wpml/` pure and covered by tests. Add a test for every bug fixed there.
- Prefer small, reviewable commits per feature, and run the tests before declaring a milestone done.
- Put every hardware- or firmware-dependent value (limits, camera specs, enums) in config with a comment citing its source or marked `// TODO verify`.
- Don't add a backend, authentication, or analytics in v1.
- When a design choice is ambiguous, propose 2 options with trade-offs and let the user choose.
