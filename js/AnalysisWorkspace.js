import * as THREE from 'three';

export class AnalysisWorkspace {
  constructor({ camera, domElement, lakeAnalysis, ui }) {
    this.camera = camera; this.domElement = domElement; this.lakeAnalysis = lakeAnalysis; this.ui = ui;
    this.data = null; this.parameter = 'do'; this.date = null; this.selectedStation = null; this.chart = null; this.mapFrame = null; this.dragStart = null; this.timePlaying = false; this.timeAccumulator = 0; this.viewMode = '4d'; this.flatGeoJson = null; this.flatStationPoints = []; this.flatZoom = 1; this.leafletMap = null; this.leafletBoundary = null; this.leafletStations = null;
    this.parameterSelect = ui.querySelector('#parameter-select'); this.dateSelect = ui.querySelector('#date-select'); this.search = ui.querySelector('#station-search'); this.stationList = ui.querySelector('#station-list'); this.status = ui.querySelector('#analysis-status'); this.stationName = ui.querySelector('#station-name'); this.stationDetails = ui.querySelector('#station-details'); this.measurementList = ui.querySelector('#measurement-list'); this.legend = ui.querySelector('#legend'); this.mapToggle = { checked: true }; this.stationToggle = ui.querySelector('#stations-toggle'); this.labelsButton = ui.querySelector('#analysis-labels'); this.timePlay = ui.querySelector('#analysis-time-play'); this.timeSlider = ui.querySelector('#analysis-time-slider'); this.timeReadout = ui.querySelector('#analysis-time-readout'); this.view3dButton = ui.querySelector('#analysis-view-3d'); this.view2dButton = ui.querySelector('#analysis-view-2d'); this.flatMapHost = ui.querySelector('#reference-map-2d'); this.flatMapCanvas = ui.querySelector('#flat-map-canvas'); this.leafletHost = ui.querySelector('#leaflet-map');
    this.raycaster = new THREE.Raycaster();
    this.parameterSelect.addEventListener('change', () => { this.parameter = this.parameterSelect.value; this.refresh(); });
    this.dateSelect.addEventListener('change', () => this.setDate(this.dateSelect.value));
    this.timeSlider.addEventListener('input', () => { if (this.data) this.setDate(this.data.dates[Number(this.timeSlider.value)]); });
    this.timePlay.addEventListener('click', () => { this.timePlaying = !this.timePlaying; this.timeAccumulator = 0; this.timePlay.textContent = this.timePlaying ? 'Pause 4D Time' : 'Play 4D Time'; });
    this.search.addEventListener('input', () => this.handleStationSearch()); this.search.addEventListener('keydown', (event) => { if (event.key !== 'Enter') return; const matches = this.filteredStations(); if (!matches.length) return; event.preventDefault(); this.selectStation(matches[0]); }); this.stationToggle.addEventListener('change', () => { this.lakeAnalysis.markerGroup.visible = this.stationToggle.checked; this.renderFlatMap(); }); this.view3dButton.addEventListener('click', () => this.setView('4d')); this.view2dButton.addEventListener('click', () => this.setView('2d')); this.flatMapCanvas.addEventListener('click', (event) => this.pickFlatStation(event)); this.flatMapCanvas.addEventListener('wheel', (event) => { event.preventDefault(); this.flatZoom = Math.max(.8, Math.min(3, this.flatZoom * (event.deltaY < 0 ? 1.12 : .89))); this.renderFlatMap(); }, { passive: false });
    this.labelsButton.addEventListener('click', () => { this.lakeAnalysis.setLabelsVisible(!this.lakeAnalysis.labelsVisible); this.labelsButton.textContent = this.lakeAnalysis.labelsVisible ? 'Hide Labels' : 'Show Labels'; });
    this.on4DMessage = (event) => { if (event.source !== this.mapFrame?.contentWindow || event.data?.source !== 'lakewatch-4d') return; if (event.data.type === 'ready') { this.postMapState(); return; } if (event.data.type !== 'station-select' || !this.data?.stations?.length) return; const picked = event.data.station; const nearest = this.data.stations.reduce((best, station) => { const distance = Math.hypot(Number(station.latitude) - Number(picked.latitude), Number(station.longitude) - Number(picked.longitude)); return !best || distance < best.distance ? { station, distance } : best; }, null)?.station; if (nearest) this.selectStation(nearest); };
    window.addEventListener('message', this.on4DMessage);
    this.loadFlatMap();
    domElement.addEventListener('pointerdown', (event) => { this.dragStart = { x: event.clientX, y: event.clientY }; });
    domElement.addEventListener('pointerup', (event) => { if (!this.dragStart || Math.hypot(event.clientX - this.dragStart.x, event.clientY - this.dragStart.y) > 6) return; const rect = domElement.getBoundingClientRect(); this.raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera); this.lakeAnalysis.pickStation(this.raycaster); });
  }
  async load() {
    try {
      let response = await fetch('../api/monitoring.php?v=csv2', { cache: 'no-store' });
      if (!response.ok) response = await fetch('../api/demo-monitoring.php?v=csv2', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Monitoring data request failed (${response.status})`);
      this.data = await response.json();
      this.normalizeStations(this.data);
      this.notifyDataset();
      this.parameterSelect.replaceChildren(...Object.entries(this.data.parameters).map(([key, parameter]) => new Option(`${parameter.name} (${parameter.unit})`, key)));
      this.date = this.data.dates[this.data.dates.length - 1];
      this.dateSelect.replaceChildren(...this.data.dates.map((date) => new Option(this.formatDate(date), date)));
      this.dateSelect.value = this.date;
      this.timeSlider.max = String(this.data.dates.length - 1);
      this.timeSlider.value = String(this.data.dates.length - 1);
      this.timeReadout.textContent = this.date.slice(0, 7);
      this.dateSelect.disabled = false;
      this.lakeAnalysis.setStations(this.data.stations, (station) => this.selectStation(station));
      this.selectStation(this.data.stations[0]);
      this.status.textContent = this.datasetStatus(this.data);
      this.initMap();
      this.toggleMap(this.mapToggle.checked);
      this.refresh();
    } catch (error) {
      this.status.textContent = `Monitoring data unavailable · ${error.message}`;
    }
  }
  datasetStatus(data = this.data) {
    const label = data?.simulated ? 'simulated fallback' : (data?.label || data?.dataset_label || 'CSV dataset');
    const qualifier = data?.partial ? ' · partial source data' : '';
    const approximateCount = data?.stations?.filter((station) => station.coordinates_approximate).length || 0;
    const coordinateNote = data?.coordinate_station_count ? ` · ${data.coordinate_station_count} updated estimates · ${data.coordinate_fallback_station_count || 0} fallback anchors` : (approximateCount ? ` · ${approximateCount} approximate station anchors` : '');
    return `${data?.stations?.length || 0} stations · ${data?.dates?.length || 0} observations · ${label}${qualifier}${coordinateNote}`;
  }
  normalizeStations(data = this.data) {
    if (!data?.stations) return data;
    data.stations = data.stations.map((station) => {
      const sourceLocation = station.location || {};
      const latitudeValue = Number(sourceLocation.latitude ?? sourceLocation.lat ?? station.latitude);
      const longitudeValue = Number(sourceLocation.longitude ?? sourceLocation.lon ?? station.longitude);
      const approximate = Boolean(sourceLocation.approximate ?? station.coordinates_approximate);
      const note = sourceLocation.note || station.coordinate_note || (approximate ? 'Approximate visualization anchor; exact coordinates are not in the dataset.' : 'Coordinates supplied by the dataset.');
      station.location = { latitude: Number.isFinite(latitudeValue) ? latitudeValue : null, longitude: Number.isFinite(longitudeValue) ? longitudeValue : null, approximate, note, status: station.coordinate_status || sourceLocation.status || '', source: station.coordinate_source || sourceLocation.source || '' };
      station.latitude = station.location.latitude;
      station.longitude = station.location.longitude;
      station.coordinates_approximate = approximate;
      station.coordinate_note = note;
      return station;
    });
    return data;
  }
  formatDate(date) {
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }
  notifyDataset() { window.dispatchEvent(new CustomEvent('lakewatch-dataset-updated', { detail: this.data })); }
  setDate(date) { if (!date) return; this.date = date; this.dateSelect.value = date; if (this.data) this.timeSlider.value = String(this.data.dates.indexOf(date)); this.timeReadout.textContent = date.slice(0, 7); this.refresh(); }
  selectStation(station) {
    this.selectedStation = station;
    this.stationName.textContent = station.name;
    const latitude = Number(station.latitude);
    const longitude = Number(station.longitude);
    const coordinateText = Number.isFinite(latitude) && Number.isFinite(longitude) ? `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E` : 'Coordinates not provided';
    const coordinateNote = station.coordinate_note ? `<br><span class="source-note">${this.escapeHtml(station.coordinate_note)}</span>` : '';
    const sourceUrl = /^https?:\/\//i.test(station.source_url || '') ? `<br><a class="source-link" href="${this.escapeHtml(station.source_url)}" target="_blank" rel="noreferrer">Open source record ↗</a>` : '';
    this.stationDetails.innerHTML = `<strong>${this.escapeHtml(station.code)}</strong><br>${coordinateText}<br><span class="source-note">${this.escapeHtml(station.source || 'CSV dataset')}</span>${coordinateNote}${sourceUrl}`;
    this.refreshChart();
    this.postMapState();
    this.focusMapOnStation(station);
    this.renderStationList();
  }
  filteredStations(query = this.search?.value.trim().toLowerCase() || '') { const normalized = String(query).trim().toLowerCase(); return this.data?.stations?.filter((station) => !normalized || (station.name + ' ' + station.code).toLowerCase().includes(normalized)) || []; }
  handleStationSearch() { this.filterStations(); this.renderStationList(); const query = this.search.value.trim().toLowerCase(); if (!query || !this.data?.stations?.length) return; const matches = this.filteredStations(query); const exact = matches.find((station) => station.name.toLowerCase() === query || station.code.toLowerCase() === query); const target = exact || (matches.length === 1 ? matches[0] : null); if (target) this.selectStation(target); }
  refresh() { if (!this.data || !this.date) return; const parameter = this.data.parameters[this.parameter]; const range = this.lakeAnalysis.updateStationStyles(this.parameter, this.date); this.legend.innerHTML = `<span class="legend-swatch" style="background:linear-gradient(90deg,#5bb6b1,#edc65f,#df765e)"></span> ${parameter.name}: ${range.min.toFixed(2)}–${range.max.toFixed(2)} ${parameter.unit}`; this.renderMeasurements(parameter); this.refreshChart(); this.renderStationList(); this.renderFlatMap(); this.postMapState(); }
  renderStationList() {
    if (!this.stationList || !this.data || !this.date) return;
    const query = this.search?.value.trim().toLowerCase() || '';
    const stations = this.data.stations.filter((station) => !query || `${station.name} ${station.code}`.toLowerCase().includes(query));
    const parameter = this.data.parameters[this.parameter];
    this.stationList.innerHTML = `<div class="station-list-heading"><span>AVAILABLE STATIONS</span><strong>${stations.length}/${this.data.stations.length}</strong></div>${stations.length ? stations.map((station) => { const value = Number(station.observations?.[this.date]?.[this.parameter]); const status = this.statusFor(value, this.parameter); const selected = station.id === this.selectedStation?.id; return `<button type="button" class="station-list-item${selected ? ' is-selected' : ''}" data-station-id="${this.escapeHtml(station.id)}"><span class="station-list-name"><strong>${this.escapeHtml(station.code)}</strong><small>${this.escapeHtml(station.name)}</small></span><span class="station-list-value" style="color:${status.color}">${Number.isFinite(value) ? value.toFixed(2) : '—'}<small>${this.escapeHtml(status.label)} · ${this.escapeHtml(parameter.unit)}</small></span></button>`; }).join('') : '<p class="station-list-empty">No station matches this search.</p>'}`;
    this.stationList.querySelectorAll('.station-list-item').forEach((button) => button.addEventListener('click', () => { const station = this.data.stations.find((item) => item.id === button.dataset.stationId); if (station) this.selectStation(station); }));
  }
  focusMapOnStation(station) {
    const latitude = Number(station?.location?.latitude ?? station?.latitude);
    const longitude = Number(station?.location?.longitude ?? station?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || this.viewMode !== '2d') return;
    if (this.leafletMap) {
      const zoom = Math.min(13, Math.max(9, this.leafletMap.getZoom()) + 1);
      this.leafletMap.flyTo([latitude, longitude], zoom, { animate: true, duration: .65, easeLinearity: .25 });
    } else {
      this.flatZoom = Math.max(this.flatZoom, 1.35);
      this.renderFlatMap();
    }
  }
  renderMeasurements(parameter) { const observation = this.selectedStation?.observations?.[this.date]?.[this.parameter]; this.measurementList.innerHTML = `<div class="measurement-value">${Number.isFinite(Number(observation)) ? Number(observation).toFixed(2) : '—'} <small>${parameter.unit}</small></div><div class="measurement-name">${parameter.name} · ${this.date}</div><p>${parameter.description}</p>`; }
  refreshChart() { if (!this.data || !this.selectedStation || !window.Chart) return; const parameter = this.data.parameters[this.parameter]; const labels = this.data.dates.map((date) => date.slice(0, 7)); const selected = this.data.dates.map((date) => Number(this.selectedStation.observations[date]?.[this.parameter]) || null); const means = this.data.dates.map((date) => { const values = this.data.stations.map((station) => Number(station.observations[date]?.[this.parameter])).filter(Number.isFinite); return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }); this.chart?.destroy(); this.chart = new window.Chart(this.ui.querySelector('#history-chart'), { type: 'line', data: { labels, datasets: [{ label: this.selectedStation.code, data: selected, borderColor: '#75c6a8', backgroundColor: 'rgba(117,198,168,.16)', fill: true, tension: .3 }, { label: 'All-station mean', data: means, borderColor: '#e6bd72', borderDash: [5, 4], tension: .3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#d8e8e1', boxWidth: 12 } } }, scales: { x: { ticks: { color: '#9fb5ad' }, grid: { color: 'rgba(255,255,255,.08)' } }, y: { title: { display: true, text: `${parameter.name} (${parameter.unit})`, color: '#b8cbc5' }, ticks: { color: '#9fb5ad' }, grid: { color: 'rgba(255,255,255,.08)' } } } } }); }
  applyDataset(data, sourceLabel = 'uploaded dataset') {
    if (!data?.stations?.length || !data?.dates?.length || !data?.parameters) throw new Error('Dataset must include stations, dates, and parameters.');
    this.data = data;
    this.normalizeStations(this.data);
    this.notifyDataset();
    this.parameter = Object.keys(data.parameters)[0];
    this.date = data.dates[data.dates.length - 1];
    this.parameterSelect.replaceChildren(...Object.entries(data.parameters).map(([key, parameter]) => new Option(`${parameter.name} (${parameter.unit})`, key)));
    this.parameterSelect.value = this.parameter;
    this.dateSelect.replaceChildren(...data.dates.map((date) => new Option(this.formatDate(date), date)));
    this.dateSelect.value = this.date;
    this.dateSelect.disabled = false;
    this.timeSlider.max = String(data.dates.length - 1);
    this.timeSlider.value = String(data.dates.length - 1);
    this.timeReadout.textContent = this.date.slice(0, 7);
    this.lakeAnalysis.setStations(data.stations, (station) => this.selectStation(station));
    this.selectStation(data.stations[0]);
    this.status.textContent = this.datasetStatus(data) + ` · ${sourceLabel}`;
    this.initMap();
    this.toggleMap(this.mapToggle.checked);
    this.refresh();
  }
  filterStations() { const query = this.search.value.trim().toLowerCase(); this.lakeAnalysis.stationEntries.forEach(({ station, marker, label }) => { const visible = !query || `${station.name} ${station.code}`.toLowerCase().includes(query); marker.visible = visible; label.hidden = !visible || !this.lakeAnalysis.labelsVisible; }); }
  initLeafletMap() { if (!window.L || !this.leafletHost || this.leafletMap) return; this.leafletMap = window.L.map(this.leafletHost, { zoomControl: true, attributionControl: true, preferCanvas: false }).setView([14.35, 121.25], 9); window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.leafletMap); this.leafletStations = window.L.layerGroup().addTo(this.leafletMap); if (this.flatGeoJson) { this.leafletBoundary = window.L.geoJSON(this.flatGeoJson, { style: { color: '#2b665d', weight: 2, fillColor: '#4da4a1', fillOpacity: .28 } }).addTo(this.leafletMap); this.leafletMap.setView([14.35, 121.25], 9); } }
  async loadFlatMap() { try { const response = await fetch('../assets/laguna-de-bay.geojson'); if (!response.ok) throw new Error('Boundary request failed'); this.flatGeoJson = await response.json(); if (this.leafletMap) { this.leafletBoundary?.remove(); this.leafletBoundary = window.L.geoJSON(this.flatGeoJson, { style: { color: '#2b665d', weight: 2, fillColor: '#4da4a1', fillOpacity: .28 } }).addTo(this.leafletMap); this.leafletMap.setView([14.35, 121.25], 9); } this.renderFlatMap(); } catch { this.flatGeoJson = null; } }
  flatRings() { const rings = []; (this.flatGeoJson?.features || []).forEach((feature) => { const geometry = feature.geometry; const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : []; polygons.forEach((polygon) => polygon.forEach((ring) => rings.push(ring))); }); return rings; }
  flatProjection() { const rings = this.flatRings(); const coordinates = rings.flat(); if (!coordinates.length) return null; const bounds = coordinates.reduce((box, [longitude, latitude]) => ({ minLon: Math.min(box.minLon, longitude), maxLon: Math.max(box.maxLon, longitude), minLat: Math.min(box.minLat, latitude), maxLat: Math.max(box.maxLat, latitude) }), { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }); const rect = this.flatMapHost.getBoundingClientRect(); const width = rect.width; const height = rect.height; const scale = Math.min((width - 96) / (bounds.maxLon - bounds.minLon), (height - 96) / (bounds.maxLat - bounds.minLat)) * this.flatZoom; return { bounds, width, height, project: ([longitude, latitude]) => [width / 2 + (longitude - (bounds.minLon + bounds.maxLon) / 2) * scale, height / 2 - (latitude - (bounds.minLat + bounds.maxLat) / 2) * scale] }; }
  statusFor(value, parameterKey) {
    if (!Number.isFinite(value)) return { label: 'NO DATA', color: '#9fb5ad', key: 'none' };
    if (parameterKey === 'do') return value >= 5 ? { label: 'GOOD', color: '#3fbf6b', key: 'good' } : value >= 3 ? { label: 'FAIR', color: '#f2b134', key: 'fair' } : { label: 'POOR', color: '#e5484d', key: 'poor' };
    if (parameterKey === 'ph') return value >= 6.5 && value <= 8.5 ? { label: 'IN RANGE', color: '#3fbf6b', key: 'good' } : value >= 6 && value <= 9 ? { label: 'REVIEW', color: '#f2b134', key: 'fair' } : { label: 'OUT OF RANGE', color: '#e5484d', key: 'poor' };
    if (['bod', 'cod', 'turbidity'].includes(parameterKey)) {
      const goodLimit = parameterKey === 'bod' ? 5 : 25;
      const reviewLimit = parameterKey === 'bod' ? 10 : 50;
      return value <= goodLimit ? { label: 'GOOD', color: '#3fbf6b', key: 'good' } : value <= reviewLimit ? { label: 'FAIR', color: '#f2b134', key: 'fair' } : { label: 'POOR', color: '#e5484d', key: 'poor' };
    }
    if (parameterKey === 'temperature') return value >= 24 && value <= 32 ? { label: 'IN RANGE', color: '#3fbf6b', key: 'good' } : value >= 20 && value <= 35 ? { label: 'REVIEW', color: '#f2b134', key: 'fair' } : { label: 'OUT OF RANGE', color: '#e5484d', key: 'poor' };
    return { label: 'RECORDED', color: '#75c6a8', key: 'recorded' };
  }
  escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
  renderLeafletMap() { if (!this.leafletMap || !this.data) return; if (this.leafletMap._tooltip) this.leafletMap.closeTooltip(); if (this.leafletMap._popup) this.leafletMap.closePopup(); const tooltipPane = this.leafletMap.getPanes().tooltipPane; if (tooltipPane) tooltipPane.replaceChildren(); this.leafletStations.clearLayers(); const values = this.data.stations.map((station) => Number(station.observations?.[this.date]?.[this.parameter])).filter(Number.isFinite); const min = Math.min(...values); const max = Math.max(...values); const parameter = this.data.parameters[this.parameter]; this.data.stations.forEach((station) => { const value = Number(station.observations?.[this.date]?.[this.parameter]); const ratio = Number.isFinite(value) && max > min ? (value - min) / (max - min) : .5; const selected = station.id === this.selectedStation?.id; const marker = window.L.circleMarker([Number(station.latitude), Number(station.longitude)], { radius: selected ? 9 : 6, color: selected ? '#fff2c4' : '#0b3036', weight: selected ? 3 : 1.5, fillColor: selected ? '#f3d48a' : `hsl(${155 - ratio * 120} 70% 55%)`, fillOpacity: .95 }); const observation = Number.isFinite(value) ? `${value.toFixed(2)} ${parameter.unit}` : 'No reading'; const status = this.statusFor(value, this.parameter); const label = `<strong>${this.escapeHtml(station.code)} · ${this.escapeHtml(station.name)}</strong><br>${Number(station.latitude).toFixed(4)}° N, ${Number(station.longitude).toFixed(4)}° E<br>${this.escapeHtml(parameter.name)}: ${observation}<br><b style="color:${status.color}">${status.label}</b>`; marker.bindTooltip(label, { sticky: true, direction: 'top', opacity: .96, className: 'lakewatch-tooltip', offset: [0, -8] }); marker.bindPopup(label); marker.on('click', () => this.selectStation(station)); marker.addTo(this.leafletStations); if (selected) marker.openTooltip(); }); if (this.viewMode === '2d') requestAnimationFrame(() => this.leafletMap.invalidateSize()); }
  renderFlatMap() { if (this.viewMode !== '2d') return; if (this.leafletMap) { this.renderLeafletMap(); return; } if (!this.flatMapCanvas || !this.flatGeoJson || !this.data) return; const projection = this.flatProjection(); if (!projection?.width || !projection.height) return; const dpr = Math.min(window.devicePixelRatio || 1, 2); this.flatMapCanvas.width = Math.round(projection.width * dpr); this.flatMapCanvas.height = Math.round(projection.height * dpr); const context = this.flatMapCanvas.getContext('2d'); context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, projection.width, projection.height); context.fillStyle = '#071d25'; context.fillRect(0, 0, projection.width, projection.height); context.strokeStyle = 'rgba(117,198,168,.11)'; context.lineWidth = 1; for (let x = 24; x < projection.width; x += 48) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, projection.height); context.stroke(); } for (let y = 24; y < projection.height; y += 48) { context.beginPath(); context.moveTo(0, y); context.lineTo(projection.width, y); context.stroke(); }
    this.flatRings().forEach((ring) => { context.beginPath(); ring.forEach((coordinate, index) => { const [x, y] = projection.project(coordinate); index ? context.lineTo(x, y) : context.moveTo(x, y); }); context.closePath(); context.fillStyle = '#247782'; context.fill(); context.strokeStyle = '#a4d5bd'; context.lineWidth = 1.5; context.stroke(); });
    const values = this.data.stations.map((station) => Number(station.observations?.[this.date]?.[this.parameter])).filter(Number.isFinite); const min = Math.min(...values); const max = Math.max(...values); this.flatStationPoints = []; this.data.stations.forEach((station) => { const [x, y] = projection.project([Number(station.longitude), Number(station.latitude)]); const value = Number(station.observations?.[this.date]?.[this.parameter]); const ratio = Number.isFinite(value) && max > min ? (value - min) / (max - min) : .5; const selected = station.id === this.selectedStation?.id; this.flatStationPoints.push({ station, x, y }); context.beginPath(); context.arc(x, y, selected ? 8 : 5.5, 0, Math.PI * 2); context.fillStyle = selected ? '#f3d48a' : `hsl(${155 - ratio * 120} 70% 62%)`; context.fill(); context.strokeStyle = selected ? '#fff6d0' : '#06222a'; context.lineWidth = selected ? 2.5 : 1.5; context.stroke(); if (selected || this.flatZoom > 1.35) { context.fillStyle = '#e6f4ef'; context.font = selected ? '700 12px system-ui' : '10px system-ui'; context.fillText(selected ? station.code + ' · ' + station.name : station.code, x + 9, y - 8); } }); context.fillStyle = '#b9d9d0'; context.font = '700 12px system-ui'; context.fillText('LAGUNA DE BAY · 2D MONITORING VIEW', 18, 26); context.font = '11px system-ui'; context.fillStyle = '#86b6aa'; context.fillText(`${this.data.stations.length} stations · ${this.date || '—'}`, 18, 43); }
  pickFlatStation(event) { if (!this.flatStationPoints.length) return; const rect = this.flatMapCanvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const nearest = this.flatStationPoints.reduce((best, point) => { const distance = Math.hypot(point.x - x, point.y - y); return !best || distance < best.distance ? { station: point.station, distance } : best; }, null); if (nearest && nearest.distance <= 18) this.selectStation(nearest.station); }
  setView(mode) { this.viewMode = mode === '2d' ? '2d' : '4d'; const is2d = this.viewMode === '2d'; this.view3dButton.classList.toggle('is-active', !is2d); this.view2dButton.classList.toggle('is-active', is2d); this.view3dButton.setAttribute('aria-pressed', String(!is2d)); this.view2dButton.setAttribute('aria-pressed', String(is2d)); const flatMap = this.ui.querySelector('#reference-map-2d'); const temporalMap = this.ui.querySelector('#reference-map'); flatMap.hidden = !is2d; temporalMap.hidden = is2d; if (is2d) { this.initLeafletMap(); this.renderFlatMap(); requestAnimationFrame(() => { if (this.leafletMap) { this.leafletMap._size = null; this.leafletMap.invalidateSize({ pan: false }); this.leafletMap.setView([14.35, 121.25], 9, { animate: false }); } this.renderLeafletMap(); if (this.selectedStation) this.focusMapOnStation(this.selectedStation); }); } else this.postMapState(); }
  initMap() { const host = this.ui.querySelector('#reference-map'); host.replaceChildren(); this.mapFrame = document.createElement('iframe'); this.mapFrame.title = 'Laguna Lake 4D terrain and station analysis'; this.mapFrame.src = './4D.html?embedded=1&v=tree8'; this.mapFrame.loading = 'eager'; this.mapFrame.addEventListener('load', () => this.postMapState()); host.append(this.mapFrame); }
  postMapState() { this.renderFlatMap(); if (!this.mapFrame?.contentWindow || !this.data || !this.date) return; this.mapFrame.contentWindow.postMessage({ source: 'lakewatch-app', type: 'state', date: this.date, parameter: this.parameter, stations: this.data.stations.map((station) => ({ id: station.id, code: station.code, name: station.name, latitude: Number(station.latitude), longitude: Number(station.longitude), location: station.location, observations: station.observations })), selectedStation: this.selectedStation ? { id: this.selectedStation.id, code: this.selectedStation.code, name: this.selectedStation.name, latitude: this.selectedStation.latitude, longitude: this.selectedStation.longitude, location: this.selectedStation.location } : null }, '*'); }
  toggleMap(visible) { this.setView(visible ? '4d' : '2d'); }
  update(delta = 0) { this.lakeAnalysis.updateLabels(this.camera); if (!this.timePlaying || !this.data?.dates?.length) return; this.timeAccumulator += delta; if (this.timeAccumulator < .85) return; this.timeAccumulator = 0; const nextIndex = (Number(this.timeSlider.value) + 1) % this.data.dates.length; this.setDate(this.data.dates[nextIndex]); }
  dispose() { this.chart?.destroy(); this.mapFrame?.remove(); window.removeEventListener('message', this.on4DMessage); this.lakeAnalysis.stationEntries.forEach(({ label }) => label.remove()); }
}
