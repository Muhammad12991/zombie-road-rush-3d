# Zombie Road Rush — 3D

A polished, single-player **3D browser** arcade racer built with
[Three.js](https://threejs.org). Third-person chase camera, always NFS-style
— never top-down, never first-person. The car drives forward automatically;
you steer left/right, with smooth acceleration, drift, engine sound,
collision effects, and screen shake.

## Run it
No build step, no server, no internet connection required — Three.js is
bundled locally in `assets/js/vendor/`.

1. Download / clone this folder.
2. Open `index.html` in a modern desktop browser (Chrome, Edge, Firefox).

> This game uses ES modules (`<script type="module">`), which some browsers
> block on `file://` URLs for security reasons. If the page loads but stays
> on "Loading the city...", serve the folder locally instead — e.g.
> `npx serve .` or VS Code's "Live Server" extension — then open the
> `http://localhost` link it gives you. No install/build beyond that.

## Controls
| Action  | Key                  | Touch |
|---------|-----------------------|-------|
| Steer   | `←` `→` or `A` `D`    | Drag left/right |
| Drift   | `Shift`                | Hold while dragging |
| Pause   | `P` or the ❚❚ button   | ❚❚ button |

## Core rules (as specified)
- **Auto-forward driving.** The car always moves forward; you only control
  lateral steering.
- **Zombies never damage the car.** Hitting one always scores points.
- **Mixed hit outcomes** (the tactical hook):
  - Most hits **knock the zombie aside** — it survives, staggers briefly,
    and you get a small score bump. No kill, no combo.
  - **Drifting into a zombie always destroys it** — instant kill, full
    combo credit.
  - Even without drifting, **every 3rd hit in an active combo window is a
    guaranteed "power hit"** that destroys the zombie — so chaining hits
    quickly is worth it even outside a drift.
- **Obstacles** (barriers, wreckage, potholes) reduce **Health**. Health at
  0 → game over.
- **Fuel** drains continuously; fuel canisters restore it. Fuel at 0 →
  game over.
- **Difficulty ramps** over time: world speed, zombie density, and
  obstacle frequency all increase; fuel spawns get comparatively rarer.
- **Score, kills, distance, best score** (persisted locally), **pause**,
  **game over / restart** are all implemented, plus a synthesized engine
  sound that revs with speed, collision sparks + screen shake, and a
  subtle speed vignette.

## Project structure
```
ZombieRoadRush3D/
├── index.html              # Canvas mount + all HUD/menu markup
├── style.css                # HUD & menu visual identity
├── game.js                   # Entry point: scene/camera/renderer, main loop,
│                               state machine, input, difficulty, wiring
│
├── assets/js/vendor/
│   └── three.module.min.js   # Three.js, bundled locally (no CDN needed)
│
└── js/
    ├── audio.js               # Synthesized engine loop + all SFX (WebAudio)
    ├── car.js                  # Player car: procedural mesh + steering physics
    ├── road.js                  # City: recycled road segments, buildings, streetlights
    ├── zombies.js                # Zombie mesh + AI + mixed knock/kill resolution
    ├── obstacles.js               # Barriers / wreckage / potholes (damage the car)
    ├── fuel.js                     # Fuel canister pickups
    ├── effects.js                   # Fire barrels, particle bursts, screen shake
    ├── collision.js                  # Car ↔ entity overlap testing
    ├── ui.js                          # DOM HUD (bars, stats, combo popup, screens)
    └── storage.js                      # Best-score persistence (localStorage)
```

## About the art
Every model — car, zombies, buildings, barriers, fuel canisters, fire
barrels, street lights — is **procedurally built from primitive
geometry** (boxes, cylinders, spheres, cones) directly in code, styled
with the game's color palette and lit by real Three.js lights (moonlight,
car headlights, streetlamps, fire glow) plus fog for that dark, abandoned
city atmosphere. There are no external model or texture files to manage —
the whole game is code you can read top to bottom.

To swap in real models later: replace the `_build...()` mesh-construction
functions in `car.js`, `zombies.js`, `road.js`, `obstacles.js`, `fuel.js`,
and `effects.js` with a `GLTFLoader` load of your own assets, keeping the
same group/position/rotation contract each class already exposes.

## Extending
- **New hazard type**: add an entry to `TYPES` in `obstacles.js` (damage +
  half-extents) and a `build...()` mesh function.
- **New zombie behavior**: extend the `switch` in `Zombie.update()` in
  `zombies.js`.
- **Tune the hit-mix ratio**: `ZombieManager.resolveHit()` in `zombies.js`
  — change the `% 3` streak threshold or the drift-always-kills rule.
- **Tune difficulty pacing**: `updateDifficulty()` and the various
  `spawnTimer` formulas in each manager's `update()`/`_spawn()`.

## Removed by design (per spec)
Top-down and first-person camera modes were intentionally excluded —
third-person chase only, as specified.
