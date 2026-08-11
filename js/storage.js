/**
 * storage.js
 * -----------------------------------------------------------------------
 * Persistence layer for Zombie Road Rush 3D.
 *
 * This is a browser-only game (no real server), so "the backend" here
 * means: every single played game is written to localStorage forever
 * (never trimmed, never overwritten) under ALL_KEY. That full log is
 * what the "Export CSV" button dumps.
 *
 * The on-screen leaderboard only ever shows the top 10 scores, computed
 * on the fly from that full log — it never deletes anything.
 *
 * Each run is stored as:
 *   { company, player, score, kills, distance, timestamp }
 * where `timestamp` is an ISO string set at the moment the run ends.
 *
 * Players identify themselves as "[Company name] - [Player name]",
 * captured as two separate fields (company / player) so the CSV export
 * has clean, sortable columns instead of one free-text name blob.
 * -----------------------------------------------------------------------
 */
export const Storage = {
    KEY: "zombieRoadRush3D.best",
    ALL_KEY: "zombieRoadRush3D.allRuns",
    IDENTITY_KEY: "zombieRoadRush3D.lastIdentity",
    LEADERBOARD_LIMIT: 10,

    // ---------------- Best score (all-time, this device) ----------------
    getBest() {
        try {
            const v = parseInt(localStorage.getItem(this.KEY), 10);
            return Number.isFinite(v) ? v : 0;
        } catch (e) {
            return 0;
        }
    },

    // ---------------- Full run log ("backend") ----------------
    getAllRuns() {
        try {
            const raw = localStorage.getItem(this.ALL_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    },

    _appendRun(run) {
        try {
            const list = this.getAllRuns();
            list.push(run); // append-only — every game ever played stays here
            localStorage.setItem(this.ALL_KEY, JSON.stringify(list));
        } catch (e) {
            // localStorage full or unavailable — fail silently, game still playable
        }
    },

    // ---------------- Last-used identity (convenience, not required) ----------------
    getLastIdentity() {
        try {
            const raw = localStorage.getItem(this.IDENTITY_KEY);
            const obj = raw ? JSON.parse(raw) : null;
            return obj && typeof obj === "object" ? obj : { company: "", player: "" };
        } catch (e) {
            return { company: "", player: "" };
        }
    },

    _saveLastIdentity(company, player) {
        try {
            localStorage.setItem(this.IDENTITY_KEY, JSON.stringify({ company, player }));
        } catch (e) {}
    },

    // ---------------- Submit a finished run ----------------
    /**
     * @param {Object} run
     * @param {string} run.company
     * @param {string} run.player
     * @param {number} run.score
     * @param {number} run.kills
     * @param {number} run.distance
     */
    submit({ company, player, score, kills, distance }) {
        const cleanCompany = (company || "").trim() || "Unknown Company";
        const cleanPlayer = (player || "").trim() || "Unknown Player";
        const s = Math.floor(score) || 0;

        const best = this.getBest();
        let isNewBest = false;
        if (s > best) {
            try { localStorage.setItem(this.KEY, String(s)); } catch (e) {}
            isNewBest = true;
        }

        this._appendRun({
            company: cleanCompany,
            player: cleanPlayer,
            score: s,
            kills: Math.floor(kills) || 0,
            distance: Math.floor(distance) || 0,
            timestamp: new Date().toISOString(),
        });
        this._saveLastIdentity(cleanCompany, cleanPlayer);

        return { best: isNewBest ? s : best, isNewBest };
    },

    // ---------------- On-screen leaderboard (top 10 only) ----------------
    getTopScores(limit = this.LEADERBOARD_LIMIT) {
        const all = this.getAllRuns();
        return all
            .slice()
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },

    // ---------------- CSV export (full history, every run) ----------------
    exportCSV() {
        const runs = this.getAllRuns().slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const escapeCsv = (val) => {
            const str = String(val || "");
            if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
            return str;
        };

        const header = ["Timestamp", "Company", "Player", "Score", "Kills", "Distance (m)"];
        const rows = runs.map((r) => [
            r.timestamp,
            r.company,
            r.player,
            r.score,
            r.kills,
            r.distance,
        ]);

        const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = `zombie-road-rush-leaderboard_${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return runs.length;
    },
};