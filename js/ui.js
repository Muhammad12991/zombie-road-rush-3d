/**
 * ui.js
 * -----------------------------------------------------------------------
 * DOM-side HUD, screen management, and modern arcade Kill Streak / Combo popup.
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

    hideLoading() {
        if (this.els.loadingScreen) this.els.loadingScreen.classList.add("hidden");
    },

    showHud(show) {
        if (this.els.hud) this.els.hud.classList.toggle("hidden", !show);
    },

    updateHealth(pct) {
        if (!this.els.healthFill) return;
        this.els.healthFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        this.els.healthFill.style.filter = pct < 25 ? "brightness(1.3) saturate(1.4)" : "none";
    },

    updateFuel(pct) {
        if (!this.els.fuelFill) return;
        this.els.fuelFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    },

    updateStats(score, kills, distanceMeters, best) {
        if (this.els.scoreVal) this.els.scoreVal.textContent = Math.floor(score).toLocaleString();
        if (this.els.killsVal) this.els.killsVal.textContent = kills;
        if (this.els.distVal) this.els.distVal.textContent = `${Math.floor(distanceMeters)}m`;
        if (this.els.bestVal) this.els.bestVal.textContent = Math.floor(best).toLocaleString();
    },

    setSpeedVignette(intensity) {
        if (!this.els.speedFx) return;
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

    // Modern Arcade Kill Streak & Combo Popup
    showCombo(countOrText, points = 0) {
        const el = this.els.comboPopup;
        if (!el) return;

        let title = "ZOMBIE KILL!";
        let colorClass = "combo-tier-1";

        if (typeof countOrText === "number") {
            const count = countOrText;
            if (count >= 10) {
                title = `UNSTOPPABLE! x${count} (+${points})`;
                colorClass = "combo-tier-4";
            } else if (count >= 6) {
                title = `ZOMBIE SLAYER! x${count} (+${points})`;
                colorClass = "combo-tier-3";
            } else if (count >= 3) {
                title = `KILL STREAK! x${count} (+${points})`;
                colorClass = "combo-tier-2";
            } else {
                title = `${count}x COMBO! (+${points})`;
                colorClass = "combo-tier-1";
            }
        } else {
            title = countOrText;
        }

        el.textContent = title;
        el.className = `combo-popup ${colorClass}`;
        el.classList.remove("hidden");

        // Restart animation bounce
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "comboPopAnim 0.75s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards";

        clearTimeout(this._comboTimeout);
        this._comboTimeout = setTimeout(() => {
            el.classList.add("hidden");
        }, 800);
    },

    showScreen(name) {
        const screens = ["startScreen", "pauseScreen", "gameOverScreen"];
        for (const s of screens) {
            if (this.els[s]) this.els[s].classList.toggle("hidden", s !== name);
        }
    },

    hideAllScreens() {
        const screens = ["startScreen", "pauseScreen", "gameOverScreen"];
        screens.forEach((s) => {
            if (this.els[s]) this.els[s].classList.add("hidden");
        });
    },

    setStartBest(best) {
        if (this.els.startBest) this.els.startBest.textContent = Math.floor(best).toLocaleString();
    },

    setGameOverStats({ score, kills, distance, bestCombo, reason, isNewBest }) {
        if (this.els.gameOverReason) this.els.gameOverReason.textContent = reason;
        if (this.els.finalScore) this.els.finalScore.textContent = Math.floor(score).toLocaleString();
        if (this.els.finalKills) this.els.finalKills.textContent = kills;
        if (this.els.finalDist) this.els.finalDist.textContent = `${Math.floor(distance)}m`;
        if (this.els.finalCombo) this.els.finalCombo.textContent = `x${bestCombo}`;
        if (this.els.newBest) this.els.newBest.classList.toggle("hidden", !isNewBest);
    },

    setLeaderboard(topScores, justPlayed) {
        const el = this.els.leaderboardList;
        if (!el) return;
        el.innerHTML = "";
        if (!topScores || !topScores.length) {
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
        const compEl = this.els.companyInput;
        const playEl = this.els.playerInput;
        return {
            company: (compEl && compEl.value ? compEl.value : "").trim(),
            player: (playEl && playEl.value ? playEl.value : "").trim(),
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
            if (target) target.focus();
        }
        return ok;
    },
};