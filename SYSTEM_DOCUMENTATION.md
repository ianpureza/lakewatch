# LakeWatch 3D — System Documentation

## 1. System overview

LakeWatch 3D is a browser-based environmental monitoring simulation for Laguna de Bay. It combines a first-person research-office experience with an interactive lake-analysis workspace.

### System type

- **First-person POV exploration game:** the user walks around a 3D office using WASD and mouse-look controls.
- **Serious game / educational simulator:** game interaction is used to introduce environmental monitoring concepts.
- **3D + 2D monitoring dashboard:** the lake can be inspected as an interactive 4D terrain model or a 2D map.
- **CSV-backed prototype:** the default readings come from the local LLDA CSV adapter. The workstation presents the system overview and LLDA monitoring activity explainer.

The experience is designed to feel like entering a small environmental research facility, finding the lake model, and switching from exploration mode into analysis mode.

## 2. Main user journey

```text
Open index.html landing page
      ↓
Click “Enter the simulator”
      ↓
Load Three.js renderer, office scene, lake boundary, and demo dataset
      ↓
Click “Start Exploring”
      ↓
Walk through the office in first-person POV
      ↓
Look at the research table and press E
      ↓
Camera transitions to the Laguna Lake analysis workspace
      ↓
Use 4D terrain, 2D map, station filters, charts, and time controls
      ↓
Exit analysis and restore the saved office camera
```

### Exploration mode

The user starts inside a stylized environmental research office. The scene contains a central lake diorama, workstation, wall display, storage, windows, lighting, and decorative objects.

The player controller uses the browser Pointer Lock API. Movement is handled with collision checks so the player cannot walk through the walls, table, workstation, or other registered solid objects.

### Interaction mode

The interaction manager casts a ray from the center of the camera. When the ray hits a registered object within its maximum distance, the object is highlighted and an interaction prompt appears.

Registered interactions include:

- **Research table:** opens Laguna Lake analysis.
- **Workstation:** opens the LakeWatch System Overview with the workflow, stack, LLDA monitoring activity, API, scope, and limitations.
- **Wall display:** opens the interactive [`Lake Watch Magazine.html`](./pages/Lake%20Watch%20Magazine.html) flipbook in a glass reader panel, replacing the former monitoring-summary interaction.

### Analysis mode

When the user selects the lake, the office camera position and orientation are saved. The camera then transitions to an orbit view around the lake model. The office controls are disabled while analysis is active.

The analysis workspace supports:

- 4D terrain view with station markers.
- 2D Leaflet/OpenStreetMap view.
- Parameter selection.
- Observation-date selection.
- Timeline slider and play/pause time animation.
- Station search and station-marker visibility.
- Station selection with current measurements and historical chart.
- Camera reset, label visibility, and AR-style HUD toggles.
- Escape key to exit analysis and restore the office view.

## 3. System architecture

| Layer | File or resource | Responsibility |
| --- | --- | --- |
| Landing shell | [`index.html`](./index.html) | Lightweight first-load experience, product explanation, and route into the simulator. |
| Simulator shell | [`pages/simulator.html`](./pages/simulator.html) | Main page structure, controls, overlays, analysis UI, and external library loading. |
| Application lifecycle | [`js/Game.js`](./js/Game.js) | Creates the renderer and connects the office, player, interaction, lake, analysis, and data systems. |
| Office scene | [`js/OfficeScene.js`](./js/OfficeScene.js) | Creates the Three.js scene, camera, fog, lighting, and office composition. |
| Office geometry | [`js/OfficeBuilder.js`](./js/OfficeBuilder.js) | Builds the room, furniture, lake diorama, map, displays, and decorative objects from reusable primitives. |
| First-person input | [`js/PlayerController.js`](./js/PlayerController.js) | Pointer lock, mouse look, WASD movement, sprinting, zoom, and camera updates. |
| Collision | [`js/CollisionSystem.js`](./js/CollisionSystem.js) | Axis-separated bounding-box movement checks for walls and furniture. |
| Object interaction | [`js/InteractionManager.js`](./js/InteractionManager.js) | Center-screen raycasting, prompts, highlighting, distance checks, and E-key activation. |
| Geographic lake model | [`js/LakeAnalysis.js`](./js/LakeAnalysis.js) | Loads GeoJSON, projects geographic coordinates into local meters, builds water/shore geometry, and manages station markers. |
| Camera state | [`js/AnalysisController.js`](./js/AnalysisController.js) | Handles office-to-analysis transition, orbit controls, reset, exit, and saved camera state. |
| Monitoring workspace | [`js/AnalysisWorkspace.js`](./js/AnalysisWorkspace.js) | Loads the CSV adapter data, updates measurements, synchronizes stations, and renders charts/maps. |
| Wall magazine | [`pages/Lake Watch Magazine.html`](./pages/Lake%20Watch%20Magazine.html) | Interactive editorial flipbook shown by the wall display; supports page turns, keyboard arrows, swipe, charts, quiz cards, and source links. |
| Standalone 4D model | [`pages/4d-2.html`](./pages/4d-2.html) | A self-contained Three.js lake terrain view with divided visual sections. The main app embeds it in an iframe and synchronizes state with `postMessage`. |
| CSV data adapter | [`api/monitoring.php`](./api/monitoring.php) | Parses the local wide-format LLDA CSV into stations, dates, parameters, observations, provenance, and coordinate-quality metadata. |
| Compatibility API | [`api/demo-monitoring.php`](./api/demo-monitoring.php) | Backward-compatible route that now forwards to the CSV adapter. |
| Monitoring source | [`csv/LLDA_2020_2025_combined_partial.csv`](./csv/LLDA_2020_2025_combined_partial.csv) | Current source-of-truth readings used by the simulator. |
| Coordinate source | [`csv/LLDA_2020Q4_estimated_station_coordinates.csv`](./csv/LLDA_2020Q4_estimated_station_coordinates.csv) | 44 estimated lake/tributary positions from the supplied Q4 2020 station map; not official GPS. |
| Geographic asset | [`assets/laguna-de-bay.geojson`](./assets/laguna-de-bay.geojson) | WGS84 lake boundary used by the 3D and 2D analysis views. |
| Tree asset | [`assets/lakewatch-tree-atlas.png`](./assets/lakewatch-tree-atlas.png) | Transparent three-variant tree atlas layered into the 4D renderer with crossed billboards and procedural fallback geometry. |
| Styling | [`css/main.css`](./css/main.css) | Layout, overlays, controls, dark research-console UI, responsive behavior, and AR HUD styling. |

## 4. Runtime data flow

```text
monitoring.php ────────────┐
                           ├─> AnalysisWorkspace
laguna-de-bay.geojson ────┘       ├─> station markers
                                   ├─> measurement panel
                                   ├─> Chart.js history chart
                                   ├─> 4D iframe state
                                   └─> 2D Leaflet map

Prepared CSV ───────────────────> monitoring.php ──> shared browser dataset
```

### Default dataset

The current CSV adapter reads:

- 63 source rows.
- 15 station IDs.
- Six sample months: October–December 2023 and January–March 2025.
- Dissolved oxygen, biochemical oxygen demand, and fecal coliform values; other declared columns are retained as unavailable when blank.
- Station observations keyed by date and parameter.
- Per-row source URLs and source-type labels.
- An explicit partial-data provenance label.

The monitoring CSV contains blank latitude/longitude fields. The adapter overlays the supplied coordinate file for matching station IDs: 9 of the 15 monitoring stations use updated Q4 2020 estimates, while 6 retain fallback named-area anchors. All positions are marked approximate because the coordinate file explicitly says they are not official GPS.

### Dataset replacement

The ingestion path is intentionally simple: update the local wide-format CSV, then let [`api/monitoring.php`](./api/monitoring.php) parse it. The station pins, 4D model, 2D map, chart, measurement panel, and summary state all read that shared adapter output.

The wall magazine is an editorial reading experience rather than a live CSV chart. It is embedded at `?embedded=1` so its header and outer controls disappear inside the glass wall reader while its own page-turn animation remains active.

## 5. Technology stack

| Technology | Use in the system |
| --- | --- |
| HTML5 | Page structure, controls, accessible labels, dialogs, and canvas hosts. |
| CSS3 | Dark research-console styling, glass panels, responsive layout, transitions, and AR HUD. |
| Vanilla JavaScript ES modules | Application logic without a frontend framework or build step. |
| Three.js `0.169.0` | Main office scene, first-person camera, lighting, geometry, lake analysis model, and station markers. Loaded through the import map in [`pages/simulator.html`](./pages/simulator.html). |
| Three.js `r128` | Standalone [`pages/4d-2.html`](./pages/4d-2.html) model loaded from cdnjs. |
| Leaflet `1.9.4` | 2D map view, OpenStreetMap tiles, boundary layer, station markers, tooltips, and popups. |
| Chart.js `4.4.4` | Selected-station history chart and all-station mean trend. |
| PHP | Local CSV-to-JSON adapter for the monitoring dataset. |
| XAMPP Apache + PHP | Recommended local hosting environment. |
| GeoJSON / WGS84 | Geographic boundary format and coordinate reference system. |
| Browser WebGL, Canvas, Pointer Lock, and `postMessage` | Rendering, input, and communication between the main app and embedded 4D model. |

There is currently no `package.json`, bundler, database schema, authentication layer, or production build pipeline. The project is served as static files plus one PHP endpoint, with third-party libraries loaded from CDNs.

## 6. Visual and color system

The visual language is inspired by a calm environmental research lab: dark blue-green surfaces, water teal, soft mint interaction states, and warm gold data highlights.

### Core palette

| Color | Hex | Purpose |
| --- | --- | --- |
| Deep panel teal | `#0F2021` / `#162728` | Analysis panels, modal surfaces, and the research-console background. |
| Control teal | `#193536` | Select boxes, search fields, and compact controls. |
| Mint accent | `#75C6A8` | Primary buttons, active states, station highlights, graphs, and positive interaction feedback. |
| Light mint | `#8BD4BC` | Eyebrow labels, prompt keys, and secondary accent text. |
| Bright mint | `#9BE0C3` | Hover state for primary buttons and emphasis. |
| Warm gold | `#F3D48A` | KPI values, selected stations, important measurements, focus outlines, and data emphasis. |
| Muted gold | `#E6BD72` | Warnings, source labels, demo notices, and secondary chart lines. |
| Water teal | `#3B8B9A` / `#397B87` | Lake water, map water, and geographic visualization surfaces. |
| Land green | `#597A56` / `#6E875B` | Terrain, vegetation, and shoreline landforms. |
| Good green | `#3FBF6B` | Healthy or in-range measurement status. |
| Fair amber | `#F2B134` | Review/fair measurement status. |
| Poor red | `#E5484D` | Poor, out-of-range, or urgent status. |
| Scene mist | `#B9D0D0` / `#DCE3E4` | Office environment and page background. |

### Color behavior

- Mint communicates interaction, readiness, active controls, and positive system feedback.
- Gold communicates selected values, important numbers, warnings, provenance, and focus.
- Green/amber/red communicate measurement status rather than decoration.
- Teal and blue-green communicate water, mapping, and environmental data.
- AR mode adds neon cyan/teal (`#79E6D1`) with a red live indicator (`#E87568`) to create a telemetry/HUD feel.
- The UI uses system sans-serif typography; AR readouts and timeline values use a monospace font for a technical instrument aesthetic.

The palette is currently implemented as hard-coded CSS and JavaScript values rather than one shared design-token file. A future design-system refactor could centralize these colors as CSS custom properties and JavaScript constants.

### Standalone 4D theme

[`pages/4d-2.html`](./pages/4d-2.html) has its own light/dark theme variables:

- Light background: `#E9F1F5` to `#CFE0EA`.
- Dark background: `#0D1B25` to `#17303F`.
- Light accent: `#0B7AA8`.
- Dark accent: `#4CC2F0`.
- Embedded mode switches to deep marine colors and uses mint accents so it visually belongs inside the main LakeWatch workspace.

## 7. Controls and interaction reference

| Context | Control | Result |
| --- | --- | --- |
| Start screen | Start Exploring | Enables the player and requests pointer lock. |
| Office | `W` / `A` / `S` / `D` | Move forward, left, backward, and right. |
| Office | Mouse | Look around while pointer lock is active. |
| Office | `Shift` | Walk faster. |
| Office | Mouse wheel, `+`, `-` | Adjust camera field of view. |
| Office | `E` | Activate the centered nearby object. |
| Office | `Esc` | Release the pointer or close/leave the current mode. |
| Analysis | Drag | Orbit around the lake model. |
| Analysis | Mouse wheel | Zoom the lake model. |
| Analysis | Arrow keys | Orbit the analysis camera. Hold `Shift` for larger steps. |
| Analysis | Reset Camera | Restore the default analysis orbit. |
| Analysis | 4D View / 2D Map | Switch between the embedded terrain and map views. |
| Analysis | Play 4D Time | Advance through the available observation dates. |
| Analysis | Station search | Filter visible station markers by code or name. |
| Analysis | Station marker | Select a station and update the details/chart panels. |

## 8. 3D model behavior

### Office

The office is constructed procedurally from Three.js primitives. It includes a floor, four walls, ceiling, windows, central research table, lake diorama, wall relief map, workstation, monitors, display, cabinets, door, sign, plant, and ceiling lights.

The `OfficeScene` adds:

- A perspective camera with a 68° field of view.
- Hemisphere lighting for ambient environmental fill.
- A directional sun with soft shadows.
- A point light over the central workspace.
- Fog to soften the office depth.

### Lake analysis

The main analysis model reads polygon or multipolygon geometry from the GeoJSON boundary. Longitude/latitude coordinates are projected into local metric-like coordinates using an Earth-radius calculation, centered near Laguna de Bay, and scaled to fit the tabletop.

The analysis model creates:

- Transparent blue-green water geometry.
- Extruded shoreline geometry.
- Station stems and marker dots.
- Screen-space station labels.
- Parameter-based marker color and size changes.

The standalone 4D model adds stylized terrain elevation, synthetic bathymetry, water-level animation, trees, labels, and station markers. It reads the local CSV values when available, while the terrain, water level, and marker positions remain illustrative because the source CSV has no exact coordinates.

## 9. Local operation

The project directory is intended to live at:

```text
C:\xampp_new85\htdocs\lakewatch
```

With Apache using the normal XAMPP port, the landing page is:

```text
http://localhost/lakewatch/
```

The landing page sends the user to the first-person simulator at:

```text
http://localhost/lakewatch/pages/simulator.html
```

When using the local PHP development server on port 8080, use:

```text
http://localhost:8080/lakewatch/index.html
http://localhost:8080/lakewatch/pages/simulator.html
http://localhost:8080/lakewatch/pages/4d-2.html
```

The browser must be served over HTTP rather than opened directly with `file://` because ES modules, `fetch()`, the PHP endpoint, and GeoJSON loading require a web origin.

## 10. Current limitations

- The current source is a partial CSV containing published/secondary-source labels; verify each source URL before operational use.
- Blank station coordinates are represented by approximate named-area anchors, not exact sampling points.
- There is no MySQL database or live sensor ingestion.
- The data endpoint is a generated PHP fallback rather than a persistent backend.
- The 3D terrain, bathymetry, trees, water-level curve, and buoy positions are illustrative.
- OpenStreetMap/GeoJSON boundary loading and CDN libraries require network access unless assets are vendored.
- WebGL is required for the 3D office and analysis model.
- The project has no automated build, unit-test, or deployment pipeline.
- The main and standalone 4D views currently use different Three.js CDN versions and could be consolidated in a future cleanup.

## 11. Recommended next development steps

1. Add exact station coordinates to the CSV or provide a verified coordinate-enriched data source.
2. Add server-side validation and authentication if a future live-data or managed ingestion service is introduced.
3. Centralize the palette into shared CSS custom properties and JavaScript design tokens.
4. Consolidate the two Three.js versions and move the standalone 4D implementation into reusable modules.
5. Add automated browser tests for pointer lock, collisions, analysis entry/exit, map synchronization, and dataset import.
6. Add a production build and dependency lockfile if the project grows beyond the current static prototype.

