// Crown of Bharat audio. Every sound is synthesised at runtime from oscillators,
// filtered noise and Karplus-Strong plucked strings: no audio files ship with the
// game, so this adds no download weight. One AudioContext is created lazily on the
// first sound the player actually asks for.
//
// Signal flow:  voices -> sfx / music / ambience buses -> master -> limiter -> out
//               any voice may also feed a shared hall reverb (generated impulse).
import { MusicDirector } from './music.js';

const CUE_INTERVAL = { hit: 70, clash: 90, arrow: 55, cannon: 130, destroy: 110, heal: 180, tap: 40, deploy: 70, spawn: 60, chakram: 90, falcon: 160, water: 120, tick: 400, coin: 60, star: 200, footfall: 90 };
const MAX_VOICES = 26;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class GameAudio {
  constructor() {
    this.enabled = false; this.musicEnabled = true; this.ctx = null; this.master = null; this.noise = null;
    this.lastCue = new Map(); this.voices = 0; this.failed = false;
    this.volume = { master: 0.8, sfx: 1, music: 0.55 };
    this.scene = 'none'; this.ambience = null; this.music = null; this.plucks = new Map();
  }
  // Browsers only allow an AudioContext to start inside a gesture, so this is called
  // from real interactions and quietly gives up if the platform refuses.
  start() {
    if (this.failed || this.ctx) return this.ctx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('no audio');
      const ctx = this.ctx = new Ctx({ latencyHint: 'interactive' });
      this.master = ctx.createGain(); this.master.gain.value = this.volume.master * 0.6;
      const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 6500; shelf.gain.value = -4;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.knee.value = 10; limiter.ratio.value = 10; limiter.attack.value = 0.003; limiter.release.value = 0.2;
      this.master.connect(shelf); shelf.connect(limiter); limiter.connect(ctx.destination);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.volume.sfx * 1.5; this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicEnabled ? this.volume.music : 0; this.musicBus.connect(this.master);
      this.ambienceBus = ctx.createGain(); this.ambienceBus.gain.value = this.musicEnabled ? 0.9 : 0; this.ambienceBus.connect(this.master);
      // Music ducks under big moments (victory stingers, hero calls) through this node.
      this.duck = ctx.createGain(); this.duck.connect(this.musicBus);
      const length = Math.floor(ctx.sampleRate * 2), buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
      // A warm courtyard reverb: decaying stereo noise, darker as it fades.
      this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.6, 2.4);
      this.reverbReturn = ctx.createGain(); this.reverbReturn.gain.value = 0.55;
      this.reverb.connect(this.reverbReturn); this.reverbReturn.connect(this.master);
      this.music = new MusicDirector(this);
      if (this.scene !== 'none') this.applyScene(true);
    } catch { this.failed = true; this.ctx = null; }
    return this.ctx;
  }
  impulse(seconds, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, length = Math.floor(rate * seconds), buffer = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel); let low = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length, n = Math.random() * 2 - 1; low += (n - low) * (0.5 - t * 0.42);
        data[i] = low * Math.pow(1 - t, decay) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    return buffer;
  }
  setEnabled(value) { this.enabled = !!value; if (value) { this.start(); this.ctx?.resume?.(); } this.applyScene(); }
  setMusicEnabled(value) {
    this.musicEnabled = !!value; if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicEnabled && this.enabled ? this.volume.music : 0, t, 0.25);
    this.ambienceBus.gain.setTargetAtTime(this.musicEnabled && this.enabled ? 0.9 : 0, t, 0.25);
    this.applyScene();
  }
  setVolume(kind, value) {
    if (!(kind in this.volume)) return; this.volume[kind] = clamp(Number(value) || 0, 0, 1);
    if (!this.ctx) return; const t = this.ctx.currentTime;
    if (kind === 'master') this.master.gain.setTargetAtTime(this.volume.master * 0.6, t, 0.05);
    if (kind === 'sfx') this.sfxBus.gain.setTargetAtTime(this.volume.sfx * 1.5, t, 0.05);
    if (kind === 'music') this.musicBus.gain.setTargetAtTime(this.musicEnabled ? this.volume.music : 0, t, 0.05);
  }
  // Background tabs fall silent entirely; the score picks up again on return.
  setHidden(hidden) { if (!this.ctx) return; if (hidden) this.ctx.suspend?.(); else if (this.enabled) this.ctx.resume?.(); }
  resume() { if (this.enabled) { this.start(); this.ctx?.resume?.(); if (this.scene !== 'none' && !this.sceneApplied) this.applyScene(); } }
  // 'home', 'battle' or 'none'. Music and ambience follow the scene with crossfades.
  setScene(scene, options = {}) {
    if (scene === this.scene && !options.force) return;
    this.scene = scene; this.applyScene();
  }
  applyScene() {
    if (!this.ctx || !this.music) return;
    const audible = this.enabled && this.musicEnabled && this.ctx.state !== 'closed';
    this.sceneApplied = audible;
    this.music.play(audible ? this.scene : 'none');
    this.setAmbience(audible ? this.scene : 'none');
  }
  setIntensity(value) { this.music?.setIntensity(value); }
  stinger(kind) { if (this.enabled && this.ctx) this.music?.stinger(kind); }
  now() { return this.ctx.currentTime; }

  // A single voice: source -> optional filter -> gain envelope -> pan -> bus (+ reverb send).
  voice({ type = 'sine', frequency = 440, sweep = null, sweepCurve = 'exp', start = 0, duration = 0.2, gain = 0.2, attack = 0.006, filter = null, pan = 0, detune = 0, wet = 0, bus = this.sfxBus, vibrato = 0, release = null }) {
    const ctx = this.ctx, t0 = this.now() + start, source = ctx.createOscillator();
    source.type = type; source.frequency.setValueAtTime(Math.max(20, frequency), t0); source.detune.value = detune;
    if (sweep) {
      if (sweepCurve === 'lin') source.frequency.linearRampToValueAtTime(Math.max(20, sweep), t0 + duration);
      else source.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t0 + duration);
    }
    if (vibrato) { const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 6; depth.gain.value = vibrato; lfo.connect(depth); depth.connect(source.detune); lfo.start(t0); lfo.stop(t0 + duration + 0.05); }
    this.chain(source, { t0, duration, gain, attack, filter, pan, wet, bus, release });
    source.start(t0); source.stop(t0 + duration + 0.05);
    return source;
  }
  burst({ start = 0, duration = 0.2, gain = 0.2, attack = 0.002, filter = null, pan = 0, playbackRate = 1, wet = 0, bus = this.sfxBus }) {
    const ctx = this.ctx, t0 = this.now() + start, source = ctx.createBufferSource();
    source.buffer = this.noise; source.playbackRate.value = playbackRate;
    const offset = Math.random() * 1.2;
    this.chain(source, { t0, duration, gain, attack, filter, pan, wet, bus });
    source.start(t0, offset); source.stop(t0 + duration + 0.05);
  }
  // Karplus-Strong string: noise excitation through a damped delay loop. Cached per pitch.
  pluckBuffer(frequency, { decay = 0.996, bright = 0.5, seconds = 1.6 } = {}) {
    const key = `${Math.round(frequency * 10)}:${decay}:${bright}:${seconds}`;
    if (this.plucks.has(key)) return this.plucks.get(key);
    const rate = this.ctx.sampleRate, length = Math.floor(rate * seconds), buffer = this.ctx.createBuffer(1, length, rate), data = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / frequency)); let low = 0;
    for (let i = 0; i < period; i++) { const n = Math.random() * 2 - 1; low += (n - low) * bright; data[i] = low; }
    for (let i = period; i < length; i++) data[i] = decay * 0.5 * (data[i - period] + data[i - period - 1 >= 0 ? i - period - 1 : 0]);
    if (this.plucks.size > 90) this.plucks.delete(this.plucks.keys().next().value);
    this.plucks.set(key, buffer); return buffer;
  }
  pluck({ frequency = 220, start = 0, gain = 0.2, pan = 0, wet = 0.3, bus = this.sfxBus, decay, bright, seconds = 1.6, filter = null, playbackRate = 1, at = null }) {
    const ctx = this.ctx, t0 = at ?? this.now() + start, source = ctx.createBufferSource();
    source.buffer = this.pluckBuffer(frequency, { decay, bright, seconds }); source.playbackRate.value = playbackRate;
    const envelope = ctx.createGain(); envelope.gain.setValueAtTime(gain, t0); envelope.gain.setTargetAtTime(0.0001, t0 + seconds * 0.7, seconds * 0.12);
    let node = source; if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.frequency; f.Q.value = filter.q ?? 0.7; node.connect(f); node = f; }
    node.connect(envelope); this.route(envelope, pan, wet, bus);
    this.voices++; source.addEventListener('ended', () => { this.voices--; }, { once: true });
    source.start(t0); source.stop(t0 + seconds);
  }
  route(node, pan, wet, bus) {
    const ctx = this.ctx; let out = node;
    if (pan && ctx.createStereoPanner) { const panner = ctx.createStereoPanner(); panner.pan.value = clamp(pan, -1, 1); node.connect(panner); out = panner; }
    out.connect(bus || this.sfxBus);
    if (wet > 0 && this.reverb) { const send = ctx.createGain(); send.gain.value = wet; out.connect(send); send.connect(this.reverb); }
  }
  chain(source, { t0, duration, gain, attack, filter, pan, wet, bus, release }) {
    const ctx = this.ctx, envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, t0);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + Math.min(attack, duration * 0.5));
    if (release) { envelope.gain.setValueAtTime(Math.max(0.0002, gain), t0 + Math.max(attack, duration - release)); }
    envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    let node = source;
    if (filter) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = filter.type || 'lowpass'; biquad.frequency.setValueAtTime(filter.frequency, t0);
      if (filter.sweep) biquad.frequency.exponentialRampToValueAtTime(Math.max(40, filter.sweep), t0 + duration);
      biquad.Q.value = filter.q ?? 1;
      node.connect(biquad); node = biquad;
    }
    node.connect(envelope); this.route(envelope, pan, wet, bus);
    this.voices++; source.addEventListener('ended', () => { this.voices--; }, { once: true });
  }
  // Metallic, inharmonic partials: swords, manjira cymbals, coins and anvils.
  metal({ base = 900, ratios = [1, 2.76, 5.4, 8.93], start = 0, duration = 0.5, gain = 0.06, pan = 0, wet = 0.25, bus = this.sfxBus }) {
    ratios.forEach((r, i) => this.voice({ type: 'sine', frequency: base * r, start, duration: duration * (1 - i * 0.14), gain: gain / (1 + i * 0.6), attack: 0.002, pan, wet, bus }));
  }
  // Short ducking of the score so big effects and stingers read clearly.
  duckMusic(amount = 0.45, seconds = 1.2) {
    if (!this.duck) return; const t = this.now(), g = this.duck.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(amount, t, 0.04); g.setTargetAtTime(1, t + seconds, 0.4);
  }

  // `pan` is the battlefield x of the event, so combat reads left-to-right.
  play(cue, { pan = 0, intensity = 1 } = {}) {
    if (!this.enabled) return;
    if (!this.start()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const gap = CUE_INTERVAL[cue] ?? 0, stamp = performance.now();
    if (gap && stamp - (this.lastCue.get(cue) || -1e9) < gap) return;
    if (this.voices > MAX_VOICES && !['victory', 'defeat', 'complete', 'star', 'hero', 'warcry', 'error'].includes(cue)) return;
    this.lastCue.set(cue, stamp);
    try { this.render(cue, pan, clamp(intensity, 0.4, 1.6)); } catch { this.failed = true; }
  }
  render(cue, pan, power) {
    const v = (options) => this.voice({ pan, ...options });
    const n = (options) => this.burst({ pan, ...options });
    const p = (options) => this.pluck({ pan, ...options });
    switch (cue) {
      // ---- Interface: soft wooden and brass tones, never shrill.
      case 'tap':
        v({ type: 'triangle', frequency: 880, sweep: 660, duration: 0.06, gain: 0.045 });
        return n({ duration: 0.025, gain: 0.03, filter: { type: 'bandpass', frequency: 3200, q: 2 } });
      case 'select':
        p({ frequency: 587.3, gain: 0.09, seconds: 0.6, decay: 0.993, bright: 0.6, wet: 0.2 });
        return p({ frequency: 880, start: 0.05, gain: 0.06, seconds: 0.6, decay: 0.993, bright: 0.6, wet: 0.2 });
      case 'open':
        n({ duration: 0.22, gain: 0.05, attack: 0.08, filter: { type: 'bandpass', frequency: 700, sweep: 2600, q: 1.2 } });
        return p({ frequency: 440, start: 0.04, gain: 0.07, seconds: 0.7, decay: 0.994, bright: 0.45, wet: 0.25 });
      case 'close':
        return n({ duration: 0.18, gain: 0.04, attack: 0.05, filter: { type: 'bandpass', frequency: 2400, sweep: 600, q: 1.2 } });
      case 'error':
        v({ type: 'square', frequency: 196, sweep: 150, duration: 0.14, gain: 0.04, filter: { type: 'lowpass', frequency: 900 } });
        return v({ type: 'square', frequency: 185, sweep: 130, duration: 0.16, gain: 0.04, start: 0.13, filter: { type: 'lowpass', frequency: 900 } });
      // ---- Kingdom building.
      case 'build':
        [0, 0.16, 0.32].forEach((start, i) => {
          v({ type: 'triangle', frequency: 210 - i * 12, sweep: 90, duration: 0.14, gain: 0.13, start });
          n({ start, duration: 0.08, gain: 0.1, filter: { type: 'bandpass', frequency: 1800, q: 1.4 }, wet: 0.2 });
        });
        return n({ start: 0.35, duration: 0.5, gain: 0.05, filter: { type: 'lowpass', frequency: 700, sweep: 200 } });
      case 'wall':
        v({ type: 'sine', frequency: 120, sweep: 55, duration: 0.25, gain: 0.2 });
        return n({ duration: 0.3, gain: 0.12, filter: { type: 'lowpass', frequency: 1300, sweep: 250 }, wet: 0.15 });
      case 'train':
        v({ type: 'sine', frequency: 150, sweep: 70, duration: 0.18, gain: 0.16, wet: 0.1 });
        return n({ duration: 0.05, gain: 0.06, filter: { type: 'bandpass', frequency: 2600, q: 2 } });
      case 'coin':
      case 'collect':
        for (let i = 0; i < 4; i++) this.metal({ base: 1900 + Math.random() * 500, ratios: [1, 2.4, 3.9], start: i * 0.055 + Math.random() * 0.02, duration: 0.28, gain: 0.05, pan, wet: 0.2 });
        return p({ frequency: 1174.7, start: 0.2, gain: 0.05, seconds: 0.8, decay: 0.995, bright: 0.7, wet: 0.35 });
      case 'gem':
        [0, 4, 7, 12, 16].forEach((step, i) => v({ type: 'sine', frequency: 1318.5 * Math.pow(2, step / 12), duration: 0.35, gain: 0.04, start: i * 0.04, wet: 0.5 }));
        return;
      case 'upgrade':
        [0, 2, 4, 7, 9, 12].forEach((step, i) => p({ frequency: 293.66 * Math.pow(2, step / 12), start: i * 0.07, gain: 0.1, seconds: 1.2, decay: 0.996, bright: 0.55, wet: 0.35 }));
        return v({ type: 'triangle', frequency: 587.3, duration: 0.9, gain: 0.04, start: 0.42, attack: 0.05, wet: 0.4, vibrato: 12 });
      case 'complete':
        this.duckMusic(0.5, 1.4);
        [0, 4, 7, 12].forEach((step, i) => v({ type: 'triangle', frequency: 440 * Math.pow(2, step / 12), duration: 0.9 - i * 0.1, gain: 0.07, start: i * 0.09, wet: 0.45, vibrato: 10 }));
        this.metal({ base: 1320, start: 0.36, duration: 1.2, gain: 0.05, wet: 0.5 });
        return;
      case 'forge':
        this.metal({ base: 620, ratios: [1, 2.32, 4.25, 6.63], duration: 0.9, gain: 0.09, wet: 0.35 });
        this.metal({ base: 640, ratios: [1, 2.32, 4.25], start: 0.22, duration: 0.7, gain: 0.07, wet: 0.35 });
        return n({ duration: 0.12, gain: 0.08, filter: { type: 'highpass', frequency: 2500 } });
      case 'research':
        for (let i = 0; i < 6; i++) v({ type: 'sine', frequency: 500 + Math.random() * 700, sweep: 900 + Math.random() * 900, duration: 0.07, gain: 0.04, start: i * 0.06 + Math.random() * 0.03, wet: 0.2 });
        return;
      // ---- Battle.
      case 'deploy':
      case 'spawn':
        n({ duration: 0.16, gain: 0.06, attack: 0.03, filter: { type: 'bandpass', frequency: 900, sweep: 2400, q: 1.1 } });
        return v({ type: 'sine', frequency: 110, sweep: 60, duration: 0.14, gain: 0.12 });
      case 'footfall':
        return v({ type: 'sine', frequency: 70, sweep: 38, duration: 0.2, gain: 0.14 * power });
      case 'elephant':
        this.duckMusic(0.6, 0.9);
        v({ type: 'sawtooth', frequency: 420, sweep: 780, duration: 0.55, gain: 0.07, attack: 0.03, vibrato: 45, filter: { type: 'bandpass', frequency: 1300, q: 3 }, wet: 0.35 });
        return v({ type: 'sawtooth', frequency: 440, sweep: 700, duration: 0.5, gain: 0.05, start: 0.05, detune: 30, vibrato: 30, filter: { type: 'bandpass', frequency: 2100, q: 4 }, wet: 0.35 });
      case 'horse':
        for (let i = 0; i < 4; i++) n({ start: i * 0.075 + (i % 2) * 0.02, duration: 0.05, gain: 0.08, filter: { type: 'bandpass', frequency: 900 + i * 90, q: 3 } });
        return;
      case 'roar':
        this.duckMusic(0.55, 1);
        v({ type: 'sawtooth', frequency: 95, sweep: 60, duration: 0.8, gain: 0.1, attack: 0.08, vibrato: 60, filter: { type: 'lowpass', frequency: 900 }, wet: 0.3 });
        return n({ duration: 0.8, gain: 0.08, attack: 0.1, filter: { type: 'bandpass', frequency: 380, q: 1 } });
      case 'wings':
        for (let i = 0; i < 3; i++) n({ start: i * 0.12, duration: 0.1, gain: 0.07, attack: 0.03, filter: { type: 'bandpass', frequency: 600, q: 0.8 } });
        return v({ type: 'sine', frequency: 2200, sweep: 1600, duration: 0.3, gain: 0.03, start: 0.1 });
      case 'warcry':
      case 'hero':
        this.duckMusic(0.5, 1.2);
        [0, 7, 12].forEach((step, i) => v({ type: 'sawtooth', frequency: 146.8 * Math.pow(2, step / 12), duration: 0.9, gain: 0.05, attack: 0.04, detune: i * 6, vibrato: 14, filter: { type: 'lowpass', frequency: 2200, sweep: 900 }, wet: 0.4 }));
        v({ type: 'sine', frequency: 73.4, sweep: 50, duration: 0.5, gain: 0.25, wet: 0.2 });
        return n({ duration: 0.35, gain: 0.08, filter: { type: 'bandpass', frequency: 900, q: 0.9 }, wet: 0.3 });
      case 'hit':
        n({ duration: 0.09, gain: 0.12 * power, filter: { type: 'bandpass', frequency: 1100, sweep: 500, q: 1.1 } });
        return v({ type: 'triangle', frequency: 150, sweep: 72, duration: 0.13, gain: 0.1 * power });
      case 'clash':
        this.metal({ base: 1500 + Math.random() * 400, ratios: [1, 2.71, 4.1], duration: 0.22, gain: 0.05 * power, pan, wet: 0.2 });
        return n({ duration: 0.06, gain: 0.08 * power, filter: { type: 'highpass', frequency: 1800 } });
      case 'arrow':
        n({ duration: 0.13, gain: 0.05, filter: { type: 'bandpass', frequency: 2400, sweep: 5200, q: 3 } });
        return v({ type: 'sine', frequency: 1250, sweep: 620, duration: 0.09, gain: 0.03 });
      case 'chakram':
        return v({ type: 'triangle', frequency: 900, sweep: 1400, duration: 0.3, gain: 0.04, vibrato: 220, wet: 0.2 });
      case 'falcon':
        return v({ type: 'sawtooth', frequency: 2600, sweep: 1700, duration: 0.35, gain: 0.03, attack: 0.02, vibrato: 90, filter: { type: 'bandpass', frequency: 2800, q: 5 }, wet: 0.35 });
      case 'water':
        v({ type: 'sine', frequency: 500, sweep: 1400, duration: 0.12, gain: 0.05 });
        return n({ start: 0.05, duration: 0.25, gain: 0.06, filter: { type: 'bandpass', frequency: 1600, sweep: 700, q: 1.5 }, wet: 0.3 });
      case 'cannon':
        v({ type: 'sine', frequency: 110, sweep: 34, duration: 0.5, gain: 0.26 * power });
        n({ duration: 0.4, gain: 0.2 * power, filter: { type: 'lowpass', frequency: 1600, sweep: 180 }, wet: 0.35 });
        return n({ duration: 0.1, gain: 0.09, filter: { type: 'highpass', frequency: 2400 } });
      case 'destroy':
        v({ type: 'sawtooth', frequency: 170, sweep: 40, duration: 0.7, gain: 0.15, filter: { type: 'lowpass', frequency: 1400, sweep: 220 } });
        n({ duration: 0.9, gain: 0.2, filter: { type: 'lowpass', frequency: 2200, sweep: 160 }, wet: 0.4 });
        for (let i = 0; i < 5; i++) n({ start: 0.12 + i * 0.07 + Math.random() * 0.05, duration: 0.07, gain: 0.05, filter: { type: 'bandpass', frequency: 1200 + Math.random() * 1600, q: 3 } });
        return n({ start: 0.09, duration: 0.6, gain: 0.09, playbackRate: 0.7, filter: { type: 'bandpass', frequency: 520, q: 0.8 } });
      case 'heal':
        p({ frequency: 1174.7, gain: 0.05, seconds: 0.9, decay: 0.996, bright: 0.7, wet: 0.5 });
        return v({ type: 'sine', frequency: 1760, duration: 0.4, gain: 0.03, start: 0.08, wet: 0.5 });
      case 'rain':
        this.duckMusic(0.55, 2);
        v({ type: 'sine', frequency: 55, sweep: 40, duration: 1.6, gain: 0.2, attack: 0.05, wet: 0.5 });
        n({ duration: 1.8, gain: 0.14, attack: 0.1, filter: { type: 'lowpass', frequency: 900, sweep: 160 }, wet: 0.6 });
        for (let i = 0; i < 18; i++) n({ start: 0.3 + Math.random() * 1.6, duration: 0.03, gain: 0.04, filter: { type: 'bandpass', frequency: 2500 + Math.random() * 3000, q: 4 } });
        return;
      case 'lightning':
        this.duckMusic(0.4, 1.2);
        n({ duration: 0.14, gain: 0.3, filter: { type: 'highpass', frequency: 2800, sweep: 900 } });
        n({ start: 0.05, duration: 1.1, gain: 0.18, filter: { type: 'lowpass', frequency: 1800, sweep: 110 }, wet: 0.5 });
        return v({ type: 'sawtooth', frequency: 320, sweep: 42, duration: 0.6, gain: 0.1 });
      case 'freeze':
        [0, 0.05, 0.1].forEach((start, i) => v({ type: 'sine', frequency: 1450 + i * 330, sweep: 2100 + i * 400, duration: 0.6, gain: 0.04, start, detune: i * 22, wet: 0.6 }));
        return n({ duration: 0.6, gain: 0.05, filter: { type: 'highpass', frequency: 4200 }, wet: 0.4 });
      case 'rage':
        [0, 0.04, 0.08].forEach((start, i) => v({ type: 'sawtooth', frequency: 150 * Math.pow(1.5, i), sweep: 300 * Math.pow(1.5, i), duration: 0.5, gain: 0.05, start, filter: { type: 'lowpass', frequency: 1600 }, wet: 0.3 }));
        return v({ type: 'sine', frequency: 60, sweep: 45, duration: 0.6, gain: 0.2 });
      case 'star':
        this.duckMusic(0.55, 0.8);
        [0, 7, 12].forEach((step, i) => v({ type: 'triangle', frequency: 880 * Math.pow(2, step / 12), duration: 0.5, gain: 0.06, start: i * 0.06, wet: 0.5 }));
        return this.metal({ base: 1760, start: 0.15, duration: 0.9, gain: 0.04, wet: 0.5 });
      case 'tick':
        return v({ type: 'square', frequency: 1320, duration: 0.05, gain: 0.03, filter: { type: 'lowpass', frequency: 3000 } });
      case 'victory':
      case 'defeat':
        this.duckMusic(0.2, 0.2);
        this.music?.stinger(cue);
        return;
      default: return v({ type: 'sine', frequency: 440, duration: 0.1, gain: 0.05 });
    }
  }

  // ---- Ambience: a living valley at home, wind and distant drums in battle.
  setAmbience(scene) {
    if (!this.ctx) return;
    if (this.ambience?.scene === scene) return;
    const old = this.ambience; this.ambience = null;
    if (old) { const t = this.now(); old.gain.gain.setTargetAtTime(0.0001, t, 0.6); clearInterval(old.timer); setTimeout(() => { for (const s of old.sources) { try { s.stop(); } catch {} } old.gain.disconnect(); }, 3000); }
    if (scene === 'none') return;
    const ctx = this.ctx, gain = ctx.createGain(), t = this.now(); gain.gain.setValueAtTime(0.0001, t); gain.gain.setTargetAtTime(1, t + 0.2, 1.2); gain.connect(this.ambienceBus);
    const sources = [];
    const bed = (frequency, q, level, rate, lfoRate, lfoDepth, type = 'lowpass') => {
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = rate;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = level;
      const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = lfoRate; depth.gain.value = lfoDepth; lfo.connect(depth); depth.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(gain); src.start(); lfo.start(); sources.push(src, lfo);
    };
    const ambience = { scene, gain, sources, timer: null }; this.ambience = ambience;
    if (scene === 'home') {
      bed(620, 0.6, 0.022, 0.5, 0.13, 0.008);           // the river along the valley
      bed(380, 1.4, 0.012, 0.35, 0.07, 0.01, 'bandpass'); // warm breeze
      ambience.timer = setInterval(() => this.ambientCall(ambience), 1400);
    } else {
      bed(300, 1.1, 0.02, 0.3, 0.09, 0.014, 'bandpass');  // open-field wind
      bed(140, 0.7, 0.018, 0.25, 0.05, 0.008);
    }
  }
  ambientCall(ambience) {
    if (this.ambience !== ambience || !this.enabled || !this.musicEnabled || document.hidden) return;
    const bus = ambience.gain, roll = Math.random(), pan = Math.random() * 1.6 - 0.8;
    if (roll < 0.22) {
      // Koel: a rising two-note call repeated with growing urgency.
      const base = 1150 + Math.random() * 120, reps = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < reps; i++) {
        const s = i * 0.62, f = base * Math.pow(1.06, i);
        this.voice({ type: 'sine', frequency: f, sweep: f * 1.03, start: s, duration: 0.16, gain: 0.018, attack: 0.02, pan, wet: 0.45, bus });
        this.voice({ type: 'sine', frequency: f * 1.26, sweep: f * 1.38, start: s + 0.2, duration: 0.3, gain: 0.02, attack: 0.03, pan, wet: 0.45, bus });
      }
    } else if (roll < 0.62) {
      // Sparrows and bulbuls chattering.
      const count = 2 + Math.floor(Math.random() * 5), base = 3200 + Math.random() * 1400;
      for (let i = 0; i < count; i++) this.voice({ type: 'sine', frequency: base * (0.9 + Math.random() * 0.25), sweep: base * (1.2 + Math.random() * 0.4), start: i * (0.06 + Math.random() * 0.05), duration: 0.05 + Math.random() * 0.04, gain: 0.008, attack: 0.005, pan, wet: 0.3, bus });
    } else if (roll < 0.66) {
      // A distant peacock.
      this.voice({ type: 'sawtooth', frequency: 700, sweep: 1000, start: 0, duration: 0.45, gain: 0.008, attack: 0.05, vibrato: 30, filter: { type: 'bandpass', frequency: 1400, q: 3 }, pan, wet: 0.7, bus });
      this.voice({ type: 'sawtooth', frequency: 1000, sweep: 640, start: 0.42, duration: 0.5, gain: 0.007, attack: 0.03, vibrato: 30, filter: { type: 'bandpass', frequency: 1300, q: 3 }, pan, wet: 0.7, bus });
    } else if (roll < 0.74) {
      // Temple bells carried on the wind.
      this.metal({ base: 780 + Math.random() * 80, ratios: [1, 2.02, 2.98, 4.1], duration: 2.2, gain: 0.008, pan, wet: 0.8, bus });
    }
  }
}
