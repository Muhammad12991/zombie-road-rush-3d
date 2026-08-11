/**
 * fuel.js
 * -----------------------------------------------------------------------
 * Ultra-glowing floating, rotating fuel canisters with neon "FUEL" text 
 * overlay and pulsing light aura that restores player fuel on contact.
 *
 * Note: this.x / this.z stay pure lane/gameplay values for collision —
 * only the rendered mesh gets nudged sideways by curveOffset() so
 * canisters visually track the (cosmetically) curving road.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

// Generates ultra-bright "FUEL" 2D Canvas Texture with Neon Glow
function createFuelLabelTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Glowing Neon Badge Background
    ctx.fillStyle = "rgba(0, 40, 15, 0.9)";
    ctx.strokeStyle = "#00ff66";
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 20);
    ctx.fill();
    ctx.stroke();

    // High Emissive Glow Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px Impact, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 20;

    ctx.fillText("⛽ FUEL", canvas.width / 2, canvas.height / 2);

    return new THREE.CanvasTexture(canvas);
}

let fuelLabelTex = null;

function buildCanister() {
    const group = new THREE.Group();

    // High Emissive Neon Green Materials
    const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff55,
        roughness: 0.2,
        metalness: 0.7,
        emissive: 0x00d544,
        emissiveIntensity: 1.2
    });

    const capMat = new THREE.MeshStandardMaterial({
        color: 0xffe600,
        roughness: 0.2,
        emissive: 0xffaa00,
        emissiveIntensity: 1.5
    });

    // Glowing Outer Aura Ring
    const haloMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.88, 18), haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.5;
    group.add(halo);

    // Main Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10), mat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Cap & Handle
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), capMat);
    cap.position.y = 0.86;
    group.add(cap);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 10), capMat);
    handle.position.y = 0.98;
    handle.rotation.x = Math.PI / 2;
    group.add(handle);

    // 3D Floating Glowing "FUEL" Text Label
    if (!fuelLabelTex) {
        fuelLabelTex = createFuelLabelTexture();
    }

    const labelMat = new THREE.MeshBasicMaterial({
        map: fuelLabelTex,
        transparent: true,
        side: THREE.DoubleSide
    });

    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.68), labelMat);
    labelMesh.position.set(0, 1.65, 0);
    group.add(labelMesh);

    // Dynamic High-Intensity Green Light Source
    const glowLight = new THREE.PointLight(0x00ff66, 3.2, 7);
    glowLight.position.set(0, 0.8, 0);
    group.add(glowLight);

    return { group, halo, glowLight };
}

class FuelTank {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.bobPhase = Math.random() * Math.PI * 2;

        const parts = buildCanister();
        this.group = parts.group;
        this.halo = parts.halo;
        this.glowLight = parts.glowLight;
        this.group.position.set(x, 0, z);
    }

    get bounds() { return { x: this.x, z: this.z, halfW: 0.4, halfL: 0.4 }; }

    update(dt, worldSpeed) {
        this.z += worldSpeed * dt;
        this.bobPhase += dt * 3.5;

        // Hovering Up & Down Motion
        const hoverY = 0.35 + Math.sin(this.bobPhase) * 0.18;
        this.group.position.set(this.x + curveOffset(this.z), hoverY, this.z);

        // Pulsing Light & Ring Effect
        const pulse = 0.85 + Math.sin(this.bobPhase * 2) * 0.25;
        if (this.halo) this.halo.scale.set(pulse, pulse, pulse);
        if (this.glowLight) this.glowLight.intensity = 2.5 + Math.sin(this.bobPhase * 2) * 0.8;

        // Rotation
        this.group.rotation.y += dt * 1.6;
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
        const idx = this.list.indexOf(f);
        if (idx !== -1) this.list.splice(idx, 1);
    }
}