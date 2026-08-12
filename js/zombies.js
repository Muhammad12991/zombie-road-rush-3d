/**
 * zombies.js
 * -----------------------------------------------------------------------
 * ULTRA-HORROR Canvas Sprite Zombie System (Perfectly Balanced Spawn Rates)
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";
import { curveOffset } from "./road.js";

// Generates 3 Different Ultra-Horror 2D Canvas Textures
function createUltraHorrorTexture(variantIndex) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark Horror Palette Variants
    const VARIANTS = [
        { skin: "#1e2b19", jacket: "#1a120b", tie: "#bb0000", eyeGlow: "#ff0000", hair: "#000000" }, // Dark Ghoul
        { skin: "#2a2c29", jacket: "#0c0e10", tie: "#7a0000", eyeGlow: "#ff2200", hair: "#120a05" }, // Blood Slasher
        { skin: "#132316", jacket: "#241a0d", tie: "#cc0000", eyeGlow: "#ff0044", hair: "#05060a" } // Rotting Mutant
    ];
    const v = VARIANTS[variantIndex % 3];

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    // 1. Torn Trousers & Legs
    ctx.fillStyle = "#090d15";
    ctx.beginPath();
    ctx.rect(82, 320, 38, 110);
    ctx.rect(136, 320, 36, 100);
    ctx.fill();
    ctx.stroke();

    // Bare Rotting Skin Ankle
    ctx.fillStyle = v.skin;
    ctx.beginPath();
    ctx.rect(140, 420, 24, 42);
    ctx.fill();
    ctx.stroke();

    // Bloody Muddy Shoes
    ctx.fillStyle = "#100a06";
    ctx.beginPath();
    ctx.ellipse(88, 448, 34, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(158, 462, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Slouched Tattered Body
    ctx.fillStyle = v.jacket;
    ctx.beginPath();
    ctx.moveTo(60, 175);
    ctx.lineTo(195, 175);
    ctx.lineTo(205, 335);
    ctx.lineTo(55, 335);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dirty Inner Shirt
    ctx.fillStyle = "#474338";
    ctx.beginPath();
    ctx.moveTo(104, 175);
    ctx.lineTo(152, 175);
    ctx.lineTo(132, 245);
    ctx.closePath();
    ctx.fill();

    // Blood-Soaked Tie
    ctx.fillStyle = v.tie;
    ctx.beginPath();
    ctx.moveTo(118, 195);
    ctx.lineTo(142, 195);
    ctx.lineTo(148, 305);
    ctx.lineTo(128, 318);
    ctx.lineTo(114, 295);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heavy Blood Splatters & Exposed Rib Detail
    ctx.fillStyle = "#880000";
    ctx.beginPath();
    ctx.arc(95, 255, 22, 0, Math.PI * 2);
    ctx.arc(168, 285, 26, 0, Math.PI * 2);
    ctx.arc(125, 300, 18, 0, Math.PI * 2);
    ctx.fill();

    // Bone Rib Detail
    ctx.fillStyle = "#e6e6e6";
    ctx.fillRect(80, 245, 22, 6);
    ctx.fillRect(78, 262, 26, 6);

    // 3. Reaching Arms & Bloody Claws
    ctx.fillStyle = v.jacket;
    ctx.beginPath();
    ctx.rect(28, 205, 42, 85);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = v.skin;
    ctx.beginPath();
    ctx.arc(46, 305, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Long Sharp Nails / Claws
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.moveTo(30, 315);
    ctx.lineTo(22, 338);
    ctx.lineTo(36, 322);
    ctx.moveTo(44, 320);
    ctx.lineTo(40, 342);
    ctx.lineTo(52, 324);
    ctx.fill();

    // 4. Ultra-Scary Decayed Head
    ctx.fillStyle = v.skin;
    ctx.beginPath();
    ctx.ellipse(130, 105, 72, 82, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jagged Gaping Jaw with Gory Blood Drips
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(140, 148, 42, 26, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Intense Blood Gushing down the chin
    ctx.fillStyle = "#aa0000";
    ctx.beginPath();
    ctx.rect(116, 150, 10, 35);
    ctx.rect(134, 155, 14, 45);
    ctx.rect(156, 152, 9, 30);
    ctx.fill();

    // Sharp Broken Yellow Teeth
    ctx.fillStyle = "#f0e2b8";
    ctx.fillRect(112, 126, 10, 16);
    ctx.fillRect(140, 128, 12, 14);
    ctx.fillRect(124, 150, 10, 14);
    ctx.fillRect(152, 148, 9, 12);

    // 5. Terrifying Glowing Eyes (Evil Undead Look)
    // Left Eye
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(98, 80, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.eyeGlow;
    ctx.beginPath();
    ctx.arc(98, 80, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(96, 78, 6, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(162, 86, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.eyeGlow;
    ctx.beginPath();
    ctx.arc(162, 86, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(160, 84, 5, 0, Math.PI * 2);
    ctx.fill();

    // Scars on Face
    ctx.strokeStyle = "#550000";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(80, 95);
    ctx.lineTo(112, 122);
    ctx.moveTo(148, 62);
    ctx.lineTo(172, 82);
    ctx.stroke();

    // 6. Wild Messy Long Horror Hair
    ctx.strokeStyle = v.hair;
    ctx.lineWidth = 7;
    ctx.fillStyle = v.hair;

    ctx.beginPath();
    ctx.moveTo(70, 80);
    ctx.quadraticCurveTo(45, 130, 40, 195);
    ctx.moveTo(88, 50);
    ctx.quadraticCurveTo(60, 110, 55, 175);
    ctx.moveTo(110, 28);
    ctx.quadraticCurveTo(95, 0, 80, -5);
    ctx.moveTo(132, 22);
    ctx.quadraticCurveTo(138, -5, 148, -10);
    ctx.moveTo(154, 28);
    ctx.quadraticCurveTo(180, 50, 195, 115);
    ctx.moveTo(168, 48);
    ctx.quadraticCurveTo(200, 100, 215, 185);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
}

// Cached Horror Textures
const horrorTextures = [];

function buildUltraHorrorSprite() {
    if (horrorTextures.length === 0) {
        for (let i = 0; i < 3; i++) {
            horrorTextures.push(createUltraHorrorTexture(i));
        }
    }

    const randTex = horrorTextures[Math.floor(Math.random() * horrorTextures.length)];
    const group = new THREE.Group();

    const mat = new THREE.MeshBasicMaterial({
        map: randTex,
        transparent: true,
        alphaTest: 0.2,
        side: THREE.DoubleSide
    });

    const planeGeo = new THREE.PlaneGeometry(1.75, 2.9);
    const sprite = new THREE.Mesh(planeGeo, mat);
    sprite.position.y = 1.38;
    sprite.castShadow = true;
    group.add(sprite);

    return { group, sprite };
}

class Zombie {
    constructor(x, z, behavior) {
        this.x = x;
        this.z = z;
        this.homeX = x;
        this.targetX = x;
        this.behavior = behavior;
        this.speedX = 0.7 + Math.random() * 0.9;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.swaySpeed = 1.3 + Math.random() * 1.4;
        this.swayAmount = behavior === "shamble" ? 0.38 : 0.25;
        this.wanderTimer = 0;
        this.wanderDir = 1;
        this.walkPhase = Math.random() * Math.PI * 2;

        this.state = "alive";
        this.staggerTimer = 0;
        this.staggerVX = 0;
        this.staggerVZ = 0;
        this.dyingTimer = 0;

        const parts = buildUltraHorrorSprite();
        this.group = parts.group;
        this.parts = parts;
        this.group.position.set(x, 0, z);
    }

    get bounds() {
        return { x: this.x, z: this.z, halfW: 0.4, halfL: 0.4 };
    }

    stagger() {
        this.state = "staggered";
        this.staggerTimer = 0.85;
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.staggerVX = dir * (2.8 + Math.random() * 1.5);
        this.staggerVZ = 2.2 + Math.random() * 1.5;
    }

    kill() {
        this.state = "dying";
        this.dyingTimer = 0.35;
    }

    update(dt, road, playerX, worldSpeed) {
        this.z += worldSpeed * dt;

        if (this.state === "dying") {
            this.dyingTimer -= dt;
            this.group.rotation.z += dt * 10;
            this.group.position.y -= dt * 1.8;
            const t = Math.max(0, this.dyingTimer / 0.35);
            this.group.scale.set(t, t, t);
            this._sync();
            return;
        }

        if (this.state === "staggered") {
            this.staggerTimer -= dt;
            this.x += this.staggerVX * dt;
            this.z += this.staggerVZ * dt * 0.4;
            this.staggerVX *= 1 - dt * 3;
            this.staggerVZ *= 1 - dt * 3;
            this.group.rotation.z = Math.sin(this.staggerTimer * 22) * 0.4;
            if (this.staggerTimer <= 0) {
                this.state = "alive";
                this.group.rotation.z = 0;
                this.homeX = this.x;
            }
            this._sync();
            return;
        }

        // Alive AI Behavior
        this.walkPhase += dt * 7.5;
        this.swayPhase += dt * this.swaySpeed;
        const sway = Math.sin(this.swayPhase) * this.swayAmount;

        switch (this.behavior) {
            case "shamble":
                this.targetX = this.homeX + sway;
                break;
            case "wander":
                this.wanderTimer -= dt;
                if (this.wanderTimer <= 0) {
                    this.wanderTimer = 1.2 + Math.random() * 1.8;
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

        this.x += (this.targetX - this.x) * Math.min(1, dt * 6);

        // Creepy Twitchy Undead Wobble Motion
        const wobble = Math.sin(this.walkPhase) * 0.18;
        this.parts.sprite.rotation.z = wobble;
        this.parts.sprite.position.y = 1.38 + Math.abs(Math.sin(this.walkPhase * 2.5)) * 0.12;

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
        this.spawnTimer = 0.8;
        this.hitStreak = 0;
        this.streakTimer = 0;
    }

    resolveHit(zombie, playerDrifting) {
        this.streakTimer = 0.9;
        if (playerDrifting) {
            this.hitStreak = 0;
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
            // Sweet Spot: Smooth Spawn Intervals (0.6s - 1.2s)
            this.spawnTimer = Math.max(0.6, 1.2 - difficulty * 0.08) * (0.7 + Math.random() * 0.4);
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
        // Balanced Limit: Up to 12 active zombies on screen
        if (this.list.length >= 12) return;

        // Moderate Cluster Chance: 2-3 Zombies in a group
        const clusterChance = Math.min(0.25 + difficulty * 0.05, 0.50);
        const isCluster = Math.random() < clusterChance;
        const count = isCluster ? 2 + Math.floor(Math.random() * 2) : 1;
        const laneBase = Math.floor(Math.random() * this.road.laneCount);

        for (let i = 0; i < count; i++) {
            const lurchChance = Math.min(0.25 + difficulty * 0.05, 0.55);
            const r = Math.random();
            const behavior = r < lurchChance ? "lurch" : r < lurchChance + 0.35 ? "wander" : "shamble";

            let x;
            if (behavior === "shamble") {
                const side = Math.random() < 0.5 ? -1 : 1;
                x = side * (this.road.roadHalfWidth + 1 + Math.random() * 2);
            } else {
                const lane = isCluster ? Math.min(this.road.laneCount - 1, laneBase + (i % 2)) : Math.floor(Math.random() * this.road.laneCount);
                x = this.road.laneCenterX(lane) + (Math.random() * 0.8 - 0.4);
            }

            const z = farZ - i * 3.0 - Math.random() * 3;
            const zombie = new Zombie(x, z, behavior);
            this.scene.add(zombie.group);
            this.list.push(zombie);
        }
    }
}