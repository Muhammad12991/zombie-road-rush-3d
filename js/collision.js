/**
 * collision.js
 * -----------------------------------------------------------------------
 * The car is conceptually fixed at world Z=0 (the world scrolls past it),
 * so collision is a simple 2D (X/Z) box-overlap test between the car and
 * each entity's current world position.
 * -----------------------------------------------------------------------
 */
export const Collision = {
    overlap(car, entity) {
        const cb = car.bounds;
        const eb = entity.bounds;
        return (
            Math.abs(cb.x - eb.x) < cb.halfW + eb.halfW &&
            Math.abs(cb.z - eb.z) < cb.halfL + eb.halfL
        );
    },

    check(car, zombieMgr, obstacleMgr, fuelMgr) {
        const result = { zombieHits: [], obstacleHit: null, fuelCollected: [] };

        for (const z of zombieMgr.list) {
            if (z.state !== "alive") continue;
            if (this.overlap(car, z)) result.zombieHits.push(z);
        }

        for (const o of obstacleMgr.list) {
            if (o.hit) continue;
            if (this.overlap(car, o)) { result.obstacleHit = o; break; }
        }

        for (const f of fuelMgr.list) {
            if (this.overlap(car, f)) result.fuelCollected.push(f);
        }

        return result;
    },
};