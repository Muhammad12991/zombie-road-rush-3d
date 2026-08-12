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
            gameContainer: document.getElementById("gameContainer"),
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

            // New Main Menu Leaderboard Elements
            mainLeaderboardBtn: document.getElementById("mainLeaderboardBtn"),
            menuLeaderboardModal: document.getElementById("menuLeaderboardModal"),
            menuLeaderboardList: document.getElementById("menuLeaderboardList"),
            menuExportCsvBtn: document.getElementById("menuExportCsvBtn"),
            closeLeaderboardBtn: document.getElementById("closeLeaderboardBtn"),
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

    _checkCriticalWarning(healthPct, fuelPct) {
        const container = this.els.gameContainer;
        if (!container) return;
        if (healthPct <= 30 || fuelPct <= 30) {
            container.classList.add("critical-warning");
        } else {
            container.classList.remove("critical-warning");
        }
    },

    updateHealth(pct) {
        if (!this.els.healthFill) return;
        const clamped = Math.max(0, Math.min(100, pct));
        this.els.healthFill.style.width = `${clamped}%`;
        this.els.healthFill.style.filter = clamped < 25 ? "brightness(1.3) saturate(1.4)" : "none";

        const fuelVal = this.els.fuelFill ? parseFloat(this.els.fuelFill.style.width) || 100 : 100;
        this._checkCriticalWarning(clamped, fuelVal);
    },

    updateFuel(pct) {
        if (!this.els.fuelFill) return;
        const clamped = Math.max(0, Math.min(100, pct));
        this.els.fuelFill.style.width = `${clamped}%`;

        const healthVal = this.els.healthFill ? parseFloat(this.els.healthFill.style.width) || 100 : 100;
        this._checkCriticalWarning(healthVal, clamped);
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

    // Toggle Main Menu Leaderboard Modal
    toggleMenuLeaderboard(show) {
        if (this.els.menuLeaderboardModal) {
            this.els.menuLeaderboardModal.classList.toggle("hidden", !show);
        }
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

    // Reusable Top 10 Leaderboard Renderer (Works for Game Over & Main Menu Modal)
    // Clean & Readable Leaderboard Renderer
    setLeaderboard(topScores, justPlayed, targetElement = null) {
        const el = targetElement || this.els.leaderboardList;
        if (!el) return;
        el.innerHTML = "";

        if (!topScores || !topScores.length) {
            const empty = document.createElement("div");
            empty.className = "lb-empty";
            empty.textContent = "NO RUNS RECORDED YET";
            el.appendChild(empty);
            return;
        }

        topScores.slice(0, 10).forEach((entry, i) => {
            const row = document.createElement("div");
            const isThisRun =
                justPlayed &&
                entry.company === justPlayed.company &&
                entry.player === justPlayed.player &&
                entry.score === justPlayed.score &&
                entry.timestamp === justPlayed.timestamp;
            row.className = "lb-row" + (isThisRun ? " lb-current" : "");

            // 1. Rank Number
            const rank = document.createElement("span");
            rank.className = "lb-rank";
            rank.textContent = `#${i + 1}`;

            // 2. Full Player & Company Name (No Clipping)
            const nameEl = document.createElement("div");
            nameEl.className = "lb-name-container";

            const compName = entry.company || "ANONYMOUS";
            const playName = entry.player || "DRIVER";

            nameEl.innerHTML = `<span class="lb-comp">${compName}</span> <span class="lb-player">(${playName})</span>`;

            // 3. Clean Text-Based Stats (No Emojis)
            const statsWrap = document.createElement("div");
            statsWrap.className = "lb-stats-wrap";

            if (entry.kills !== undefined) {
                const killsEl = document.createElement("span");
                killsEl.className = "lb-stat-badge lb-kills";
                killsEl.textContent = `KILLS: ${entry.kills}`;
                statsWrap.appendChild(killsEl);
            }

            if (entry.distance !== undefined) {
                const distEl = document.createElement("span");
                distEl.className = "lb-stat-badge lb-dist";
                distEl.textContent = `DIST: ${Math.floor(entry.distance)}m`;
                statsWrap.appendChild(distEl);
            }

            const scoreEl = document.createElement("span");
            scoreEl.className = "lb-score";
            scoreEl.textContent = `SCORE: ${Math.floor(entry.score).toLocaleString()}`;
            statsWrap.appendChild(scoreEl);

            row.appendChild(rank);
            row.appendChild(nameEl);
            row.appendChild(statsWrap);
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