// Crown of Bharat audio. Every sound is synthesised at runtime from oscillators and
// filtered noise: no audio files ship with the game, so this adds no download weight.
// One AudioContext is created lazily on the first sound the player actually asks for.
const CUE_INTERVAL = { hit: 70, arrow: 55, cannon: 130, destroy: 110, heal: 180, tap: 40, deploy: 70 };
const MAX_VOICES = 18;

export class GameAudio {
  constructor() {
    this.enabled = false; this.ctx = null; this.master = null; this.noise = null;
    this.lastCue = new Map(); this.voices = 0; this.failed = false;
  }
  // Browsers only allow an AudioContext to start inside a gesture, so this is called
  // from real interactions and quietly gives up if the platform refuses.
  start() {
    if (this.failed || this.ctx) return this.ctx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('no audio');
      this.ctx = new Ctx();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
      const shelf = this.ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 5200; shelf.gain.value = -6;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 8; limiter.attack.value = 0.004; limiter.release.value = 0.18;
      this.master.connect(shelf); shelf.connect(limiter); limiter.connect(this.ctx.destination);
      const length = Math.floor(this.ctx.sampleRate * 1.2), buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    } catch { this.failed = true; this.ctx = null; }
    return this.ctx;
  }
  setEnabled(value) { this.enabled = !!value; if (value) { this.start(); this.ctx?.resume?.(); } }
  resume() { if (this.enabled) this.ctx?.resume?.(); }
  now() { return this.ctx.currentTime; }
  // A single voice: source -> gain envelope -> optional filter -> pan -> master.
  voice({ type = 'sine', frequency = 440, sweep = null, start = 0, duration = 0.2, gain = 0.2, attack = 0.006, filter = null, pan = 0, detune = 0 }) {
    const ctx = this.ctx, t0 = this.now() + start, source = ctx.createOscillator();
    source.type = type; source.frequency.setValueAtTime(Math.max(20, frequency), t0); source.detune.value = detune;
    if (sweep) source.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t0 + duration);
    this.chain(source, { t0, duration, gain, attack, filter, pan });
    source.start(t0); source.stop(t0 + duration + 0.03);
  }
  burst({ start = 0, duration = 0.2, gain = 0.2, attack = 0.002, filter = null, pan = 0, playbackRate = 1 }) {
    const ctx = this.ctx, t0 = this.now() + start, source = ctx.createBufferSource();
    source.buffer = this.noise; source.playbackRate.value = playbackRate;
    this.chain(source, { t0, duration, gain, attack, filter, pan });
    source.start(t0); source.stop(t0 + duration + 0.03);
  }
  chain(source, { t0, duration, gain, attack, filter, pan }) {
    const ctx = this.ctx, envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, t0);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + Math.min(attack, duration * 0.5));
    envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    let node = source;
    if (filter) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = filter.type || 'lowpass'; biquad.frequency.setValueAtTime(filter.frequency, t0);
      if (filter.sweep) biquad.frequency.exponentialRampToValueAtTime(Math.max(40, filter.sweep), t0 + duration);
      biquad.Q.value = filter.q ?? 1;
      node.connect(biquad); node = biquad;
    }
    node.connect(envelope);
    if (pan && ctx.createStereoPanner) { const panner = ctx.createStereoPanner(); panner.pan.value = Math.max(-1, Math.min(1, pan)); envelope.connect(panner); panner.connect(this.master); }
    else envelope.connect(this.master);
    this.voices++; source.addEventListener('ended', () => { this.voices--; }, { once: true });
  }
  // `pan` is the battlefield x of the event, so combat reads left-to-right.
  play(cue, { pan = 0, intensity = 1 } = {}) {
    if (!this.enabled) return;
    if (!this.start()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const gap = CUE_INTERVAL[cue] ?? 0, stamp = performance.now();
    if (gap && stamp - (this.lastCue.get(cue) || -1e9) < gap) return;
    if (this.voices > MAX_VOICES) return;
    this.lastCue.set(cue, stamp);
    try { this.render(cue, pan, Math.max(0.4, Math.min(1.6, intensity))); } catch { this.failed = true; }
  }
  render(cue, pan, power) {
    const v = (options) => this.voice({ pan, ...options });
    const n = (options) => this.burst({ pan, ...options });
    switch (cue) {
      case 'tap': return v({ type: 'sine', frequency: 620, sweep: 500, duration: 0.07, gain: 0.05 });
      case 'select': return v({ type: 'triangle', frequency: 480, sweep: 640, duration: 0.09, gain: 0.06 });
      case 'error': return v({ type: 'square', frequency: 200, sweep: 130, duration: 0.16, gain: 0.05, filter: { type: 'lowpass', frequency: 1200 } });
      case 'build':
        v({ type: 'triangle', frequency: 190, sweep: 92, duration: 0.28, gain: 0.14 });
        return n({ duration: 0.22, gain: 0.1, filter: { type: 'lowpass', frequency: 900, sweep: 260 } });
      case 'collect':
        [0, 0.06, 0.12].forEach((start, i) => v({ type: 'sine', frequency: 620 * Math.pow(1.26, i), duration: 0.16, gain: 0.075, start }));
        return;
      case 'upgrade':
        [0, 0.08, 0.16, 0.26].forEach((start, i) => v({ type: 'triangle', frequency: 392 * Math.pow(1.2599, i), duration: 0.3, gain: 0.075, start }));
        return;
      case 'deploy':
        v({ type: 'triangle', frequency: 300, sweep: 440, duration: 0.11, gain: 0.08 });
        return n({ duration: 0.1, gain: 0.05, filter: { type: 'bandpass', frequency: 1700, q: 1.4 } });
      case 'hit':
        n({ duration: 0.09, gain: 0.13 * power, filter: { type: 'bandpass', frequency: 1100, sweep: 500, q: 1.1 } });
        return v({ type: 'triangle', frequency: 150, sweep: 72, duration: 0.13, gain: 0.1 * power });
      case 'arrow':
        n({ duration: 0.11, gain: 0.06, filter: { type: 'highpass', frequency: 1400, sweep: 3600 } });
        return v({ type: 'sine', frequency: 1250, sweep: 620, duration: 0.09, gain: 0.035 });
      case 'cannon':
        v({ type: 'sine', frequency: 110, sweep: 38, duration: 0.4, gain: 0.24 * power });
        n({ duration: 0.34, gain: 0.19 * power, filter: { type: 'lowpass', frequency: 1500, sweep: 220 } });
        return n({ duration: 0.1, gain: 0.1, filter: { type: 'highpass', frequency: 2400 } });
      case 'destroy':
        v({ type: 'sawtooth', frequency: 170, sweep: 42, duration: 0.6, gain: 0.16, filter: { type: 'lowpass', frequency: 1400, sweep: 240 } });
        n({ duration: 0.7, gain: 0.2, filter: { type: 'lowpass', frequency: 2200, sweep: 180 } });
        return n({ start: 0.09, duration: 0.5, gain: 0.09, playbackRate: 0.7, filter: { type: 'bandpass', frequency: 620, q: 0.8 } });
      case 'heal':
        v({ type: 'sine', frequency: 660, duration: 0.3, gain: 0.06 });
        return v({ type: 'sine', frequency: 990, duration: 0.34, gain: 0.045, start: 0.07 });
      case 'lightning':
        n({ duration: 0.14, gain: 0.3, filter: { type: 'highpass', frequency: 2800, sweep: 900 } });
        n({ start: 0.05, duration: 0.75, gain: 0.16, filter: { type: 'lowpass', frequency: 1800, sweep: 130 } });
        return v({ type: 'sawtooth', frequency: 320, sweep: 46, duration: 0.5, gain: 0.1 });
      case 'freeze':
        [0, 0.05].forEach((start, i) => v({ type: 'sine', frequency: 1450, sweep: 2100, duration: 0.55, gain: 0.05, start, detune: i * 22 }));
        return n({ duration: 0.5, gain: 0.05, filter: { type: 'highpass', frequency: 4200 } });
      case 'rage':
        [0, 0.04, 0.08].forEach((start, i) => v({ type: 'sawtooth', frequency: 150 * Math.pow(1.5, i), sweep: 300 * Math.pow(1.5, i), duration: 0.45, gain: 0.05, start, filter: { type: 'lowpass', frequency: 1600 } }));
        return;
      case 'hero':
        [0, 4, 7].forEach(step => v({ type: 'sawtooth', frequency: 196 * Math.pow(2, step / 12), duration: 0.7, gain: 0.06, filter: { type: 'lowpass', frequency: 1900, sweep: 900 } }));
        return n({ duration: 0.3, gain: 0.08, filter: { type: 'bandpass', frequency: 900, q: 0.9 } });
      case 'victory':
        [0, 4, 7, 12].forEach((step, i) => v({ type: 'triangle', frequency: 262 * Math.pow(2, step / 12), duration: 0.75, gain: 0.09, start: i * 0.13 }));
        return;
      case 'defeat':
        [0, -3, -7].forEach((step, i) => v({ type: 'triangle', frequency: 294 * Math.pow(2, step / 12), duration: 0.85, gain: 0.08, start: i * 0.18, filter: { type: 'lowpass', frequency: 1300 } }));
        return;
      default: return v({ type: 'sine', frequency: 440, duration: 0.1, gain: 0.05 });
    }
  }
}
