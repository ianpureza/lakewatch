import * as THREE from 'three';
import { buildOffice } from './OfficeBuilder.js?v=overview16';
import { CollisionSystem } from './CollisionSystem.js';

export class OfficeScene {
  constructor() {
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0xb9d0d0); this.scene.fog = new THREE.Fog(0xb9d0d0, 16, 32);
    this.camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, .05, 80);
    this.collisions = new CollisionSystem(); this.office = buildOffice(this.scene, this.collisions); this.addLighting();
  }
  addLighting() {
    const hemi = new THREE.HemisphereLight(0xe8f5f0, 0x4b514e, 1.65); this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5dd, 2.5); sun.position.set(-4, 7, 5); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); sun.shadow.camera.left = -8; sun.shadow.camera.right = 8; sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8; sun.shadow.bias = -.0002; this.scene.add(sun);
    const fill = new THREE.PointLight(0xf4ead1, 1.15, 11); fill.position.set(0, 2.8, .5); this.scene.add(fill);
  }
  resize(width, height) { this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); }
  update(delta) { this.office?.userData.updateMonitors?.(delta); }
}
