/**
 * car.js
 * -----------------------------------------------------------------------
 * Player car. The car always drives forward automatically (world scrolls
 * past it); the player only controls lateral (steering) movement, with
 * acceleration/friction and an optional drift that widens the steer
 * envelope, tilts the body, and — per game rules — guarantees a kill on
 * zombie contact instead of a mere knockback.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";

export class Car {
    constructor(roadHalfWidth) {
        this.roadHalfWidth = roadHalfWidth;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.maxSpeed = 9.5; // lateral units/sec
        this.accel = 26;
        this.friction = 20;
        this.drifting = false;
        this.tilt = 0;
        this.bodyBob = 0;
        this.hitFlash = 0;
        this.shieldless = true;

        this.group = new THREE.Group();
        this._buildMesh();
    }

    _buildMesh() {
        const g = this.group;

        // Pearl-white sports-sedan paint, low glossy body — Taycan-inspired silhouette
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe9ebee, roughness: 0.22, metalness: 0.55 });
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.15, metalness: 0.3 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.5, metalness: 0.4 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.55, metalness: 0.7 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.85 });
        const caliperMat = new THREE.MeshStandardMaterial({ color: 0xd9b429, roughness: 0.4, metalness: 0.3 });
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xf4e9c9, emissive: 0xf4e9c9, emissiveIntensity: 1.4 });
        const tailMat = new THREE.MeshStandardMaterial({ color: 0x7a9a3f, emissive: 0x7a9a3f, emissiveIntensity: 1.2 });

        this.bodyMat = bodyMat;
        this.tailMat = tailMat;

        // Low, wide lower body shell
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.42, 4.3), bodyMat);
        body.position.y = 0.42;
        body.castShadow = true;
        g.add(body);
        this.bodyMesh = body;

        // Sloped fastback cabin — two stacked boxes raked back like a sportback roofline
        const cabinMain = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.4, 1.7), cabinMat);
        cabinMain.position.set(0, 0.82, -0.15);
        g.add(cabinMain);

        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.34, 1.0), cabinMat);
        windshield.position.set(0, 0.7, 0.75);
        windshield.rotation.x = -0.32;
        g.add(windshield);

        // Side skirt / lower diffuser accent along the rocker panels
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.1, 3.9), trimMat);
        skirt.position.set(0, 0.16, 0);
        g.add(skirt);

        // Rear diffuser
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.2), trimMat);
        diffuser.position.set(0, 0.18, -2.14);
        g.add(diffuser);

        const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.32, 16);
        const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.34, 6);
        const caliperGeo = new THREE.BoxGeometry(0.1, 0.16, 0.16);
        const wheelPositions = [
            [-0.97, 0.36, 1.38],
            [0.97, 0.36, 1.38],
            [-0.97, 0.36, -1.32],
            [0.97, 0.36, -1.32],
        ];
        this.wheels = wheelPositions.map(([x, y, z]) => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, y, z);
            g.add(w);

            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.z = Math.PI / 2;
            rim.position.set(x, y, z);
            w.add(rim);

            // yellow brake caliper peeking from behind the rim, matching sport-trim reference
            const caliper = new THREE.Mesh(caliperGeo, caliperMat);
            caliper.position.set(x > 0 ? x + 0.1 : x - 0.1, y, z);
            g.add(caliper);

            return w;
        });

        // Slim four-point LED daytime-running lights up front
        const headlightGeo = new THREE.BoxGeometry(0.34, 0.07, 0.06);
        [-0.72, -0.5, 0.5, 0.72].forEach((x) => {
            const hl = new THREE.Mesh(headlightGeo, lightMat);
            hl.scale.x = Math.abs(x) > 0.6 ? 0.55 : 1;
            hl.position.set(x, 0.52, 2.16);
            g.add(hl);
        });

        // Continuous edge-to-edge LED tail-light bar — the signature Taycan-style cue
        const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.08, 0.05), tailMat);
        tailBar.position.set(0, 0.56, -2.16);
        g.add(tailBar);
        this.tailBarMesh = tailBar;

        // headlight spotlights for real illumination ahead
        this.headlight = new THREE.SpotLight(0xfff3d0, 3.2, 34, Math.PI / 6, 0.5, 1.2);
        this.headlight.position.set(0, 0.9, 2);
        this.headlightTarget = new THREE.Object3D();
        this.headlightTarget.position.set(0, 0, 20);
        g.add(this.headlight, this.headlightTarget);
        this.headlight.target = this.headlightTarget;

        g.position.y = this.y;
    }

    setSkin(bodyColor, accentColor) {
        this.bodyMat.color.set(bodyColor);
        this.tailMat.color.set(accentColor);
        this.tailMat.emissive.set(accentColor);
    }

    get bounds() {
        // world-space AABB approximation (car stays near x=this.x, z≈0)
        return { x: this.x, z: 0, halfW: 0.95, halfL: 2.1 };
    }

    update(dt, input, speedFactor) {
        const boost = this.drifting ? 1.7 : 1;
        if (input.left) this.vx -= this.accel * boost * dt;
        if (input.right) this.vx += this.accel * boost * dt;

        if (!input.left && !input.right) {
            const decel = this.friction * dt;
            if (this.vx > 0) this.vx = Math.max(0, this.vx - decel);
            else this.vx = Math.min(0, this.vx + decel);
        }

        const cap = this.maxSpeed * boost;
        this.vx = Math.max(-cap, Math.min(cap, this.vx));
        this.x += this.vx * dt;

        const margin = this.roadHalfWidth - 1.1;
        if (this.x < -margin) {
            this.x = -margin;
            this.vx = 0;
        }
        if (this.x > margin) {
            this.x = margin;
            this.vx = 0;
        }

        this.drifting = !!input.drift && Math.abs(this.vx) > 1.2;

        const targetTilt = this.drifting ?
            Math.max(-1, Math.min(1, this.vx / cap)) * 0.22 :
            (this.vx / this.maxSpeed) * 0.09;
        this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 8);

        const targetYaw = this.drifting ?
            Math.max(-1, Math.min(1, -this.vx / cap)) * 0.35 :
            (-this.vx / this.maxSpeed) * 0.12;
        this._yaw = (this._yaw || 0) + (targetYaw - (this._yaw || 0)) * Math.min(1, dt * 6);

        this.bodyBob = Math.sin(performance.now() * 0.012 * (0.6 + speedFactor)) * 0.02;

        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
            const flashing = Math.floor(this.hitFlash * 16) % 2 === 0;
            if (this.bodyMat.emissive) this.bodyMat.emissive.set(flashing ? 0x551a12 : 0x000000);
            if (this.bodyMat.emissiveIntensity) {
                this.bodyMat.emissiveIntensity = flashing ? 1 : 0;
            }
        } else if (this.bodyMat.emissiveIntensity) {
            this.bodyMat.emissiveIntensity = 0;
        }

        // spin wheels based on forward speed
        const wheelSpin = speedFactor * dt * 26;
        for (const w of this.wheels) w.rotation.x += wheelSpin;

        this.group.position.set(this.x, this.y + this.bodyBob, 0);
        this.group.rotation.z = -this.tilt;
        this.group.rotation.y = this._yaw;
    }

    flashHit() { this.hitFlash = 0.5; }
}