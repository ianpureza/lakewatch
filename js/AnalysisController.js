import * as THREE from 'three';

export class AnalysisController {
  constructor(camera, domElement, lakeAnalysis) {
    this.camera = camera; this.domElement = domElement; this.lakeAnalysis = lakeAnalysis; this.state = 'EXPLORING'; this.saved = null; this.transition = null; this.orbit = { yaw: 0, pitch: .9, distance: 6.2 }; this.dragging = false; this.lastPointer = new THREE.Vector2();
    this.onPointerDown = (event) => { if (this.state !== 'ANALYZING') return; this.dragging = true; this.domElement.setPointerCapture?.(event.pointerId); this.lastPointer.set(event.clientX, event.clientY); };
    this.onPointerUp = (event) => { this.dragging = false; this.domElement.releasePointerCapture?.(event.pointerId); };
    this.onPointerMove = (event) => { if (!this.dragging || this.state !== 'ANALYZING') return; this.orbit.yaw -= (event.clientX - this.lastPointer.x) * .008; this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch + (event.clientY - this.lastPointer.y) * .008, .25, 1.45); this.lastPointer.set(event.clientX, event.clientY); this.applyOrbit(); };
    this.onWheel = (event) => { if (this.state !== 'ANALYZING') return; event.preventDefault(); this.orbit.distance = THREE.MathUtils.clamp(this.orbit.distance + event.deltaY * .008, 3.4, 10); this.applyOrbit(); };
    this.onKeyDown = (event) => { if (this.state !== 'ANALYZING') return; const step = event.shiftKey ? .18 : .06; if (event.code === 'ArrowLeft') this.orbit.yaw += step; else if (event.code === 'ArrowRight') this.orbit.yaw -= step; else if (event.code === 'ArrowUp') this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch - step, .25, 1.45); else if (event.code === 'ArrowDown') this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch + step, .25, 1.45); else return; event.preventDefault(); this.applyOrbit(); };
    domElement.tabIndex = 0;
    domElement.addEventListener('keydown', this.onKeyDown);
    domElement.addEventListener('pointerdown', this.onPointerDown); domElement.addEventListener('pointerup', this.onPointerUp); domElement.addEventListener('pointermove', this.onPointerMove); domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }
  enter() { if (this.state !== 'EXPLORING') return false; this.saved = { position: this.camera.position.clone(), quaternion: this.camera.quaternion.clone() }; this.state = 'ENTERING_ANALYSIS'; this.lakeAnalysis.show(); this.orbit = { yaw: 0, pitch: .88, distance: 5.8 }; const target = this.orbitPosition(); this.transition = { elapsed: 0, duration: 1, fromPosition: this.saved.position.clone(), fromQuaternion: this.saved.quaternion.clone(), toPosition: target, toQuaternion: this.lookQuaternion(target) }; return true; }
  update(delta) { if (!this.transition) return; this.transition.elapsed += delta; const t = THREE.MathUtils.smootherstep(Math.min(this.transition.elapsed / this.transition.duration, 1), 0, 1); this.camera.position.lerpVectors(this.transition.fromPosition, this.transition.toPosition, t); this.camera.quaternion.slerpQuaternions(this.transition.fromQuaternion, this.transition.toQuaternion, t); if (t >= 1) { this.transition = null; this.state = 'ANALYZING'; } }
  orbitPosition() { return new THREE.Vector3(Math.sin(this.orbit.yaw) * this.orbit.distance, 1.8 + Math.sin(this.orbit.pitch) * this.orbit.distance, .15 + Math.cos(this.orbit.yaw) * this.orbit.distance * .82); }
  lookQuaternion(position) { const target = new THREE.Object3D(); target.position.copy(position); target.lookAt(new THREE.Vector3(0, 1.3, .15)); return target.quaternion.clone(); }
  applyOrbit() { if (this.state !== 'ANALYZING') return; const position = this.orbitPosition(); this.camera.position.copy(position); this.camera.quaternion.copy(this.lookQuaternion(position)); }
  reset() { this.orbit = { yaw: 0, pitch: .88, distance: 5.8 }; this.applyOrbit(); }
  exit() { if (this.state === 'EXPLORING') return; this.state = 'EXITING_ANALYSIS'; this.lakeAnalysis.hide(); if (this.saved) { this.camera.position.copy(this.saved.position); this.camera.quaternion.copy(this.saved.quaternion); } this.transition = null; this.state = 'EXPLORING'; }
  dispose() { this.domElement.removeEventListener('pointerdown', this.onPointerDown); this.domElement.removeEventListener('pointerup', this.onPointerUp); this.domElement.removeEventListener('pointermove', this.onPointerMove); this.domElement.removeEventListener('wheel', this.onWheel); this.domElement.removeEventListener('keydown', this.onKeyDown); }
}
