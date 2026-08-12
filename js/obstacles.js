/**
 * obstacles.js
 * -----------------------------------------------------------------------
 * In-lane hazards: striped barriers, burned wreckage, cones,
 * T-barriers, TRASH CANS (overflowing with odor FX), fire barrels, and smoking TREE TRUNKS.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

const TYPES = {
    cone: { damage: 10, halfW: 0.4, halfL: 0.4 },
    tree_trunk: { damage: 20, halfW: 1.1, halfL: 0.5 },
    barrier: { damage: 22, halfW: 1.1, halfL: 0.3 },
    t_barrier: { damage: 26, halfW: 1.4, halfL: 0.5 },
    trash_can: { damage: 18, halfW: 0.65, halfL: 0.65 },
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

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 });
    const innerWoodMat = new THREE.MeshStandardMaterial({
        color: 0x8c6239,
        roughness: 0.8,
        emissive: 0xd97724,
        emissiveIntensity: 0.3
    });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x2e4218, roughness: 0.9 });

    const logGeo = new THREE.CylinderGeometry(0.38, 0.42, 2.3, 12);
    const log = new THREE.Mesh(logGeo, barkMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = Math.random() * 0.3 - 0.15;
    log.position.y = 0.38;
    log.castShadow = true;
    group.add(log);

    const endGeo = new THREE.CircleGeometry(0.38, 12);

    const endL = new THREE.Mesh(endGeo, innerWoodMat);
    endL.position.set(-1.15, 0.38, 0);
    endL.rotation.y = -Math.PI / 2;
    group.add(endL);

    const endR = new THREE.Mesh(endGeo, innerWoodMat);
    endR.position.set(1.15, 0.38, 0);
    endR.rotation.y = Math.PI / 2;
    group.add(endR);

    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.4, 8), mossMat);
    stump.position.set(0.3, 0.65, 0.1);
    stump.rotation.x = 0.4;
    group.add(stump);

    const glowLight = new THREE.PointLight(0xff7700, 1.4, 4.5);
    glowLight.position.set(0, 0.8, 0);
    group.add(glowLight);

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

function buildTrashCan() {
    const group = new THREE.Group();

    const canMat = new THREE.MeshStandardMaterial({
        color: 0x4a525a,
        roughness: 0.4,
        metalness: 0.7
    });

    const garbageMat1 = new THREE.MeshStandardMaterial({ color: 0x223311, roughness: 0.9 });
    const garbageMat2 = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.95 });
    const slimeGlowMat = new THREE.MeshBasicMaterial({ color: 0x55ff00, transparent: true, opacity: 0.7 });

    const bodyGeo = new THREE.CylinderGeometry(0.48, 0.42, 1.1, 14);
    const body = new THREE.Mesh(bodyGeo, canMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    const handleGeo = new THREE.TorusGeometry(0.08, 0.02, 8, 12);
    const handleL = new THREE.Mesh(handleGeo, canMat);
    handleL.position.set(-0.5, 0.7, 0);
    handleL.rotation.y = Math.PI / 2;
    group.add(handleL);

    const handleR = new THREE.Mesh(handleGeo, canMat);
    handleR.position.set(0.5, 0.7, 0);
    handleR.rotation.y = Math.PI / 2;
    group.add(handleR);

    const trashMound1 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), garbageMat1);
    trashMound1.position.set(-0.08, 1.12, 0.05);
    trashMound1.scale.set(1.1, 0.7, 1.0);
    group.add(trashMound1);

    const trashMound2 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), garbageMat2);
    trashMound2.position.set(0.12, 1.18, -0.06);
    trashMound2.scale.set(0.9, 0.8, 0.9);
    group.add(trashMound2);

    const lidGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.08, 14);
    const lid = new THREE.Mesh(lidGeo, canMat);
    lid.position.set(0.15, 1.35, 0.05);
    lid.rotation.z = -0.38;
    lid.rotation.x = 0.15;
    lid.castShadow = true;
    group.add(lid);

    const odorParticles = [];
    for (let i = 0; i < 5; i++) {
        const odorPuff = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 6, 6), slimeGlowMat);
        odorPuff.position.set(
            (Math.random() - 0.5) * 0.5,
            1.2 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        group.add(odorPuff);
        odorParticles.push(odorPuff);
    }

    const odorLight = new THREE.PointLight(0x44ff00, 0.9, 3.0);
    odorLight.position.set(0, 1.3, 0);
    group.add(odorLight);

    group.add(contactShadow(0.8));

    return { group, odorParticles };
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

class Obstacle {
    constructor(x, z, type) {
        this.x = x;
        this.z = z;
        this.type = type;
        this.def = TYPES[type] || TYPES.cone;
        this.hit = false;
        this.smokePuffs = null;
        this.odorParticles = null;

        if (type === "tree_trunk") {
            const res = buildTreeTrunk();
            this.group = res.group;
            this.smokePuffs = res.smokePuffs;
        } else if (type === "trash_can") {
            const res = buildTrashCan();
            this.group = res.group;
            this.odorParticles = res.odorParticles;
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
                case "fire_barrel":
                    this.group = buildFireBarrel();
                    break;
                case "wreckage":
                    this.group = buildWreckage();
                    break;
                default:
                    this.group = buildCone();
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

        if (this.odorParticles) {
            this.odorParticles.forEach((p) => {
                p.position.y += dt * 0.6;
                p.position.x += Math.sin(p.position.y * 5) * dt * 0.1;
                p.material.opacity -= dt * 0.25;

                if (p.position.y > 2.2 || p.material.opacity <= 0) {
                    p.position.y = 1.1;
                    p.position.x = (Math.random() - 0.5) * 0.5;
                    p.material.opacity = 0.7;
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
        const pool = ["tree_trunk", "tree_trunk", "cone", "barrier"];
        if (difficulty > 1) pool.push("trash_can");
        if (difficulty > 2) pool.push("t_barrier", "fire_barrel", "trash_can");
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