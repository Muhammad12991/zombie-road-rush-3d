/**
 * fuel.js
 * -----------------------------------------------------------------------
 * Fuel canister pickups. Fuel drains continuously during play; these
 * restore it. Spawn rate is deliberately generous but finite so route
 * planning still matters as difficulty climbs.
 *
 * Note: this.x / this.z stay pure lane/gameplay values for collision —
 * only the rendered mesh gets nudged sideways by curveOffset() so
 * canisters visually track the (cosmetically) curving road.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

function buildCanister() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd98f30, roughness: 0.4, metalness: 0.3, emissive: 0x552d0d, emissiveIntensity: 0.3 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xa86a1f, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10), mat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), capMat);
    cap.position.y = 0.86;
    group.add(cap);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 10), capMat);
    handle.position.y = 0.98;
    handle.rotation.x = Math.PI / 2;
    group.add(handle);
    return group;
}

class FuelTank {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.group = buildCanister();
        this.group.position.set(x, 0, z);
    }

    get bounds() { return { x: this.x, z: this.z, halfW: 0.4, halfL: 0.4 }; }

    update(dt, worldSpeed) {
        this.z += worldSpeed * dt;
        this.bobPhase += dt * 3.5;
        this.group.position.set(this.x + curveOffset(this.z), 0.15 + Math.sin(this.bobPhase) * 0.08, this.z);
        this.group.rotation.y += dt * 1.4;
    }
}

export class FuelManager {
    constructor(scene, road) {
        this.scene = scene;
        this.road = road;
        this.list = [];
        this.spawnTimer = 0;
    }

    reset() {
        for (const f of this.list) this.scene.remove(f.group);
        this.list = [];
        this.spawnTimer = 3;
    }

    update(dt, difficulty, worldSpeed, farZ) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = Math.min(3 + difficulty * 0.9, 14) * (0.8 + Math.random() * 0.5);
            const lane = Math.floor(Math.random() * this.road.laneCount);
            const f = new FuelTank(this.road.laneCenterX(lane), farZ);
            this.scene.add(f.group);
            this.list.push(f);
        }
        for (const f of this.list) f.update(dt, worldSpeed);
        this.list = this.list.filter((f) => {
            const gone = f.z > 14;
            if (gone) this.scene.remove(f.group);
            return !gone;
        });
    }

    remove(f) {
        this.scene.remove(f.group);
        this.list.splice(this.list.indexOf(f), 1);
    }
}