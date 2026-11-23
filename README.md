# LakeWatch 3D - Stage 3

LakeWatch 3D is a vanilla JavaScript/Three.js first-person environmental research office for the Laguna Lake monitoring project. Stage 3 adds a geographically projected Laguna de Bay model, camera transition, dedicated analysis controls, and a CSV-backed analysis workspace while keeping the Stage 1/2 office and interaction systems intact.

## Run with XAMPP

1. Put this folder at `C:\xampp_new85\htdocs\lakewatch`.
2. Start Apache in the XAMPP Control Panel.
3. Open `http://localhost/lakewatch/` in a desktop browser.
4. The lightweight landing page loads first. Select **Enter the simulator**.
5. Click **Start Exploring**, then use WASD and the mouse. Hold Shift to walk faster; press Esc to release the cursor.

Three.js is loaded as an ES module from jsDelivr. The geographic boundary is vendored in `assets/laguna-de-bay.geojson`, and the local monitoring adapter reads `csv/LLDA_2020_2025_combined_partial.csv` through PHP. The project has no MySQL database; the CSV is the current source of truth for station readings.

## Structure

- `index.html` - lightweight landing page and simulator launch route
- `simulator.html` - first-person office and analysis UI
- `4D.html` - standalone lake 4D terrain view, also embedded by the simulator
- `assets/lakewatch-tree-atlas.png` - transparent stylized tree atlas used by the 4D renderer
- `Lake Watch Magazine.html` - interactive flipbook used by the wall display
- `csv/LLDA_2020_2025_combined_partial.csv` - local LLDA monitoring readings used by the simulator
- `csv/LLDA_2020Q4_estimated_station_coordinates.csv` - shared estimated lake/tributary coordinate layer
- `api/monitoring.php` - CSV-to-JSON adapter used by the office, 4D model, map, charts, and summary
- `api/demo-monitoring.php` - backward-compatible route to the CSV adapter
- `js/Game.js` - renderer, lifecycle, state integration, and animation loop
- `js/OfficeScene.js` - scene, camera, lighting, and office composition
- `js/OfficeBuilder.js` - reusable primitive-based room and furniture builders
- `js/PlayerController.js` - pointer lock, first-person mouse look, and movement
- `js/CollisionSystem.js` - lightweight axis-separated AABB collision checks
- `js/InteractionManager.js` - recursive raycast targeting, prompts, E-key activation, and safe highlights
- `js/LakeAnalysis.js` - GeoJSON loading, local metric projection, Polygon/MultiPolygon model generation, and shoreline geometry
- `js/AnalysisController.js` - analysis state machine, camera transition, orbit-style drag/zoom, and restore behavior
- `assets/laguna-de-bay.geojson` - Laguna de Bay boundary from OpenStreetMap Nominatim
- `css/main.css` - responsive office, panel, and analysis styling

## Stage 3 analysis behavior

Look directly at the central table within range to see **E - Analyze Laguna Lake**. The camera smoothly transitions to the projected lake model. Look at the wall display and press **E - Read Lake Watch Magazine** to open the interactive flipbook in the wall reader. Drag to orbit, scroll to zoom, reset the camera, and use Exit Analysis to return to the office. The boundary asset is WGS84 GeoJSON from OpenStreetMap contributors and is used only for shoreline geometry; no bathymetry is invented.

The simulator now reads the local CSV through the PHP monitoring adapter. The current file contains 63 readings across 15 station IDs and six sample months. The available measurements are dissolved oxygen, biochemical oxygen demand, and fecal coliform; blank source fields remain missing rather than being interpolated. The coordinate update supplies estimated positions for 9 matching lake station IDs; the remaining 6 use fallback anchors. All coordinate points are explicitly approximate, not official GPS.

## Manual testing checklist

- [ ] Load the page with DevTools open and confirm there are no console errors.
- [ ] Confirm the room renders immediately with the central table and placeholder lake visible.
- [ ] Click Start Exploring and confirm pointer lock activates.
- [ ] Test W/A/S/D walking, mouse look, vertical look limits, and Shift speed.
- [ ] Press Esc and confirm the cursor is released and the overlay returns.
- [ ] Walk into walls, the central table, cabinets, workstation, and display; confirm the player is blocked.
- [ ] Confirm the player cannot leave the office or fall below the floor.
- [ ] Resize the browser and confirm the view remains correctly framed.
- [ ] Look at the research table from within range and confirm the E prompt and highlight appear.
- [ ] Confirm walls and furniture block targeting through occlusion.
- [ ] Enter analysis mode and confirm the camera transition completes once.
- [ ] Drag to orbit, scroll to zoom, reset the camera, and exit analysis.
- [ ] Confirm Esc exits analysis and restores the saved office view.
- [ ] Repeat analysis entry and exit to check for stuck controls or duplicate loops.
- [ ] Confirm the GeoJSON status reports the loaded OpenStreetMap boundary.
- [ ] Confirm the workstation shows the CSV source and the wall display opens the magazine reader.

## Stage 3 limitations

Exact station geospatial accuracy remains pending because the current CSV has blank latitude/longitude columns. Threshold labels are conservative UI indicators, not regulatory determinations; missing values are not interpolated. The system is ready for a future coordinate-enriched CSV or verified database adapter.
