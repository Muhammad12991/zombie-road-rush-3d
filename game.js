/**
 * game.js
 * -----------------------------------------------------------------------
 * Entry point. Sets up the Three.js scene (renderer, third-person chase
 * camera, night-city lighting + fog), wires together the car, road,
 * zombies, obstacles, fuel, effects, audio and HUD, and runs the main
 * loop / state machine (menu → playing → paused → game over).
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

// ---------------- Renderer / Scene / Camera ----------------
const viewport = document.getElementById("viewport");
const FOG_COLOR = 0x0c0a0d;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.028);
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

// ---------------- Lighting ----------------
const ambient = new THREE.AmbientLight(0x2a3550, 0.55);
scene.add(ambient);

const moon = new THREE.DirectionalLight(0x8fa8d9, 1.05);
moon.position.set(12, 24, -6);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.near = 5;
moon.shadow.camera.far = 60;
moon.shadow.camera.left = -22;
moon.shadow.camera.right = 22;
moon.shadow.camera.top = 22;
moon.shadow.camera.bottom = -22;
moon.shadow.bias = -0.0025;
scene.add(moon);
scene.add(moon.target);

// ---------------- Moon disc (visible in the sky, ignores fog) ----------------
const moonDiscMat = new THREE.MeshBasicMaterial({ color: 0xe4ebf7, fog: false });
const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 24), moonDiscMat);
moonDisc.position.set(16, 58, -230);
scene.add(moonDisc);

const glowCanvas = document.createElement("canvas");
glowCanvas.width = 256;
glowCanvas.height = 256;
const gctx = glowCanvas.getContext("2d");
const glowGrad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
glowGrad.addColorStop(0, "rgba(223,230,245,0.55)");
glowGrad.addColorStop(0.4, "rgba(223,230,245,0.18)");
glowGrad.addColorStop(1, "rgba(223,230,245,0)");
gctx.fillStyle = glowGrad;
gctx.fillRect(0, 0, 256, 256);
const glowTex = new THREE.CanvasTexture(glowCanvas);
const moonGlowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false });
const moonGlow = new THREE.Sprite(moonGlowMat);
moonGlow.scale.set(75, 75, 1);
moonGlow.position.copy(moonDisc.position);
scene.add(moonGlow);

// ---------------- Time of day (night / afternoon) ----------------
// The same directional light + sky disc double as "moon" at night and
// "sun" in the afternoon — only their color/intensity/fog change.
const TIME_KEY = "zombieRoadRush3D.timeOfDay";
const TIME_PRESETS = {
    night: {
        fog: 0x0c0a0d,
        bg: 0x0c0a0d,
        fogDensity: 0.017,
        ambientColor: 0x2a3550,
        ambientIntensity: 0.55,
        sunColor: 0x8fa8d9,
        sunIntensity: 1.05,
        discColor: 0xe4ebf7,
        glowOpacity: 1,
    },
    afternoon: {
        fog: 0x9fc0d6,
        bg: 0x8fb3cf,
        fogDensity: 0.011,
        ambientColor: 0xd7e4ea,
        ambientIntensity: 0.85,
        sunColor: 0xfff0cf,
        sunIntensity: 1.35,
        discColor: 0xfff0b8,
        glowOpacity: 0.55,
    },
};

let timeOfDay = "night";
try { timeOfDay = localStorage.getItem(TIME_KEY) || "night"; } catch (e) {}

function applyTimeOfDay(mode) {
    const p = TIME_PRESETS[mode] || TIME_PRESETS.night;
    scene.fog.color.setHex(p.fog);
    scene.fog.density = p.fogDensity;
    scene.background.setHex(p.bg);
    ambient.color.setHex(p.ambientColor);
    ambient.intensity = p.ambientIntensity;
    moon.color.setHex(p.sunColor);
    moon.intensity = p.sunIntensity;
    moonDiscMat.color.setHex(p.discColor);
    moonGlowMat.opacity = p.glowOpacity;
    timeOfDay = mode;
    try { localStorage.setItem(TIME_KEY, mode); } catch (e) {}
}

applyTimeOfDay(timeOfDay);

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
const STATE = { MENU: "menu", PLAYING: "playing", PAUSED: "paused", GAMEOVER: "gameover" };
let state = STATE.MENU;

let health, fuel, score, kills, distance, comboCount, comboTimer, bestCombo;
let baseSpeed = 15,
    difficulty = 0,
    difficultyTimer = 0,
    worldSpeed = 15;
let gameOverReason = "";
let groanTimer = 0;
let lightningTimer = 10;
const FAR_Z = -70;

// ---------------- Input ----------------
const kbInput = { left: false, right: false, drift: false };
const mobileInput = { left: false, right: false, drift: false };

// Getter object ensures existing game loop physics reads merged inputs dynamically
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
        // Safety Reset: Stop car if phone disconnects
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

// --- Keyboard Logic ---
window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) kbInput.left = true;
    if (["ArrowRight", "d", "D"].includes(e.key)) kbInput.right = true;
    if (e.key === "Shift") kbInput.drift = true;
    if (e.key === "p" || e.key === "P") togglePause();
    if (e.key === " " && state === STATE.MENU) startGame();
});
window.addEventListener("keyup", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) kbInput.left = false;
    if (["ArrowRight", "d", "D"].includes(e.key)) kbInput.right = false;
    if (e.key === "Shift") kbInput.drift = false;
});

let best = Storage.getBest();
UI.setStartBest(best);
UI.updateStats(0, 0, 0, best);

// Prefill company/player name from last time this browser played
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
    baseSpeed = 15;
    difficulty = 0;
    difficultyTimer = 0;
    worldSpeed = baseSpeed;
    gameOverReason = "";
    groanTimer = 2;
    lightningTimer = 8 + Math.random() * 14;
}

// ---------------- Input ----------------
window.addEventListener("keydown", (e) => {
    const typingInField = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
    if (typingInField) return; // don't hijack keys while the player is typing their name
    if (["ArrowLeft", "a", "A"].includes(e.key)) input.left = true;
    if (["ArrowRight", "d", "D"].includes(e.key)) input.right = true;
    if (e.key === "Shift") input.drift = true;
    if (e.key === "p" || e.key === "P") togglePause();
    if (e.key === " " && state === STATE.MENU) startGame();
});
window.addEventListener("keyup", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) input.left = false;
    if (["ArrowRight", "d", "D"].includes(e.key)) input.right = false;
    if (e.key === "Shift") input.drift = false;
});

let touchActive = false,
    touchStartX = 0,
    touchOriginX = 0;
renderer.domElement.addEventListener("touchstart", (e) => {
    if (state !== STATE.PLAYING) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchOriginX = car.x;
    input.drift = true;
}, { passive: true });
renderer.domElement.addEventListener("touchmove", (e) => {
    if (!touchActive) return;
    const dx = e.touches[0].clientX - touchStartX;
    const targetX = touchOriginX + dx * 0.02;
    input.left = targetX < car.x - 0.05;
    input.right = targetX > car.x + 0.05;
}, { passive: true });
renderer.domElement.addEventListener("touchend", () => {
    touchActive = false;
    input.left = false;
    input.right = false;
    input.drift = false;
});

// first user interaction unlocks WebAudio; kick off the menu ambience then
function initAudioOnce() {
    Audio_.resume();
    if (state === STATE.MENU) Audio_.startMenuAmbience();
    window.removeEventListener("pointerdown", initAudioOnce);
    window.removeEventListener("keydown", initAudioOnce);
}
window.addEventListener("pointerdown", initAudioOnce);
window.addEventListener("keydown", initAudioOnce);

// ---------------- Menu wiring ----------------
["companyInput", "playerInput"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
        document.getElementById("identityError").classList.add("hidden");
    });
});
document.getElementById("startBtn").addEventListener("click", () => {
    Audio_.button();
    startGame();
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
document.getElementById("muteBtn").addEventListener("click", (e) => {
    const nowMuted = !Audio_.isMuted();
    Audio_.setMuted(nowMuted);
    if (!nowMuted) {
        if (state === STATE.MENU) Audio_.startMenuAmbience();
        if (state === STATE.PLAYING && rain.active) Audio_.startRain();
    }
    e.target.textContent = `SOUND: ${nowMuted ? "OFF" : "ON"}`;
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

const timeToggleBtn = document.getElementById("timeToggleBtn");
const timeToggleVal = document.getElementById("timeToggleVal");

function refreshTimeToggleLabel() {
    if (timeToggleVal) timeToggleVal.textContent = timeOfDay === "night" ? "NIGHT" : "AFTERNOON";
}
if (timeToggleBtn) {
    timeToggleBtn.addEventListener("click", () => {
        Audio_.button();
        applyTimeOfDay(timeOfDay === "night" ? "afternoon" : "night");
        refreshTimeToggleLabel();
    });
}
refreshTimeToggleLabel();

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
}

function startGame() {
    if (!UI.validateIdentity()) return;
    Audio_.resume();
    resetRun();
    state = STATE.PLAYING;
    UI.hideAllScreens();
    UI.showHud(true);
    UI.updateHealth(100);
    UI.updateFuel(100);
    UI.updateStats(0, 0, 0, best);
    document.getElementById("muteBtn").textContent = `SOUND: ${Audio_.isMuted() ? "OFF" : "ON"}`;
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
    // Storage.submit assigns the timestamp internally; pull it back off the freshest run so
    // the leaderboard can highlight exactly this run (not just any run with a matching score).
    const allRuns = Storage.getAllRuns();
    lastSubmittedRun.timestamp = allRuns.length ? allRuns[allRuns.length - 1].timestamp : null;
    UI.setGameOverStats({ score, kills, distance, bestCombo, reason, isNewBest: result.isNewBest });
    UI.setLeaderboard(Storage.getTopScores(), lastSubmittedRun);
    UI.showHud(false);
    UI.showScreen("gameOverScreen");
}

// ---------------- Difficulty ----------------
function updateDifficulty(dt) {
    difficultyTimer += dt;
    if (difficultyTimer >= 8) {
        difficultyTimer = 0;
        difficulty = Math.min(difficulty + 1, 20);
    }
    worldSpeed = baseSpeed + difficulty * 1.15;
}

// ---------------- Combo ----------------
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

// ---------------- Main update ----------------
function update(dt) {
    updateDifficulty(dt);

    road.update(dt, worldSpeed);
    car.update(dt, input, worldSpeed / (baseSpeed + 20 * 1.15));
    zombieMgr.update(dt, difficulty, worldSpeed, car.x, FAR_Z);
    obstacleMgr.update(dt, difficulty, worldSpeed, FAR_Z);
    fuelMgr.update(dt, difficulty, worldSpeed, FAR_Z);
    effects.update(dt);
    effects.updateFires(dt, worldSpeed, road.segmentSpan);
    rain.update(dt, worldSpeed, car.x);

    updateCombo(dt);

    fuel -= (2.0 + difficulty * 0.1) * dt;
    distance += worldSpeed * dt;
    score += dt * 2;

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

    if (events.fuelCollected.length > 0) {
        for (const f of events.fuelCollected) {
            fuel = Math.min(100, fuel + 28);
            effects.sparkle(f.x, 0.5, f.z, 0xd98f30);
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

// ---------------- Chase camera ----------------
const camState = { x: 0, y: 3.1, lookX: 0, fov: baseFov };

function updateCamera(dt) {
    const speedT = Math.min(1, difficulty / 16);
    const camDistance = 6.4 + speedT * 0.8;
    const camHeight = 2.75 + speedT * 0.25;

    camState.x += (car.x - camState.x) * Math.min(1, dt * 5.5);
    camState.lookX += (car.x - camState.lookX) * Math.min(1, dt * 8);

    if (state === STATE.PLAYING) {
        // tiny continuous rumble that grows gently with speed — an extra,
        // subtle "you're going faster" cue on top of the vignette/FOV/engine pitch
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

    moon.target.position.set(car.x, 0, -10);
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

// initial idle camera framing before first game
camera.position.set(0, 2.75, 6.4);
camera.lookAt(0, 1.2, -14);
moon.target.position.set(0, 0, -10);

UI.hideLoading();
requestAnimationFrame(loop);
// force-redeploy