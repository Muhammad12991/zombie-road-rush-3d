/**
 * obstacles.js
 * -----------------------------------------------------------------------
 * In-lane hazards that damage the car on contact: striped barriers,
 * burned-out wreckage, and potholes (flat dark decals). Never zombies —
 * zombies are handled entirely in zombies.js and never harm the car.
 *
 * Note: this.x / this.z stay pure lane/gameplay values for collision —
 * only the rendered mesh gets nudged sideways by curveOffset() so
 * obstacles visually track the (cosmetically) curving road.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

const TYPES = {
    barrier: { damage: 22, halfW: 1.1, halfL: 0.3 },
    wreckage: { damage: 30, halfW: 0.9, halfL: 1.2 },
    pothole: { damage: 14, halfW: 0.8, halfL: 0.8 },
};

function contactShadow(radius) {
    // cheap fake ambient-occlusion disc so obstacles read as sitting ON the
    // road instead of floating above it, regardless of dynamic shadow strength
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 14), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.015;
    return mesh;
}

function buildBarrier() {
    const group = new THREE.Group();
    const mat1 = new THREE.MeshStandardMaterial({ color: 0xd9c34a, roughness: 0.6 });
    const mat2 = new THREE.MeshStandardMaterial({ color: 0x232226, roughness: 0.6 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.35), mat1);
    bar.position.y = 0.5;
    bar.castShadow = true;
    group.add(bar);
    for (let i = -0.9; i <= 0.9; i += 0.4) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.37), mat2);
        stripe.position.set(i, 0.5, 0);
        group.add(stripe);
    }
    const legGeo = new THREE.BoxGeometry(0.12, 0.5, 0.5);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e });
    [-0.9, 0.9].forEach((x) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.25, 0);
        group.add(leg);
    });
    group.add(contactShadow(1.3));
    return group;
}

function buildWreckage() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x241c1a, roughness: 1 });
    const burnMat = new THREE.MeshStandardMaterial({ color: 0x120e0d, emissive: 0x6a1c10, emissiveIntensity: 0.4, roughness: 1 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.4), mat);
    chassis.position.y = 0.25; // flush with ground (half its own height) — was floating ~0.1 units up
    chassis.rotation.y = Math.random() * 0.6 - 0.3;
    chassis.castShadow = true;
    group.add(chassis);
    const scorch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 1.5), burnMat);
    scorch.position.y = 0.575; // sits right on top of the chassis roof
    group.add(scorch);
    group.add(contactShadow(1.5));
    return group;
}

function buildPothole() {
    const group = new THREE.Group();
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 1 });
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 1 });
    // slightly lighter cracked rim first, so the hole reads as a dip in the
    // asphalt rather than a flat black sticker/floating disc
    const rim = new THREE.Mesh(new THREE.CircleGeometry(0.95, 16), rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.005;
    group.add(rim);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.78, 16), holeMat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = -0.02; // slightly recessed for a dent look instead of sitting on top
    group.add(hole);
    return group;
}

class Obstacle {
    constructor(x, z, type) {
        this.x = x;
        this.z = z;
        this.type = type;
        this.def = TYPES[type];
        this.hit = false;
        this.group = type === "barrier" ? buildBarrier() : type === "wreckage" ? buildWreckage() : buildPothole();
        this.group.position.set(x, 0, z);
    }

    get bounds() {
        return { x: this.x, z: this.z, halfW: this.def.halfW, halfL: this.def.halfL };
    }

    update(dt, worldSpeed) {
        this.z += worldSpeed * dt;
        this.group.position.z = this.z;
        this.group.position.x = this.x + curveOffset(this.z);
    }
}

export class ObstacleManager {
    constructor(scene, road) {
        this.scene = scene;
        this.road = road;
        this.list = [];
        this.spawnTimer = 0;
    }

    reset() {
        for (const o of this.list) this.scene.remove(o.group);
        this.list = [];
        this.spawnTimer = 2.4;
    }

    update(dt, difficulty, worldSpeed, farZ) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = Math.max(1.0, 2.8 - difficulty * 0.14) * (0.8 + Math.random() * 0.5);
            this._spawn(difficulty, farZ);
        }
        for (const o of this.list) o.update(dt, worldSpeed);
        this.list = this.list.filter((o) => {
            const gone = o.z > 14;
            if (gone) this.scene.remove(o.group);
            return !gone;
        });
    }

    _spawn(difficulty, farZ) {
        const pool = ["pothole", "barrier"];
        if (difficulty > 2) pool.push("wreckage");
        const type = pool[Math.floor(Math.random() * pool.length)];
        const lane = Math.floor(Math.random() * this.road.laneCount);
        const x = this.road.laneCenterX(lane) + (Math.random() * 0.6 - 0.3);
        const o = new Obstacle(x, farZ, type);
        this.scene.add(o.group);
        this.list.push(o);

        if (difficulty > 4 && Math.random() < 0.22) {
            let lane2 = Math.floor(Math.random() * this.road.laneCount);
            if (lane2 === lane) lane2 = (lane2 + 1) % this.road.laneCount;
            const type2 = pool[Math.floor(Math.random() * pool.length)];
            const o2 = new Obstacle(this.road.laneCenterX(lane2), farZ - 6, type2);
            this.scene.add(o2.group);
            this.list.push(o2);
        }
    }
}