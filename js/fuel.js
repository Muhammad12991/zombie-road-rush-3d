/**
 * fuel.js
 * -----------------------------------------------------------------------
 * Floating, rotating Fuel Canisters & Wrench Pickups.
 * Clean, non-rotating, camera-facing text sprites for maximum readability.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

// Clean & Readable "FUEL" Text Sprite (No Box, No Rotation)
function createFuelTextSprite() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = "900 60px Impact, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Black Thick Stroke for High Contrast against 3D environment
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 12;
    ctx.strokeText("⛽ FUEL (+20%)", canvas.width / 2, canvas.height / 2);

    // Bright Neon Green Fill
    ctx.fillStyle = "#00ff66";
    ctx.fillText("⛽ FUEL (+20%)", canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.2, 0.8, 1);
    return sprite;
}

// Clean & Readable "WRENCH" Text Sprite (No Box, No Rotation)
function createWrenchTextSprite() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = "900 60px Impact, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Black Thick Stroke for High Contrast
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 12;
    ctx.strokeText("🔧 REPAIR (+15%)", canvas.width / 2, canvas.height / 2);

    // Bright Gold/Yellow Fill
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("🔧 REPAIR (+15%)", canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.4, 0.85, 1);
    return sprite;
}

// ---------------- 3D FUEL CANISTER ----------------
function buildCanister() {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff55,
        roughness: 0.15,
        metalness: 0.8,
        emissive: 0x00d544,
        emissiveIntensity: 1.2
    });

    const capMat = new THREE.MeshStandardMaterial({
        color: 0xffe600,
        roughness: 0.2,
        emissive: 0xffaa00,
        emissiveIntensity: 1.5
    });

    // Sub-group specifically for rotating the 3D meshes
    const modelGroup = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.0, 12), mat);
    body.position.y = 0.8;
    body.castShadow = true;
    modelGroup.add(body);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), capMat);
    cap.position.y = 1.4;
    modelGroup.add(cap);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 12), capMat);
    handle.position.y = 1.55;
    handle.rotation.x = Math.PI / 2;
    modelGroup.add(handle);

    group.add(modelGroup);

    // CAMERA-FACING TEXT SPRITE (Added outside modelGroup so it doesn't rotate)
    const textSprite = createFuelTextSprite();
    textSprite.position.set(0, 2.2, 0);
    group.add(textSprite);

    const glowLight = new THREE.PointLight(0x00ff66, 3.5, 8);
    glowLight.position.set(0, 1.0, 0);
    group.add(glowLight);

    return { group, modelGroup, glowLight };
}

// ---------------- 3D WRENCH MODEL ----------------
function buildWrenchMesh() {
    const group = new THREE.Group();

    const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0xff9900,
        emissiveIntensity: 1.2
    });

    // Sub-group specifically for rotating the 3D meshes
    const modelGroup = new THREE.Group();

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.3, 0.12), chromeMat);
    handle.position.y = 0.75;
    modelGroup.add(handle);

    const headTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16), chromeMat);
    headTop.position.y = 1.4;
    modelGroup.add(headTop);

    modelGroup.rotation.z = Math.PI / 6;
    group.add(modelGroup);

    // CAMERA-FACING TEXT SPRITE (Added outside modelGroup so it doesn't rotate)
    const textSprite = createWrenchTextSprite();
    textSprite.position.set(0, 2.1, 0);
    group.add(textSprite);

    const glowLight = new THREE.PointLight(0xffcc00, 3.8, 8);
    glowLight.position.set(0, 1.0, 0);
    group.add(glowLight);

    return { group, modelGroup, glowLight };
}

class FuelTank {
    constructor(x, z, pickupType = "fuel") {
        this.x = x;
        this.z = z;
        this.pickupType = pickupType;
        this.bobPhase = Math.random() * Math.PI * 2;

        const parts = pickupType === "wrench" ? buildWrenchMesh() : buildCanister();
        this.group = parts.group;
        this.modelGroup = parts.modelGroup;
        this.glowLight = parts.glowLight;
        this.group.position.set(x, 0, z);
    }

    get bounds() { return { x: this.x, z: this.z, halfW: 0.55, halfL: 0.55 }; }

    update(dt, worldSpeed) {
        this.z += worldSpeed * dt;
        this.bobPhase += dt * 3.5;

        const hoverY = 0.4 + Math.sin(this.bobPhase) * 0.18;
        this.group.position.set(this.x + curveOffset(this.z), hoverY, this.z);

        // Sirf 3D Model Spin Karega, Text Sprite hamesha camera facing aur STILL rahega!
        if (this.modelGroup) this.modelGroup.rotation.y += dt * 1.8;
    }
}

export class FuelManager {
    constructor(scene, road) {
        this.scene = scene;
        this.road = road;
        this.list = [];
        this.spawnTimer = 0;
        this.lastWrenchDist = 0;
    }

    reset() {
        for (const f of this.list) this.scene.remove(f.group);
        this.list = [];
        this.spawnTimer = 3;
        this.lastWrenchDist = 0;
    }

    update(dt, difficulty, worldSpeed, farZ, currentDistance = 0) {
        this.spawnTimer -= dt;

        // Spawn Wrench every 500m
        if (currentDistance - this.lastWrenchDist >= 500) {
            this.lastWrenchDist = currentDistance;
            const lane = Math.floor(Math.random() * this.road.laneCount);
            const wrench = new FuelTank(this.road.laneCenterX(lane), farZ, "wrench");
            this.scene.add(wrench.group);
            this.list.push(wrench);
        }

        // Regular Fuel Canister Spawn
        if (this.spawnTimer <= 0) {
            this.spawnTimer = Math.min(3 + difficulty * 0.9, 14) * (0.8 + Math.random() * 0.5);
            const lane = Math.floor(Math.random() * this.road.laneCount);
            const f = new FuelTank(this.road.laneCenterX(lane), farZ, "fuel");
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