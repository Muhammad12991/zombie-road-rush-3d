/**
 * effects.js
 * -----------------------------------------------------------------------
 * Scenery barrels, short-lived particle bursts for zombie gore / collision 
 * sparks / exhaust, camera screen-shake, and cosmetic rain system.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

function buildFireBarrel() {
    const group = new THREE.Group();
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9, metalness: 0.2 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.7, 10), barrelMat);
    barrel.position.y = 0.35;
    barrel.castShadow = true;
    group.add(barrel);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.85 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 8), flameMat);
    flame.position.y = 1.0;
    group.add(flame);

    const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.7 });
    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8), flameMat2);
    flame2.position.y = 1.05;
    group.add(flame2);

    const light = new THREE.PointLight(0xff8a30, 2.2, 9, 2);
    light.position.y = 1.0;
    group.add(light);

    return { group, flame, flame2, light, phase: Math.random() * Math.PI * 2 };
}

class Particle {
    constructor(x, y, z, opts) {
        this.vx = opts.vx || 0;
        this.vy = opts.vy || 0;
        this.vz = opts.vz || 0;
        this.life = opts.life || 0.5;
        this.maxLife = this.life;
        this.gravity = opts.gravity !== undefined ? opts.gravity : -6;
        this.mesh = new THREE.Mesh(
            opts.geo || new THREE.SphereGeometry(opts.size || 0.05, 5, 5),
            new THREE.MeshBasicMaterial({ color: opts.color || 0xffffff, transparent: true })
        );
        this.mesh.position.set(x, y, z);
    }

    update(dt) {
        this.vy += this.gravity * dt;
        this.mesh.position.x += this.vx * dt;
        this.mesh.position.y += this.vy * dt;
        this.mesh.position.z += this.vz * dt;
        this.life -= dt;
        const t = Math.max(0, this.life / this.maxLife);
        this.mesh.material.opacity = t;
        this.mesh.scale.setScalar(Math.max(0.05, t));
    }
}

export class Effects {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.fires = [];
        this.shake = 0;
    }

    reset() {
        for (const p of this.particles) this.scene.remove(p.mesh);
        this.particles = [];
        this.shake = 0;
    }

    seedFires(road, count = 9) {
        for (const f of this.fires) this.scene.remove(f.group);
        this.fires = [];
        const span = road ? road.segmentSpan || 336 : 336;
        for (let i = 0; i < count; i++) {
            const f = buildFireBarrel();
            const side = Math.random() < 0.5 ? -1 : 1;
            const x = side * (road.roadHalfWidth + 1.8 + Math.random() * 3);
            f.baseX = x;
            f.group.position.set(x, 0, -Math.random() * span * 1.4);
            this.scene.add(f.group);
            this.fires.push(f);
        }
    }

    updateFires(dt, worldSpeed, span) {
        for (const f of this.fires) {
            f.group.position.z += worldSpeed * dt;
            f.phase += dt * 14;
            const flick = 0.8 + Math.sin(f.phase) * 0.15 + Math.random() * 0.08;
            f.flame.scale.set(flick, 0.9 + Math.sin(f.phase * 1.3) * 0.2, flick);
            f.light.intensity = 1.8 + Math.sin(f.phase * 2) * 0.6 + Math.random() * 0.3;
            if (f.group.position.z > 14) {
                f.group.position.z -= span * 1.4;
                const side = Math.random() < 0.5 ? -1 : 1;
                f.baseX = side * (6.6 + 1.8 + Math.random() * 3);
            }
            f.group.position.x = f.baseX + curveOffset(f.group.position.z);
        }
    }

    addShake(amount) { this.shake = Math.min(0.5, this.shake + amount); }

    getShakeOffset(dt) {
        if (this.shake <= 0) return { x: 0, y: 0 };
        this.shake = Math.max(0, this.shake - dt * 1.1);
        const s = this.shake;
        return { x: (Math.random() * 2 - 1) * s, y: (Math.random() * 2 - 1) * s * 0.6 };
    }

    update(dt) {
        for (const p of this.particles) p.update(dt);
        const dead = this.particles.filter((p) => p.life <= 0);
        for (const p of dead) this.scene.remove(p.mesh);
        this.particles = this.particles.filter((p) => p.life > 0);
    }

    _spawn(x, y, z, opts) {
        const p = new Particle(x, y, z, opts);
        this.scene.add(p.mesh);
        this.particles.push(p);
    }

    // High Impact Blood & Gore Explosion
    gore(x, y, z) {
        this.addShake(0.22); // Impact Screen Shake

        // Crimson Blood Splatter Particles
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.0 + Math.random() * 4.5;
            this._spawn(x, y + 0.8, z, {
                vx: Math.cos(angle) * speed,
                vz: Math.sin(angle) * speed,
                vy: 2.5 + Math.random() * 3.5,
                life: 0.45 + Math.random() * 0.3,
                size: 0.05 + Math.random() * 0.06,
                color: Math.random() < 0.7 ? 0x8a0f0f : 0x540808,
                gravity: -8,
            });
        }

        // Flying Debris Chunks
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            this._spawn(x, y + 0.5, z, {
                vx: Math.cos(angle) * 1.8,
                vz: Math.sin(angle) * 1.8,
                vy: 1.5 + Math.random() * 2,
                life: 0.35 + Math.random() * 0.2,
                size: 0.08 + Math.random() * 0.04,
                color: 0x3d4a2a,
                gravity: -7,
            });
        }
    }

    spark(x, y, z) {
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this._spawn(x, y + 0.5, z, {
                vx: Math.cos(angle) * speed,
                vz: Math.sin(angle) * speed,
                vy: Math.random() * 3,
                life: 0.25 + Math.random() * 0.25,
                size: 0.035,
                color: Math.random() < 0.5 ? 0xf4d060 : 0xdd4a30,
                gravity: -9,
            });
        }
        for (let i = 0; i < 5; i++) {
            this._spawn(x, y + 0.5, z, {
                vx: (Math.random() - 0.5) * 1.2,
                vz: (Math.random() - 0.5) * 1.2,
                vy: 1 + Math.random() * 1.5,
                life: 0.6 + Math.random() * 0.3,
                size: 0.18 + Math.random() * 0.1,
                color: 0x4a4a4d,
                gravity: -1,
            });
        }
    }

    exhaust(x, y, z) {
        this._spawn(x, y, z, {
            vx: (Math.random() - 0.5) * 0.3,
            vy: 0.4,
            vz: 1.5 + Math.random() * 0.5,
            life: 0.4,
            size: 0.09 + Math.random() * 0.05,
            color: 0xd9d3bf,
            gravity: 0,
        });
    }

    sparkle(x, y, z, color = 0xd98f30) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            this._spawn(x, y + 0.6, z, {
                vx: Math.cos(angle) * 2,
                vz: Math.sin(angle) * 2,
                vy: 1 + Math.random(),
                life: 0.35,
                size: 0.05,
                color,
                gravity: -3,
            });
        }
    }
}

export class Rain {
    constructor(scene) {
        this.scene = scene;
        this.count = 340;
        this.active = false;
        this.spread = 15;

        const positions = new Float32Array(this.count * 6);
        this.velocities = new Float32Array(this.count);
        this.gustPhase = Math.random() * Math.PI * 2;

        for (let i = 0; i < this.count; i++) this._resetDrop(i, positions);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({ color: 0x9fb3c9, transparent: true, opacity: 0.32 });
        this.lines = new THREE.LineSegments(geo, mat);
        this.lines.frustumCulled = false;
        this.positions = positions;
        this.group = new THREE.Group();
        this.group.add(this.lines);
        this.group.visible = false;
        scene.add(this.group);
    }

    _resetDrop(i, positions) {
        const x = (Math.random() * 2 - 1) * this.spread;
        const y = 5 + Math.random() * 8;
        const z = -Math.random() * 42 - 2;
        const len = 0.3 + Math.random() * 0.35;
        this.velocities[i] = 10 + Math.random() * 6;
        const idx = i * 6;
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
        positions[idx + 3] = x - 0.05;
        positions[idx + 4] = y - len;
        positions[idx + 5] = z + 0.04;
    }

    setActive(active) {
        this.active = active;
        this.group.visible = active;
    }

    update(dt, worldSpeed, carX) {
        if (!this.active) return;
        this.gustPhase += dt * 0.4;
        const gust = Math.sin(this.gustPhase) * 0.6;
        const pos = this.positions;
        for (let i = 0; i < this.count; i++) {
            const idx = i * 6;
            const fall = this.velocities[i] * dt;
            pos[idx + 1] -= fall;
            pos[idx + 4] -= fall;
            const fwd = (worldSpeed * 0.5 + gust) * dt;
            pos[idx] += fwd * 0.15;
            pos[idx + 3] += fwd * 0.15;
            pos[idx + 2] += worldSpeed * dt;
            pos[idx + 5] += worldSpeed * dt;
            if (pos[idx + 1] < -1 || pos[idx + 2] > 10) {
                this._resetDrop(i, pos);
                pos[idx] += carX;
                pos[idx + 3] += carX;
            }
        }
        this.lines.geometry.attributes.position.needsUpdate = true;
        this.group.position.x = 0;
    }
}