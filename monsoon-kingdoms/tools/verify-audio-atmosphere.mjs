import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MusicDirector } from '../src/music.js';
import { GameAudio } from '../src/audio.js';
import { ParticleField, addRimLight, addWindSway, addCloudShade, waterMaterial } from '../src/atmosphere.js';
import { unitScale } from '../src/view.js';

// ---- Music theory: ragas map to the right pitches and phrases stay musical.
const director = new MusicDirector({ ctx: null });
const home = { name: 'home', spec: { scale: [0, 2, 4, 7, 9], bar: 16, stable: [0, 2, 3] } };
const battle = { name: 'battle', spec: { scale: [0, 2, 3, 5, 7, 8, 11], bar: 16, stable: [0, 2, 4] } };
const close = (a, b) => Math.abs(a - b) < 1e-6;
assert.ok(close(director.freq(home, 0), 146.83), 'Sa is D3');
assert.ok(close(director.freq(home, 5), 146.83 * 2), 'five Bhupali degrees span one octave');
assert.ok(close(director.freq(home, 3), 146.83 * Math.pow(2, 7 / 12)), 'Pa is a perfect fifth above Sa');
assert.ok(close(director.freq(battle, -1), 146.83 * Math.pow(2, -1 / 12)), 'Kirwani has a raised Ni just below Sa');
for (const theme of [home, battle]) {
  const n = theme.spec.scale.length, options = { cells: [[2, 2, 4], [4, 2, 2], [3, 1, 4], [1, 1, 2]], bars: 2, low: n, high: n * 2 + 2, start: n + 2 };
  for (let run = 0; run < 300; run++) {
    const phrase = director.phrase(theme, options);
    assert.ok(phrase.length >= 2, 'a phrase has several notes');
    let previous = -1;
    for (const note of phrase) {
      assert.ok(note.at > previous && note.at + note.steps <= 32, 'notes are ordered and fit their two bars');
      assert.ok(note.degree >= options.low - n && note.degree <= options.high + n, 'melody stays within its register');
      previous = note.at;
    }
    const last = phrase.at(-1), degree = ((last.degree % n) + n) % n;
    assert.ok(theme.spec.stable.includes(degree), 'phrases resolve on a stable tone of the raga');
    assert.equal(director.vary(theme, phrase).length, phrase.length, 'variations keep the motif rhythm');
  }
}

// ---- Audio facade is inert until enabled and never throws without Web Audio.
const audio = new GameAudio();
assert.doesNotThrow(() => { audio.play('cannon'); audio.setScene('battle'); audio.setIntensity(0.7); audio.setVolume('music', 2); audio.setHidden(true); audio.stinger('victory'); });
assert.equal(audio.volume.music, 1, 'volume is clamped');
assert.equal(audio.ctx, null, 'no AudioContext is created while sound is disabled');

// ---- Particles: pooled, bounded and self-cleaning.
const scene = new THREE.Scene(), field = new ParticleField(scene, { capacity: 64, additive: true });
field.emit({ x: 1, y: 2, z: 3, count: 40, life: 0.5, radial: 2, size: 0.3, color: '#ffcc00' });
field.update(1 / 60, 0, 10);
assert.equal(field.points.geometry.drawRange.count, 40, 'emitted particles are drawn');
field.emit({ count: 100, life: 0.5 });
assert.ok(field.count <= 64, 'pool never exceeds its capacity');
for (let i = 0; i < 60; i++) field.update(1 / 30, i / 30, 10);
assert.equal(field.points.geometry.drawRange.count, 0, 'expired particles leave nothing to draw');
field.emit({ count: 5, life: 5 }); field.clear();
assert.equal(field.points.geometry.drawRange.count, 0, 'clear empties the pool');
assert.equal(scene.children.length, 1, 'a pool is a single draw call'); field.dispose(); assert.equal(scene.children.length, 0);

// ---- Shader injections target chunks that exist and never stack.
const material = new THREE.MeshStandardMaterial();
addRimLight(material, '#ffcf6b', 0.5); addRimLight(material, '#ffffff', 1);
const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
material.onBeforeCompile(shader);
assert.equal(shader.fragmentShader.match(/uRimStrength/g).length, 2, 'rim light injected exactly once');
assert.ok(shader.uniforms.uRimColor.value.equals(new THREE.Color('#ffcf6b')), 'first rim colour is kept');
const uniforms = { uWindTime: { value: 0 }, uCloudTime: { value: 0 }, uCloudAmount: { value: 0.2 } };
for (const [apply, marker] of [[m => addWindSway(m, uniforms), 'cobGust'], [m => addCloudShade(m, uniforms), 'cobCloud']]) {
  const m = new THREE.MeshStandardMaterial(); apply(m);
  const s = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  m.onBeforeCompile(s); assert.ok((s.vertexShader + s.fragmentShader).includes(marker), `${marker} injected`);
}
const water = waterMaterial();
assert.ok(water.fragmentShader.includes('#include <fog_fragment>') && water.uniforms.uTime, 'river shader is animated and fogged');

// ---- Characters render larger than their footprint, heroes most of all.
assert.ok(unitScale({ heroId: 'veer' }) > unitScale({ type: 'guard' }) && unitScale({ type: 'guard' }) > unitScale({ type: 'elephant' }));
assert.equal(unitScale({ decoy: true }), 1.16, 'mechanical decoys keep their calibrated size');

console.log('PASS: raga pitch maps, resolved generative phrases and motif variation; inert audio facade; bounded self-cleaning particle pools; single-injection rim/wind/cloud shaders; fogged river shader; readable unit scales.');
