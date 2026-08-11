/**
 * road.js
 * -----------------------------------------------------------------------
 * Builds and endlessly recycles the abandoned-city road: asphalt
 * segments with lane markings, roadside buildings with lit windows,
 * street lights, and warning/direction signboards. Everything scrolls
 * toward the (fixed) car by moving objects along +Z each frame; anything
 * that passes behind the camera is recycled back out to the far
 * distance, giving a seamless infinite road without ever growing the
 * scene graph.
 *
 * CURVES: the road is visually curved using curveOffset(z) — a smooth,
 * purely cosmetic sideways offset applied only to rendered mesh
 * positions. It always evaluates to 0 right at the car (z ≈ 0), so the
 * car and camera never need to change, and gameplay math (lanes,
 * collisions) stays untouched — only what you SEE bends.
 * -----------------------------------------------------------------------
 */
import * as THREE from "../assets/js/vendor/three.module.min.js";

const SEGMENT_LENGTH = 8; // shorter segments = smoother-looking curves
const SEGMENT_COUNT = 42; // 8 * 42 = 336, same total draw distance as before
const BUILDING_ROWS = 16;
const LANE_COUNT = 3;
const ROAD_HALF_WIDTH = 6.6;

// ---------------- Curve tuning ----------------
// Feel free to tweak these numbers if the curves feel too strong, too
// weak, too close, too far, too frequent, or too rare. IMPORTANT: keep
// the curve's peak within roughly 60-80 units, or the night fog will
// hide it before it's visible.
const CURVE_AMPLITUDE = 2.8; // max sideways offset (world units) at the peak of a curve
const CURVE_PERIOD = 130; // distance (units) between the start of one curve and the next
const CURVE_WINDOW_START = 0.03; // curve begins at this fraction of the period
const CURVE_WINDOW_END = 0.75; // curve ends at this fraction of the period (rest is straight)

export function curveOffset(z) {
    const distanceAhead = -z; // positive = ahead of the car
    if (distanceAhead <= 0) return 0;
    const t = (distanceAhead % CURVE_PERIOD) / CURVE_PERIOD;
    if (t < CURVE_WINDOW_START || t > CURVE_WINDOW_END) return 0;
    const local = (t - CURVE_WINDOW_START) / (CURVE_WINDOW_END - CURVE_WINDOW_START);
    const shaped = 0.5 - 0.5 * Math.cos(local * Math.PI * 2); // smooth 0 -> 1 -> 0 bump
    const periodIndex = Math.floor(distanceAhead / CURVE_PERIOD);
    const sign = periodIndex % 2 === 0 ? 1 : -1; // alternate left/right each curve
    return sign * CURVE_AMPLITUDE * shaped;
}

// How steeply the curve is bending sideways at this point (used to actually
// ROTATE each road segment so it points along the curve, instead of just
// sliding sideways — this is what makes segments join up into one smooth
// bending road instead of a disconnected staircase).
const TANGENT_EPS = 1.0;

function curveTangentAngle(z) {
    const slope = (curveOffset(z + TANGENT_EPS) - curveOffset(z - TANGENT_EPS)) / (2 * TANGENT_EPS);
    return Math.atan(slope);
}

// ---------------- Signboards ----------------
const SIGN_DEFS = [
    { text: "ZOMBIES\nAHEAD", bg: "#15170f", fg: "#9fc45a", accent: "#7a9a3f" },
    { text: "DANGER", bg: "#170f0d", fg: "#dd4a30", accent: "#b3311f" },
    { text: "SLOW\nDOWN", bg: "#17150d", fg: "#d9c34a", accent: "#d9c34a" },
    { text: "45", bg: "#101010", fg: "#e8e4d8", accent: "#b3311f" },
    { text: "CITY\nLIMIT", bg: "#141414", fg: "#d9d3bf", accent: "#8a8579" },
    { text: "SHELTER \u2192", bg: "#131a10", fg: "#9fc45a", accent: "#7a9a3f" },
    { text: "NO\nSURVIVORS", bg: "#170f0d", fg: "#dd4a30", accent: "#b3311f" },
    { text: "KEEP\nMOVING", bg: "#15170f", fg: "#d9c34a", accent: "#7a9a3f" },
];

function makeSignTexture(def) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = def.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = def.fg;
    ctx.font = "bold 42px Arial Narrow, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = def.text.split("\n");
    const lineHeight = 46;
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, startY + i * lineHeight));
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

// ---------------- Roadside trees ----------------
// Gaunt, half-bare trees fitting the abandoned-city mood (not lush green).
function buildTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 });
    const trunkHeight = 3 + Math.random() * 3.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, trunkHeight, 6), trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const branchCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branchCount; i++) {
        const len = 0.8 + Math.random() * 1.3;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, len, 5), trunkMat);
        const angle = Math.random() * Math.PI * 2;
        const tilt = 0.5 + Math.random() * 0.6;
        branch.position.set(0, trunkHeight * (0.55 + Math.random() * 0.4), 0);
        branch.rotation.z = Math.cos(angle) * tilt;
        branch.rotation.x = Math.sin(angle) * tilt;
        branch.translateY(len / 2);
        branch.castShadow = true;
        group.add(branch);
    }

    // sparse dark foliage clumps — kept minimal for the dead/abandoned feel
    if (Math.random() < 0.6) {
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x232a18, roughness: 1 });
        const clumps = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < clumps; i++) {
            const clump = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.4, 6, 6), foliageMat);
            clump.position.set(
                (Math.random() - 0.5) * 1.2,
                trunkHeight * 0.8 + Math.random() * 0.6,
                (Math.random() - 0.5) * 1.2
            );
            group.add(clump);
        }
    }

    return group;
}

function buildSign() {
    const def = SIGN_DEFS[Math.floor(Math.random() * SIGN_DEFS.length)];
    const tex = makeSignTexture(def);
    const group = new THREE.Group();

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.7, metalness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6), poleMat);
    pole.position.y = 1.3;
    pole.castShadow = true;
    group.add(pole);

    const boardMat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.35,
        roughness: 0.6,
        side: THREE.DoubleSide,
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95), boardMat);
    board.position.set(0, 2.35, 0);
    group.add(board);

    return group;
}

export class CityRoad {
    constructor(scene) {
        this.scene = scene;
        this.laneCount = LANE_COUNT;
        this.roadHalfWidth = ROAD_HALF_WIDTH;
        this.laneWidth = (ROAD_HALF_WIDTH * 2) / LANE_COUNT;

        this.segments = [];
        this.buildingsLeft = [];
        this.buildingsRight = [];
        this.streetlights = [];
        this.signs = [];
        this.trees = [];

        this._buildGround();
        this._buildSegments();
        this._buildBuildings();
        this._buildStreetlights();
        this._buildSigns();
        this._buildTrees();
    }

    laneCenterX(laneIndex) {
        return -this.roadHalfWidth + this.laneWidth * (laneIndex + 0.5);
    }

    _buildGround() {
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 1 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 4000), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.02, -1200);
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    _buildSegments() {
        const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x232228, roughness: 0.95 });
        const lineMat = new THREE.MeshStandardMaterial({ color: 0xd9c34a, emissive: 0x554715, emissiveIntensity: 0.4 });
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xb3311f, emissive: 0x5a1810, emissiveIntensity: 0.5 });

        for (let i = 0; i < SEGMENT_COUNT; i++) {
            const group = new THREE.Group();

            const asphalt = new THREE.Mesh(
                new THREE.BoxGeometry(this.roadHalfWidth * 2 + 1, 0.2, SEGMENT_LENGTH),
                asphaltMat
            );
            asphalt.position.y = -0.1;
            asphalt.receiveShadow = true;
            group.add(asphalt);

            // lane dividers
            for (let lane = 1; lane < this.laneCount; lane++) {
                const x = -this.roadHalfWidth + this.laneWidth * lane;
                for (let d = 0; d < SEGMENT_LENGTH; d += 4) {
                    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 2), lineMat);
                    dash.position.set(x, 0.005, -SEGMENT_LENGTH / 2 + d);
                    group.add(dash);
                }
            }

            // edge strips
            [-this.roadHalfWidth, this.roadHalfWidth].forEach((x) => {
                const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, SEGMENT_LENGTH), edgeMat);
                strip.position.set(x, 0.01, 0);
                group.add(strip);
            });

            group.position.z = -i * SEGMENT_LENGTH;
            this.scene.add(group);
            this.segments.push(group);
        }
    }

    _makeBuilding() {
        const height = 6 + Math.random() * 26;
        const width = 5 + Math.random() * 5;
        const depth = 5 + Math.random() * 5;
        const shade = 0.08 + Math.random() * 0.08;
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(shade, shade * 0.95, shade * 1.05),
            roughness: 0.9,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
        mesh.position.y = height / 2;
        mesh.castShadow = true;

        // lit windows (instanced-ish via a small emissive plane grid, kept sparse for perf)
        const winMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a12,
            emissive: 0xd9c34a,
            emissiveIntensity: 0,
        });
        const rows = Math.floor(height / 2.2);
        const cols = Math.floor(width / 1.4);
        const group = new THREE.Group();
        group.add(mesh);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.35) continue; // most windows dark — abandoned city
                const lit = Math.random() < 0.5;
                const wMat = winMat.clone();
                wMat.emissiveIntensity = lit ? 0.5 + Math.random() * 0.6 : 0;
                wMat.emissive.set(lit ? (Math.random() < 0.7 ? 0xd9c34a : 0x7a9a3f) : 0x000000);
                const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), wMat);
                win.position.set(-width / 2 + 0.9 + c * 1.4, 1.4 + r * 2.2, depth / 2 + 0.02);
                group.add(win);
            }
        }

        return group;
    }

    _buildBuildings() {
        const gapZ = (BUILDING_ROWS > 0) ? (SEGMENT_LENGTH * SEGMENT_COUNT) / BUILDING_ROWS : SEGMENT_LENGTH;
        for (let side = -1; side <= 1; side += 2) {
            const list = side < 0 ? this.buildingsLeft : this.buildingsRight;
            for (let i = 0; i < BUILDING_ROWS; i++) {
                const b = this._makeBuilding();
                const x = side * (this.roadHalfWidth + 4 + Math.random() * 6);
                b.position.set(x, 0, -i * gapZ - Math.random() * 6);
                b.userData.baseX = x;
                this.scene.add(b);
                list.push(b);
            }
        }
    }

    _buildStreetlights() {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.7, metalness: 0.3 });
        const lampMat = new THREE.MeshStandardMaterial({ color: 0xd9c34a, emissive: 0xd9c34a, emissiveIntensity: 1.6 });

        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 10; i++) {
                const group = new THREE.Group();
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 6), poleMat);
                pole.position.y = 2.6;
                group.add(pole);

                const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), poleMat);
                arm.position.set(-side * 0.7, 5.1, 0);
                group.add(arm);

                const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lampMat);
                lamp.position.set(-side * 1.35, 5.0, 0);
                group.add(lamp);

                // real point light on ~half the poles to keep perf sane
                if (i % 2 === 0) {
                    const light = new THREE.PointLight(0xd9c34a, 3.5, 12, 2);
                    light.position.copy(lamp.position);
                    group.add(light);
                }

                const x = side * (this.roadHalfWidth + 0.6);
                group.position.set(x, 0, -i * (SEGMENT_LENGTH * SEGMENT_COUNT) / 10 - 4);
                group.userData.baseX = x;
                this.scene.add(group);
                this.streetlights.push(group);
            }
        }
    }

    _buildSigns(count = 7) {
        const totalLen = SEGMENT_LENGTH * SEGMENT_COUNT;
        for (let i = 0; i < count; i++) {
            const sign = buildSign();
            const side = Math.random() < 0.5 ? -1 : 1;
            const x = side * (this.roadHalfWidth + 2.4 + Math.random() * 1.5);
            sign.rotation.y = side < 0 ? Math.PI / 2 - 0.15 : -Math.PI / 2 + 0.15;
            sign.position.set(x, 0, -Math.random() * totalLen);
            sign.userData.baseX = x;
            this.scene.add(sign);
            this.signs.push(sign);
        }
    }

    _buildTrees(countPerSide = 13) {
        const totalLen = SEGMENT_LENGTH * SEGMENT_COUNT;
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < countPerSide; i++) {
                const tree = buildTree();
                const x = side * (this.roadHalfWidth + 1.4 + Math.random() * 2.3);
                tree.position.set(x, 0, -Math.random() * totalLen);
                tree.rotation.y = Math.random() * Math.PI * 2;
                tree.userData.baseX = x;
                this.scene.add(tree);
                this.trees.push(tree);
            }
        }
    }

    update(dt, speed) {
        const dz = speed * dt;
        const totalLen = SEGMENT_LENGTH * SEGMENT_COUNT;
        const recycleZ = 12;

        for (const seg of this.segments) {
            seg.position.z += dz;
            if (seg.position.z > recycleZ) seg.position.z -= totalLen;
            seg.position.x = curveOffset(seg.position.z);
            seg.rotation.y = curveTangentAngle(seg.position.z);
        }

        const buildingSpan = totalLen;
        for (const b of this.buildingsLeft.concat(this.buildingsRight)) {
            b.position.z += dz;
            if (b.position.z > recycleZ + 10) b.position.z -= buildingSpan + Math.random() * 6;
            b.position.x = b.userData.baseX + curveOffset(b.position.z);
        }

        for (const s of this.streetlights) {
            s.position.z += dz;
            if (s.position.z > recycleZ) s.position.z -= totalLen;
            s.position.x = s.userData.baseX + curveOffset(s.position.z);
        }

        for (const s of this.signs) {
            s.position.z += dz;
            if (s.position.z > recycleZ) s.position.z -= totalLen;
            s.position.x = s.userData.baseX + curveOffset(s.position.z);
        }

        for (const t of this.trees) {
            t.position.z += dz;
            if (t.position.z > recycleZ) t.position.z -= totalLen;
            t.position.x = t.userData.baseX + curveOffset(t.position.z);
        }
    }
}