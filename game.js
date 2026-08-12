/**
 * game.js
 * -----------------------------------------------------------------------
 * Entry point. Sets up the Three.js scene (renderer, third-person chase
 * camera, balanced lighting + fog), wires together the car, road,
 * zombies, obstacles, fuel, effects, audio and HUD, and runs the main
 * loop / state machine (menu → controls modal → playing → paused → game over).
 * -----------------------------------------------------------------------
 */
import * as THREE from "./assets/js/vendor/three.module.min.js";
import { Audio_ } from "./js/audio.js";
import { Car } from "./js/car.js";
import { CityRoad } from "./js/road.js";
import { ZombieManager } from "./js/zombies.js";
import { ObstacleManager } from "./js/obstacles.js";
import { FuelManager } from "./js/fuel.js";
import { Effects, Rain } from "./js/effects.js";
import { Collision } from "./js/collision.js";
import { UI } from "./js/ui.js";
import { Storage } from "./js/storage.js";
import { startTypewriterEffect } from "./js/ui.js";

// ---------------- Renderer / Scene / Camera ----------------
const viewport = document.getElementById("viewport");
const FOG_COLOR = 0x222a38;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.016);
scene.background = new THREE.Color(FOG_COLOR);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 300);
const baseFov = 62;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- Lighting (Single Balanced Mode) ----------------
const ambient = new THREE.AmbientLight(0x708090, 0.75);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
sun.position.set(12, 28, -6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 5;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -22;
sun.shadow.bias = -0.0025;
scene.add(sun);
scene.add(sun.target);

// Visible sky disc
const discMat = new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false });
const skyDisc = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 24), discMat);
skyDisc.position.set(16, 58, -230);
scene.add(skyDisc);

const glowCanvas = document.createElement("canvas");
glowCanvas.width = 256;
glowCanvas.height = 256;
const gctx = glowCanvas.getContext("2d");
const glowGrad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
glowGrad.addColorStop(0, "rgba(255, 240, 208, 0.45)");
glowGrad.addColorStop(0.4, "rgba(255, 240, 208, 0.15)");
glowGrad.addColorStop(1, "rgba(255, 240, 208, 0)");
gctx.fillStyle = glowGrad;
gctx.fillRect(0, 0, 256, 256);
const glowTex = new THREE.CanvasTexture(glowCanvas);
const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false, opacity: 0.75 });
const skyGlow = new THREE.Sprite(glowMat);
skyGlow.scale.set(75, 75, 1);
skyGlow.position.copy(skyDisc.position);
scene.add(skyGlow);

// ---------------- World systems ----------------
const road = new CityRoad(scene);
road.segmentSpan = 24 * 14;
const car = new Car(road.roadHalfWidth);
scene.add(car.group);

const zombieMgr = new ZombieManager(scene, road);
const obstacleMgr = new ObstacleManager(scene, road);
const fuelMgr = new FuelManager(scene, road);
const effects = new Effects(scene);
const rain = new Rain(scene);

UI.init();

// ---------------- Game state ----------------
const STATE = { MENU: "menu", CONTROLS: "controls", PLAYING: "playing", PAUSED: "paused", GAMEOVER: "gameover" };
let state = STATE.MENU;

let health, fuel, score, kills, distance, comboCount, comboTimer, bestCombo;
let baseSpeed = 22,
    difficulty = 0,
    difficultyTimer = 0,
    worldSpeed = 22;
let gameOverReason = "";
let groanTimer = 0;
let lightningTimer = 10;
const FAR_Z = -70;

// ---------------- Input ----------------
const kbInput = { left: false, right: false, drift: false };
const mobileInput = { left: false, right: false, drift: false };

const input = {
    get left() { return kbInput.left || mobileInput.left; },
    get right() { return kbInput.right || mobileInput.right; },
    get drift() { return kbInput.drift || mobileInput.drift; }
};

// --- Mobile Controller Socket Logic ---
try {
    const socket = io('https://zombie-road-rush-3d.onrender.com');
    socket.emit('registerPC');

    socket.on('qrCode', (url) => {
        const qrImg = document.getElementById('qrImage');
        if (qrImg) qrImg.src = url;
    });

    socket.on('mobileConnected', () => {
        const statusEl = document.getElementById('mobileStatus');
        if (statusEl) {
            statusEl.innerText = "CONNECTED";
            statusEl.style.color = "#00ffff";
        }
    });

    socket.on('mobileDisconnected', () => {
        const statusEl = document.getElementById('mobileStatus');
        if (statusEl) {
            statusEl.innerText = "WAITING...";
            statusEl.style.color = "#ff4444";
        }
        mobileInput.left = false;
        mobileInput.right = false;
        mobileInput.drift = false;
    });

    socket.on('controllerInput', (data) => {
        if (data.btn === 'left') mobileInput.left = data.state;
        if (data.btn === 'right') mobileInput.right = data.state;
        if (data.btn === 'drift') mobileInput.drift = data.state;
    });
} catch (e) {
    console.warn("Socket.IO not initialized. Running offline mode.");
}

// --- Keyboard Logic (Spacebar = Drift / Zombie Attack) ---
window.addEventListener("keydown", (e) => {
    const typingInField = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
    if (typingInField) return;

    if (["ArrowLeft", "a", "A"].includes(e.key)) kbInput.left = true;
    if (["ArrowRight", "d", "D"].includes(e.key)) kbInput.right = true;
    if (e.code === "Space") {
        kbInput.drift = true;
        e.preventDefault();
    }
    if (e.key === "p" || e.key === "P") togglePause();
});

window.addEventListener("keyup", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) kbInput.left = false;
    if (["ArrowRight", "d", "D"].includes(e.key)) kbInput.right = false;
    if (e.code === "Space") kbInput.drift = false;
});

// Touch controls for mobile preview in browser
let touchActive = false,
    touchStartX = 0,
    touchOriginX = 0;
renderer.domElement.addEventListener("touchstart", (e) => {
    if (state !== STATE.PLAYING) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchOriginX = car.x;
    kbInput.drift = true;
}, { passive: true });

renderer.domElement.addEventListener("touchmove", (e) => {
    if (!touchActive) return;
    const dx = e.touches[0].clientX - touchStartX;
    const targetX = touchOriginX + dx * 0.02;
    kbInput.left = targetX < car.x - 0.05;
    kbInput.right = targetX > car.x + 0.05;
}, { passive: true });

renderer.domElement.addEventListener("touchend", () => {
    touchActive = false;
    kbInput.left = false;
    kbInput.right = false;
    kbInput.drift = false;
});

let best = Storage.getBest();
UI.setStartBest(best);
UI.updateStats(0, 0, 0, best);

const lastIdentity = Storage.getLastIdentity();
UI.setIdentity(lastIdentity.company, lastIdentity.player);
let lastSubmittedRun = null;

function resetRun() {
    car.x = 0;
    car.vx = 0;
    car.setSkin(0xc94f3a, 0x7a9a3f);

    zombieMgr.reset();
    obstacleMgr.reset();
    fuelMgr.reset();
    effects.reset();
    effects.seedFires(road, 7);

    health = 100;
    fuel = 100;
    score = 0;
    kills = 0;
    distance = 0;
    comboCount = 0;
    comboTimer = 0;
    bestCombo = 1;
    baseSpeed = 22;
    difficulty = 0;
    difficultyTimer = 0;
    worldSpeed = baseSpeed;
    gameOverReason = "";
    groanTimer = 2;
    lightningTimer = 8 + Math.random() * 14;
}

function initAudioOnce() {
    Audio_.resume();
    if (state === STATE.MENU) Audio_.startMenuAmbience();
    window.removeEventListener("pointerdown", initAudioOnce);
    window.removeEventListener("keydown", initAudioOnce);
}
window.addEventListener("pointerdown", initAudioOnce);
window.addEventListener("keydown", initAudioOnce);

// ---------------- Menu & Controls Wiring ----------------
["companyInput", "playerInput"].forEach((id) => {
    const inputEl = document.getElementById(id);
    if (inputEl) {
        inputEl.addEventListener("input", () => {
            document.getElementById("identityError").classList.add("hidden");
        });
    }
});

document.getElementById("startBtn").addEventListener("click", () => {
    Audio_.button();
    if (!UI.validateIdentity()) return;

    // Show Controls Popup Modal first
    state = STATE.CONTROLS;
    UI.hideAllScreens();
    document.getElementById("controlsModal").classList.remove("hidden");
});

// NEW MAIN MENU LEADERBOARD WIRING
const mainLeaderboardBtn = document.getElementById("mainLeaderboardBtn");
if (mainLeaderboardBtn) {
    mainLeaderboardBtn.addEventListener("click", () => {
        Audio_.button();
        UI.setLeaderboard(Storage.getTopScores(), null, UI.els.menuLeaderboardList);
        UI.toggleMenuLeaderboard(true);
    });
}

const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener("click", () => {
        Audio_.button();
        UI.toggleMenuLeaderboard(false);
    });
}

const menuExportCsvBtn = document.getElementById("menuExportCsvBtn");
if (menuExportCsvBtn) {
    menuExportCsvBtn.addEventListener("click", () => {
        Audio_.button();
        Storage.exportCSV();
    });
}

document.getElementById("launchGameBtn").addEventListener("click", () => {
    Audio_.button();
    document.getElementById("controlsModal").classList.add("hidden");
    startGame();
});

// Sound Toggles
function updateSoundUI() {
    const isMuted = Audio_.isMuted();
    const label = `SOUND: ${isMuted ? "OFF" : "ON"}`;
    const mainValEl = document.getElementById("mainSoundToggleVal");
    const pauseBtnEl = document.getElementById("muteBtn");

    if (mainValEl) mainValEl.textContent = isMuted ? "OFF" : "ON";
    if (pauseBtnEl) pauseBtnEl.textContent = label;
}

const mainSoundToggleBtn = document.getElementById("mainSoundToggleBtn");
if (mainSoundToggleBtn) {
    mainSoundToggleBtn.addEventListener("click", () => {
        const nowMuted = !Audio_.isMuted();
        Audio_.setMuted(nowMuted);
        if (!nowMuted && state === STATE.MENU) Audio_.startMenuAmbience();
        updateSoundUI();
    });
}

document.getElementById("muteBtn").addEventListener("click", () => {
    const nowMuted = !Audio_.isMuted();
    Audio_.setMuted(nowMuted);
    if (!nowMuted) {
        if (state === STATE.MENU) Audio_.startMenuAmbience();
        if (state === STATE.PLAYING && rain.active) Audio_.startRain();
    }
    updateSoundUI();
});

document.getElementById("pauseBtn").addEventListener("click", togglePause);
document.getElementById("resumeBtn").addEventListener("click", togglePause);
document.getElementById("restartFromPauseBtn").addEventListener("click", () => {
    Audio_.button();
    startGame();
});
document.getElementById("quitBtn").addEventListener("click", () => {
    Audio_.button();
    returnToMenu();
});
document.getElementById("restartBtn").addEventListener("click", () => {
    Audio_.button();
    startGame();
});
document.getElementById("menuBtn").addEventListener("click", () => {
    Audio_.button();
    returnToMenu();
});
document.getElementById("exportCsvBtn").addEventListener("click", () => {
    Audio_.button();
    Storage.exportCSV();
});

function togglePause() {
    if (state === STATE.PLAYING) {
        state = STATE.PAUSED;
        UI.showScreen("pauseScreen");
        Audio_.stopEngine();
        Audio_.stopMusic();
    } else if (state === STATE.PAUSED) {
        state = STATE.PLAYING;
        UI.hideAllScreens();
        Audio_.startEngine();
        Audio_.startMusic();
    }
}

function returnToMenu() {
    state = STATE.MENU;
    UI.showHud(false);
    UI.setStartBest(best);
    UI.showScreen("startScreen");
    rain.setActive(false);
    Audio_.stopEngine();
    Audio_.stopMusic();
    Audio_.stopRain();
    Audio_.startMenuAmbience();
    startTypewriterEffect();

}

function startGame() {
    Audio_.resume();
    resetRun();
    state = STATE.PLAYING;
    UI.hideAllScreens();
    UI.showHud(true);
    UI.updateHealth(100);
    UI.updateFuel(100);
    UI.updateStats(0, 0, 0, best);
    updateSoundUI();
    Audio_.stopMenuAmbience();
    Audio_.startEngine();
    Audio_.startMusic();
    rain.setActive(true);
    Audio_.startRain();
}

function endGame(reason) {
    state = STATE.GAMEOVER;
    gameOverReason = reason;
    rain.setActive(false);
    Audio_.stopEngine();
    Audio_.stopMusic();
    Audio_.stopRain();
    Audio_.gameOver();
    const { company, player } = UI.getIdentity();
    const result = Storage.submit({ company, player, score, kills, distance });
    best = result.best;
    lastSubmittedRun = { company: company.trim() || "Unknown Company", player: player.trim() || "Unknown Player", score: Math.floor(score), timestamp: null };

    const allRuns = Storage.getAllRuns();
    lastSubmittedRun.timestamp = allRuns.length ? allRuns[allRuns.length - 1].timestamp : null;
    UI.setGameOverStats({ score, kills, distance, bestCombo, reason, isNewBest: result.isNewBest });
    UI.setLeaderboard(Storage.getTopScores(), lastSubmittedRun);
    UI.showHud(false);
    UI.showScreen("gameOverScreen");
}

// ---------------- Progressive Speed & Difficulty ----------------
function updateDifficulty(dt) {
    difficultyTimer += dt;
    if (difficultyTimer >= 6) {
        difficultyTimer = 0;
        difficulty = Math.min(difficulty + 1, 25);
    }
    worldSpeed = baseSpeed + difficulty * 1.45;
}

// ---------------- Combo System ----------------
function updateCombo(dt) {
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) comboCount = 0;
    }
}

function registerKill(zombie) {
    effects.gore(zombie.x, 0, zombie.z);
    zombie.kill();
    comboCount += 1;
    comboTimer = 1.1;
    kills += 1;
    if (comboCount > bestCombo) bestCombo = comboCount;
    const points = 10 + (comboCount - 1) * 8;
    score += points;
    Audio_.zombieKill();
    if (comboCount > 1) {
        Audio_.combo();
        UI.showCombo(`x${comboCount} COMBO! +${points}`);
    }
}

function registerKnock(zombie) {
    zombie.stagger();
    score += 3;
    Audio_.zombieKnock();
}

// ---------------- Main Game Loop Update ----------------
function update(dt) {
    updateDifficulty(dt);

    road.update(dt, worldSpeed);
    car.update(dt, input, worldSpeed / (baseSpeed + 25 * 1.45));
    zombieMgr.update(dt, difficulty, worldSpeed, car.x, FAR_Z);
    obstacleMgr.update(dt, difficulty, worldSpeed, FAR_Z);

    // Pass current distance for 500m Wrench Health Spawn
    fuelMgr.update(dt, difficulty, worldSpeed, FAR_Z, distance);

    effects.update(dt);
    effects.updateFires(dt, worldSpeed, road.segmentSpan);
    rain.update(dt, worldSpeed, car.x);

    updateCombo(dt);

    fuel -= (2.0 + difficulty * 0.12) * dt;
    distance += worldSpeed * dt;
    score += dt * 2.5;

    if (Math.random() < 0.5) {
        effects.exhaust(car.x + (Math.random() * 0.3 - 0.15), 0.3, 1.9);
    }

    groanTimer -= dt;
    if (groanTimer <= 0) {
        groanTimer = 1.5 + Math.random() * 2;
        Audio_.zombieGroan();
    }

    if (rain.active) {
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
            lightningTimer = 8 + Math.random() * 16;
            UI.flashLightning();
            Audio_.thunder();
        }
    }

    const events = Collision.check(car, zombieMgr, obstacleMgr, fuelMgr);

    for (const z of events.zombieHits) {
        const outcome = zombieMgr.resolveHit(z, car.drifting);
        if (outcome === "kill") registerKill(z);
        else registerKnock(z);
    }

    if (events.obstacleHit) {
        events.obstacleHit.hit = true;
        health -= events.obstacleHit.def.damage;
        car.flashHit();
        effects.spark(car.x, 0, 0);
        effects.addShake(0.35);
        Audio_.crash();
    }

    // Handled Fuel Canisters vs Wrench Health Pickups
    if (events.fuelCollected.length > 0) {
        for (const f of events.fuelCollected) {
            if (f.pickupType === "wrench") {
                health = Math.min(100, health + 15); // Restore 15% Health
                effects.sparkle(f.x, 0.5, f.z, 0xffaa00);
            } else {
                fuel = Math.min(100, fuel + 28); // Restore Fuel
                effects.sparkle(f.x, 0.5, f.z, 0xd98f30);
            }
            fuelMgr.remove(f);
        }
        Audio_.fuelPickup();
    }

    Audio_.setEngineSpeed(Math.min(1, difficulty / 14));

    UI.updateHealth(health);
    UI.updateFuel(fuel);
    UI.updateStats(score, kills, distance, best);
    const speedT = Math.min(1, difficulty / 16);
    UI.setSpeedVignette(speedT);
    UI.setSpeedLines(speedT);

    if (health <= 0) {
        health = 0;
        endGame("Your car couldn't take any more damage.");
    } else if (fuel <= 0) {
        fuel = 0;
        endGame("You ran out of fuel in the middle of the city.");
    }
}

// ---------------- Chase Camera ----------------
const camState = { x: 0, y: 3.1, lookX: 0, fov: baseFov };

function updateCamera(dt) {
    const speedT = Math.min(1, difficulty / 16);
    const camDistance = 6.4 + speedT * 0.8;
    const camHeight = 2.75 + speedT * 0.25;

    camState.x += (car.x - camState.x) * Math.min(1, dt * 5.5);
    camState.lookX += (car.x - camState.lookX) * Math.min(1, dt * 8);

    if (state === STATE.PLAYING) {
        effects.addShake(speedT * 0.004);
    }
    const shake = state === STATE.PLAYING ? effects.getShakeOffset(dt) : { x: 0, y: 0 };

    camera.position.set(camState.x + shake.x, camHeight + shake.y, camDistance);
    const lookTarget = new THREE.Vector3(camState.lookX * 0.5, 1.2, -14);
    camera.lookAt(lookTarget);

    const targetFov = baseFov + (car.drifting ? 4 : 0) + speedT * 4;
    camState.fov += (targetFov - camState.fov) * Math.min(1, dt * 6);
    camera.fov = camState.fov;
    camera.updateProjectionMatrix();

    sun.target.position.set(car.x, 0, -10);
}

// ---------------- Render / Loop ----------------
function render() {
    renderer.render(scene, camera);
}

let lastTime = performance.now();

function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (state === STATE.PLAYING) update(dt);
    updateCamera(dt);
    render();

    requestAnimationFrame(loop);
}

camera.position.set(0, 2.75, 6.4);
camera.lookAt(0, 1.2, -14);
sun.target.position.set(0, 0, -10);

UI.hideLoading();
requestAnimationFrame(loop);