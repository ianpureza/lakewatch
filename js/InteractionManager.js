import * as THREE from 'three';

export class InteractionManager {
  constructor(camera, scene, promptElement) {
    this.camera = camera; this.scene = scene; this.promptElement = promptElement; this.raycaster = new THREE.Raycaster(); this.registry = new Map(); this.enabled = true; this.target = null; this.lastTarget = null; this.isTouchDevice = Boolean(window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || innerWidth <= 700);
    this.onKeyDown = (event) => { if (event.code === 'KeyE' && !event.repeat) this.interact(); };
    document.addEventListener('keydown', this.onKeyDown);
  }
  interact() { if (this.enabled && this.target?.entry.onInteract) this.target.entry.onInteract(); }
  register({ id, object3D, label, maxDistance = 2, enabled = true, onInteract }) { this.registry.set(id, { id, object3D, label, maxDistance, enabled, onInteract }); return () => this.unregister(id); }
  unregister(id) { this.registry.delete(id); if (this.target?.entry.id === id) this.clearTarget(); }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.clearTarget(); }
  update() {
    if (!this.enabled) return;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);
    const hit = intersections.map((intersection) => ({ intersection, entry: [...this.registry.values()].find((candidate) => candidate.enabled && candidate.object3D && (intersection.object === candidate.object3D || candidate.object3D.getObjectById(intersection.object.id))) })).find(({ intersection, entry }) => entry && intersection.distance <= entry.maxDistance);
    const nearest = hit?.intersection; const entry = hit?.entry;
    if (!nearest || !entry) { this.clearTarget(); return; }
    if (this.target?.entry.id !== entry.id) this.clearTarget();
    this.target = { entry, mesh: nearest.object }; this.highlight(nearest.object); this.showPrompt(entry.label);
  }
  showPrompt(label) { this.promptElement.innerHTML = `<kbd>${this.isTouchDevice ? 'Tap' : 'E'}</kbd> ${label}`; this.promptElement.hidden = false; }
  highlight(mesh) {
    if (!mesh?.material || mesh.userData.lakeWatchHighlight) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const highlighted = materials.map((material) => material.clone());
    mesh.userData.lakeWatchHighlight = { original: mesh.material, highlighted };
    mesh.material = Array.isArray(mesh.material) ? highlighted : highlighted[0];
    for (const material of highlighted) if (material.emissive) material.emissive.setHex(0x285c4d);
  }
  clearTarget() {
    if (this.target?.mesh?.userData.lakeWatchHighlight) { const state = this.target.mesh.userData.lakeWatchHighlight; this.target.mesh.material = state.original; state.highlighted.forEach((material) => material.dispose()); delete this.target.mesh.userData.lakeWatchHighlight; }
    this.target = null; this.promptElement.hidden = true;
  }
  dispose() { document.removeEventListener('keydown', this.onKeyDown); this.registry.clear(); this.clearTarget(); }
}
