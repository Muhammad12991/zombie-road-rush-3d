/**
 * car.js
 * -----------------------------------------------------------------------
 * Player car. High-detail Porsche Taycan inspired sports car 3D model
 * completely cleared of any side wheels/cylinders.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";

export class Car {
    constructor(roadHalfWidth) {
        this.roadHalfWidth = roadHalfWidth;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.maxSpeed = 9.5;
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

        // Premium Porsche Taycan Metallic Paint & Materials
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xc8102e, // Porsche Carmine Red Metallic
            roughness: 0.15,
            metalness: 0.75
        });
        const cabinMat = new THREE.MeshStandardMaterial({
            color: 0x050608,
            roughness: 0.1,
            metalness: 0.9
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x111215,
            roughness: 0.4,
            metalness: 0.6
        });
        const ledHeadMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2.2
        });
        const tailMat = new THREE.MeshStandardMaterial({
            color: 0xff1100,
            emissive: 0xff1100,
            emissiveIntensity: 1.8
        });

        this.bodyMat = bodyMat;
        this.tailMat = tailMat;

        // 1. Lower Chassis Base
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.25, 4.2), trimMat);
        chassis.position.y = 0.25;
        chassis.castShadow = true;
        g.add(chassis);

        // 2. Taycan Main Aerodynamic Body Shell
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.38, 4.2), bodyMat);
        body.position.y = 0.48;
        body.castShadow = true;
        g.add(body);
        this.bodyMesh = body;

        // Sloped Hood / Bonnet
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.2, 1.4), bodyMat);
        hood.position.set(0, 0.58, 1.25);
        hood.rotation.x = -0.12;
        g.add(hood);

        // Wide Front & Rear Wheel Fenders (Taycan Muscle Curves)
        [-0.92, 0.92].forEach((x) => {
            const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 1.1), bodyMat);
            frontFender.position.set(x, 0.52, 1.35);
            g.add(frontFender);

            const rearFender = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.48, 1.2), bodyMat);
            rearFender.position.set(x, 0.54, -1.25);
            g.add(rearFender);
        });

        // 3. Sportback Glass Cabin (Sleek Roofline)
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.38, 1.8), cabinMat);
        roof.position.set(0, 0.88, -0.2);
        g.add(roof);

        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.36, 1.0), cabinMat);
        windshield.position.set(0, 0.78, 0.85);
        windshield.rotation.x = -0.38;
        g.add(windshield);

        const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.32, 1.1), cabinMat);
        rearGlass.position.set(0, 0.78, -1.1);
        rearGlass.rotation.x = 0.32;
        g.add(rearGlass);

        // 4. Detailed Side Mirrors
        [-0.98, 0.98].forEach((x) => {
            const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.08), trimMat);
            mirrorArm.position.set(x > 0 ? x - 0.04 : x + 0.04, 0.72, 0.85);
            g.add(mirrorArm);

            const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.18), bodyMat);
            mirrorCap.position.set(x, 0.74, 0.85);
            g.add(mirrorCap);
        });

        // 5. Taycan Rear Active Wing / Spoiler
        const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 0.32), bodyMat);
        spoilerWing.position.set(0, 0.76, -2.0);
        g.add(spoilerWing);

        [-0.65, 0.65].forEach((x) => {
            const spoilerMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), trimMat);
            spoilerMount.position.set(x, 0.68, -1.98);
            g.add(spoilerMount);
        });

        // 6. Rear Diffuser & Side Skirts
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.12, 3.8), trimMat);
        skirt.position.set(0, 0.18, 0);
        g.add(skirt);

        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.18, 0.25), trimMat);
        diffuser.position.set(0, 0.22, -2.12);
        g.add(diffuser);

        // 7. Signature Quad-LED Matrix Headlights
        [-0.72, 0.72].forEach((x) => {
            const hlCluster = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), trimMat);
            hlCluster.position.set(x, 0.56, 2.12);
            g.add(hlCluster);

            const quadLed = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.04), ledHeadMat);
            quadLed.position.set(x, 0.56, 2.16);
            g.add(quadLed);
        });

        // 8. Continuous Edge-to-Edge LED Tail LightBar
        const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.06, 0.06), tailMat);
        tailBar.position.set(0, 0.62, -2.14);
        g.add(tailBar);
        this.tailBarMesh = tailBar;

        // Headlight spotlights
        this.headlight = new THREE.SpotLight(0xfff3d0, 3.5, 36, Math.PI / 6, 0.5, 1.2);
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

        this.group.position.set(this.x, this.y + this.bodyBob, 0);
        this.group.rotation.z = -this.tilt;
        this.group.rotation.y = this._yaw;
    }

    flashHit() { this.hitFlash = 0.5; }
}