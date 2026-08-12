/**
 * audio.js (REAL MP3 SOUNDTRACK & AMBIENT WIND-RAIN EDITION)
 * -----------------------------------------------------------------------
 * Menu Ambience: theme.mp3
 * Gameplay Music: bg-music.mp3
 * Environment Ambient: wind-rain.mp3 (Continuous background loop)
 * Zombie Death: zombie-die.mp3 (Trimmed strictly to 1.0s)
 * Item Pickup: item-pick.mp3 (Fuel & Wrench)
 * Obstacle Crash: hit.mp3 (Trimmed strictly to 1.0s)
 * -----------------------------------------------------------------------
 */
export const Audio_ = (function() {
    let ctx = null;
    let muted = false;

    // --- Audio Mixing Buses ---
    let masterGain, engineGain, sfxGain, envGain;

    const SETTINGS = { master: 0.9, engine: 0.6, sfx: 0.8, env: 0.5 };

    let engine = null;
    let envNodes = null;

    // --- Real MP3 Audio Objects ---
    let menuTheme = null;
    let bgMusic = null;
    let windRainAudio = null;

    function getCtx() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            ctx = new AC();

            masterGain = ctx.createGain();
            engineGain = ctx.createGain();
            sfxGain = ctx.createGain();
            envGain = ctx.createGain();

            masterGain.gain.value = SETTINGS.master;
            engineGain.gain.value = SETTINGS.engine;
            sfxGain.gain.value = SETTINGS.sfx;
            envGain.gain.value = SETTINGS.env;

            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -10;
            compressor.knee.value = 10;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.1;
            compressor.release.value = 0.2;

            engineGain.connect(compressor);
            sfxGain.connect(compressor);
            envGain.connect(compressor);
            compressor.connect(masterGain);
            masterGain.connect(ctx.destination);
        }
        return ctx;
    }

    function makeSoftNoiseBuffer(c, duration) {
        const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11;
            b6 = white * 0.115926;
        }
        return buffer;
    }

    function playSmoothTone(freq, duration, type = "sine", vol = 1.0, destination = sfxGain) {
        if (muted) return;
        try {
            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, c.currentTime);

            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

            const filter = c.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 800;

            osc.connect(filter).connect(gain).connect(destination);
            osc.start();
            osc.stop(c.currentTime + duration);
        } catch (e) {}
    }

    function playSoftImpact(duration, vol = 1.0, cutoff = 500) {
        if (muted) return;
        try {
            const c = getCtx();
            const src = c.createBufferSource();
            src.buffer = makeSoftNoiseBuffer(c, duration);
            const gain = c.createGain();

            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

            const filter = c.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = cutoff;

            src.connect(filter).connect(gain).connect(sfxGain);
            src.start();
        } catch (e) {}
    }

    function playTrimmedAudio(audioPath, durationInSeconds = 1.0, volume = 0.95) {
        if (muted) return;
        try {
            const sound = new Audio(audioPath);
            sound.volume = volume;
            sound.currentTime = 0;
            sound.play().catch(() => {});

            setTimeout(() => {
                sound.pause();
                sound.currentTime = 0;
            }, durationInSeconds * 1000);
        } catch (e) {}
    }

    function playAudioSFX(audioPath, volume = 0.9) {
        if (muted) return;
        try {
            const sound = new Audio(audioPath);
            sound.volume = volume;
            sound.currentTime = 0;
            sound.play().catch(() => {});
        } catch (e) {}
    }

    return {
        setMuted(v) {
            muted = v;
            if (ctx) {
                masterGain.gain.setTargetAtTime(muted ? 0 : SETTINGS.master, ctx.currentTime, 0.1);
            }
            if (menuTheme) menuTheme.muted = muted;
            if (bgMusic) bgMusic.muted = muted;
            if (windRainAudio) windRainAudio.muted = muted;
        },
        isMuted() { return muted; },
        resume() { try { getCtx().resume(); } catch (e) {} },

        // --- ZOMBIE INTERACTIONS ---
        zombieKnock() {
            if (muted) return;
            playSoftImpact(0.4, 0.9, 300);
            playSmoothTone(60, 0.2, "sine", 0.7);
        },

        zombieKill() {
            if (muted) return;
            playSoftImpact(0.3, 1.0, 700);
            playTrimmedAudio('assets/js/vendor/audio/zombie-die.mp3', 1.0, 0.95);
        },

        zombieGroan() {
            if (muted || Math.random() > 0.1) return;
            playSmoothTone(70 + Math.random() * 20, 1.2, "triangle", 0.3);
        },

        // --- ENGINE SYSTEM ---
        startEngine() {
            if (muted || engine) return;
            try {
                const c = getCtx();

                playSoftImpact(1.0, 0.5, 400);
                const rev = c.createOscillator();
                const revGain = c.createGain();
                rev.type = "triangle";
                rev.frequency.setValueAtTime(30, c.currentTime + 0.3);
                rev.frequency.linearRampToValueAtTime(80, c.currentTime + 0.7);
                rev.frequency.exponentialRampToValueAtTime(45, c.currentTime + 1.5);

                revGain.gain.setValueAtTime(0, c.currentTime);
                revGain.gain.setValueAtTime(0, c.currentTime + 0.3);
                revGain.gain.linearRampToValueAtTime(0.6, c.currentTime + 0.7);
                revGain.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
                rev.connect(revGain).connect(engineGain);
                rev.start();
                rev.stop(c.currentTime + 1.5);

                const osc = c.createOscillator();
                const gain = c.createGain();
                const filter = c.createBiquadFilter();

                filter.type = "lowpass";
                filter.Q.value = 1;
                filter.frequency.value = 150;

                osc.type = "sawtooth";
                osc.frequency.value = 40;

                gain.gain.setValueAtTime(0, c.currentTime);
                gain.gain.linearRampToValueAtTime(0.5, c.currentTime + 2.0);

                osc.connect(filter).connect(gain).connect(engineGain);
                osc.start(c.currentTime + 0.5);

                engine = { osc, gain, filter };
            } catch (e) {}
        },

        setEngineSpeed(t) {
            if (!engine) return;
            try {
                const c = getCtx();
                const safeT = Math.max(0, Math.min(t, 1.0));
                const targetFreq = 40 + (safeT * 45);
                const targetFilter = 150 + (safeT * 300);
                const targetVol = 0.5 + (safeT * 0.25);

                engine.osc.frequency.setTargetAtTime(targetFreq, c.currentTime, 0.3);
                engine.filter.frequency.setTargetAtTime(targetFilter, c.currentTime, 0.3);
                engine.gain.gain.setTargetAtTime(targetVol, c.currentTime, 0.3);
            } catch (e) {}
        },

        stopEngine() {
            if (engine) {
                try {
                    const c = getCtx();
                    engine.gain.gain.setTargetAtTime(0, c.currentTime, 0.5);
                    setTimeout(() => { try { engine.osc.stop(); } catch (e) {} }, 1000);
                } catch (e) {}
                engine = null;
            }
        },

        // --- MENU THEME ---
        startMenuAmbience() {
            if (muted) return;
            try {
                if (!menuTheme) {
                    menuTheme = new Audio('assets/js/vendor/audio/theme.mp3');
                    menuTheme.loop = true;
                }
                menuTheme.volume = 0.8;
                menuTheme.muted = muted;
                menuTheme.play().catch(() => {});
            } catch (e) {}
        },

        stopMenuAmbience() {
            if (menuTheme) {
                menuTheme.pause();
                menuTheme.currentTime = 0;
            }
        },

        // --- GAMEPLAY MUSIC & WIND-RAIN AMBIANCE ---
        startMusic() {
            if (muted) return;

            // Background Music
            try {
                if (!bgMusic) {
                    bgMusic = new Audio('assets/js/vendor/audio/bg-music.mp3');
                    bgMusic.loop = true;
                }
                bgMusic.volume = 0.35;
                bgMusic.muted = muted;
                bgMusic.play().catch(e => console.warn("BG Music error:", e));
            } catch (e) {}

            // Wind-Rain Ambience (Clear Audio Output)
            try {
                if (!windRainAudio) {
                    windRainAudio = new Audio('assets/js/vendor/audio/wind-rain.mp3');
                    windRainAudio.loop = true;
                }
                windRainAudio.volume = 0.55; // Boosted volume so it is clearly audible
                windRainAudio.muted = muted;

                // Reset playback time to start fresh
                windRainAudio.currentTime = 0;

                const promise = windRainAudio.play();
                if (promise !== undefined) {
                    promise.catch(e => {
                        console.warn("Wind-Rain autoplay blocked by browser, re-trying on click.", e);
                    });
                }
            } catch (e) {}
        },

        stopMusic() {
            if (bgMusic) {
                bgMusic.pause();
                bgMusic.currentTime = 0;
            }
            if (windRainAudio) {
                windRainAudio.pause();
                windRainAudio.currentTime = 0;
            }
        },

        // --- WEATHER & ENVIRONMENT ---
        startRain() {
            if (muted || envNodes) return;
            try {
                const c = getCtx();
                const src = c.createBufferSource();
                src.buffer = makeSoftNoiseBuffer(c, 4);
                src.loop = true;

                const filter = c.createBiquadFilter();
                filter.type = "lowpass";
                filter.frequency.value = 600;

                const gain = c.createGain();
                gain.gain.setValueAtTime(0, c.currentTime);
                gain.gain.linearRampToValueAtTime(0.3, c.currentTime + 2.0);

                src.connect(filter).connect(gain).connect(envGain);
                src.start();
                envNodes = { src, filter, gain };
            } catch (e) {}
        },

        stopRain() {
            if (envNodes) {
                try {
                    const c = getCtx();
                    envNodes.gain.gain.setTargetAtTime(0, c.currentTime, 0.5);
                    const n = envNodes;
                    setTimeout(() => { try { n.src.stop(); } catch (e) {} }, 1500);
                } catch (e) {}
                envNodes = null;
            }
        },

        thunder() {
            if (muted) return;
            try {
                playSoftImpact(4.0, 0.6, 200);
                playSmoothTone(45, 3.0, "sine", 0.5);
            } catch (e) {}
        },

        // --- UI & MISC EVENTS ---
        combo() { playSmoothTone(400, 0.2, "sine", 0.3); },

        crash() {
            playTrimmedAudio('assets/js/vendor/audio/hit.mp3', 1.0, 0.95);
        },

        fuelPickup() {
            playAudioSFX('assets/js/vendor/audio/item-pick.mp3', 0.9);
        },

        button() { playSmoothTone(300, 0.1, "sine", 0.4); },
        gameOver() { playSmoothTone(100, 2.0, "triangle", 0.4); },

        _setEngineGain(v) { if (engine) { try { engine.gain.gain.setTargetAtTime(v, getCtx().currentTime, 0.1); } catch (e) {} } }
    };
})();