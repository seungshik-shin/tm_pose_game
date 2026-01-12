/**
 * soundManager.js
 * Generates synthetic sounds using Web Audio API
 * No external files required!
 */
class SoundManager {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.isMuted = false;
    }

    playTone(freq, type, duration) {
        if (this.isMuted) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playCoin() {
        // High pitched sine wave for coin
        this.playTone(800, "sine", 0.1);
        setTimeout(() => this.playTone(1200, "sine", 0.2), 50);
    }

    playExplosion() {
        if (this.isMuted) return;
        // Noise buffer for explosion
        const bufferSize = this.audioCtx.sampleRate * 0.5; // 0.5 sec
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

        noise.connect(gain);
        gain.connect(this.audioCtx.destination);
        noise.start();
    }

    playGameOver() {
        this.playTone(400, "sawtooth", 0.3);
        setTimeout(() => this.playTone(300, "sawtooth", 0.3), 300);
        setTimeout(() => this.playTone(200, "sawtooth", 0.6), 600);
    }
}

window.soundManager = new SoundManager();
