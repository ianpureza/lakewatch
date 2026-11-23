import * as THREE from 'three';

const EARTH_RADIUS = 6378137;
const lakeCenter = { longitude: 121.2, latitude: 14.35 };

function project([longitude, latitude]) {
  const latitudeScale = Math.cos(THREE.MathUtils.degToRad(lakeCenter.latitude));
  return new THREE.Vector2(
    THREE.MathUtils.degToRad(longitude - lakeCenter.longitude) * EARTH_RADIUS * latitudeScale,
    THREE.MathUtils.degToRad(latitude - lakeCenter.latitude) * EARTH_RADIUS
  );
}
function ringToShape(ring, scale, center) { return ring.map((coordinate) => project(coordinate).sub(center).multiplyScalar(scale)); }

export class LakeAnalysis {
  constructor(scene) { this.scene = scene; this.group = new THREE.Group(); this.group.name = 'GeographicLagunaLakeAnalysis'; this.group.visible = false; this.active = false; this.scene.add(this.group); this.markerGroup = new THREE.Group(); this.markerGroup.name = 'LagunaLakeMonitoringStations'; this.group.add(this.markerGroup); this.placeholderObjects = ['LagunaLakeTerrainPlaceholder', 'LagunaLakeWaterPlaceholder'].map((name) => scene.getObjectByName(name)).filter(Boolean); this.scale = 1 / 11000; this.modelReady = false; this.bounds = null; this.projectedCenter = new THREE.Vector2(); this.stationEntries = []; this.labelsVisible = true; }
  async load() {
    try { const response = await fetch('../assets/laguna-de-bay.geojson'); if (!response.ok) throw new Error(`Boundary request failed (${response.status})`); const geojson = await response.json(); this.geojson = geojson; this.buildGeoJson(geojson); this.modelReady = true; if (this.active) this.group.visible = true; return { ok: true, source: geojson.licence || 'OpenStreetMap contributors' }; }
    catch (error) { return { ok: false, error }; }
  }
  buildGeoJson(collection) {
    const features = collection.features || [];
    const waterMaterial = new THREE.MeshPhysicalMaterial({ color: 0x3b8b9a, roughness: .22, metalness: .05, transparent: true, opacity: .9, side: THREE.DoubleSide });
    const shoreMaterial = new THREE.MeshStandardMaterial({ color: 0x6e8b63, roughness: .9, side: THREE.DoubleSide });
    const projectedCoordinates = [];
    features.forEach((feature) => {
      const geometry = feature.geometry; if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      polygons.forEach((polygon) => polygon.forEach((ring) => ring.forEach((coordinate) => projectedCoordinates.push(project(coordinate)))));
    });
    if (!projectedCoordinates.length) throw new Error('GeoJSON contains no Polygon or MultiPolygon coordinates');
    const projectedBounds = projectedCoordinates.reduce((box, point) => box.expandByPoint(new THREE.Vector3(point.x, point.y, 0)), new THREE.Box3());
    const center = new THREE.Vector2((projectedBounds.min.x + projectedBounds.max.x) / 2, (projectedBounds.min.y + projectedBounds.max.y) / 2);
    const width = projectedBounds.max.x - projectedBounds.min.x;
    const height = projectedBounds.max.y - projectedBounds.min.y;
    this.scale = Math.min(3.85 / width, 1.95 / height);
    this.bounds = { width, height, center };
    this.projectedCenter.copy(center);
    features.forEach((feature) => {
      const geometry = feature.geometry; if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      polygons.forEach((polygon) => {
        const outer = new THREE.Shape(ringToShape(polygon[0], this.scale, center)); const holes = polygon.slice(1).map((ring) => new THREE.Path(ringToShape(ring, this.scale, center)));
        outer.holes = holes;
        const shapeGeometry = new THREE.ShapeGeometry(outer); shapeGeometry.rotateX(-Math.PI / 2); shapeGeometry.translate(0, 1.38, .15);
        const water = new THREE.Mesh(shapeGeometry, waterMaterial); water.name = 'AccurateLagunaLakeWater'; water.castShadow = true; water.receiveShadow = true; this.group.add(water);
        const shoreGeometry = new THREE.ExtrudeGeometry(outer, { depth: .08, bevelEnabled: false }); shoreGeometry.rotateX(-Math.PI / 2); shoreGeometry.translate(0, 1.29, .15);
        const shore = new THREE.Mesh(shoreGeometry, shoreMaterial); shore.name = 'LagunaLakeShoreline'; shore.castShadow = true; shore.receiveShadow = true; this.group.add(shore);
      });
    });
  }
  show() { this.active = true; this.group.visible = this.modelReady; this.placeholderObjects.forEach((object) => { object.visible = !this.modelReady; }); }
  hide() { this.active = false; this.group.visible = false; this.placeholderObjects.forEach((object) => { object.visible = true; }); }

  projectStation(longitude, latitude) { const point = project([longitude, latitude]).sub(this.projectedCenter).multiplyScalar(this.scale); return new THREE.Vector3(point.x, 1.58, .15 - point.y); }

  setStations(stations, onSelect) {
    this.stationEntries.forEach(({ marker, label }) => { marker.traverse((child) => { if (child.geometry) child.geometry.dispose(); if (child.material) child.material.dispose(); }); this.markerGroup.remove(marker); label.remove(); });
    this.stationEntries = [];
    stations.forEach((station) => {
      const marker = new THREE.Group(); marker.position.copy(this.projectStation(Number(station.longitude), Number(station.latitude))); marker.userData.station = station;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .22, 8), new THREE.MeshStandardMaterial({ color: 0xc8e8df, roughness: .4 })); stem.position.y = -.11;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0x75c6a8, emissive: 0x163f38, roughness: .35 })); dot.userData.station = station;
      marker.add(stem, dot); marker.userData.dot = dot; this.markerGroup.add(marker);
      const label = document.createElement('span'); label.className = 'station-label'; label.textContent = station.code; label.dataset.stationId = station.id; label.hidden = true; document.body.append(label);
      this.stationEntries.push({ station, marker, dot, label });
    });
    this.stationSelectHandler = onSelect;
  }

  updateStationStyles(parameter, date) {
    const values = this.stationEntries.map(({ station }) => Number(station.observations?.[date]?.[parameter])).filter(Number.isFinite);
    const min = values.length ? Math.min(...values) : 0; const max = values.length ? Math.max(...values) : 1;
    this.stationEntries.forEach(({ station, dot }) => { const value = Number(station.observations?.[date]?.[parameter]); const ratio = Number.isFinite(value) && max > min ? (value - min) / (max - min) : null; dot.material.color.set(ratio === null ? 0x6f7e7b : new THREE.Color().setHSL(.52 - (ratio * .46), .62, .56)); dot.scale.setScalar(ratio === null ? .82 : .88 + ratio * .35); });
    return { min, max, count: values.length };
  }

  pickStation(raycaster) { const hit = raycaster.intersectObjects(this.markerGroup.children, true).find((entry) => entry.object.userData.station || entry.object.parent?.userData.station); const station = hit?.object.userData.station || hit?.object.parent?.userData.station; if (station && this.stationSelectHandler) this.stationSelectHandler(station); return station || null; }

  updateLabels(camera) { this.stationEntries.forEach(({ station, marker, label }) => { if (!this.labelsVisible || !this.group.visible) { label.hidden = true; return; } const projected = marker.getWorldPosition(new THREE.Vector3()).project(camera); const visible = projected.z > -1 && projected.z < 1; label.hidden = !visible; if (visible) { label.style.left = `${(projected.x * .5 + .5) * innerWidth}px`; label.style.top = `${(-projected.y * .5 + .5) * innerHeight}px`; label.textContent = station.code; } }); }

  setLabelsVisible(visible) { this.labelsVisible = visible; this.stationEntries.forEach(({ label }) => { label.hidden = !visible; }); }
}
