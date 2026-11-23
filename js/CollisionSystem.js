import * as THREE from 'three';

export class CollisionSystem {
  constructor() { this.boxes = []; }
  addBox(center, size, label = 'solid') {
    const box = new THREE.Box3().setFromCenterAndSize(center.clone(), size.clone());
    this.boxes.push({ box, label });
    return box;
  }
  canOccupy(position, radius, height = 1.7) {
    const player = new THREE.Box3(
      new THREE.Vector3(position.x - radius, position.y - height / 2, position.z - radius),
      new THREE.Vector3(position.x + radius, position.y + height / 2, position.z + radius)
    );
    return !this.boxes.some(({ box }) => player.intersectsBox(box));
  }
  move(position, delta, radius, height) {
    const next = position.clone();
    next.x += delta.x;
    if (!this.canOccupy(next, radius, height)) next.x = position.x;
    next.z += delta.z;
    if (!this.canOccupy(next, radius, height)) next.z = position.z;
    return next;
  }
}
