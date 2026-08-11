/**
 * ui.js
 * -----------------------------------------------------------------------
 * DOM-side HUD and screen management.
 * -----------------------------------------------------------------------
 */
export const UI = {
    els: {},

    init() {
        this.els = {
            hud: document.getElementById("hud"),
            healthFill: document.getElementById("healthFill"),
            fuelFill: document.getElementById("fuelFill"),
            scoreVal: document.getElementById("scoreVal"),
            killsVal: document.getElementById("killsVal"),
            distVal: document.getElementById("distVal"),
            bestVal: document.getElementById("bestVal"),
            comboPopup: document.getElementById("comboPopup"),
            speedFx: document.getElementById("speedFx"),
            speedLines: document.getElementById("speedLines"),
            lightningFlash: document.getElementById("lightningFlash"),
            startScreen: document.getElementById("startScreen"),
            pauseScreen: document.getElementById("pauseScreen"),
            gameOverScreen: document.getElementById("gameOverScreen"),
            loadingScreen: document.getElementById("loadingScreen"),
            gameOverReason: document.getElementById("gameOverReason"),
            finalScore: document.getElementById("finalScore"),
            finalKills: document.getElementById("finalKills"),
            finalDist: document.getElementById("finalDist"),
            finalCombo: document.getElementById("finalCombo"),
            newBest: document.getElementById("newBest"),
            startBest: document.getElementById("startBest"),
            leaderboardList: document.getElementById("leaderboardList"),
            companyInput: document.getElementById("companyInput"),
            playerInput: document.getElementById("playerInput"),
            identityError: document.getElementById("identityError"),
            exportCsvBtn: document.getElementById("exportCsvBtn"),
        };

        this._buildSpeedLines();
    },

    _buildSpeedLines() {
        const el = this.els.speedLines;
        if (!el || el.dataset.built) return;
        for (let i = 0; i < 10; i++) {
            const line = document.createElement("div");
            line.className = "speed-line";
            const angle = -16 + Math.random() * 32;
            const topPct = 8 + Math.random() * 84;
            const delay = Math.random() * 1.2;
            line.style.setProperty("--sl-top", `${topPct}%`);
            line.style.setProperty("--sl-angle", `${angle}deg`);
            line.style.setProperty("--sl-delay", `${delay}s`);
            line.style.setProperty("--sl-side", i % 2 === 0 ? "-1" : "1");
            el.appendChild(line);
        }
        el.dataset.built = "1";
    },

    hideLoading() { this.els.loadingScreen.classList.add("hidden"); },

    showHud(show) { this.els.hud.classList.toggle("hidden", !show); },

    updateHealth(pct) {
        this.els.healthFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        this.els.healthFill.style.filter = pct < 25 ? "brightness(1.3) saturate(1.4)" : "none";
    },

    updateFuel(pct) {
        this.els.fuelFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    },

    updateStats(score, kills, distanceMeters, best) {
        this.els.scoreVal.textContent = Math.floor(score).toLocaleString();
        this.els.killsVal.textContent = kills;
        this.els.distVal.textContent = `${Math.floor(distanceMeters)}m`;
        this.els.bestVal.textContent = Math.floor(best).toLocaleString();
    },

    setSpeedVignette(intensity) {
        // intensity 0..1 — subtle dark vignette that tightens at high speed
        const blur = 40 + intensity * 60;
        const spread = 10 + intensity * 40;
        this.els.speedFx.style.boxShadow = `inset 0 0 ${blur}px ${spread}px rgba(0,0,0,${0.15 + intensity * 0.35})`;
    },

    setSpeedLines(intensity) {
        if (!this.els.speedLines) return;
        const t = Math.max(0, Math.min(1, intensity));
        this.els.speedLines.style.opacity = t.toFixed(2);
        this.els.speedLines.style.setProperty("--sl-duration", `${(1.1 - t * 0.6).toFixed(2)}s`);
    },

    flashLightning() {
        const el = this.els.lightningFlash;
        if (!el) return;
        el.style.transition = "none";
        el.style.opacity = "0.55";
        requestAnimationFrame(() => {
            el.style.transition = "opacity 0.9s ease-out";
            el.style.opacity = "0";
        });
    },

    showCombo(text) {
        const el = this.els.comboPopup;
        el.textContent = text;
        el.classList.remove("hidden");
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
        clearTimeout(this._comboTimeout);
        this._comboTimeout = setTimeout(() => el.classList.add("hidden"), 700);
    },

    showScreen(name) {
        const screens = ["startScreen", "pauseScreen", "gameOverScreen"];
        for (const s of screens) this.els[s].classList.toggle("hidden", s !== name);
    },

    hideAllScreens() {
        ["startScreen", "pauseScreen", "gameOverScreen"].forEach((s) => this.els[s].classList.add("hidden"));
    },

    setStartBest(best) { this.els.startBest.textContent = Math.floor(best).toLocaleString(); },

    setGameOverStats({ score, kills, distance, bestCombo, reason, isNewBest }) {
        this.els.gameOverReason.textContent = reason;
        this.els.finalScore.textContent = Math.floor(score).toLocaleString();
        this.els.finalKills.textContent = kills;
        this.els.finalDist.textContent = `${Math.floor(distance)}m`;
        this.els.finalCombo.textContent = `x${bestCombo}`;
        this.els.newBest.classList.toggle("hidden", !isNewBest);
    },

    setLeaderboard(topScores, justPlayed) {
        const el = this.els.leaderboardList;
        if (!el) return;
        el.innerHTML = "";
        if (!topScores.length) {
            const empty = document.createElement("div");
            empty.className = "lb-empty";
            empty.textContent = "No runs recorded yet.";
            el.appendChild(empty);
            return;
        }
        topScores.forEach((entry, i) => {
            const row = document.createElement("div");
            const isThisRun =
                justPlayed &&
                entry.company === justPlayed.company &&
                entry.player === justPlayed.player &&
                entry.score === justPlayed.score &&
                entry.timestamp === justPlayed.timestamp;
            row.className = "lb-row" + (isThisRun ? " lb-current" : "");

            const rank = document.createElement("span");
            rank.className = "lb-rank";
            rank.textContent = `${i + 1}`;

            const nameEl = document.createElement("span");
            nameEl.className = "lb-name";
            nameEl.textContent = `${entry.company} - ${entry.player}`;

            const scoreEl = document.createElement("span");
            scoreEl.className = "lb-score";
            scoreEl.textContent = Math.floor(entry.score).toLocaleString();

            row.appendChild(rank);
            row.appendChild(nameEl);
            row.appendChild(scoreEl);
            el.appendChild(row);
        });
    },

    // ---------------- Player identity (Company / Player name) ----------------
    getIdentity() {
        return {
            company: (this.els.companyInput?.value || "").trim(),
            player: (this.els.playerInput?.value || "").trim(),
        };
    },

    setIdentity(company, player) {
        if (this.els.companyInput) this.els.companyInput.value = company || "";
        if (this.els.playerInput) this.els.playerInput.value = player || "";
    },

    validateIdentity() {
        const { company, player } = this.getIdentity();
        const ok = company.length > 0 && player.length > 0;
        if (this.els.identityError) {
            this.els.identityError.classList.toggle("hidden", ok);
        }
        if (!ok) {
            const target = company.length === 0 ? this.els.companyInput : this.els.playerInput;
            target?.focus();
        }
        return ok;
    },
};