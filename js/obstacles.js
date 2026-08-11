/**
 * obstacles.js
 * -----------------------------------------------------------------------
 * In-lane hazards: striped barriers, burned wreckage, potholes, cones,
 * T-barriers, open manholes, fire barrels, and smoking TREE TRUNKS (fallen logs).
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

const TYPES = {
    cone: { damage: 10, halfW: 0.4, halfL: 0.4 },
    pothole: { damage: 14, halfW: 0.8, halfL: 0.8 },
    tree_trunk: { damage: 20, halfW: 1.1, halfL: 0.5 },
    barrier: { damage: 22, halfW: 1.1, halfL: 0.3 },
    t_barrier: { damage: 26, halfW: 1.4, halfL: 0.5 },
    manhole: { damage: 20, halfW: 0.7, halfL: 0.7 },
    fire_barrel: { damage: 28, halfW: 0.8, halfL: 0.8 },
    wreckage: { damage: 32, halfW: 1.0, halfL: 1.3 },
};

function contactShadow(radius) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 14), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.015;
    return mesh;
}

function buildCone() {
    const group = new THREE.Group();
    const orangeMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        roughness: 0.3,
        emissive: 0xff3300,
        emissiveIntensity: 0.6
    });
    const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), orangeMat);
    base.position.y = 0.04;
    group.add(base);

    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.28, 0.7, 12), orangeMat);
    cone.position.y = 0.39;
    cone.castShadow = true;
    group.add(cone);

    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 0.18, 12), whiteMat);
    stripe.position.y = 0.38;
    group.add(stripe);

    group.add(contactShadow(0.5));
    return group;
}

function buildTreeTrunk() {
    const group = new THREE.Group();

    // Realistic Bark & Cut Wood Materials
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 }); // Rough Tree Bark
    const innerWoodMat = new THREE.MeshStandardMaterial({
        color: 0x8c6239,
        roughness: 0.8,
        emissive: 0xd97724,
        emissiveIntensity: 0.3 // Smoldering Wood Rings Glow
    });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x2e4218, roughness: 0.9 });

    // Main Fallen Tree Log (Lying Horizontally Across Lane)
    const logGeo = new THREE.CylinderGeometry(0.38, 0.42, 2.3, 12);
    const log = new THREE.Mesh(logGeo, barkMat);
    log.rotation.z = Math.PI / 2; // Lie flat across the road
    log.rotation.y = Math.random() * 0.3 - 0.15; // Natural slight tilt
    log.position.y = 0.38;
    log.castShadow = true;
    group.add(log);

    // Inner Rings Cut Ends (Left & Right Ends of Log)
    const endGeo = new THREE.CircleGeometry(0.38, 12);

    const endL = new THREE.Mesh(endGeo, innerWoodMat);
    endL.position.set(-1.15, 0.38, 0);
    endL.rotation.y = -Math.PI / 2;
    group.add(endL);

    const endR = new THREE.Mesh(endGeo, innerWoodMat);
    endR.position.set(1.15, 0.38, 0);
    endR.rotation.y = Math.PI / 2;
    group.add(endR);

    // Broken Moss / Branch Stump detail on Log
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.4, 8), mossMat);
    stump.position.set(0.3, 0.65, 0.1);
    stump.rotation.x = 0.4;
    group.add(stump);

    // High Visibility Amber Point Light for Smoldering Log
    const glowLight = new THREE.PointLight(0xff7700, 1.4, 4.5);
    glowLight.position.set(0, 0.8, 0);
    group.add(glowLight);

    // Rising Smoldering Smoke System
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.5 });
    const smokePuffs = [];

    for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18 + i * 0.05, 8, 8), smokeMat);
        puff.position.set((Math.random() - 0.5) * 1.2, 0.7 + i * 0.3, (Math.random() - 0.5) * 0.3);
        group.add(puff);
        smokePuffs.push(puff);
    }

    group.add(contactShadow(1.4));

    return { group, smokePuffs };
}

function buildBarrier() {
    const group = new THREE.Group();
    const mat1 = new THREE.MeshStandardMaterial({
        color: 0xd9c34a,
        roughness: 0.5,
        emissive: 0xcca300,
        emissiveIntensity: 0.5
    });
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

    const glowLight = new THREE.PointLight(0xffcc00, 1.0, 3.5);
    glowLight.position.set(0, 0.8, 0);
    group.add(glowLight);

    group.add(contactShadow(1.3));
    return group;
}

function buildTBarrier() {
    const group = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x555558, roughness: 0.9 });
    const redGlowMat = new THREE.MeshStandardMaterial({
        color: 0xcc2222,
        roughness: 0.5,
        emissive: 0xff0000,
        emissiveIntensity: 0.7
    });

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 0.4), redGlowMat);
    topBeam.position.y = 0.8;
    topBeam.castShadow = true;
    group.add(topBeam);

    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.4), concreteMat);
    stem.position.y = 0.4;
    stem.castShadow = true;
    group.add(stem);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 0.8), concreteMat);
    foot.position.y = 0.1;
    group.add(foot);

    const glowLight = new THREE.PointLight(0xff1100, 1.2, 4);
    glowLight.position.set(0, 1.0, 0);
    group.add(glowLight);

    group.add(contactShadow(1.6));
    return group;
}

function buildOpenManhole() {
    const group = new THREE.Group();
    const neonRimMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00c8ff,
        emissiveIntensity: 0.9,
        roughness: 0.3
    });
    const abyssMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const rim = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 18), neonRimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01;
    group.add(rim);

    const pit = new THREE.Mesh(new THREE.CircleGeometry(0.5, 18), abyssMat);
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = 0.005;
    group.add(pit);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 16), neonRimMat);
    lid.position.set(0.65, 0.04, 0.3);
    lid.rotation.z = 0.15;
    group.add(lid);

    return group;
}

function buildFireBarrel() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2b2523, roughness: 0.7, metalness: 0.5 });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 14), metalMat);
    barrel.position.y = 0.55;
    barrel.castShadow = true;
    group.add(barrel);

    const fireCore = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), fireMat);
    fireCore.position.y = 1.0;
    group.add(fireCore);

    const fireLight = new THREE.PointLight(0xff6600, 2.2, 7);
    fireLight.position.y = 1.2;
    group.add(fireLight);

    group.add(contactShadow(0.9));
    return group;
}

function buildWreckage() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x241c1a, roughness: 1 });
    const burnMat = new THREE.MeshStandardMaterial({
        color: 0x120e0d,
        emissive: 0xff3300,
        emissiveIntensity: 0.9,
        roughness: 0.8
    });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.4), mat);
    chassis.position.y = 0.25;
    chassis.rotation.y = Math.random() * 0.6 - 0.3;
    chassis.castShadow = true;
    group.add(chassis);

    const scorch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 1.5), burnMat);
    scorch.position.y = 0.575;
    group.add(scorch);

    const glowLight = new THREE.PointLight(0xff2200, 1.3, 4.5);
    glowLight.position.set(0, 0.7, 0);
    group.add(glowLight);

    group.add(contactShadow(1.5));
    return group;
}

function buildPothole() {
    const group = new THREE.Group();
    const neonRimMat = new THREE.MeshStandardMaterial({
        color: 0xff0055,
        emissive: 0xff0055,
        emissiveIntensity: 0.8,
        roughness: 0.5
    });
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 1 });

    const rim = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.95, 16), neonRimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.005;
    group.add(rim);

    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.78, 16), holeMat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = -0.02;
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
        this.smokePuffs = null;

        if (type === "tree_trunk") {
            const res = buildTreeTrunk();
            this.group = res.group;
            this.smokePuffs = res.smokePuffs;
        } else {
            switch (type) {
                case "cone":
                    this.group = buildCone();
                    break;
                case "barrier":
                    this.group = buildBarrier();
                    break;
                case "t_barrier":
                    this.group = buildTBarrier();
                    break;
                case "manhole":
                    this.group = buildOpenManhole();
                    break;
                case "fire_barrel":
                    this.group = buildFireBarrel();
                    break;
                case "wreckage":
                    this.group = buildWreckage();
                    break;
                default:
                    this.group = buildPothole();
                    break;
            }
        }

        this.group.position.set(x, 0, z);
    }

    get bounds() {
        return { x: this.x, z: this.z, halfW: this.def.halfW, halfL: this.def.halfL };
    }

    update(dt, worldSpeed) {
        this.z += worldSpeed * dt;
        this.group.position.z = this.z;
        this.group.position.x = this.x + curveOffset(this.z);

        // Smoke Rising Effect for Tree Trunks
        if (this.smokePuffs) {
            this.smokePuffs.forEach((puff, idx) => {
                puff.position.y += dt * (0.8 + idx * 0.2);
                puff.scale.addScalar(dt * 0.3);
                puff.material.opacity -= dt * 0.3;

                if (puff.position.y > 1.8 || puff.material.opacity <= 0) {
                    puff.position.y = 0.7;
                    puff.scale.set(1, 1, 1);
                    puff.material.opacity = 0.5;
                }
            });
        }
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
        this.spawnTimer = 1.2;
    }

    update(dt, difficulty, worldSpeed, farZ) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = Math.max(0.65, 2.2 - difficulty * 0.15) * (0.7 + Math.random() * 0.4);
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
        const pool = ["tree_trunk", "tree_trunk", "cone", "pothole", "barrier"];
        if (difficulty > 1) pool.push("manhole");
        if (difficulty > 2) pool.push("t_barrier", "fire_barrel");
        if (difficulty > 4) pool.push("wreckage");

        const type = pool[Math.floor(Math.random() * pool.length)];
        const lane = Math.floor(Math.random() * this.road.laneCount);
        const x = this.road.laneCenterX(lane) + (Math.random() * 0.4 - 0.2);
        const o = new Obstacle(x, farZ, type);
        this.scene.add(o.group);
        this.list.push(o);

        if (difficulty > 2 && Math.random() < 0.35) {
            let lane2 = Math.floor(Math.random() * this.road.laneCount);
            if (lane2 === lane) lane2 = (lane2 + 1) % this.road.laneCount;
            const type2 = pool[Math.floor(Math.random() * pool.length)];
            const o2 = new Obstacle(this.road.laneCenterX(lane2), farZ - 7, type2);
            this.scene.add(o2.group);
            this.list.push(o2);
        }
    }
}