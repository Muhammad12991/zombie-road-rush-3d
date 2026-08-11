/**
 * zombies.js
 * -----------------------------------------------------------------------
 * Procedural low-poly zombies that stand near the road, wander, or lurch
 * across it. Per the game's combat rule: most car hits KNOCK a zombie
 * aside (staggered, stays alive, small score) while a "power hit" —
 * drifting into one, or every 3rd hit in an active combo streak —
 * DESTROYS it (counts as a kill, full combo score, gore burst).
 *
 * Note: this.x / this.z are the pure gameplay (lane) position used for
 * AI and collision — never touched by the road curve. Only the mesh's
 * on-screen position gets nudged by curveOffset() so zombies visually
 * stay on the (cosmetically) curving road.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

function buildZombieMesh() {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5f7a3a, roughness: 0.85 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x3d4a2a, roughness: 0.9 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xb3311f, emissive: 0xb3311f, emissiveIntensity: 1.5 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), clothMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), skinMat);
    head.position.y = 1.62;
    group.add(head);

    [-0.09, 0.09].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
        eye.position.set(x, 1.64, 0.19);
        group.add(eye);
    });

    const limbGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.62, 6);
    const armL = new THREE.Mesh(limbGeo, skinMat);
    armL.position.set(-0.36, 1.15, 0.05);
    armL.rotation.z = 0.5;
    group.add(armL);
    const armR = new THREE.Mesh(limbGeo, skinMat);
    armR.position.set(0.36, 1.15, 0.05);
    armR.rotation.z = -0.5;
    group.add(armR);

    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6);
    const legL = new THREE.Mesh(legGeo, clothMat);
    legL.position.set(-0.15, 0.4, 0);
    group.add(legL);
    const legR = new THREE.Mesh(legGeo, clothMat);
    legR.position.set(0.15, 0.4, 0);
    group.add(legR);

    return { group, armL, armR, legL, legR, torso, head };
}

class Zombie {
    constructor(x, z, behavior) {
        this.x = x;
        this.z = z;
        this.homeX = x;
        this.targetX = x;
        this.behavior = behavior; // "shamble" | "wander" | "lurch"
        this.speedX = 0.6 + Math.random() * 0.9;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.swaySpeed = 1 + Math.random() * 1.4;
        this.swayAmount = behavior === "shamble" ? 0.35 : 0.2;
        this.wanderTimer = 0;
        this.wanderDir = 1;
        this.walkPhase = Math.random() * Math.PI * 2;

        this.state = "alive"; // alive | staggered | dying | dead
        this.staggerTimer = 0;
        this.staggerVX = 0;
        this.staggerVZ = 0;
        this.dyingTimer = 0;

        const parts = buildZombieMesh();
        this.group = parts.group;
        this.parts = parts;
        this.group.position.set(x, 0, z);
        this.group.rotation.y = Math.PI; // face the oncoming car
    }

    get bounds() {
        return { x: this.x, z: this.z, halfW: 0.32, halfL: 0.32 };
    }

    stagger() {
        this.state = "staggered";
        this.staggerTimer = 0.85;
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.staggerVX = dir * (2.5 + Math.random() * 1.5);
        this.staggerVZ = 2 + Math.random() * 1.5; // knocked slightly toward camera (+z)
    }

    kill() {
        this.state = "dying";
        this.dyingTimer = 0.35;
    }

    update(dt, road, playerX, worldSpeed) {
        // world scroll always applies (city moves toward camera)
        this.z += worldSpeed * dt;

        if (this.state === "dying") {
            this.dyingTimer -= dt;
            // was a fast full-body tumble (rotation.x += dt*10) — with cylinder
            // limbs that read as a spinning dark blob/cylinder at a distance.
            // Now: a quick downward "collapse" (gentle tilt + squash-sink) so
            // it clearly reads as the zombie dropping, not flying debris.
            this.group.rotation.x += dt * 2.2;
            this.group.position.y -= dt * 1.1;
            const t = Math.max(0, this.dyingTimer / 0.35);
            this.group.scale.set(t, t * t, t); // shrinks vertically faster — a splat/collapse, not a spin
            this._sync();
            return;
        }

        if (this.state === "staggered") {
            this.staggerTimer -= dt;
            this.x += this.staggerVX * dt;
            this.z += this.staggerVZ * dt * 0.4;
            this.staggerVX *= 1 - dt * 3;
            this.staggerVZ *= 1 - dt * 3;
            this.group.rotation.z = Math.sin(this.staggerTimer * 20) * 0.3;
            if (this.staggerTimer <= 0) {
                this.state = "alive";
                this.group.rotation.z = 0;
                this.homeX = this.x;
            }
            this._sync();
            return;
        }

        // alive: run behavior AI
        this.walkPhase += dt * 7;
        this.swayPhase += dt * this.swaySpeed;
        const sway = Math.sin(this.swayPhase) * this.swayAmount;

        switch (this.behavior) {
            case "shamble":
                this.targetX = this.homeX + sway;
                break;
            case "wander":
                this.wanderTimer -= dt;
                if (this.wanderTimer <= 0) {
                    this.wanderTimer = 1.5 + Math.random() * 2;
                    this.wanderDir = Math.random() < 0.5 ? -1 : 1;
                }
                this.homeX += this.wanderDir * this.speedX * dt;
                this.targetX = this.homeX + sway * 0.5;
                break;
            case "lurch":
                {
                    const dir = Math.sign(playerX - this.x) || 1;
                    this.homeX += dir * this.speedX * dt;
                    this.targetX = this.homeX + sway * 0.3;
                    break;
                }
        }

        this.x += (this.targetX - this.x) * Math.min(1, dt * 5);

        // walk-cycle limb swing
        const swing = Math.sin(this.walkPhase) * 0.5;
        this.parts.legL.rotation.x = swing;
        this.parts.legR.rotation.x = -swing;
        this.parts.armL.rotation.x = -swing * 0.6;
        this.parts.armR.rotation.x = swing * 0.6;

        this._sync();
    }

    _sync() {
        this.group.position.x = this.x + curveOffset(this.z);
        this.group.position.z = this.z;
    }
}

export class ZombieManager {
    constructor(scene, road) {
        this.scene = scene;
        this.road = road;
        this.list = [];
        this.spawnTimer = 0;
        this.hitStreak = 0;
        this.streakTimer = 0;
    }

    reset() {
        for (const z of this.list) this.scene.remove(z.group);
        this.list = [];
        this.spawnTimer = 1.2;
        this.hitStreak = 0;
        this.streakTimer = 0;
    }

    /** Called on every zombie contact; returns "kill" or "knock" per the game's mixed-hit rule. */
    resolveHit(zombie, playerDrifting) {
        this.streakTimer = 0.9;
        if (playerDrifting) {
            this.hitStreak = 0; // drift kills don't need to build a streak
            return "kill";
        }
        this.hitStreak += 1;
        if (this.hitStreak % 3 === 0) return "kill";
        return "knock";
    }

    updateStreak(dt) {
        if (this.streakTimer > 0) {
            this.streakTimer -= dt;
            if (this.streakTimer <= 0) this.hitStreak = 0;
        }
    }

    update(dt, difficulty, worldSpeed, playerX, farZ) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = Math.max(0.4, 1.5 - difficulty * 0.09) * (0.7 + Math.random() * 0.6);
            this._spawnGroup(difficulty, farZ);
        }

        for (const z of this.list) z.update(dt, this.road, playerX, worldSpeed);

        this.list = this.list.filter((z) => {
            const gone = z.z > 14 || (z.state === "dying" && z.dyingTimer <= -0.05);
            if (gone) this.scene.remove(z.group);
            return !gone;
        });

        this.updateStreak(dt);
    }

    _spawnGroup(difficulty, farZ) {
        const clusterChance = Math.min(0.15 + difficulty * 0.04, 0.45);
        const isCluster = Math.random() < clusterChance;
        const count = isCluster ? 2 + Math.floor(Math.random() * 2) : 1;
        const laneBase = Math.floor(Math.random() * this.road.laneCount);

        for (let i = 0; i < count; i++) {
            const behaviors = ["shamble", "wander", "lurch"];
            const lurchChance = Math.min(0.15 + difficulty * 0.05, 0.55);
            const r = Math.random();
            const behavior = r < lurchChance ? "lurch" : r < lurchChance + 0.35 ? "wander" : "shamble";

            let x;
            if (behavior === "shamble") {
                const side = Math.random() < 0.5 ? -1 : 1;
                x = side * (this.road.roadHalfWidth + 1 + Math.random() * 2);
            } else {
                const lane = isCluster ? Math.min(this.road.laneCount - 1, laneBase + (i % 2)) : Math.floor(Math.random() * this.road.laneCount);
                x = this.road.laneCenterX(lane) + (Math.random() * 1 - 0.5);
            }

            const z = farZ - i * 3 - Math.random() * 4;
            const zombie = new Zombie(x, z, behavior);
            this.scene.add(zombie.group);
            this.list.push(zombie);
        }
    }
}