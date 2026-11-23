import * as THREE from 'three';

const mats = {};
function material(name, color, roughness = .7, metalness = 0) { return mats[name] ||= new THREE.MeshStandardMaterial({ color, roughness, metalness }); }
function cube(group, collisions, name, position, size, mat, solid = true, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.name = name; mesh.position.copy(position); mesh.castShadow = cast; mesh.receiveShadow = true; group.add(mesh);
  if (solid) collisions.addBox(position, new THREE.Vector3(...size), name); return mesh;
}
function cylinder(group, name, position, radius, height, mat) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, height, 20), mat); mesh.name = name; mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh; }
function extrudedShape(group, name, points, position, depth, mat, bevel = .035) {
  const shape = new THREE.Shape(); points.forEach(([x, z], index) => index ? shape.lineTo(x, z) : shape.moveTo(x, z)); shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel }), mat);
  mesh.name = name; mesh.rotation.x = -Math.PI / 2; mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function wallExtrudedShape(group, name, points, position, depth, mat, bevel = .02) {
  const shape = new THREE.Shape(); points.forEach(([z, y], index) => index ? shape.lineTo(z, y) : shape.moveTo(z, y)); shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel }), mat);
  mesh.name = name; mesh.rotation.y = Math.PI / 2; mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function wallLine(group, name, points, position, mat) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([z, y]) => new THREE.Vector3(0, y, z)));
  const line = new THREE.LineLoop(geometry, mat); line.name = name; line.position.copy(position); group.add(line); return line;
}
function lineLoop(group, name, points, y, mat, scale = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale)));
  const line = new THREE.LineLoop(geometry, mat); line.name = name; line.castShadow = true; group.add(line); return line;
}
function applyLagunaMapTexture(displayMaterial) {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 720;
  const context = canvas.getContext('2d'); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; displayMaterial.map = texture; displayMaterial.needsUpdate = true;
  const draw = (geojson) => {
    const coordinates = [];
    (geojson.features || []).forEach((feature) => {
      const geometry = feature.geometry; if (!geometry) return;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
      polygons.forEach((polygon) => polygon[0]?.forEach((coordinate) => coordinates.push(coordinate)));
    });
    const bounds = coordinates.reduce((box, [longitude, latitude]) => ({ minX: Math.min(box.minX, longitude), maxX: Math.max(box.maxX, longitude), minY: Math.min(box.minY, latitude), maxY: Math.max(box.maxY, latitude) }), { minX: 121.05, maxX: 121.48, minY: 14.18, maxY: 14.54 });
    const pad = 105; const sx = (canvas.width - pad * 2) / (bounds.maxX - bounds.minX); const sy = (canvas.height - pad * 2) / (bounds.maxY - bounds.minY); const scale = Math.min(sx, sy);
    const project = ([longitude, latitude]) => [pad + (longitude - bounds.minX) * scale, canvas.height - pad - (latitude - bounds.minY) * scale];
    context.fillStyle = '#e8dfc4'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(90, 116, 102, .24)'; context.lineWidth = 2; for (let x = pad; x < canvas.width - pad; x += 78) { context.beginPath(); context.moveTo(x, pad); context.lineTo(x, canvas.height - pad); context.stroke(); } for (let y = pad; y < canvas.height - pad; y += 78) { context.beginPath(); context.moveTo(pad, y); context.lineTo(canvas.width - pad, y); context.stroke(); }
    const drawPath = (ring, fill, stroke, width) => { context.beginPath(); ring.forEach((coordinate, index) => { const [x, y] = project(coordinate); index ? context.lineTo(x, y) : context.moveTo(x, y); }); context.closePath(); if (fill) { context.fillStyle = fill; context.fill(); } context.strokeStyle = stroke; context.lineWidth = width; context.stroke(); };
    const features = geojson.features || []; features.forEach((feature) => { const geometry = feature.geometry; if (!geometry) return; const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []; polygons.forEach((polygon) => { drawPath(polygon[0], '#5c9ba0', '#294f55', 6); polygon.slice(1).forEach((hole) => drawPath(hole, '#e8dfc4', '#294f55', 3)); }); });
    context.strokeStyle = 'rgba(176, 101, 70, .72)'; context.lineWidth = 4; [[121.1,14.28,121.3,14.4],[121.18,14.2,121.36,14.5],[121.06,14.34,121.43,14.34]].forEach(([a,b,c,d]) => { const start = project([a,b]); const end = project([c,d]); context.beginPath(); context.moveTo(...start); context.lineTo(...end); context.stroke(); });
    context.fillStyle = '#263d3b'; context.font = '700 36px sans-serif'; context.fillText('LAKE WATCH', 46, 58); context.font = '18px sans-serif'; context.fillStyle = '#52645c'; context.fillText('MAGAZINE · ISSUE 01 · LAKE NEWS', 48, 84); context.fillStyle = 'rgba(15,32,33,.84)'; context.fillRect(42, 108, 420, 82); context.fillStyle = '#9BE0C3'; context.font = '700 24px sans-serif'; context.fillText('READ THE LAKE', 62, 142); context.fillStyle = '#F3D48A'; context.font = '16px sans-serif'; context.fillText('Turn the page · press E to open', 62, 169);
    context.fillStyle = '#263d3b'; context.font = '700 24px sans-serif'; context.fillText('N', canvas.width - 75, 62); context.strokeStyle = '#263d3b'; context.lineWidth = 4; context.beginPath(); context.moveTo(canvas.width - 64, 72); context.lineTo(canvas.width - 64, 126); context.stroke(); context.beginPath(); context.moveTo(canvas.width - 64, 72); context.lineTo(canvas.width - 75, 90); context.moveTo(canvas.width - 64, 72); context.lineTo(canvas.width - 53, 90); context.stroke();
    context.fillStyle = 'rgba(232,223,196,.94)'; context.fillRect(42, canvas.height - 90, 360, 48); context.fillStyle = '#294f55'; context.font = '16px sans-serif'; context.fillText('Laguna de Bay · wall edition', 60, canvas.height - 58); context.fillStyle = '#5c9ba0'; context.fillRect(60, canvas.height - 51, 18, 4); context.fillStyle = '#b06546'; context.fillRect(84, canvas.height - 51, 18, 4); context.fillStyle = '#52645c'; context.fillText('lake   shoreline', 114, canvas.height - 43);
    texture.needsUpdate = true;
  };
  context.fillStyle = '#e8dfc4'; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#52645c'; context.font = '700 34px sans-serif'; context.fillText('LAGUNA DE BAY', 46, 58); texture.needsUpdate = true;
  fetch('./assets/laguna-de-bay.geojson').then((response) => response.json()).then(draw).catch(() => {});
}
function applyAccurateTableMap(group) {
  fetch('./assets/laguna-de-bay.geojson').then((response) => response.json()).then((geojson) => {
    const coordinates = []; (geojson.features || []).forEach((feature) => { const geometry = feature.geometry; const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : []; polygons.forEach((polygon) => polygon[0]?.forEach((coordinate) => coordinates.push(coordinate))); });
    if (!coordinates.length) return;
    const bounds = coordinates.reduce((box, [longitude, latitude]) => ({ minX: Math.min(box.minX, longitude), maxX: Math.max(box.maxX, longitude), minY: Math.min(box.minY, latitude), maxY: Math.max(box.maxY, latitude) }), { minX: 121.05, maxX: 121.48, minY: 14.18, maxY: 14.54 });
    const scale = Math.min(3.85 / (bounds.maxX - bounds.minX), 1.95 / (bounds.maxY - bounds.minY)); const project = ([longitude, latitude]) => [(longitude - bounds.minX) * scale - (bounds.maxX - bounds.minX) * scale / 2, -((latitude - bounds.minY) * scale - (bounds.maxY - bounds.minY) * scale / 2)];
    (geojson.features || []).forEach((feature) => { const geometry = feature.geometry; const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : []; polygons.forEach((polygon, polygonIndex) => { const shape = new THREE.Shape(polygon[0].map(project)); shape.holes = polygon.slice(1).map((ring) => new THREE.Path(ring.map(project))); const geometry = new THREE.ExtrudeGeometry(shape, { depth: .045, bevelEnabled: true, bevelSegments: 2, bevelSize: .02, bevelThickness: .02 }); geometry.rotateX(-Math.PI / 2); const water = new THREE.Mesh(geometry, material(`accurate-water-${polygonIndex}`, 0x3b8b9a, .22, .06)); water.name = 'AccurateDioramaLagunaLake'; water.position.set(0, 1.46, .15); water.castShadow = true; water.receiveShadow = true; group.add(water); }); });
    const shoreline = new THREE.LineBasicMaterial({ color: 0xd7c58d, transparent: true, opacity: .95 }); const first = (geojson.features || []).find((feature) => feature.geometry?.type === 'Polygon'); const projectedShoreline = first?.geometry.coordinates[0].map(project) || []; if (first) { const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(projectedShoreline.map(([x, z]) => new THREE.Vector3(x, 1.515, z + .15))), shoreline); line.name = 'AccurateDioramaShoreline'; group.add(line); addMiniatureTrees(group, projectedShoreline, [[-1.95,-.52],[-1.5,-.9],[-.78,-.72],[-.35,-.98],[.25,-.7],[.88,-.82],[1.75,-.48],[1.92,.02],[1.55,.45],[1.1,.7],[.42,.56],[.05,.85],[-.58,.68],[-1.12,.87],[-1.72,.52],[-2.02,.08]]); }
    fetch('./api/monitoring.php?v=csv2', { cache: 'no-store' }).then((response) => response.json()).then((data) => { const pinGroup = new THREE.Group(); pinGroup.name = 'LagunaLakeStationPins'; group.add(pinGroup); const pinMaterial = material('station-pin', 0xe7a84e, .36, .18); const pinHeadMaterial = material('station-pin-head', 0xd85f4f, .32, .12); data.stations?.forEach((station) => { const rawPoint = project([Number(station.longitude), Number(station.latitude)]); const point = projectedShoreline.length && !pointInPolygon(rawPoint, projectedShoreline) ? nearestPointOnRing(rawPoint, projectedShoreline) : rawPoint; const [x, z] = point; const stem = cylinder(pinGroup, `StationPin-${station.id}`, new THREE.Vector3(x, 1.58, z + .15), .026, .22, pinMaterial); stem.userData.station = station; stem.userData.originalCoordinate = { latitude: Number(station.latitude), longitude: Number(station.longitude) }; const head = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 8), pinHeadMaterial); head.name = `StationPinHead-${station.id}`; head.position.set(x, 1.71, z + .15); head.userData.station = station; head.userData.originalCoordinate = stem.userData.originalCoordinate; head.castShadow = true; pinGroup.add(head); }); }).catch(() => {});
  }).catch(() => {});
}
function pointInPolygon(point, polygon) {
  let result = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j]; const crossed = ((yi > point[1]) !== (yj > point[1])) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi; if (crossed) result = !result; } return result;
}
function nearestPointOnRing(point, ring) {
  let nearest = ring[0]; let nearestDistance = Infinity; for (let i = 0; i < ring.length; i += 1) { const a = ring[i]; const b = ring[(i + 1) % ring.length]; const dx = b[0] - a[0]; const dz = b[1] - a[1]; const lengthSquared = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / lengthSquared)); const candidate = [a[0] + dx * t, a[1] + dz * t]; const distance = (candidate[0] - point[0]) ** 2 + (candidate[1] - point[1]) ** 2; if (distance < nearestDistance) { nearest = candidate; nearestDistance = distance; } } return nearest;
}
function addMiniatureTrees(group, shoreline, landBoundary) {
  const inside = (point) => { let result = false; for (let i = 0, j = shoreline.length - 1; i < shoreline.length; j = i++) { const [xi, yi] = shoreline[i]; const [xj, yj] = shoreline[j]; const crossed = ((yi > point[1]) !== (yj > point[1])) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi; if (crossed) result = !result; } return result; };
  const trunk = material('diorama-tree-trunk', 0x75502f, .95); const leaves = [material('diorama-tree-leaves-a', 0x356b4b, .9), material('diorama-tree-leaves-b', 0x4f844d, .9), material('diorama-tree-leaves-c', 0x6e9653, .9)];
  let planted = 0;
  for (let z = -.97; z <= .98 && planted < 58; z += .15) for (let x = -2.02; x <= 2.02 && planted < 58; x += .16) {
    const hash = (Math.sin(x * 31.7 + z * 17.3) + 1) / 2; if (!pointInPolygon([x, z], landBoundary) || inside([x, z])) continue; if (hash < .44) continue;
    const height = .09 + hash * .09; cylinder(group, `DioramaTreeTrunk-${planted}`, new THREE.Vector3(x, 1.43 + height / 2, z + .15), .012, height, trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(.045 + hash * .025, .1 + hash * .06, 7), leaves[planted % leaves.length]); crown.name = `DioramaTreeCrown-${planted}`; crown.position.set(x, 1.52 + height, z + .15); crown.castShadow = true; crown.receiveShadow = true; group.add(crown); planted += 1;
  }
}
function wallMap(group, wallMat, inkMat, accentMat) {
  const board = cube(group, null, 'WallReliefMap', new THREE.Vector3(-5.86, 2.15, -.9), [.045, 1.75, 3.15], wallMat, false, false); board.rotation.y = Math.PI / 2;
  const frame = material('map-frame', 0x42372d, .52);
  [[-5.9, 3.04, -.9, .08, .08, 3.28], [-5.9, 1.26, -.9, .08, .08, 3.28], [-5.9, 2.15, .69, .08, 1.86, .08], [-5.9, 2.15, -2.49, .08, 1.86, .08]].forEach(([x, y, z, sx, sy, sz]) => cube(group, null, 'MapFrame', new THREE.Vector3(x, y, z), [sx, sy, sz], frame, false, false));
  const land = [[-.98, -.52], [-.42, -.78], [.22, -.5], [.48, -.08], [.22, .38], [-.4, .6], [-.9, .34]];
  const lake = [[-.52, -.1], [-.22, -.38], [.2, -.18], [.27, .12], [-.08, .34], [-.4, .25], [-.65, .02]];
  const mapScale = 1.3; const mapY = 2.16;
  wallExtrudedShape(group, 'WallMapLandmass', land.map(([z, x]) => [z * mapScale, x * mapScale]), new THREE.Vector3(-5.88, mapY, -.9), .018, accentMat, .01);
  wallExtrudedShape(group, 'WallMapWater', lake.map(([z, x]) => [z * mapScale, x * mapScale]), new THREE.Vector3(-5.855, mapY + .02, -.9), .012, material('wall-map-water', 0x397b87, .35), .008);
  const contour = new THREE.LineBasicMaterial({ color: 0xa77e4c, transparent: true, opacity: .8 });
  [[-.72, -.4], [-.48, -.18], [-.2, .1], [.12, .28]].forEach(([z, x], i) => { const points = [[z - .18, x - .08], [z + .08, x - .14], [z + .2, x + .05], [z + .02, x + .14]].map(([pointZ, pointY]) => [pointZ * mapScale, pointY * mapScale]); wallLine(group, `WallMapContour${i}`, points, new THREE.Vector3(-5.83, mapY, -.9), contour); });
}
function createCinematicMonitorFeed(office, screenMaterials) {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360; const context = canvas.getContext('2d'); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  screenMaterials.forEach((screenMaterial) => { screenMaterial.map = texture; screenMaterial.color.set(0xffffff); screenMaterial.emissive.set(0x082326); screenMaterial.emissiveIntensity = .35; screenMaterial.needsUpdate = true; });
  const draw = (time) => {
    const t = time * .001; const width = canvas.width; const height = canvas.height; const horizon = 190;
    const sky = context.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, '#071a29'); sky.addColorStop(.58, '#0d3c4a'); sky.addColorStop(1, '#d17855'); context.fillStyle = sky; context.fillRect(0, 0, width, height);
    const glow = context.createRadialGradient(465, 128, 8, 465, 128, 95); glow.addColorStop(0, 'rgba(255,224,153,.9)'); glow.addColorStop(1, 'rgba(255,168,94,0)'); context.fillStyle = glow; context.fillRect(350, 25, 230, 210);
    context.fillStyle = '#123e45'; context.beginPath(); context.moveTo(0, horizon + 18); for (let x = 0; x <= width; x += 32) context.lineTo(x, horizon - 18 - Math.sin(x * .018) * 18 - Math.sin(x * .041) * 9); context.lineTo(width, height); context.lineTo(0, height); context.closePath(); context.fill();
    const water = context.createLinearGradient(0, horizon, 0, height); water.addColorStop(0, '#19758a'); water.addColorStop(1, '#062b3d'); context.fillStyle = water; context.fillRect(0, horizon, width, height - horizon);
    context.globalAlpha = .35; context.strokeStyle = '#8de0d1'; context.lineWidth = 2; for (let row = 0; row < 15; row++) { const y = horizon + 18 + row * 10 + Math.sin(t * 1.4 + row) * 3; context.beginPath(); for (let x = -20; x < width + 20; x += 24) context.lineTo(x, y + Math.sin(x * .035 + t * 2 + row) * 3); context.stroke(); } context.globalAlpha = 1;
    const stations = [[155,236],[245,218],[332,251],[420,228],[505,263]]; stations.forEach(([x, y], index) => { const pulse = 4 + Math.sin(t * 3 + index) * 2; context.strokeStyle = 'rgba(117,231,205,.45)'; context.beginPath(); context.arc(x, y, pulse + 7, 0, Math.PI * 2); context.stroke(); context.fillStyle = index === 2 ? '#f3d48a' : '#75e6d1'; context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill(); });
    context.fillStyle = 'rgba(4,18,28,.68)'; context.fillRect(18, 18, 260, 50); context.fillStyle = '#8fe6d2'; context.font = '700 18px monospace'; context.fillText('LAGUNA DE BAY', 32, 42); context.fillStyle = '#d8eee7'; context.font = '12px monospace'; context.fillText('LIVE CINEMATIC MONITORING FEED', 32, 59); context.fillStyle = '#f3d48a'; context.font = '700 13px monospace'; context.fillText(`4D / ${new Date().toISOString().slice(11, 19)} UTC`, width - 190, 30);
    context.fillStyle = '#75e6d1'; context.fillRect(0, height - 8, width * ((t % 12) / 12), 3); context.fillStyle = 'rgba(171,255,232,.14)'; for (let y = 0; y < height; y += 6) context.fillRect(0, y, width, 1); texture.needsUpdate = true;
  };
  draw(0); office.userData.updateMonitors = (delta) => { office.userData.monitorTime = (office.userData.monitorTime || 0) + delta * 1000; draw(office.userData.monitorTime); };
}

export function buildOffice(scene, collisions) {
  const office = new THREE.Group(); office.name = 'ResearchOffice'; scene.add(office);
  const floor = material('floor', 0x9faeaa, .82); const wall = material('wall', 0xd9ddd5, .9); const wood = material('walnut', 0x654d3a, .58); const dark = material('metal', 0x263235, .3, .72); const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fc8ca, roughness: .12, metalness: .05, transmission: .18, transparent: true, opacity: .55 }); const green = material('model-land', 0x597a56, .9); const water = new THREE.MeshPhysicalMaterial({ color: 0x397b87, roughness: .16, metalness: .08, transmission: .12 });
  cube(office, collisions, 'Floor', new THREE.Vector3(0, -.08, 0), [12, .16, 9], floor, false, false);
  cube(office, collisions, 'BackWall', new THREE.Vector3(0, 1.6, -4.5), [12, 3.2, .16], wall);
  cube(office, collisions, 'LeftWall', new THREE.Vector3(-6, 1.6, 0), [.16, 3.2, 9], wall);
  cube(office, collisions, 'RightWall', new THREE.Vector3(6, 1.6, 0), [.16, 3.2, 9], wall);
  cube(office, collisions, 'FrontWall', new THREE.Vector3(0, 1.6, 4.5), [12, 3.2, .16], wall);
  cube(office, collisions, 'Ceiling', new THREE.Vector3(0, 3.25, 0), [12, .12, 9], wall, false, false);
  [-3.55, -.95, 1.65, 4.25].forEach((x) => { const pane = cube(office, collisions, 'Window', new THREE.Vector3(x, 2.1, -4.39), [2.25, 1.65, .035], glass, false, false); pane.castShadow = false; });
  [-2.4, 0.3, 3.0].forEach(x => cube(office, collisions, 'WindowMullion', new THREE.Vector3(x, 2.1, -4.32), [.08, 1.8, .08], dark, false));
  cube(office, collisions, 'ResearchTableTop', new THREE.Vector3(0, .92, .15), [4.8, .22, 2.35], wood);
  cube(office, collisions, 'TableInset', new THREE.Vector3(0, 1.045, .15), [4.35, .035, 1.9], material('map-paper', 0xc4a978, .95), false, false);
  [-1.95, 1.95].forEach(x => [-.72, 1.02].forEach(z => cylinder(office, 'TableLeg', new THREE.Vector3(x, .43, z), .11, .82, dark)));
  const diorama = new THREE.Group(); diorama.name = 'LagunaLakeDiorama'; diorama.position.set(0, .2, 0); diorama.scale.setScalar(.84); office.add(diorama);
  const landShape = [[-1.95,-.52],[-1.5,-.9],[-.78,-.72],[-.35,-.98],[.25,-.7],[.88,-.82],[1.75,-.48],[1.92,.02],[1.55,.45],[1.1,.7],[.42,.56],[.05,.85],[-.58,.68],[-1.12,.87],[-1.72,.52],[-2.02,.08]];
  const outer = extrudedShape(diorama, 'LagunaLakeTerrainPlaceholder', landShape, new THREE.Vector3(0, .98, .15), .28, material('terrain-sand', 0x9b825d, .95), .06);
  extrudedShape(diorama, 'TerrainGreenRelief', landShape.map(([x,z]) => [x * .95, z * .9]), new THREE.Vector3(0, 1.25, .15), .18, green, .045);
  const highland = [[-1.25,-.45],[-.8,-.6],[-.3,-.37],[-.12,.2],[-.52,.48],[-1.18,.35],[-1.55,.02]];
  const ridge = extrudedShape(diorama, 'RaisedTerrainRidge', highland, new THREE.Vector3(-.05, 1.4, .2), .14, material('terrain-ridge', 0x6e875b, .88), .035);
  ridge.scale.set(1, 1, .82);
  const lakeShape = [[-1.35,-.08],[-1.05,-.4],[-.52,-.37],[-.18,-.12],[.18,-.25],[.7,-.08],[1.18,.18],[1.05,.42],[.55,.48],[.2,.27],[-.18,.5],[-.58,.33],[-.92,.48],[-1.28,.28]];
  const lake = extrudedShape(diorama, 'LagunaLakeWaterPlaceholder', lakeShape, new THREE.Vector3(.06, 1.46, .11), .035, water, .025);
  const contour = new THREE.LineBasicMaterial({ color: 0x486446, transparent: true, opacity: .7 });
  [[.92,.82],[.78,.68],[.62,.54]].forEach((scale, index) => lineLoop(diorama, `TerrainContour${index}`, landShape, 1.44 + index * .035, contour, scale[0]));
  const shoreline = new THREE.LineBasicMaterial({ color: 0xb9d18b, transparent: true, opacity: .9 }); lineLoop(diorama, 'LakeShoreline', lakeShape, 1.505, shoreline);
  const mapLabel = material('map-label', 0x433b30, .95); const label = cube(diorama, null, 'DioramaLabel', new THREE.Vector3(.0, 1.53, 1.0), [.8, .025, .08], mapLabel, false, false); label.rotation.y = -.08;
  const compass = cylinder(diorama, 'CompassRose', new THREE.Vector3(-1.65, 1.53, .9), .19, .025, material('compass', 0xf0e0b5, .6)); const needle = cube(diorama, null, 'CompassNeedle', new THREE.Vector3(-1.65, 1.56, .9), [.025, .02, .28], material('needle', 0xb3473d, .45), false, false); needle.rotation.y = -.72;
  const hotspot = new THREE.Mesh(new THREE.BoxGeometry(3.9, .7, 1.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: .001, depthWrite: false })); hotspot.name = 'LakeAnalysisHotspot'; hotspot.position.set(0, 1.34, .15); diorama.add(hotspot);
  applyAccurateTableMap(diorama);
  wallMap(office, material('map-board', 0xe8d9b6, .96), material('map-ink', 0x273f3d, .75), material('map-land', 0x75936d, .9));
  cube(office, collisions, 'WorkstationDesk', new THREE.Vector3(-3.85, .82, 2.95), [3.25, .14, 1.05], wood);
  cube(office, collisions, 'WorkstationPedestal', new THREE.Vector3(-3.85, .4, 3.12), [1.1, .72, .72], dark);
  const screenMaterials = []; [-4.45, -3.25].forEach((x, i) => { cube(office, collisions, `Monitor${i + 1}`, new THREE.Vector3(x, 1.54, 2.94), [.9, .58, .06], dark, true); const screenMaterial = material(`screen${i}`, i ? 0x2e7777 : 0x356b72, .28, .12); screenMaterials.push(screenMaterial); cube(office, collisions, `MonitorScreen${i + 1}`, new THREE.Vector3(x, 1.54, 2.9), [.72, .4, .018], screenMaterial, false, false); cube(office, collisions, 'MonitorStand', new THREE.Vector3(x, 1.14, 2.94), [.08, .28, .08], dark, false); });
  createCinematicMonitorFeed(office, screenMaterials);
  cube(office, collisions, 'DisplayFrame', new THREE.Vector3(3.7, 2.22, -4.28), [3.25, 1.42, .12], dark, true);
  const displayMaterial = material('display', 0x23474a, .3, .12); cube(office, collisions, 'MonitoringDisplay', new THREE.Vector3(3.7, 2.22, -4.2), [2.92, 1.1, .025], displayMaterial, false, false); applyLagunaMapTexture(displayMaterial);
  for (let i = 0; i < 5; i++) cube(office, collisions, 'DisplayGraph', new THREE.Vector3(2.7 + i * .4, 2.13 + (i % 2) * .16, -4.17), [.22, .08 + (i % 3) * .1, .02], material('graph', 0x78c9ad, .35), false, false);
  for (let i = 0; i < 3; i++) cube(office, collisions, 'StorageCabinet', new THREE.Vector3(-4.55, .9 + i * .72, -.8), [1.25, .62, 1.25], i === 1 ? wood : dark);
  cube(office, collisions, 'Door', new THREE.Vector3(5.9, 1.35, -2.45), [.08, 2.7, 1.35], wood);
  cube(office, collisions, 'OfficeSign', new THREE.Vector3(5.82, 2.7, -2.45), [.025, .3, .95], material('sign', 0x75c6a8, .5), false, false);
  cylinder(office, 'PlantPot', new THREE.Vector3(4.7, .28, 3.35), .32, .56, dark);
  for (let i = 0; i < 6; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 8), green); leaf.scale.set(.5, 1.7, .5); leaf.position.set(4.7 + Math.cos(i) * .28, .78 + (i % 2) * .12, 3.35 + Math.sin(i) * .28); leaf.castShadow = true; office.add(leaf); }
  [-3.2, 0, 3.2].forEach(x => cube(office, collisions, 'CeilingLight', new THREE.Vector3(x, 3.12, 1.8), [1.8, .04, .32], material('light', 0xf7f1d8, .22), false, false));
  return office;
}
