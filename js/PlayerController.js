import * as THREE from 'three';

export class PlayerController {
  constructor(camera, domElement, collisionSystem) {
    this.camera = camera; this.domElement = domElement; this.collisions = collisionSystem;
    this.position = new THREE.Vector3(0, 2.35, 3.45); this.yaw = 0; this.pitch = .12;
    this.walkSpeed = 2.35; this.runSpeed = 4.35; this.radius = .28; this.height = 2.15; this.defaultFov = camera.fov; this.zoomFov = camera.fov;
    this.keys = new Set(); this.enabled = false; this.pointerLocked = false; this.touchActive = false;
    this.isTouchDevice = Boolean(window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || innerWidth <= 700);
    this.touchLookPointerId = null; this.touchLookPoint = new THREE.Vector2(); this.mobileControls = document.querySelector('#mobile-controls'); this.mobileButtonHandlers = [];
    this.onLockChange = () => { this.pointerLocked = this.touchActive || document.pointerLockElement === this.domElement; if (!this.pointerLocked) this.keys.clear(); document.body.classList.toggle('exploring', this.pointerLocked); };
    this.onKeyDown = (event) => { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) this.keys.add(event.code); };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    this.onBlur = () => this.keys.clear(); this.onVisibilityChange = () => { if (document.hidden) this.keys.clear(); };
    this.onMouseMove = (event) => { if (!this.pointerLocked || this.touchActive) return; this.yaw -= event.movementX * .0021; this.pitch -= event.movementY * .0018; this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2.25, Math.PI / 2.25); this.updateCamera(); };
    this.onTouchLookStart = (event) => { if (!this.isTouchDevice || !this.touchActive || !this.enabled || event.pointerType === 'mouse' || event.target.closest?.('.mobile-controls')) return; this.touchLookPointerId = event.pointerId; this.touchLookPoint.set(event.clientX, event.clientY); this.domElement.setPointerCapture?.(event.pointerId); event.preventDefault(); };
    this.onTouchLookMove = (event) => { if (event.pointerId !== this.touchLookPointerId || !this.enabled) return; const dx = event.clientX - this.touchLookPoint.x; const dy = event.clientY - this.touchLookPoint.y; this.touchLookPoint.set(event.clientX, event.clientY); this.yaw -= dx * .004; this.pitch -= dy * .0035; this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2.25, Math.PI / 2.25); this.updateCamera(); event.preventDefault(); };
    this.onTouchLookEnd = (event) => { if (event.pointerId !== this.touchLookPointerId) return; this.touchLookPointerId = null; this.domElement.releasePointerCapture?.(event.pointerId); };
    this.onWheel = (event) => { if (!this.enabled) return; event.preventDefault(); this.zoomFov = THREE.MathUtils.clamp(this.zoomFov + event.deltaY * .08, 46, 96); this.camera.fov = this.zoomFov; this.camera.updateProjectionMatrix(); };
    this.onZoomKey = (event) => { if (!this.enabled || !['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract'].includes(event.code)) return; event.preventDefault(); const direction = event.code === 'Equal' || event.code === 'NumpadAdd' ? -1 : 1; this.zoomFov = THREE.MathUtils.clamp(this.zoomFov + direction * 4, 46, 96); this.camera.fov = this.zoomFov; this.camera.updateProjectionMatrix(); };
    document.addEventListener('pointerlockchange', this.onLockChange);
    document.addEventListener('keydown', this.onKeyDown); document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('keydown', this.onZoomKey);
    window.addEventListener('blur', this.onBlur); document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.domElement.addEventListener('pointerdown', this.onTouchLookStart, { passive: false }); this.domElement.addEventListener('pointermove', this.onTouchLookMove, { passive: false }); this.domElement.addEventListener('pointerup', this.onTouchLookEnd); this.domElement.addEventListener('pointercancel', this.onTouchLookEnd);
    this.bindMobileControls(); this.setTouchControlsVisible(false); this.updateCamera();
  }
  bindMobileControls() {
    this.mobileControls?.querySelectorAll('[data-touch-key]').forEach((button) => {
      const code = button.dataset.touchKey;
      const start = (event) => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); this.keys.add(code); button.classList.add('is-active'); };
      const end = (event) => { event.preventDefault(); this.keys.delete(code); button.classList.remove('is-active'); };
      button.addEventListener('pointerdown', start, { passive: false }); button.addEventListener('pointerup', end, { passive: false }); button.addEventListener('pointercancel', end, { passive: false }); button.addEventListener('lostpointercapture', end, { passive: false });
      this.mobileButtonHandlers.push({ button, start, end });
    });
  }
  setTouchControlsVisible(visible) { if (this.mobileControls) this.mobileControls.hidden = !(visible && this.isTouchDevice && this.touchActive); }
  enable() {
    this.enabled = true;
    if (this.isTouchDevice) { this.touchActive = true; this.pointerLocked = true; document.body.classList.add('exploring'); this.setTouchControlsVisible(true); return; }
    const request = this.domElement.requestPointerLock();
    if (request?.catch) request.catch(() => {});
  }
  update(deltaSeconds) {
    if (!this.enabled || !(this.pointerLocked || this.touchActive)) return;
    const input = new THREE.Vector2((this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0), (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0));
    if (input.lengthSq() === 0) return;
    input.normalize(); const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? this.runSpeed : this.walkSpeed;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const delta = forward.multiplyScalar(-input.y * speed * deltaSeconds).add(right.multiplyScalar(input.x * speed * deltaSeconds));
    this.position.copy(this.collisions.move(this.position, delta, this.radius, this.height)); this.updateCamera();
  }
  updateCamera() { this.camera.position.copy(this.position); this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); }
  dispose() {
    document.removeEventListener('pointerlockchange', this.onLockChange); document.removeEventListener('keydown', this.onKeyDown); document.removeEventListener('keyup', this.onKeyUp); document.removeEventListener('mousemove', this.onMouseMove); document.removeEventListener('wheel', this.onWheel); document.removeEventListener('keydown', this.onZoomKey); window.removeEventListener('blur', this.onBlur); document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.domElement.removeEventListener('pointerdown', this.onTouchLookStart); this.domElement.removeEventListener('pointermove', this.onTouchLookMove); this.domElement.removeEventListener('pointerup', this.onTouchLookEnd); this.domElement.removeEventListener('pointercancel', this.onTouchLookEnd);
    this.mobileButtonHandlers.forEach(({ button, start, end }) => { button.removeEventListener('pointerdown', start); button.removeEventListener('pointerup', end); button.removeEventListener('pointercancel', end); button.removeEventListener('lostpointercapture', end); });
    document.body.classList.remove('exploring');
  }
}
