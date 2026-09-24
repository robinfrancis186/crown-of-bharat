// Procedural score for Crown of Bharat. Nothing is pre-recorded: each theme is a
// small generative ensemble built on a raga, a tala and a drone, scheduled ahead on
// the Web Audio clock so timing stays tight even when the render loop stutters.
//
//   home   · Raga Bhupali (S R G P D), keherwa tala: tanpura, bansuri, santoor, tabla
//   battle · Raga Kirwani (S R g m P d N), driving chaal: sitar ostinato, shehnai,
//            dhol, nagara and manjira. Layers enter as the battle intensifies.
const SA = 146.83; // D3
const THEMES = {
  home: { scale: [0, 2, 4, 7, 9], bpm: 74, stepsPerBeat: 2, bar: 16, stable: [0, 2, 3], level: 2.3 },
  battle: { scale: [0, 2, 3, 5, 7, 8, 11], bpm: 126, stepsPerBeat: 4, bar: 16, stable: [0, 2, 4], level: 0.62 },
};
const LOOKAHEAD = 0.3;
const pick = list => list[Math.floor(Math.random() * list.length)];
const chance = p => Math.random() < p;

export class MusicDirector {
  constructor(audio) {
    this.audio = audio; this.ctx = audio.ctx; this.theme = null; this.intensity = 0; this.timer = null;
  }
  get out() { return this.audio.duck; }
  // Scale degree (may be negative or span octaves) to frequency in Hz.
  freq(theme, degree, octave = 0) {
    const scale = THEMES[theme.name].scale, n = scale.length, o = Math.floor(degree / n), i = ((degree % n) + n) % n;
    return SA * Math.pow(2, octave + o + scale[i] / 12);
  }
  setIntensity(value) { this.intensity = Math.max(0, Math.min(1, Number(value) || 0)); }
  play(name) {
    if ((this.theme?.name || 'none') === name) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (this.theme) this.release(this.theme, 1.4);
    this.theme = null;
    if (name === 'none' || !THEMES[name]) { this.stopClock(); return; }
    const spec = THEMES[name], gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t); gain.gain.setTargetAtTime(spec.level, t + 0.1, 0.9); gain.connect(this.out);
    this.theme = { name, spec, gain, step: 0, nextTime: t + 0.15, secondsPerStep: 60 / spec.bpm / spec.stepsPerBeat, pad: [], phrase: null, motif: null, section: 0 };
    this.startPad(this.theme);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 60);
    this.tick();
  }
  release(theme, seconds) {
    const t = this.ctx.currentTime; theme.stopped = true;
    theme.gain.gain.cancelScheduledValues(t); theme.gain.gain.setTargetAtTime(0.0001, t, seconds / 4);
    setTimeout(() => { for (const node of theme.pad) { try { node.stop(); } catch {} } theme.gain.disconnect(); }, seconds * 1000 + 800);
  }
  stopClock() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  tick() {
    const theme = this.theme; if (!theme || theme.stopped) return;
    const now = this.ctx.currentTime;
    // After a hidden tab or a long stall, rejoin the grid instead of flooding notes.
    if (theme.nextTime < now - 0.2) theme.nextTime = now + 0.05;
    if (document.hidden) return;
    while (theme.nextTime < now + LOOKAHEAD) {
      try { if (theme.name === 'home') this.homeStep(theme, theme.step, theme.nextTime); else this.battleStep(theme, theme.step, theme.nextTime); } catch {}
      theme.nextTime += theme.secondsPerStep; theme.step++;
    }
  }

  // ---------------------------------------------------------------- instruments
  node(dest, pan = 0, wet = 0) {
    const ctx = this.ctx, g = ctx.createGain(); let out = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
    out.connect(dest);
    if (wet > 0 && this.audio.reverb) { const s = ctx.createGain(); s.gain.value = wet; out.connect(s); s.connect(this.audio.reverb); }
    return g;
  }
  env(g, t, gain, attack, dur, tail = 0.08) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setTargetAtTime(0.0001, t + Math.max(attack, dur - tail), tail);
  }
  osc(dest, { type = 'sine', freq, t, dur, gain, attack = 0.01, tail = 0.08, glideFrom = null, glide = 0.08, vibrato = 0, vibratoRate = 5.4, vibratoDelay = 0.18, filter = null, pan = 0, wet = 0, detune = 0 }) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = this.node(dest, pan, wet);
    o.type = type; o.detune.value = detune;
    if (glideFrom) { o.frequency.setValueAtTime(glideFrom, t); o.frequency.exponentialRampToValueAtTime(freq, t + glide); } else o.frequency.setValueAtTime(freq, t);
    let src = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.frequency; f.Q.value = filter.q ?? 0.8; o.connect(f); src = f; }
    src.connect(g); this.env(g, t, gain, attack, dur, tail);
    if (vibrato && dur > vibratoDelay + 0.05) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = vibratoRate * (0.94 + Math.random() * 0.12);
      depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(vibrato, t + vibratoDelay + 0.25);
      lfo.connect(depth); depth.connect(o.detune); lfo.start(t); lfo.stop(t + dur + tail * 6);
    }
    o.start(t); o.stop(t + dur + tail * 6);
    return o;
  }
  noise(dest, { t, dur, gain, attack = 0.002, tail = 0.03, filter, pan = 0, wet = 0, rate = 1 }) {
    const ctx = this.ctx, s = ctx.createBufferSource(), g = this.node(dest, pan, wet), f = ctx.createBiquadFilter();
    s.buffer = this.audio.noise; s.playbackRate.value = rate; f.type = filter.type || 'bandpass'; f.frequency.value = filter.frequency; f.Q.value = filter.q ?? 1;
    s.connect(f); f.connect(g); this.env(g, t, gain, attack, dur, tail);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + tail * 6);
  }
  pluck(dest, { freq, t, gain, seconds = 1.6, decay = 0.996, bright = 0.5, pan = 0, wet = 0.3, filter = null }) {
    const ctx = this.ctx, s = ctx.createBufferSource(), g = this.node(dest, pan, wet);
    s.buffer = this.audio.pluckBuffer(freq, { decay, bright, seconds });
    let src = s; if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.frequency; f.Q.value = filter.q ?? 0.7; s.connect(f); src = f; }
    src.connect(g); g.gain.setValueAtTime(gain, t); g.gain.setTargetAtTime(0.0001, t + seconds * 0.75, seconds * 0.08);
    s.start(t); s.stop(t + seconds);
  }
  bansuri(dest, freq, t, dur, gain, glideFrom) {
    this.osc(dest, { type: 'sine', freq, t, dur, gain, attack: 0.07, tail: 0.12, glideFrom, glide: 0.11, vibrato: dur > 0.5 ? 16 : 6, pan: 0.12, wet: 0.42 });
    this.osc(dest, { type: 'triangle', freq: freq * 2, t, dur, gain: gain * 0.07, attack: 0.09, tail: 0.1, glideFrom: glideFrom && glideFrom * 2, glide: 0.11, pan: 0.12, wet: 0.42 });
    this.noise(dest, { t, dur: Math.min(dur, 0.5), gain: gain * 0.22, attack: 0.04, tail: 0.1, filter: { type: 'bandpass', frequency: freq * 2.2, q: 2.2 }, pan: 0.12, wet: 0.3 });
  }
  shehnai(dest, freq, t, dur, gain, glideFrom) {
    for (const [type, detune, level] of [['sawtooth', 0, 1], ['square', 7, 0.45]])
      this.osc(dest, { type, freq, t, dur, gain: gain * level, attack: 0.035, tail: 0.07, glideFrom, glide: 0.07, vibrato: dur > 0.3 ? 22 : 8, vibratoRate: 6.4, vibratoDelay: 0.1, detune, filter: { type: 'bandpass', frequency: 1250, q: 1.1 }, pan: -0.08, wet: 0.35 });
  }
  santoor(dest, freq, t, gain) {
    this.pluck(dest, { freq, t, gain, seconds: 1.5, decay: 0.997, bright: 0.72, pan: -0.25, wet: 0.35 });
    this.pluck(dest, { freq: freq * 1.003, t: t + 0.004, gain: gain * 0.5, seconds: 1.3, decay: 0.996, bright: 0.72, pan: -0.3, wet: 0.35 });
  }
  sitar(dest, freq, t, gain) {
    // A slightly sharp, bright pluck plus a buzzing upper partial suggests the jawari bridge.
    this.pluck(dest, { freq, t, gain, seconds: 1.1, decay: 0.995, bright: 0.85, pan: 0.22, wet: 0.2 });
    this.osc(dest, { type: 'sawtooth', freq: freq * 2, t, dur: 0.18, gain: gain * 0.08, attack: 0.002, tail: 0.1, filter: { type: 'bandpass', frequency: 2400, q: 3 }, pan: 0.22 });
  }
  tanpura(dest, freq, t, gain) {
    this.pluck(dest, { freq, t, gain, seconds: 3.2, decay: 0.9985, bright: 0.3, pan: -0.35, wet: 0.45 });
    // Jawari: the buzz blooms a moment after the pluck.
    this.osc(dest, { type: 'sawtooth', freq, t: t + 0.05, dur: 2.2, gain: gain * 0.1, attack: 0.5, tail: 0.6, filter: { type: 'bandpass', frequency: freq * 6, q: 5 }, pan: -0.35, wet: 0.4 });
  }
  tabla(dest, stroke, t, level = 1) {
    const dayan = SA * 2, pan = 0.25;
    const na = (g, dur) => { for (const [ratio, amp] of [[1, 1], [2, 0.5], [3, 0.28], [4.1, 0.12]]) this.osc(dest, { freq: dayan * ratio, t, dur: dur / (1 + (ratio - 1) * 0.3), gain: g * amp * level, attack: 0.002, tail: dur / 3.5, pan, wet: 0.12 }); this.noise(dest, { t, dur: 0.012, gain: g * 0.5 * level, filter: { type: 'highpass', frequency: 3000 }, pan }); };
    const ge = g => this.osc(dest, { freq: 110, glideFrom: 82, glide: 0.05, t, dur: 0.5, gain: g * level, attack: 0.004, tail: 0.18, pan: -pan, wet: 0.1 });
    const ke = g => { this.noise(dest, { t, dur: 0.05, gain: g * level, filter: { type: 'lowpass', frequency: 520 }, pan: -pan }); this.osc(dest, { freq: 130, t, dur: 0.05, gain: g * 0.6 * level, attack: 0.002, tail: 0.02, pan: -pan }); };
    const ti = g => { this.noise(dest, { t, dur: 0.03, gain: g * level, filter: { type: 'bandpass', frequency: 3400, q: 1.4 }, pan }); this.osc(dest, { freq: dayan * 2.1, t, dur: 0.05, gain: g * 0.3 * level, attack: 0.001, tail: 0.02, pan }); };
    if (stroke === 'na') na(0.075, 0.45); else if (stroke === 'tin') na(0.045, 0.25);
    else if (stroke === 'ge') ge(0.16); else if (stroke === 'ke') ke(0.07); else if (stroke === 'ti') ti(0.05);
    else if (stroke === 'dha') { ge(0.15); na(0.07, 0.45); } else if (stroke === 'dhi') { ge(0.14); na(0.04, 0.25); }
  }
  dhol(dest, stroke, t, level = 1) {
    if (stroke === 'dagga') { this.osc(dest, { freq: 58, glideFrom: 96, glide: 0.06, t, dur: 0.38, gain: 0.26 * level, attack: 0.003, tail: 0.14, pan: -0.1, wet: 0.12 }); this.noise(dest, { t, dur: 0.06, gain: 0.07 * level, filter: { type: 'lowpass', frequency: 320 } }); }
    else if (stroke === 'tak') { this.noise(dest, { t, dur: 0.05, gain: 0.07 * level, filter: { type: 'bandpass', frequency: 2300, q: 1.5 }, pan: 0.15, wet: 0.1 }); this.osc(dest, { type: 'triangle', freq: 540, t, dur: 0.05, gain: 0.03 * level, attack: 0.001, tail: 0.02, pan: 0.15 }); }
    else if (stroke === 'nagara') { this.osc(dest, { freq: 44, glideFrom: 70, glide: 0.1, t, dur: 1, gain: 0.3 * level, attack: 0.004, tail: 0.35, wet: 0.35 }); this.noise(dest, { t, dur: 0.2, gain: 0.08 * level, filter: { type: 'lowpass', frequency: 260 }, wet: 0.3 }); }
  }
  manjira(dest, t, open = true, level = 1) {
    for (const [ratio, amp] of [[1, 1], [1.48, 0.6], [2.13, 0.45], [2.94, 0.3]]) this.osc(dest, { freq: 2650 * ratio, t, dur: open ? 0.9 : 0.09, gain: 0.012 * amp * level, attack: 0.001, tail: open ? 0.3 : 0.03, pan: 0.4, wet: 0.35 });
  }
  startPad(theme) {
    const ctx = this.ctx, t = ctx.currentTime, battle = theme.name === 'battle';
    for (const [ratio, type, level] of battle ? [[0.5, 'sawtooth', 0.012], [0.75, 'sawtooth', 0.008], [1, 'triangle', 0.01]] : [[0.5, 'sine', 0.026], [0.75, 'sine', 0.012], [1, 'triangle', 0.006]]) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = this.node(theme.gain, 0, 0.3);
      o.type = type; o.frequency.value = SA * ratio; o.detune.value = (Math.random() - 0.5) * 6; f.type = 'lowpass'; f.frequency.value = battle ? 520 : 900;
      o.connect(f); f.connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(level, t + 0.2, 2);
      o.start(t); theme.pad.push(o);
    }
  }

  // --------------------------------------------------------------- composition
  // A phrase is a list of {at, degree, steps}. Motifs return with variation, which
  // is what makes generative lines sound composed rather than random.
  phrase(theme, { cells, bars, low, high, start }) {
    const bar = theme.spec.bar, total = bar * bars, notes = []; let at = 0, degree = start, guard = 0;
    while (at < total - 4 && guard++ < 64) {
      for (const steps of pick(cells)) {
        if (at + steps > total - 2) break;
        const move = Math.random(); degree += move < 0.42 ? 1 : move < 0.84 ? -1 : move < 0.94 ? (chance(0.5) ? 2 : -2) : 0;
        degree = Math.max(low, Math.min(high, degree)); notes.push({ at, degree, steps }); at += steps;
      }
      if (chance(0.35)) at += pick([2, 4]);
    }
    // Resolve to a stable tone of the raga on a long final note.
    const n = theme.spec.scale.length, last = notes.at(-1);
    if (last) { const octave = Math.floor(last.degree / n) * n; last.degree = octave + theme.spec.stable.reduce((best, s) => Math.abs(octave + s - last.degree) < Math.abs(octave + best - last.degree) ? s : best, 0); last.steps = Math.max(last.steps, Math.min(8, total - last.at)); }
    return notes;
  }
  vary(theme, motif) {
    const copy = motif.map(note => ({ ...note })), n = theme.spec.scale.length;
    if (!copy.length) return copy;
    const roll = Math.random();
    if (roll < 0.4) { for (const note of copy.slice(-3, -1)) note.degree += chance(0.5) ? 1 : -1; }
    else if (roll < 0.65) { for (const note of copy) note.degree += 1; copy.at(-1).degree = Math.round(copy.at(-1).degree / n) * n; }
    return copy;
  }
  melodyFor(theme) {
    const home = theme.name === 'home', n = theme.spec.scale.length;
    const options = home
      ? { cells: [[2, 2, 4], [4, 2, 2], [3, 1, 4], [6, 2], [4, 4], [2, 2, 2, 2], [8]], bars: 2, low: n, high: n * 2 + 2, start: n + 2 }
      : { cells: [[2, 2], [1, 1, 2], [4], [3, 1], [2, 1, 1], [6, 2]], bars: 2, low: n - 2, high: n * 2 + 1, start: n };
    theme.section = (theme.section + 1) % 4;
    if (!theme.motif || theme.section === 0) { theme.motif = this.phrase(theme, options); return theme.motif; }
    return theme.section === 2 ? this.phrase(theme, options) : this.vary(theme, theme.motif);
  }
  playMelody(theme, step, t, voice, gain, octave = 0) {
    const bar = theme.spec.bar, length = bar * 2;
    if (step % length === 0) { theme.phrase = this.melodyFor(theme); theme.lastFreq = null; }
    const within = step % length;
    for (const note of theme.phrase || []) if (note.at === within) {
      const f = this.freq(theme, note.degree, octave), dur = note.steps * theme.secondsPerStep * 0.96;
      const glide = theme.lastFreq && Math.abs(Math.log2(f / theme.lastFreq)) < 0.3 && chance(0.45) ? theme.lastFreq : null;
      voice(f, t, dur, gain, glide); theme.lastFreq = f;
    }
  }
  homeStep(theme, step, t) {
    const bar = theme.spec.bar, beat = step % bar, cycle = Math.floor(step / bar), out = theme.gain;
    // Tanpura: Pa – Sa' – Sa' – Sa, one string per beat pair.
    if (beat % 4 === 0) { const strings = [this.freq(theme, -2), this.freq(theme, 0), this.freq(theme, 0), this.freq(theme, -5)]; this.tanpura(out, strings[beat / 4], t, 0.055); }
    // Keherwa after a short alap: Dha Ge Na Ti | Na Ke Dhi Na.
    if (cycle >= 2 && beat % 2 === 0) {
      const bols = ['dha', 'ge', 'na', 'ti', 'na', 'ke', 'dhi', 'na'], bol = bols[beat / 2];
      this.tabla(out, bol, t, cycle % 8 === 7 && beat >= 8 ? 1.15 : 0.9);
    } else if (cycle >= 3 && beat % 2 === 1 && (beat === 15 ? chance(0.6) : chance(0.12))) this.tabla(out, 'ti', t, 0.7);
    if (cycle >= 2 && beat === 0 && cycle % 2 === 0) this.manjira(out, t, true, 0.7);
    // Bansuri leads; santoor answers on alternate phrase pairs.
    if (cycle >= 1) {
      const answering = Math.floor((cycle - 1) / 2) % 4 === 3;
      this.playMelody(theme, step - bar, t, answering
        ? (f, time, dur, gain) => { this.santoor(out, f, time, gain); if (dur > theme.secondsPerStep * 3) this.santoor(out, f, time + dur / 2, gain * 0.6); }
        : (f, time, dur, gain, glide) => this.bansuri(out, f, time, dur, gain, glide), answering ? 0.1 : 0.075);
    }
  }
  battleStep(theme, step, t) {
    const bar = theme.spec.bar, beat = step % bar, cycle = Math.floor(step / bar), out = theme.gain, heat = this.intensity;
    if (beat === 0) this.tanpura(out, this.freq(theme, 0, -1), t, 0.05);
    // Dhol chaal with the classic push on the "and" of two.
    if ([0, 3, 6, 10, 12].includes(beat)) this.dhol(out, 'dagga', t, beat === 0 ? 1 : 0.8);
    if ([2, 4, 7, 8, 11, 14].includes(beat) || (heat > 0.5 && beat === 15)) this.dhol(out, 'tak', t, 0.7 + heat * 0.4);
    if (heat > 0.25 && beat % 8 === 0) this.dhol(out, 'nagara', t, 0.6 + heat * 0.5);
    if (heat > 0.6 && beat % 4 === 2) this.manjira(out, t, false, 1);
    if (heat > 0.8 && beat >= 12 && cycle % 2 === 1) this.dhol(out, 'dagga', t, 0.6);
    // Sitar ostinato: S S r g | S n S P  (low register).
    const riff = [[0, 0], [2, 0], [4, 1], [6, 2], [8, 0], [10, -1], [12, 0], [14, -3]];
    for (const [at, degree] of riff) if (beat === at && (cycle >= 1 || at === 0)) this.sitar(out, this.freq(theme, degree, -1), t, cycle % 4 === 3 && at >= 8 ? 0.13 : 0.1);
    // Shehnai joins once the attack is under way.
    if (cycle >= 2 && heat > 0.12) this.playMelody(theme, step - bar * 2, t, (f, time, dur, gain, glide) => this.shehnai(out, f, time, dur, gain, glide), 0.022 + heat * 0.012);
  }

  // ---------------------------------------------------------------- stingers
  stinger(kind) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + 0.05, out = this.node(this.audio.sfxBus, 0, 0);
    out.gain.value = 1; setTimeout(() => out.disconnect(), 7000);
    const theme = { name: kind === 'defeat' ? 'battle' : 'home' }, f = (d, o = 0) => this.freq(theme, d, o);
    if (kind === 'victory') {
      this.dhol(out, 'nagara', t, 1.1); this.dhol(out, 'nagara', t + 0.36, 0.9);
      [[0, 0, 0.18], [0.18, 1, 0.18], [0.36, 2, 0.18], [0.54, 3, 0.36], [0.9, 4, 0.18], [1.08, 5, 1.3]].forEach(([at, degree, dur]) => this.shehnai(out, f(degree, 1), t + at, dur, 0.05));
      [0, 2, 3, 5].forEach((degree, i) => this.santoor(out, f(degree, 1), t + 1.1 + i * 0.07, 0.1));
      for (let i = 0; i < 6; i++) this.dhol(out, i % 2 ? 'tak' : 'dagga', t + 0.9 + i * 0.1, 0.8);
      this.manjira(out, t + 1.08, true, 1.4); this.tanpura(out, f(0), t, 0.08); this.tanpura(out, f(3), t + 0.5, 0.06);
    } else if (kind === 'defeat') {
      this.tanpura(out, f(0, -1), t, 0.08);
      [[0, 4, 0.5], [0.5, 3, 0.5], [1, 2, 0.5], [1.5, 1, 0.4], [1.9, 0, 1.6]].forEach(([at, degree, dur]) => this.bansuri(out, f(degree, 1), t + at, dur, 0.07));
      this.dhol(out, 'nagara', t + 1.9, 0.7);
    } else if (kind === 'upgrade') {
      [0, 1, 2, 3, 4, 5].forEach((degree, i) => this.santoor(out, f(degree, 1), t + i * 0.06, 0.08));
    }
  }
}
