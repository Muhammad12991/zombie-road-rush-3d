/**
 * zombies.js
 * -----------------------------------------------------------------------
 * ULTRA-HORROR Canvas Sprite Zombie System:
 * 3 Creepy Variants (Dark Ghoul, Blood Slasher, Rotting Mutant), 
 * glowing sockets, blood drips, long messy hair, exposed bone details,
 * and twitchy undead motion for maximum horror vibes!
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
        { skin: "#2e3d29", jacket: "#2a221b", tie: "#8b0000", eyeGlow: "#ff0000", hair: "#0a0a0a" }, // Dark Ghoul
        { skin: "#3b3d3a", jacket: "#14171a", tie: "#4a0000", eyeGlow: "#ff3300", hair: "#1c140d" }, // Blood Slasher
        { skin: "#1f3322", jacket: "#382d1d", tie: "#990000", eyeGlow: "#ff0055", hair: "#0d0e14" } // Rotting Mutant
    ];
    const v = VARIANTS[variantIndex % 3];

    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";

    // 1. Torn Trousers & Legs
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.rect(86, 320, 34, 110);
    ctx.rect(136, 320, 32, 100);
    ctx.fill();
    ctx.stroke();

    // Bare Rotting Skin Ankle
    ctx.fillStyle = v.skin;
    ctx.beginPath();
    ctx.rect(140, 420, 22, 42);
    ctx.fill();
    ctx.stroke();

    // Bloody Muddy Shoes
    ctx.fillStyle = "#1c120c";
    ctx.beginPath();
    ctx.ellipse(90, 448, 32, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(156, 462, 34, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Slouched Tattered Body
    ctx.fillStyle = v.jacket;
    ctx.beginPath();
    ctx.moveTo(65, 175);
    ctx.lineTo(190, 175);
    ctx.lineTo(200, 335);
    ctx.lineTo(60, 335);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dirty Inner Shirt
    ctx.fillStyle = "#6b6659";
    ctx.beginPath();
    ctx.moveTo(108, 175);
    ctx.lineTo(148, 175);
    ctx.lineTo(130, 245);
    ctx.closePath();
    ctx.fill();

    // Blood-Soaked Tie
    ctx.fillStyle = v.tie;
    ctx.beginPath();
    ctx.moveTo(120, 195);
    ctx.lineTo(140, 195);
    ctx.lineTo(145, 305);
    ctx.lineTo(128, 315);
    ctx.lineTo(116, 295);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heavy Blood Splatters & Exposed Rib Detail
    ctx.fillStyle = "#660000";
    ctx.beginPath();
    ctx.arc(100, 255, 18, 0, Math.PI * 2);
    ctx.arc(165, 285, 22, 0, Math.PI * 2);
    ctx.arc(125, 300, 15, 0, Math.PI * 2);
    ctx.fill();

    // Bone Rib Detail
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(85, 245, 18, 5);
    ctx.fillRect(83, 260, 22, 5);

    // 3. Reaching Arms & Bloody Claws
    ctx.fillStyle = v.jacket;
    ctx.beginPath();
    ctx.rect(34, 205, 38, 85);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = v.skin;
    ctx.beginPath();
    ctx.arc(50, 305, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Long Sharp Nails / Claws
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(35, 315);
    ctx.lineTo(28, 330);
    ctx.lineTo(40, 320);
    ctx.moveTo(48, 320);
    ctx.lineTo(45, 338);
    ctx.lineTo(55, 322);
    ctx.fill();

    // 4. Ultra-Scary Decayed Head
    ctx.fillStyle = v.skin;
    ctx.beginPath();
    ctx.ellipse(130, 105, 68, 78, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jagged Gaping Jaw with Gory Blood Drips
    ctx.fillStyle = "#080202";
    ctx.beginPath();
    ctx.ellipse(140, 145, 36, 22, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Intense Blood Gushing down the chin
    ctx.fillStyle = "#800000";
    ctx.beginPath();
    ctx.rect(120, 150, 8, 28);
    ctx.rect(136, 155, 12, 38);
    ctx.rect(154, 152, 7, 24);
    ctx.fill();

    // Sharp Broken Yellow Teeth
    ctx.fillStyle = "#d9ccab";
    ctx.fillRect(116, 128, 8, 14);
    ctx.fillRect(142, 130, 10, 12);
    ctx.fillRect(128, 148, 9, 12);
    ctx.fillRect(152, 146, 8, 10);

    // 5. Terrifying Glowing Eyes (Evil Undead Look)
    // Left Eye
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.arc(102, 82, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.eyeGlow;
    ctx.beginPath();
    ctx.arc(102, 82, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(100, 80, 5, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.arc(158, 88, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.eyeGlow;
    ctx.beginPath();
    ctx.arc(158, 88, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(156, 86, 4, 0, Math.PI * 2);
    ctx.fill();

    // Scars on Face
    ctx.strokeStyle = "#400000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(85, 95);
    ctx.lineTo(110, 120);
    ctx.moveTo(150, 65);
    ctx.lineTo(170, 80);
    ctx.stroke();

    // 6. Wild Messy Long Horror Hair
    ctx.strokeStyle = v.hair;
    ctx.lineWidth = 6;
    ctx.fillStyle = v.hair;

    ctx.beginPath();
    ctx.moveTo(75, 80);
    ctx.quadraticCurveTo(50, 130, 45, 190);
    ctx.moveTo(90, 50);
    ctx.quadraticCurveTo(65, 110, 60, 170);
    ctx.moveTo(110, 30);
    ctx.quadraticCurveTo(100, 5, 85, 0);
    ctx.moveTo(130, 25);
    ctx.quadraticCurveTo(135, 0, 145, -5);
    ctx.moveTo(150, 30);
    ctx.quadraticCurveTo(175, 50, 190, 110);
    ctx.moveTo(165, 50);
    ctx.quadraticCurveTo(195, 100, 210, 180);
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

    const planeGeo = new THREE.PlaneGeometry(1.65, 2.75);
    const sprite = new THREE.Mesh(planeGeo, mat);
    sprite.position.y = 1.32;
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
        this.speedX = 0.65 + Math.random() * 0.95;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.swaySpeed = 1.2 + Math.random() * 1.5;
        this.swayAmount = behavior === "shamble" ? 0.38 : 0.22;
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
        return { x: this.x, z: this.z, halfW: 0.35, halfL: 0.35 };
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
            this.group.rotation.z += dt * 9;
            this.group.position.y -= dt * 1.6;
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
            this.group.rotation.z = Math.sin(this.staggerTimer * 20) * 0.35;
            if (this.staggerTimer <= 0) {
                this.state = "alive";
                this.group.rotation.z = 0;
                this.homeX = this.x;
            }
            this._sync();
            return;
        }

        // Alive AI Behavior
        this.walkPhase += dt * 6.5;
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

        // Creepy Twitchy Undead Wobble Motion
        const wobble = Math.sin(this.walkPhase) * 0.14;
        this.parts.sprite.rotation.z = wobble;
        this.parts.sprite.position.y = 1.32 + Math.abs(Math.sin(this.walkPhase * 2.2)) * 0.09;

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