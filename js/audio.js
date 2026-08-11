/**
 * audio.js (REAL SOUNDTRACK EDITION)
 * -----------------------------------------------------------------------
 * Uses your actual .mp3 soundtrack for the background music!
 * The track plays at full volume in the menu and dynamically fades
 * to a lower volume during gameplay so you can hear the engine and zombies.
 * All other SFX (engine, zombies, rain) are kept as synthesized audio.
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

    // --- Real MP3 Audio Variables ---
    let bgMusic = null;
    let musicFadeInterval = null;

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

    return {
        setMuted(v) {
            muted = v;
            if (ctx) {
                masterGain.gain.setTargetAtTime(muted ? 0 : SETTINGS.master, ctx.currentTime, 0.1);
            }
            if (bgMusic) {
                bgMusic.muted = muted;
            }
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
            playSoftImpact(0.4, 1.0, 800);
            playSoftImpact(0.6, 0.8, 300);

            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = "triangle";

            osc.frequency.setValueAtTime(120 + Math.random() * 40, c.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.8);

            gain.gain.setValueAtTime(0, c.currentTime);
            gain.gain.linearRampToValueAtTime(0.4, c.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);

            const filter = c.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 600;

            osc.connect(filter).connect(gain).connect(sfxGain);
            osc.start();
            osc.stop(c.currentTime + 0.8);
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

        // --- REAL MP3 SOUNDTRACK LOGIC ---
        startMenuAmbience() {
            if (muted) return;
            try {
                // Initialize audio object only once
                if (!bgMusic) {
                    bgMusic = new Audio('assets/js/vendor/audio/theme.mp3');
                    bgMusic.loop = true;
                }

                // Clear any ongoing fade-out animations
                clearInterval(musicFadeInterval);

                // Set volume back to full (80%) for the menu
                bgMusic.volume = 0.8;
                bgMusic.muted = muted;

                // Browser policies might block autoplay, catch the error silently
                bgMusic.play().catch(e => console.warn("Waiting for player interaction to play audio."));
            } catch (e) {}
        },

        stopMenuAmbience() {
            // Instead of stopping the track completely, we fade it down to 15% volume for gameplay!
            if (bgMusic) {
                clearInterval(musicFadeInterval);
                let vol = bgMusic.volume;

                musicFadeInterval = setInterval(() => {
                    vol -= 0.05;
                    if (vol <= 0.15) {
                        vol = 0.15;
                        clearInterval(musicFadeInterval);
                    }
                    bgMusic.volume = vol;
                }, 100);
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
            playSoftImpact(0.8, 0.8, 400);
            playSmoothTone(50, 0.6, "triangle", 0.5);
        },
        fuelPickup() { playSmoothTone(600, 0.3, "sine", 0.3); },
        button() { playSmoothTone(300, 0.1, "sine", 0.4); },
        gameOver() { playSmoothTone(100, 2.0, "triangle", 0.4); },

        startMusic() {},
        stopMusic() {},
        _setEngineGain(v) { if (engine) { try { engine.gain.gain.setTargetAtTime(v, getCtx().currentTime, 0.1); } catch (e) {} } }
    };
})();