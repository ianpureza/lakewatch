import * as THREE from 'three';
import { OfficeScene } from './OfficeScene.js?v=overview44';
import { PlayerController } from './PlayerController.js?v=overview42';
import { InteractionManager } from './InteractionManager.js?v=overview42';
import { LakeAnalysis } from './LakeAnalysis.js';
import { AnalysisController } from './AnalysisController.js';
import { AnalysisWorkspace } from './AnalysisWorkspace.js?v=overview42';

class Game {
  constructor() {
    this.mount = document.querySelector('#app'); this.intro = document.querySelector('#intro'); this.loading = document.querySelector('#loading'); this.error = document.querySelector('#webgl-error'); this.mobileAdvice = document.querySelector('#mobile-advice'); this.updateMobileAdvice = () => { if (!this.mobileAdvice) return; const isMobile = window.matchMedia?.('(max-width: 700px)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); this.mobileAdvice.hidden = !isMobile; }; this.updateMobileAdvice(); window.addEventListener('resize', this.updateMobileAdvice);
    try { this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch { this.showError('WebGL is unavailable in this browser. You can still access the monitoring dashboard below.'); return; }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); this.renderer.setSize(innerWidth, innerHeight); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.mount.prepend(this.renderer.domElement);
    this.office = new OfficeScene(); this.player = new PlayerController(this.office.camera, this.renderer.domElement, this.office.collisions); this.clock = new THREE.Clock();
    this.lakeAnalysis = new LakeAnalysis(this.office.scene); this.analysis = new AnalysisController(this.office.camera, this.renderer.domElement, this.lakeAnalysis);
    this.analysisUi = document.querySelector('#analysis-ui'); this.analysisStatus = document.querySelector('#analysis-status'); this.workspace = new AnalysisWorkspace({ camera: this.office.camera, domElement: this.renderer.domElement, lakeAnalysis: this.lakeAnalysis, ui: this.analysisUi });
    this.panelBackdrop = document.querySelector('#panel-backdrop'); this.panel = document.querySelector('#interaction-panel'); this.panelTitle = document.querySelector('#panel-title'); this.panelContent = document.querySelector('#panel-content'); this.magazinePrev = document.querySelector('#magazine-prev'); this.magazineNext = document.querySelector('#magazine-next'); this.magazineSpacer = document.querySelector('#magazine-action-spacer'); this.magazineFrame = null;
    this.interactions = new InteractionManager(this.office.camera, this.office.scene, document.querySelector('#interaction-prompt'));
    this.registerInteractions();
    this.onLakeShortcut = (event) => { if (event.code !== 'KeyE' || event.repeat || !this.player.enabled || this.analysis.state !== 'EXPLORING') return; const tableCenter = new THREE.Vector3(0, this.player.position.y, .15); if (this.player.position.distanceTo(tableCenter) <= 4.5) this.openLakePanel(); };
    document.addEventListener('keydown', this.onLakeShortcut);
    document.querySelector('#start-button').addEventListener('click', () => this.startExploring());
    document.querySelector('#panel-close').addEventListener('click', () => this.closePanel(false));
    document.querySelector('#panel-resume').addEventListener('click', () => this.closePanel(true));
    this.magazinePrev.addEventListener('click', () => this.sendMagazineCommand('prev'));
    this.magazineNext.addEventListener('click', () => this.sendMagazineCommand('next'));
    this.onMagazineMessage = (event) => { if (event.source !== this.magazineFrame?.contentWindow || event.data?.source !== 'lakewatch-magazine') return; if (event.data.type === 'state') { this.magazinePrev.disabled = Boolean(event.data.atStart); this.magazineNext.disabled = Boolean(event.data.atEnd); } };
    window.addEventListener('message', this.onMagazineMessage);
    document.querySelector('#analysis-reset').addEventListener('click', () => this.analysis.reset());
    document.querySelector('#analysis-back').addEventListener('click', () => this.exitAnalysis(true));
    document.addEventListener('keydown', (event) => { if (event.code === 'Escape' && this.analysis.state !== 'EXPLORING') this.exitAnalysis(false); else if (event.code === 'Escape' && !this.panelBackdrop.hidden) this.closePanel(false); });
    this.lakeAnalysis.load().then((result) => { this.analysisStatus.textContent = result.ok ? `Geographic boundary loaded · ${result.source}` : 'Boundary unavailable · development placeholder retained'; if (result.ok) return this.workspace.load(); });
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) this.intro.classList.add('hidden'); else if (this.player.enabled) this.intro.classList.remove('hidden'); });
    addEventListener('resize', () => { this.renderer.setSize(innerWidth, innerHeight); this.office.resize(innerWidth, innerHeight); });
    this.loading.remove(); this.animate();
  }
  registerInteractions() {
    const lakeObjects = ['ResearchTableTop', 'LagunaLakeTerrainPlaceholder', 'LagunaLakeWaterPlaceholder', 'LakeAnalysisHotspot'].map((name) => this.office.scene.getObjectByName(name)).filter(Boolean);
    lakeObjects.forEach((object3D) => this.interactions.register({ id: `lake-table-${object3D.name}`, object3D, label: 'Analyze Laguna Lake', maxDistance: 2.4, onInteract: () => this.openLakePanel() }));
    const workstation = this.office.scene.getObjectByName('WorkstationDesk');
    if (workstation) this.interactions.register({ id: 'research-workstation', object3D: workstation, label: 'View System Overview', maxDistance: 2, onInteract: () => this.openSystemOverview() });
    const display = this.office.scene.getObjectByName('DisplayFrame');
    if (display) this.interactions.register({ id: 'monitoring-display', object3D: display, label: 'Read Lake Watch Magazine', maxDistance: 2, onInteract: () => this.openMagazinePanel() });
  }
  openLakePanel() {
    if (!this.analysis.enter()) return;
    this.player.enabled = false; this.player.keys.clear(); this.interactions.setEnabled(false); document.exitPointerLock?.(); this.analysisUi.hidden = false; this.workspace.setView('2d');
  }
  exitAnalysis(reacquirePointerLock) {
    if (this.analysis.state === 'EXPLORING') return;
    this.analysis.exit(); this.analysisUi.hidden = true; this.player.enabled = true; this.interactions.setEnabled(true);
    if (reacquirePointerLock) this.player.enable(); else document.querySelector('#intro').classList.remove('hidden');
  }
  openSystemOverview() {
    const content = `<div class="system-overview"><section class="system-hero"><p class="system-kicker">LAKEWATCH 3D // SYSTEM BRIEF</p><h3>Explore the office. Understand the lake.</h3><p>LakeWatch is a first-person environmental monitoring simulator that turns a research office into an interactive learning space. The CSV-backed station data, geographic model, 2D map, charts, and wall magazine work together as one experience.</p><div class="system-status-row"><span><i></i> CSV source connected</span><span><i></i> 15 station IDs</span><span><i></i> 6 sample months</span></div></section><div class="system-grid"><section class="system-card"><span class="system-index">01</span><h3>How it works</h3><ol><li>Landing page loads first, then launches the POV simulator.</li><li>WASD, mouse-look, Shift, collision checks, and Pointer Lock control the office.</li><li>Press E at the research table to enter the 4D/2D lake analysis.</li><li>Press E at the wall display to open the Lake Watch Magazine.</li></ol></section><section class="system-card"><span class="system-index">02</span><h3>Technology stack</h3><ul><li>HTML5, CSS3, vanilla JavaScript ES modules</li><li>Three.js 0.169 for the office and lake model</li><li>Leaflet 1.9.4 + OpenStreetMap for the 2D map</li><li>Chart.js 4.4.4 for station trends</li><li>PHP + XAMPP for the local data adapter</li></ul></section><section class="system-card"><span class="system-index">03</span><h3>Data setup</h3><p><code>csv/LLDA_2020_2025_combined_partial.csv</code> is the current source of truth. <code>api/monitoring.php</code> parses its wide format into station observations.</p><p class="system-muted">Current file: 63 readings · 15 stations · October 2023–March 2025 · dissolved oxygen, BOD, and fecal coliform.</p></section><section class="system-card"><span class="system-index">04</span><h3>API and assets</h3><ul><li><code>api/monitoring.php</code> — CSV-to-JSON adapter</li><li><code>assets/laguna-de-bay.geojson</code> — WGS84 shoreline</li><li>CDN libraries — Three.js, Leaflet, Chart.js</li><li>Browser APIs — WebGL, Canvas, Pointer Lock, postMessage</li></ul></section></div><section class="system-wide-card"><div><p class="system-kicker">SCOPE & LIMITATIONS</p><h3>Built for learning, exploration, and clear data context.</h3></div><ul><li>No MySQL database, authentication, or live sensor stream is connected.</li><li>Source readings are partial and retain their published/secondary-source labels.</li><li>The CSV has no exact coordinates, so station map positions are approximate area anchors.</li><li>Terrain, bathymetry, trees, and water-level animation are illustrative, not operational forecasts.</li><li>Missing readings remain missing; the interface does not invent or interpolate values.</li></ul></section><footer class="system-credit"><span>PROGRAMMERS / RESEARCHERS</span><strong>IAN ROSS PUREZA · JOSE NIÑO UMALI</strong><small>MIT-LSPU 2026 · WITM</small></footer></div>`;
    this.openPanel('LakeWatch System Overview', content.replace('15 station IDs', '16 station IDs').replace('6 sample months', '10 time periods').replace('csv/LLDA_2020_2025_combined_partial.csv', 'csv/llda_master_historical.csv'));
    const overview = this.panelContent.querySelector('.system-overview');
    const dataCard = [...overview.querySelectorAll('.system-card')].find((card) => card.textContent.includes('Data setup'));
    if (dataCard) { const paragraphs = dataCard.querySelectorAll('p'); if (paragraphs[0]) paragraphs[0].innerHTML = '<code>csv/llda_master_historical.csv</code> is the current LLDA master dataset. <code>csv/llda_class_c_thresholds.csv</code> supplies the Class C limits.'; if (paragraphs[1]) paragraphs[1].textContent = 'Current file: 117 readings · 16 stations · annual averages from 2009–2012 plus monthly observations from Oct 2024–Jun 2025.'; }
    if (dataCard?.querySelectorAll('p')[1]) dataCard.querySelectorAll('p')[1].textContent = 'Current file: 117 source rows · 16 stations · 10 periods · annual averages from 2009–2012 plus monthly observations in Q4 2024 and Q2 2025.';
    const statusItems = overview.querySelectorAll('.system-status-row span'); if (statusItems[1]) statusItems[1].textContent = '16 station IDs'; if (statusItems[2]) statusItems[2].textContent = '10 time periods';
    const guidelines = document.createElement('section');
    guidelines.className = 'system-guidelines';
    guidelines.innerHTML = '<div><p class="system-kicker">IMPORTANT GUIDELINES</p><h3>Use the system with context.</h3></div><div class="system-guideline-grid"><article><strong>01 · Provenance</strong><span>Readings come from a partial CSV. Verify each retained source URL before using values beyond this educational simulator.</span></article><article><strong>02 · Location accuracy</strong><span>The source readings have blank coordinates. Nine matching station IDs use the Q4 2020 estimate file; six use fallback anchors. All remain approximate.</span></article><article><strong>03 · Interpretation</strong><span>Good, fair, and poor colors are interface screening cues—not regulatory or health determinations.</span></article><article><strong>04 · Model limits</strong><span>Terrain, bathymetry, trees, and water-level animation are illustrative and should not be treated as forecasts.</span></article><article><strong>05 · Updating data</strong><span>Update the local CSV and coordinate file, reload the PHP adapter, and refresh the simulator. The current workstation does not upload files.</span></article><article><strong>06 · Best experience</strong><span>Use a desktop browser with WebGL, keyboard, and mouse. Press Esc to release Pointer Lock safely.</span></article></div>';
    const locationGuideline = guidelines.querySelectorAll('.system-guideline-grid article')[1]?.querySelector('span'); if (locationGuideline) locationGuideline.textContent = 'The source readings have blank coordinates. Nine matching station IDs use the Q4 2020 estimate file; seven use fallback anchors. All remain approximate.';
    const updateGuideline = guidelines.querySelectorAll('.system-guideline-grid article')[4]?.querySelector('span');
    if (updateGuideline) updateGuideline.textContent = 'Import a monitoring CSV and optional Class C threshold CSV from the analysis sidebar. Imports stay in this browser session.';
    const activitySection = document.createElement('section');
    activitySection.className = 'system-activity';
    activitySection.innerHTML = `<div class="system-section-heading"><div><p class="system-kicker">ACTIVITY / HOW WATER IS WATCHED</p><h3>What happens behind a water-quality reading?</h3></div><span class="system-index">06</span></div><p class="system-activity-intro">This is a deeper, educational summary of public LLDA program descriptions. The simulator is not connected to LLDA live systems; its default view uses a local, partial CSV.</p><div class="system-activity-grid"><article class="system-activity-card"><strong>01 &middot; FIELD + LAB</strong><h4>Routine water-quality monitoring</h4><p>LLDA&apos;s Environmental Laboratory and Research Division describes routine monitoring of Laguna de Bay and its tributaries. Recent annual-report scope describes 15 regular lake stations and 36 tributary stations, with additional sites for other programs.</p><a href="https://llda.gov.ph/environmental-management-program/" target="_blank" rel="noreferrer">LLDA environmental management &rarr;</a></article><article class="system-activity-card"><strong>02 &middot; SAMPLE ANALYSIS</strong><h4>From sample to result</h4><p>Water and wastewater samples move through labeling, a chain-of-custody form, laboratory analysis, review, and release. Public laboratory services cover physico-chemical, biological, microbiological, and heavy-metal analyses.</p><a href="https://llda.gov.ph/laboratory-services/" target="_blank" rel="noreferrer">LLDA laboratory services &rarr;</a></article><article class="system-activity-card"><strong>03 &middot; DECISION SUPPORT</strong><h4>DSS, HYMOS, and Water Mondriaan</h4><p>LLDA describes a Decision Support System and a Water Quality Monitoring program for policy decisions. Its Water Mondriaan presents monthly status against DENR criteria and uses stored monitoring data to compare oxygen demand, bacteria, nutrients, algae, and other indicators.</p><a href="https://llda.gov.ph/the-water-mondriaan/" target="_blank" rel="noreferrer">Read the Water Mondriaan overview &rarr;</a></article><article class="system-activity-card"><strong>04 &middot; LEVEL + WEATHER</strong><h4>Lake-level gauging stations</h4><p>A separate hydrometeorological layer uses lake-level gauging stations, radar level sensors, and GSM transmission to a data center. The public project description also includes rainfall and wind measurements for real-time and historical visualization.</p><a href="https://llda.gov.ph/wp-content/uploads/dox/bid/2025/07_July/DATAVIS-2025-02_FOR%20PRINTING_compressed.pdf" target="_blank" rel="noreferrer">LLDA data-visualization project brief &rarr;</a></article><article class="system-activity-card"><strong>05 &middot; COMPLIANCE + HOTSPOTS</strong><h4>Monitoring informs action</h4><p>Monitoring is used to evaluate development impacts, support environmental planning, inform permits and enforcement, and investigate hotspot areas. LLDA reports also describe special-lake, productivity, and industrial or commercial waste sampling.</p><a href="https://llda.gov.ph/ldb-and-its-tributaries/" target="_blank" rel="noreferrer">LLDA water-quality reports &rarr;</a></article></div>`;
    overview.querySelector('.system-credit')?.before(activitySection, guidelines);
  }
  openMagazinePanel() {
    const content = '<div class="magazine-frame"><iframe class="magazine-embed" title="Lake Watch Magazine" src="./Lake%20Watch%20Magazine.html?embedded=1&v=covers1" loading="eager"></iframe></div>';
    this.openPanel('Lake Watch Magazine', content);
    this.magazineFrame = this.panelContent.querySelector('.magazine-embed');
    this.magazineFrame.addEventListener('load', () => this.sendMagazineCommand('state'), { once: true });
  }
  sendMagazineCommand(direction) {
    this.magazineFrame?.contentWindow?.postMessage({ source: 'lakewatch-wall', type: 'navigate', direction }, '*');
  }
  parseMonitoringCsv(text) {
    const rows = this.parseCsvRows(text);
    if (rows.length < 2) throw new Error('CSV has no data rows.');
    const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, '').trim().toLowerCase());
    if (headers.includes('station_id') && headers.includes('station_name') && headers.includes('sample_month')) return this.parseWideMonitoringCsv(headers, rows);
    const required = ['id', 'code', 'name', 'latitude', 'longitude', 'date', 'parameter', 'value'];
    if (required.some((name) => !headers.includes(name))) throw new Error(`CSV requires long-format columns: ${required.join(', ')}`);
    const index = (name) => headers.indexOf(name);
    const data = { simulated: false, label: 'Uploaded CSV dataset', parameters: {}, dates: [], stations: [] };
    const stations = new Map();
    rows.forEach((row) => {
      const id = row[index('id')]; const parameter = row[index('parameter')]; const date = this.normalizeDatasetDate(row[index('date')]); const value = this.parseFiniteNumber(row[index('value')]);
      if (!id || !parameter || !date || value === null) throw new Error(`Invalid reading for ${id || 'unknown station'}.`);
      if (!data.parameters[parameter]) data.parameters[parameter] = { name: parameter, unit: row[index('unit')] || 'value', description: 'Uploaded monitoring measurement.' };
      if (!data.dates.includes(date)) data.dates.push(date);
      if (!stations.has(id)) {
        const hint = this.stationCoordinateHint(id, row[index('name')], stations.size);
        stations.set(id, { id, code: row[index('code')] || id, name: row[index('name')] || id, latitude: this.parseFiniteNumber(row[index('latitude')]) ?? hint.latitude, longitude: this.parseFiniteNumber(row[index('longitude')]) ?? hint.longitude, coordinates_approximate: this.parseFiniteNumber(row[index('latitude')]) === null || this.parseFiniteNumber(row[index('longitude')]) === null, coordinate_note: hint.note, source: 'UPLOADED DATASET', observations: {} });
      }
      const station = stations.get(id); station.observations[date] ||= {}; station.observations[date][parameter] = value;
    });
    data.dates.sort(); data.stations = [...stations.values()]; return data;
  }
  parseCsvRows(text) {
    const rows = []; let row = []; let cell = ''; let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index]; const next = text[index + 1];
      if (character === '"') {
        if (quoted && next === '"') { cell += '"'; index += 1; } else quoted = !quoted;
      } else if (character === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
      else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && next === '\n') index += 1; row.push(cell.trim()); if (row.some((value) => value !== '')) rows.push(row); row = []; cell = ''; }
      else cell += character;
    }
    if (cell !== '' || row.length) { row.push(cell.trim()); if (row.some((value) => value !== '')) rows.push(row); }
    return rows;
  }
  parseWideMonitoringCsv(headers, rows) {
    const index = (name) => headers.indexOf(name);
    const definitions = [
      ['do', 'Dissolved Oxygen', 'mg/L', 'do_mg_l', 'Dissolved oxygen concentration reported in the source CSV.'],
      ['ph', 'pH', 'pH units', 'ph', 'Acidity/alkalinity reading reported in the source CSV.'],
      ['bod', 'Biochemical Oxygen Demand', 'mg/L', 'bod_mg_l', 'Five-day biochemical oxygen demand reported in the source CSV.'],
      ['cod', 'Chemical Oxygen Demand', 'mg/L', 'cod_mg_l', 'Chemical oxygen demand reported in the source CSV.'],
      ['turbidity', 'Turbidity', 'NTU', 'turbidity_ntu', 'Water clarity indicator reported in the source CSV.'],
      ['temperature', 'Temperature', '°C', 'temperature_c', 'Surface-water temperature reported in the source CSV.'],
      ['nitrate', 'Nitrate', 'mg/L', 'nitrate_mg_l', 'Nitrate concentration reported in the source CSV.'],
      ['phosphate', 'Phosphate', 'mg/L', 'phosphate_mg_l', 'Phosphate concentration reported in the source CSV.'],
      ['fecal_coliform', 'Fecal Coliform', 'MPN/100 mL', 'fecal_coliform_mpn_100ml', 'Fecal coliform count reported in the source CSV.'],
    ];
    const data = { simulated: false, partial: true, label: 'Uploaded wide CSV dataset', parameters: {}, dates: [], stations: [] };
    const stations = new Map(); const counts = new Map(definitions.map(([key]) => [key, 0]));
    rows.forEach((row) => {
      const get = (name) => row[index(name)] || ''; const id = get('station_id'); const name = get('station_name'); const date = this.normalizeDatasetDate(get('sample_month'));
      if (!id || !name || !date) return;
      if (!data.dates.includes(date)) data.dates.push(date);
      if (!stations.has(id)) {
        const hint = this.stationCoordinateHint(id, name, stations.size); const latitude = this.parseFiniteNumber(get('latitude')); const longitude = this.parseFiniteNumber(get('longitude'));
        stations.set(id, { id, code: id, name, latitude: latitude ?? hint.latitude, longitude: longitude ?? hint.longitude, coordinates_approximate: latitude === null || longitude === null, coordinate_note: latitude !== null && longitude !== null ? 'Coordinates supplied by the CSV.' : hint.note, source: get('data_type') || 'UPLOADED CSV DATASET', source_url: get('source_url') || null, observations: {} });
      }
      const station = stations.get(id); station.observations[date] ||= {};
      definitions.forEach(([key, parameterName, unit, column, description]) => { const value = this.parseFiniteNumber(get(column)); if (value === null) return; if (!data.parameters[key]) data.parameters[key] = { name: parameterName, unit, description }; station.observations[date][key] = value; counts.set(key, counts.get(key) + 1); });
    });
    if (!stations.size) throw new Error('Wide CSV has no valid station rows.');
    data.dates.sort(); data.stations = [...stations.values()];
    definitions.forEach(([key]) => { if (data.parameters[key]) data.parameters[key].available_values = counts.get(key); });
    return data;
  }
  parseFiniteNumber(value) { const text = String(value ?? '').trim().replace(/,/g, ''); return text === '' || !Number.isFinite(Number(text)) ? null : Number(text); }
  normalizeDatasetDate(value) { const text = String(value ?? '').trim(); return /^\d{4}-\d{2}$/.test(text) ? `${text}-01` : /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; }
  stationCoordinateHint(id, name, index = 0) {
    const hints = { I: [14.43, 121.13], II: [14.37, 121.41], IV: [14.34, 121.27], V: [14.49, 121.16], VIII: [14.26, 121.32], XIII: [14.50, 121.11], XV: [14.31, 121.08], XVI: [14.26, 121.14], XVII: [14.34, 121.27], XVIII: [14.30, 121.35], XIX: [14.34, 121.09], XX: [14.39, 121.35], XXI: [14.45, 121.33], XXII: [14.42, 121.33], XXIII: [14.32, 121.42] };
    const point = hints[String(id || '').trim().toUpperCase()] || [14.35 + Math.sin(index * 2.4) * .08, 121.25 + Math.cos(index * 2.4) * .12];
    return { latitude: point[0], longitude: point[1], note: `Approximate visualization anchor for ${name || id}; exact coordinates are not in the dataset.` };
  }
  openSummaryPanel() {
    const data = this.workspace.data;
    if (!data) { this.openPanel('Monitoring Summary', '<p class="panel-copy">Loading the LakeWatch monitoring dataset…</p>'); return; }
    const parameterKeys = Object.keys(data.parameters); const station = this.workspace.selectedStation || data.stations[0]; const dataNote = data.simulated ? 'SIMULATED DATA — EDUCATIONAL DEMONSTRATION.' : `${data.label || 'CSV DATASET'} · values shown as provided; missing readings are not interpolated.`;
    const panel = `<div id="summary-root" class="summary-root"><div class="summary-controls"><label>Parameter<select id="summary-parameter">${parameterKeys.map((key) => `<option value="${key}" ${key === this.workspace.parameter ? 'selected' : ''}>${data.parameters[key].name}</option>`).join('')}</select></label><label>Observation date<select id="summary-date">${data.dates.map((date) => `<option value="${date}" ${date === this.workspace.date ? 'selected' : ''}>${this.workspace.formatDate(date)}</option>`).join('')}</select></label><label>Focus station<select id="summary-station">${data.stations.map((item) => `<option value="${item.id}" ${item.id === station.id ? 'selected' : ''}>${item.code}</option>`).join('')}</select></label></div><div id="summary-kpis" class="summary-kpis"></div><div id="summary-table" class="summary-table"></div><p class="panel-note">${dataNote} Select a parameter, date, or station to update the summary and analysis state.</p></div>`;
    this.openPanel('Monitoring Summary', panel);
    const root = this.panelContent.querySelector('#summary-root'); const parameterSelect = root.querySelector('#summary-parameter'); const dateSelect = root.querySelector('#summary-date'); const stationSelect = root.querySelector('#summary-station'); const kpis = root.querySelector('#summary-kpis'); const table = root.querySelector('#summary-table');
    const render = () => {
      const parameter = data.parameters[parameterSelect.value]; const date = dateSelect.value;
      const values = data.stations.map((item) => ({ station: item, value: Number(item.observations?.[date]?.[parameterSelect.value]) })).filter(({ value }) => Number.isFinite(value)).sort((a, b) => b.value - a.value);
      const mean = values.length ? values.reduce((sum, item) => sum + item.value, 0) / values.length : 0;
      const selected = data.stations.find((item) => item.id === stationSelect.value) || values[0]?.station;
      if (selected && this.workspace.selectedStation?.id !== selected.id) this.workspace.selectStation(selected);
      kpis.innerHTML = `<article><span>Stations</span><strong>${values.length}</strong><small>reporting</small></article><article><span>Network mean</span><strong>${mean.toFixed(2)}</strong><small>${parameter.unit}</small></article><article><span>Highest</span><strong>${values[0]?.value.toFixed(2) || '—'}</strong><small>${values[0]?.station.code || '—'}</small></article><article><span>Lowest</span><strong>${values.at(-1)?.value.toFixed(2) || '—'}</strong><small>${values.at(-1)?.station.code || '—'}</small></article>`;
      table.innerHTML = `<div class="summary-table-head"><span>Station</span><span>${parameter.name}</span><span>Status</span></div>${values.slice(0, 8).map(({ station: item, value }) => { const status = this.workspace.statusFor(value, parameterSelect.value); return `<button class="summary-row ${item.id === selected?.id ? 'selected' : ''}" data-station="${item.id}" type="button"><span><b>${item.code}</b><small>${item.name}</small></span><strong>${value.toFixed(2)} ${parameter.unit}</strong><em style="color:${status.color}">${status.label}</em></button>`; }).join('')}`;
      root.querySelectorAll('.summary-row').forEach((row) => row.addEventListener('click', () => { stationSelect.value = row.dataset.station; render(); }));
    };
    parameterSelect.addEventListener('change', () => { this.workspace.parameter = parameterSelect.value; this.workspace.refresh(); render(); }); dateSelect.addEventListener('change', () => { this.workspace.setDate(dateSelect.value); render(); }); stationSelect.addEventListener('change', () => render()); render();
  }
  openPanel(title, content) {
    if (!this.panelBackdrop.hidden) return;
    this.player.enabled = false; this.player.keys.clear(); this.interactions.setEnabled(false); document.exitPointerLock?.();
    const isMagazine = title === 'Lake Watch Magazine';
    const isSystem = title === 'LakeWatch System Overview';
    this.panelBackdrop.classList.toggle('magazine-backdrop', isMagazine);
    this.panelBackdrop.classList.toggle('system-backdrop', isSystem);
    this.panel.classList.toggle('magazine-panel', isMagazine);
    this.panel.classList.toggle('system-panel', isSystem);
    this.magazinePrev.hidden = !isMagazine; this.magazineNext.hidden = !isMagazine; this.magazineSpacer.hidden = !isMagazine;
    this.magazinePrev.disabled = true; this.magazineNext.disabled = false;
    this.panelTitle.textContent = title; this.panelContent.innerHTML = content; this.panelBackdrop.hidden = false; this.panel.focus();
  }
  closePanel(reacquirePointerLock) {
    if (this.panelBackdrop.hidden) return;
    this.panelBackdrop.hidden = true; this.panelBackdrop.classList.remove('magazine-backdrop', 'system-backdrop'); this.interactions.setEnabled(true); this.player.enabled = true;
    this.panel.classList.remove('magazine-panel', 'system-panel');
    this.magazineFrame = null; this.magazinePrev.hidden = true; this.magazineNext.hidden = true; this.magazineSpacer.hidden = true;
    if (reacquirePointerLock) this.player.enable();
    else document.querySelector('#intro').classList.remove('hidden');
  }
  startExploring() { this.player.enable(); }
  showError(message) { this.loading?.remove(); this.error.hidden = false; this.error.innerHTML = `${message}<br><br><span class="dashboard-link unavailable">Monitoring dashboard unavailable · no PHP/MySQL source configured</span>`; }
  animate = () => { requestAnimationFrame(this.animate); const delta = Math.min(this.clock.getDelta(), .05); this.office?.update?.(delta); this.analysis?.update(delta); if (this.analysis?.state === 'ANALYZING') { this.analysisUi.hidden = false; this.workspace?.update(delta); } this.player?.update(delta); if (this.player?.pointerLocked) this.interactions?.update(); if (this.renderer && this.office) this.renderer.render(this.office.scene, this.office.camera); };
}
new Game();
