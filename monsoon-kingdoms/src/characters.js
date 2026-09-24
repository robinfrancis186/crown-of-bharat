import * as THREE from 'three';
import { addRimLight } from './atmosphere.js';
import { ClothStrip } from './physics.js';

// Crown of Bharat character forge. Every troop, hero and mount is modelled here from
// primitives and rigged with a real skeleton: 18 bones for people (hips, spine, chest,
// neck, head, shoulders→elbows→hands, thighs→knees→feet), dedicated rigs for the
// horse, war elephant (three-bone trunk, flapping ears), yeti and winged Garuda.
// Each character merges into ONE skinned mesh (two material groups: cloth/skin and
// metal), so a full battle stays within a mobile draw-call budget. Clones share the
// geometry and inverse-bind matrices; only bones are per actor.
//
// Animation is procedural and full-body: distance-driven gait with arm counter-swing,
// hip bob and torso twist; breathing idles; weapon-specific attacks timed to the rules'
// own attack clock (the blow lands on the frame the hit event fires); hit flinches;
// victory cheers; and a limp pose handed to the physics solver when a warrior falls.

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0);
const TAU = Math.PI * 2;
const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = t => t * t * (3 - 2 * t);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// ------------------------------------------------------------------ builder
class Builder {
  constructor() { this.parts = []; this.bones = []; this.index = new Map(); this.meta = {}; }
  bone(name, parent, pos) { this.index.set(name, this.bones.length); this.bones.push({ name, parent, pos: pos.clone() }); return this; }
  boneAt(name) { return this.bones[this.index.get(name)].pos; }
  part(geometry, bone, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], quat = null, metal = false } = {}) {
    if (!this.index.has(bone)) throw new Error(`unknown bone ${bone}`);
    const q = quat || new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
    this.parts.push({ geometry, bone: this.index.get(bone), color: new THREE.Color(color), metal, matrix: new THREE.Matrix4().compose(Array.isArray(pos) ? V(...pos) : pos, q, V(...scale)) });
    return this;
  }
  // A tapered limb from a to b with rounded ends.
  limb(bone, a, b, r0, r1, color, { caps = true, metal = false, segments = 10 } = {}) {
    const dir = V().subVectors(b, a), len = dir.length(); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(Y, dir), mid = V().addVectors(a, b).multiplyScalar(0.5);
    this.part(new THREE.CylinderGeometry(r1, r0, len, segments, 1, true), bone, color, { pos: mid, quat: q, metal });
    if (caps) { this.part(sphere(r0, segments), bone, color, { pos: a, metal }); this.part(sphere(r1, segments), bone, color, { pos: b, metal }); }
    return this;
  }
  build() {
    const pos = [], nor = [], col = [], skin = [], matte = [], metal = [];
    const normal = new THREE.Matrix3(), v = V(), n = V();
    for (const p of this.parts) {
      const g = p.geometry.index ? p.geometry : p.geometry, base = pos.length / 3, P = g.attributes.position, N = g.attributes.normal;
      normal.getNormalMatrix(p.matrix);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(p.matrix); n.fromBufferAttribute(N, i).applyMatrix3(normal).normalize();
        pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); col.push(p.color.r, p.color.g, p.color.b); skin.push(p.bone);
      }
      const target = p.metal ? metal : matte, index = g.index ? g.index.array : Array.from({ length: P.count }, (_, i) => i);
      // Negative-determinant transforms (mirrored parts) flip winding.
      const flip = p.matrix.determinant() < 0;
      for (let i = 0; i < index.length; i += 3) { if (flip) target.push(base + index[i], base + index[i + 2], base + index[i + 1]); else target.push(base + index[i], base + index[i + 1], base + index[i + 2]); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const indices = new Uint16Array(skin.length * 4), weights = new Float32Array(skin.length * 4);
    skin.forEach((b, i) => { indices[i * 4] = b; weights[i * 4] = 1; });
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    geometry.setIndex([...matte, ...metal]);
    geometry.addGroup(0, matte.length, 0); geometry.addGroup(matte.length, metal.length, 1);
    geometry.computeBoundingSphere(); geometry.computeBoundingBox();
    const bones = this.bones.map(b => ({ name: b.name, parent: b.parent, world: b.pos.clone(), local: b.parent ? b.pos.clone().sub(this.boneAt(b.parent)) : b.pos.clone() }));
    const inverses = bones.map(b => new THREE.Matrix4().makeTranslation(-b.world.x, -b.world.y, -b.world.z));
    return { geometry, bones, inverses, height: geometry.boundingBox.max.y, triangles: (matte.length + metal.length) / 3, ...this.meta };
  }
}
const cache = new Map();
const shared = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const sphere = (r, s = 12) => shared(`s${r}:${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, Math.round(s * 0.7))));
const box = (x, y, z) => shared(`b${x}:${y}:${z}`, () => new THREE.BoxGeometry(x, y, z));
const cyl = (t, b, h, s = 12, open = false) => shared(`c${t}:${b}:${h}:${s}:${open}`, () => new THREE.CylinderGeometry(t, b, h, s, 1, open));
const torus = (r, t, s = 16, arc = TAU) => shared(`t${r}:${t}:${s}:${arc}`, () => new THREE.TorusGeometry(r, t, 6, s, arc));
const cone = (r, h, s = 10) => shared(`k${r}:${h}:${s}`, () => new THREE.ConeGeometry(r, h, s));
// Lathe profiles must run bottom→top for outward-facing triangles.
const lathe = (points, s = 14) => { const p = points[0][1] > points.at(-1)[1] ? [...points].reverse() : points; return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), s); };
const ico = (r, d = 0) => shared(`i${r}:${d}`, () => new THREE.IcosahedronGeometry(r, d));
const halfSphere = r => shared(`h${r}`, () => new THREE.SphereGeometry(r, 12, 6, 0, TAU, 0, Math.PI / 2));

// ------------------------------------------------------------------ palettes
const SKIN = { warm: '#c58a5f', deep: '#9c6440', light: '#d9a57a' };
const GOLD = '#d9a93f', BROWN = '#5a3a27', DARK = '#2b2522', TEAL = '#2f7f8d', TEAL_D = '#23606d', HAIR = '#2a211d';

// ------------------------------------------------------------------ humanoid
// Proportions are in model units (the renderer scales actors per unit type).
function humanoid(B, o = {}) {
  const k = o.scale || 1, wide = (o.wide || 1) * 1.14, skin = o.skin || SKIN.warm;
  const H = { ankle: 0.09 * k, knee: 0.4 * k, hip: 0.72 * k, spine: 0.86 * k, chest: 1.02 * k, shoulder: 1.2 * k, neck: 1.28 * k, head: 1.38 * k };
  const sw = 0.25 * k * wide, hw = 0.1 * k * wide, hr = (o.headRadius || 0.205) * k;
  B.meta.H = H; B.meta.kind = 'biped';
  B.bone('root', null, V()).bone('hips', 'root', V(0, H.hip, 0)).bone('spine', 'hips', V(0, H.spine, 0)).bone('chest', 'spine', V(0, H.chest, 0))
    .bone('neck', 'chest', V(0, H.neck, 0)).bone('head', 'neck', V(0, H.head, 0));
  for (const [s, side] of [['L', 1], ['R', -1]]) {
    B.bone(`upperArm${s}`, 'chest', V(side * sw, H.shoulder, 0)).bone(`forearm${s}`, `upperArm${s}`, V(side * (sw + 0.04 * k), 0.95 * k, 0)).bone(`hand${s}`, `forearm${s}`, V(side * (sw + 0.06 * k), 0.72 * k, 0.01));
    B.bone(`thigh${s}`, 'hips', V(side * hw, H.hip, 0)).bone(`shin${s}`, `thigh${s}`, V(side * hw, H.knee, 0.015)).bone(`foot${s}`, `shin${s}`, V(side * hw, H.ankle, 0));
  }
  const pants = o.pants || TEAL_D, top = o.top || TEAL, sleeve = o.sleeve || top, boots = o.boots || BROWN, trim = o.trim || GOLD;
  // Legs.
  for (const [s, side] of [['L', 1], ['R', -1]]) {
    const x = side * hw;
    B.limb(`thigh${s}`, V(x, H.hip - 0.02 * k, 0), V(x, H.knee + 0.02 * k, 0.01), 0.088 * k * wide, 0.074 * k * wide, pants);
    B.limb(`shin${s}`, V(x, H.knee, 0.015), V(x, H.ankle + 0.06 * k, 0), 0.07 * k * wide, 0.058 * k * wide, o.bareLegs ? skin : pants);
    if (!o.noKneeBand) B.part(torus(0.074 * k * wide, 0.014 * k), `shin${s}`, trim, { pos: [x, H.knee - 0.03 * k, 0.015], rot: [Math.PI / 2, 0, 0], metal: true });
    // Boot: rounded toe, dark sole, gold anklet.
    B.part(sphere(0.085 * k * wide), `foot${s}`, boots, { pos: [x, H.ankle - 0.01 * k, 0.04 * k], scale: [0.95, 0.75, 1.45] });
    B.part(box(0.13 * k * wide, 0.025 * k, 0.22 * k), `foot${s}`, DARK, { pos: [x, 0.013 * k, 0.05 * k] });
    B.part(cyl(0.066 * k * wide, 0.07 * k * wide, 0.09 * k), `foot${s}`, boots, { pos: [x, H.ankle + 0.05 * k, 0] });
  }
  // Pelvis and kurta skirt (on the hips so legs swing beneath the hem).
  B.part(sphere(0.2 * k * wide), 'hips', pants, { pos: [0, H.hip + 0.02 * k, 0], scale: [1, 0.62, 0.8] });
  if (!o.noSkirt) B.part(lathe([[0.001, 0.2], [0.2, 0.19], [0.215, 0.1], [0.24, -0.02], [0.258, -0.15], [0.001, -0.16]].map(([r, y]) => [r * k * wide * (o.skirtFlare || 1), y * k]), 16), 'hips', o.skirt || top, { pos: [0, H.hip + 0.02 * k, 0], scale: [1, o.skirtLength || 1, 0.82] });
  // Torso.
  const torso = o.bareChest ? skin : top;
  B.part(lathe([[0.001, 0], [0.2, 0.02], [0.195, 0.14], [0.215, 0.28], [0.225, 0.36], [0.17, 0.43], [0.001, 0.44]].map(([r, y]) => [r * k * wide, y * k])), 'chest', torso, { pos: [0, H.spine - 0.03 * k, 0], scale: [1, 1, 0.78] });
  if (o.bareChest) { B.part(sphere(0.1 * k), 'chest', skin, { pos: [0.07 * k, H.chest + 0.08 * k, 0.1 * k], scale: [1, 0.7, 0.5] }); B.part(sphere(0.1 * k), 'chest', skin, { pos: [-0.07 * k, H.chest + 0.08 * k, 0.1 * k], scale: [1, 0.7, 0.5] }); }
  B.part(torus(0.19 * k * wide, 0.028 * k, 20), 'hips', o.belt || BROWN, { pos: [0, H.spine - 0.02 * k, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.8, 1] });
  B.part(box(0.08 * k, 0.07 * k, 0.03 * k), 'hips', trim, { pos: [0, H.spine - 0.02 * k, 0.155 * k * wide], metal: true });
  if (o.sash !== false) B.part(box(0.07 * k, 0.62 * k, 0.025 * k), 'chest', o.sash || trim, { pos: [0, H.chest + 0.05 * k, 0.16 * k * wide], rot: [0.12, 0, 0.72], metal: !o.sash });
  B.part(torus(0.1 * k, 0.022 * k, 16), 'chest', trim, { pos: [0, H.neck - 0.035 * k, 0.005], rot: [Math.PI / 2, 0, 0], metal: true });
  // Arms.
  for (const [s, side] of [['L', 1], ['R', -1]]) {
    const sh = V(side * sw, H.shoulder, 0), el = V(side * (sw + 0.04 * k), 0.95 * k, 0), wr = V(side * (sw + 0.06 * k), 0.72 * k, 0.01);
    B.limb(`upperArm${s}`, sh, el, 0.07 * k * wide, 0.062 * k * wide, o.bareArms ? skin : sleeve);
    B.limb(`forearm${s}`, el, wr, 0.058 * k * wide, 0.05 * k * wide, skin);
    B.part(cyl(0.058 * k * wide, 0.056 * k * wide, 0.1 * k), `forearm${s}`, o.bracer || BROWN, { pos: [side * (sw + 0.055 * k), 0.79 * k, 0.008] });
    B.part(sphere(0.062 * k * wide), `hand${s}`, o.gloves || skin, { pos: [side * (sw + 0.065 * k), 0.67 * k, 0.015], scale: [0.85, 1.1, 1] });
    if (o.pauldrons !== false) B.part(halfSphere(0.105 * k * wide), `upperArm${s}`, o.pauldron || trim, { pos: [side * (sw + 0.01 * k), H.shoulder + 0.01 * k, 0], scale: [1.1, 0.8, 1.1], rot: [0, 0, -side * 0.35], metal: (o.pauldron || trim) === GOLD });
  }
  // Neck and head.
  B.limb('neck', V(0, H.neck - 0.03 * k, 0), V(0, H.head + 0.04 * k, 0.01), 0.07 * k, 0.068 * k, skin, { caps: false });
  const hy = H.head + hr * 0.95;
  B.part(sphere(hr, 16), 'head', o.headColor || skin, { pos: [0, hy, 0.01], scale: [0.95, 1.02, 0.98] });
  B.part(sphere(hr * 0.72, 12), 'head', o.headColor || skin, { pos: [0, hy - hr * 0.42, hr * 0.28], scale: [1, 0.8, 0.9] }); // jaw
  for (const side of [1, -1]) {
    B.part(sphere(hr * 0.2), 'head', o.headColor || skin, { pos: [side * hr * 0.95, hy - hr * 0.05, 0], scale: [0.5, 1, 0.8] });
    B.part(sphere(hr * 0.13, 8), 'head', '#fbf6ec', { pos: [side * hr * 0.36, hy + hr * 0.08, hr * 0.84], scale: [1, 1, 0.5] });
    B.part(sphere(hr * 0.085, 8), 'head', '#1d1614', { pos: [side * hr * 0.36, hy + hr * 0.07, hr * 0.9], scale: [1, 1, 0.5] });
    B.part(box(hr * 0.36, hr * 0.07, hr * 0.08), 'head', o.brows || HAIR, { pos: [side * hr * 0.37, hy + hr * 0.3, hr * 0.86], rot: [0, 0, side * -0.18] });
  }
  B.part(sphere(hr * 0.17, 8), 'head', o.headColor || skin, { pos: [0, hy - hr * 0.12, hr * 1.0], scale: [0.8, 1, 0.9] }); // nose
  B.part(box(hr * 0.34, hr * 0.05, hr * 0.05), 'head', '#7a3b2e', { pos: [0, hy - hr * 0.45, hr * 0.88] }); // mouth
  if (o.mustache) for (const side of [1, -1]) B.part(cyl(hr * 0.06, hr * 0.03, hr * 0.5, 6), 'head', o.hair || HAIR, { pos: [side * hr * 0.2, hy - hr * 0.33, hr * 0.96], rot: [0, 0, side * (Math.PI / 2 - 0.35)] });
  if (o.beard) B.part(sphere(hr * 0.62, 10), 'head', o.hair || HAIR, { pos: [0, hy - hr * 0.62, hr * 0.42], scale: [1.05, 0.9, 0.72] });
  // Headwear.
  const hat = o.hat || 'cap', hatColor = o.hatColor || top;
  if (hat === 'cap') { B.part(cyl(hr * 0.98, hr * 1.02, hr * 0.42, 16), 'head', hatColor, { pos: [0, hy + hr * 0.62, -0.005] }); B.part(sphere(hr * 0.98, 16), 'head', hatColor, { pos: [0, hy + hr * 0.8, 0], scale: [1, 0.35, 1] }); B.part(torus(hr * 1.0, hr * 0.08, 20), 'head', trim, { pos: [0, hy + hr * 0.46, 0], rot: [Math.PI / 2, 0, 0], metal: true }); }
  if (hat === 'turban') { for (let i = 0; i < 3; i++) B.part(torus(hr * (0.9 - i * 0.12), hr * 0.2, 18), 'head', hatColor, { pos: [0, hy + hr * (0.45 + i * 0.2), 0], rot: [Math.PI / 2 + (i % 2 ? 0.2 : -0.15), 0, 0] }); B.part(sphere(hr * 0.72), 'head', hatColor, { pos: [0, hy + hr * 0.7, 0] }); B.part(sphere(hr * 0.13, 8), 'head', o.jewel || '#c93c3c', { pos: [0, hy + hr * 0.72, hr * 0.97], metal: true }); B.part(cone(hr * 0.09, hr * 0.6, 6), 'head', trim, { pos: [0, hy + hr * 1.1, hr * 0.85], rot: [0.4, 0, 0], metal: true }); }
  if (hat === 'helmet') { B.part(halfSphere(hr * 1.1), 'head', o.helmet || '#c46a35', { pos: [0, hy + hr * 0.1, 0], metal: true }); B.part(torus(hr * 1.08, hr * 0.09, 20), 'head', trim, { pos: [0, hy + hr * 0.12, 0], rot: [Math.PI / 2, 0, 0], metal: true }); B.part(cone(hr * 0.12, hr * 0.7, 8), 'head', trim, { pos: [0, hy + hr * 1.45, 0], metal: true }); B.part(torus(hr * 0.35, hr * 0.08, 10, Math.PI * 1.2), 'head', o.plume || '#e05a2b', { pos: [0, hy + hr * 1.7, -hr * 0.2], rot: [0, Math.PI / 2, 0] }); B.part(box(hr * 0.12, hr * 0.5, hr * 0.12), 'head', trim, { pos: [0, hy - hr * 0.1, hr * 1.03], metal: true }); }
  if (hat === 'bun' || hat === 'topknot' || hat === 'braid') { B.part(sphere(hr * 1.03, 16), 'head', o.hair || HAIR, { pos: [0, hy + hr * 0.14, -hr * 0.08], scale: [1, 0.92, 1] }); B.part(sphere(hr * 0.38), 'head', o.hair || HAIR, { pos: [0, hy + hr * (hat === 'topknot' ? 1.05 : 0.55), -hr * (hat === 'topknot' ? 0.2 : 0.85)] }); if (hat === 'braid') for (let i = 0; i < 4; i++) B.part(sphere(hr * (0.24 - i * 0.03)), 'head', o.hair || HAIR, { pos: [0, hy + hr * (0.2 - i * 0.42), -hr * (1.15 + i * 0.12)] }); B.part(torus(hr * 0.3, hr * 0.06, 10), 'head', trim, { pos: [0, hy + hr * (hat === 'topknot' ? 0.85 : 0.5), -hr * (hat === 'topknot' ? 0.2 : 0.62)], rot: [hat === 'topknot' ? Math.PI / 2 : 0.3, 0, 0], metal: true }); }
  if (hat === 'bald') { B.part(torus(hr * 0.98, hr * 0.07, 20), 'head', o.band || GOLD, { pos: [0, hy + hr * 0.35, 0], rot: [Math.PI / 2 + 0.1, 0, 0], metal: true }); }
  B.meta.hy = hy; B.meta.hr = hr; B.meta.sw = sw;
  return H;
}
// ------------------------------------------------------------------ props
const W = {
  // Modelled so the ready stance (upper arm −0.5, forearm −0.9 rad) levels the point at the enemy.
  spear(B, hand, k = 1) { const g = B.boneAt(hand), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.4, 0, 0)), dir = V(0, 0, 1).applyQuaternion(q), grip = V(g.x, 0.66 * k, 0.02), along = (d) => grip.clone().addScaledVector(dir, d), orient = new THREE.Quaternion().setFromUnitVectors(Y, dir);
    B.part(cyl(0.02, 0.02, 1.9 * k, 6), hand, BROWN, { pos: along(0.35 * k), quat: orient }); B.part(cone(0.05, 0.24, 6), hand, GOLD, { pos: along(1.4 * k), quat: orient, metal: true }); B.part(torus(0.032, 0.013, 8), hand, GOLD, { pos: along(1.25 * k), quat: orient.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), metal: true }); B.part(box(0.012, 0.14, 0.2), hand, '#e0562e', { pos: along(1.15 * k).add(V(0, 0.08, 0)), quat: orient }); },
  sword(B, hand, k = 1) { const x = B.boneAt(hand).x, y = 0.66 * k; B.part(box(0.05, 0.06, 0.14), hand, GOLD, { pos: [x, y, 0.04], metal: true }); B.part(box(0.16, 0.03, 0.04), hand, GOLD, { pos: [x, y, 0.1], metal: true }); for (let i = 0; i < 6; i++) B.part(box(0.05, 0.018, 0.13), hand, '#e7e4dc', { pos: [x, y + i * i * 0.006, 0.18 + i * 0.12], rot: [-i * 0.07, 0, 0], metal: true }); },
  shield(B, hand, k = 1, face = TEAL, sun = false) { const x = B.boneAt(hand).x + 0.07 * Math.sign(B.boneAt(hand).x); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.sign(x) * 1.0, Math.PI / 2)); B.part(cyl(0.3 * k, 0.3 * k, 0.05, 20), hand, face, { pos: V(x, 0.8 * k, 0.05), quat: q }); B.part(torus(0.3 * k, 0.03, 24), hand, GOLD, { pos: V(x, 0.8 * k, 0.05), quat: q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), metal: true }); const out = V(Math.sign(x), 0, 0.64).normalize(); B.part(sphere(0.08), hand, GOLD, { pos: V(x, 0.8 * k, 0.05).addScaledVector(out, 0.04), metal: true }); if (sun) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, off = V(0, Math.cos(a) * 0.18 * k, 0).add(V(Math.sin(a) * 0.18 * k, 0, 0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(Y, Math.sign(x) * 1.0 - Math.PI / 2))); B.part(cone(0.035, 0.14 * k, 4), hand, GOLD, { pos: V(x, 0.8 * k, 0.05).addScaledVector(out, 0.03).add(off), quat: new THREE.Quaternion().setFromUnitVectors(Y, off.clone().normalize()), metal: true }); } },
  bow(B, hand, k = 1, color = GOLD) { const x = B.boneAt(hand).x; B.part(torus(0.62 * k, 0.022, 20, Math.PI * 0.95), hand, color, { pos: [x, 0.68 * k, 0.28 * k], rot: [0, Math.PI / 2, Math.PI / 2 + 0.08], scale: [1, 0.55, 1], metal: color === GOLD }); B.part(cyl(0.005, 0.005, 1.18 * k, 4), hand, '#f1e8d0', { pos: [x, 0.68 * k, 0.02], rot: [Math.PI / 2, 0, 0] }); },
  quiver(B, k = 1, fletch = TEAL) { B.part(cyl(0.07, 0.06, 0.5 * k, 10), 'chest', BROWN, { pos: [0.1, 1.1 * k, -0.2 * k], rot: [0.2, 0, -0.35] }); for (let i = 0; i < 4; i++) B.part(cone(0.03, 0.1, 4), 'chest', fletch, { pos: [0.18 + (i % 2) * 0.03, 1.4 * k, -0.25 * k + (i - 1.5) * 0.02], rot: [0.2, 0, -0.35] }); },
  mallet(B, hand, k = 1, head = GOLD) { const x = B.boneAt(hand).x; B.part(cyl(0.025, 0.025, 0.8 * k, 6), hand, BROWN, { pos: [x, 0.66 * k, 0.25 * k], rot: [Math.PI / 2, 0, 0] }); B.part(cyl(0.12 * k, 0.12 * k, 0.32 * k, 12), hand, head, { pos: [x, 0.66 * k, 0.66 * k], rot: [0, 0, Math.PI / 2], metal: true }); },
  pick(B, hand, k = 1) { const x = B.boneAt(hand).x; B.part(cyl(0.022, 0.022, 0.8 * k, 6), hand, BROWN, { pos: [x, 0.66 * k, 0.25 * k], rot: [Math.PI / 2, 0, 0] }); B.part(cone(0.04, 0.5 * k, 5), hand, '#b9c4c6', { pos: [x, 0.8 * k, 0.64 * k], rot: [-0.4, 0, 0], metal: true }); B.part(cone(0.035, 0.3 * k, 5), hand, '#b9c4c6', { pos: [x, 0.5 * k, 0.64 * k], rot: [Math.PI + 0.3, 0, 0], metal: true }); },
  staff(B, hand, k = 1, disc = TEAL) { const x = B.boneAt(hand).x; B.part(cyl(0.02, 0.02, 1.9 * k, 6), hand, GOLD, { pos: [x, 1.05 * k, 0.03], metal: true }); B.part(sphere(0.05), hand, GOLD, { pos: [x, 2.0 * k, 0.03], metal: true }); B.part(cyl(0.18 * k, 0.18 * k, 0.03, 16), hand, disc, { pos: [x - 0.04, 1.75 * k, 0.03], rot: [0, 0, Math.PI / 2] }); B.part(torus(0.18 * k, 0.015, 16), hand, GOLD, { pos: [x - 0.04, 1.75 * k, 0.03], rot: [0, Math.PI / 2, 0], metal: true }); },
  boulder(B, hand, k = 1) { const x = B.boneAt(hand).x; B.part(ico(0.26 * k, 1), hand, '#a7a9a3', { pos: [x * 0.4, 1.0 * k, 0.12] }); },
  chakram(B, hand, k = 1) { const x = B.boneAt(hand).x; B.part(torus(0.17 * k, 0.018, 20), hand, GOLD, { pos: [x + Math.sign(x) * 0.12, 0.66 * k, 0.04], rot: [0, Math.PI / 2 - Math.sign(x) * 0.3, 0], metal: true }); },
  satchel(B, k = 1, color = BROWN) { B.part(box(0.16, 0.18, 0.08), 'hips', color, { pos: [0.23 * k, 0.78 * k, 0.04] }); B.part(box(0.17, 0.05, 0.09), 'hips', GOLD, { pos: [0.23 * k, 0.86 * k, 0.04], metal: true }); },
  falcon(B, hand, k = 1) { const p = B.boneAt(hand).clone(); p.y -= 0.02; B.part(sphere(0.08), hand, '#f1ede4', { pos: V(p.x, p.y + 0.1, p.z + 0.02), scale: [0.9, 1.2, 1] }); B.part(sphere(0.05), hand, '#f1ede4', { pos: V(p.x, p.y + 0.22, p.z + 0.04) }); B.part(cone(0.02, 0.05, 5), hand, GOLD, { pos: V(p.x, p.y + 0.21, p.z + 0.1), rot: [Math.PI / 2, 0, 0], metal: true }); for (const s of [1, -1]) B.part(box(0.03, 0.18, 0.12), hand, '#2d2a28', { pos: V(p.x + s * 0.07, p.y + 0.11, p.z - 0.01), rot: [0.3, 0, s * 0.25] }); },
  parasol(B, hand, k = 1) { const x = B.boneAt(hand).x; B.part(cyl(0.015, 0.015, 1.5 * k, 6), hand, GOLD, { pos: [x, 1.25 * k, 0.02], metal: true }); B.part(cone(0.62 * k, 0.24 * k, 12), hand, '#6fc3bd', { pos: [x, 2.05 * k, 0.02] }); B.part(torus(0.6 * k, 0.012, 24), hand, GOLD, { pos: [x, 1.93 * k, 0.02], rot: [Math.PI / 2, 0, 0], metal: true }); },
  pot(B, hand, k = 1) { const x = B.boneAt(hand).x; B.part(lathe([[0.001, 0], [0.08, 0.02], [0.11, 0.1], [0.07, 0.2], [0.05, 0.24], [0.06, 0.26]], 12), hand, '#c9803f', { pos: [x, 0.42 * k, 0.03], metal: true }); },
};

// ------------------------------------------------------------------ roster
const ROSTER = {
  guard: B => { humanoid(B, { hat: 'cap', mustache: true }); W.spear(B, 'handR'); W.shield(B, 'handL'); B.meta.style = 'thrust'; },
  archer: B => { humanoid(B, { hat: 'bun', skin: SKIN.light }); W.bow(B, 'handL'); W.quiver(B); B.meta.style = 'bow'; },
  engineer: B => { humanoid(B, { hat: 'cap', beard: true, wide: 1.08 }); W.mallet(B, 'handR'); W.satchel(B); B.meta.style = 'smash'; },
  healer: B => { humanoid(B, { hat: 'bun', skin: SKIN.light, top: '#3a8f95', skirtLength: 1.3 }); W.staff(B, 'handR'); W.satchel(B, 1, '#6d4a2c'); B.meta.style = 'cast'; },
  miner: B => { humanoid(B, { hat: 'turban', hatColor: '#d7b56d', top: '#4d8a52', pants: '#3a6b3f', mustache: true }); W.pick(B, 'handR'); W.satchel(B, 1, '#4a3322'); B.meta.style = 'smash'; },
  bowler: B => { humanoid(B, { hat: 'bald', beard: true, bareChest: true, bareArms: true, noSkirt: true, pauldrons: false, pants: '#2f6d8f', sash: '#3a8ab8', wide: 1.18, skin: SKIN.warm }); W.boulder(B, 'handR'); B.meta.style = 'throw'; },
  veer: B => { humanoid(B, { hat: 'helmet', mustache: true, top: '#c9743a', sleeve: '#b9612c', pants: TEAL_D, skirt: '#c9743a', pauldron: GOLD, wide: 1.1, skin: SKIN.warm }); for (let i = 0; i < 3; i++) B.part(torus(0.2 * 1.1, 0.02, 20), 'chest', GOLD, { pos: [0, 0.9 + i * 0.09, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.78, 1], metal: true }); W.sword(B, 'handR'); W.shield(B, 'handL', 1.05, TEAL, true); B.meta.style = 'slash'; B.meta.cape = { color: '#b8422e', trim: GOLD, width: 0.46, length: 0.95 }; },
  tara: B => { humanoid(B, { hat: 'topknot', skin: SKIN.light, top: '#2e8f7a', sleeve: '#2e8f7a', pants: '#23705f', skirtLength: 1.25 }); W.bow(B, 'handL', 1.15, '#3a2c24'); W.quiver(B, 1, '#e8b54a'); B.meta.style = 'bow'; B.meta.cape = { color: '#2fa39a', trim: GOLD, width: 0.36, length: 0.7 }; },
  nila: B => { humanoid(B, { hat: 'braid', skin: SKIN.light, top: '#8e2f6a', sleeve: '#8e2f6a', skirt: '#e59a2e', pants: TEAL_D, sash: '#e59a2e', skirtLength: 1.35, skirtFlare: 1.25 }); W.chakram(B, 'handR'); W.chakram(B, 'handL'); B.meta.style = 'chakram'; },
  ayaan: B => { humanoid(B, { hat: 'topknot', beard: true, top: '#3f7f4a', sleeve: '#3f7f4a', pants: TEAL_D }); W.falcon(B, 'handL'); B.part(cyl(0.02, 0.02, 1.2, 6), 'handR', GOLD, { pos: [-0.31, 0.62, 0.05], rot: [0.2, 0, 0], metal: true }); B.meta.style = 'falcon'; B.meta.cape = { color: '#2f6a3a', trim: GOLD, width: 0.42, length: 0.85 }; },
  ira: B => { humanoid(B, { hat: 'bun', skin: SKIN.light, top: '#2f8c8f', sleeve: '#f1ece2', skirt: '#2f8c8f', skirtLength: 1.9, skirtFlare: 1.2, pauldrons: false }); B.part(torus(0.16, 0.05, 16), 'chest', '#f4efe6', { pos: [0, 1.24, 0.02], rot: [Math.PI / 2 + 0.2, 0, 0] }); W.parasol(B, 'handR'); W.pot(B, 'handL'); B.meta.style = 'cast'; },
  kabir: B => { humanoid(B, { hat: 'turban', hatColor: '#c9602d', beard: true, top: '#d06a2c', sleeve: '#b85a26', pants: TEAL_D, skirtLength: 1.3, wide: 1.1 }); B.part(torus(0.08, 0.025, 10), 'head', '#3fa4a0', { pos: [0.08, 1.72, 0.12], rot: [0.3, 0, 0], metal: true }); B.part(torus(0.08, 0.025, 10), 'head', '#3fa4a0', { pos: [-0.08, 1.72, 0.12], rot: [0.3, 0, 0], metal: true }); W.mallet(B, 'handR', 1.2); W.satchel(B, 1, '#4a3322'); B.meta.style = 'smash'; },
  yeti: B => {
    const H = humanoid(B, { scale: 1.2, wide: 1.45, hat: 'none', skin: '#7fb4de', headColor: '#f2f6f8', top: '#eef3f6', sleeve: '#eef3f6', pants: '#e4ebef', boots: '#7fb4de', gloves: '#7fb4de', bracer: '#e4ebef', trim: '#dbe6ec', noSkirt: true, sash: false, pauldrons: false, noKneeBand: true, brows: '#9fc3de', headRadius: 0.22 });
    for (let i = 0; i < 26; i++) { const a = i * 2.4, y = 0.6 + (i % 9) * 0.1; B.part(sphere(0.12 + (i % 3) * 0.03, 8), y > 1.0 ? 'chest' : 'hips', '#f4f8fa', { pos: [Math.cos(a) * 0.32, y * 1.2, Math.sin(a) * 0.25] }); }
    B.part(sphere(0.2, 10), 'head', '#7fb4de', { pos: [0, B.meta.hy - 0.05, 0.17], scale: [1, 0.8, 0.6] });
    B.part(ico(0.22, 1), 'handR', '#9a9d98', { pos: [B.boneAt('handR').x, 0.75, 0.05] }); B.meta.style = 'pound'; void H;
  },
  garuda: B => {
    humanoid(B, { hat: 'none', top: '#c23b31', sleeve: '#1f4a7a', pants: '#1f4a7a', skirt: '#c23b31', headColor: '#c23b31', skin: '#c23b31', pauldron: GOLD, boots: GOLD, gloves: GOLD, skirtLength: 0.8 });
    const { hy, hr } = B.meta;
    B.part(cone(0.07, 0.24, 8), 'head', GOLD, { pos: [0, hy - 0.02, hr + 0.1], rot: [Math.PI / 2 + 0.3, 0, 0], metal: true });
    for (let i = 0; i < 5; i++) B.part(cone(0.035, 0.28, 5), 'head', '#e0302a', { pos: [0, hy + hr * 0.8, -0.05 - i * 0.05], rot: [-0.3 - i * 0.18, 0, 0] });
    for (const [s, side] of [['L', 1], ['R', -1]]) {
      B.bone(`wing${s}`, 'chest', V(side * 0.12, 1.15, -0.14)).bone(`wingTip${s}`, `wing${s}`, V(side * 0.72, 1.28, -0.2));
      B.limb(`wing${s}`, V(side * 0.12, 1.15, -0.14), V(side * 0.72, 1.28, -0.2), 0.05, 0.035, '#1f4a7a');
      B.limb(`wingTip${s}`, V(side * 0.72, 1.28, -0.2), V(side * 1.25, 1.12, -0.22), 0.035, 0.02, '#1f4a7a');
      for (let i = 0; i < 7; i++) { const t = i / 6, bone = t < 0.5 ? `wing${s}` : `wingTip${s}`; const x = side * (0.2 + t * 1.05), y = 1.2 - t * 0.05; B.part(box(0.08, 0.5 - t * 0.12, 0.02), bone, i % 2 ? '#2b6ca8' : '#1f4a7a', { pos: [x, y - 0.24, -0.2], rot: [0, 0, side * (0.15 + t * 0.25)] }); B.part(box(0.08, 0.12, 0.022), bone, '#d6352c', { pos: [x + side * 0.02, y - 0.5 + t * 0.1, -0.2], rot: [0, 0, side * (0.15 + t * 0.25)] }); }
    }
    B.meta.style = 'dive'; B.meta.flying = true;
  },
  rider: B => mounted(B),
  elephant: B => elephant(B),
};

function mounted(B) {
  B.meta.kind = 'horse';
  const coat = '#4a3325', mane = '#1f1814';
  B.bone('root', null, V()).bone('body', 'root', V(0, 1.0, 0)).bone('neck', 'body', V(0, 1.15, 0.45)).bone('head', 'neck', V(0, 1.6, 0.62)).bone('tail', 'body', V(0, 1.1, -0.55));
  const legs = [['FL', 0.17, 0.4], ['FR', -0.17, 0.4], ['BL', 0.17, -0.42], ['BR', -0.17, -0.42]];
  for (const [n, x, z] of legs) B.bone(`upper${n}`, 'body', V(x, 0.95, z)).bone(`lower${n}`, `upper${n}`, V(x, 0.5, z + 0.02)).bone(`hoof${n}`, `lower${n}`, V(x, 0.1, z));
  B.part(sphere(0.34, 14), 'body', coat, { pos: [0, 1.02, 0], scale: [0.85, 0.85, 1.75] });
  B.limb('neck', V(0, 1.15, 0.42), V(0, 1.58, 0.66), 0.17, 0.12, coat);
  B.part(box(0.18, 0.2, 0.44), 'head', coat, { pos: [0, 1.6, 0.86], rot: [0.55, 0, 0] });
  B.part(sphere(0.1), 'head', '#2e2019', { pos: [0, 1.47, 1.05] });
  for (const s of [1, -1]) { B.part(cone(0.04, 0.12, 5), 'head', coat, { pos: [s * 0.07, 1.8, 0.7] }); B.part(sphere(0.025, 6), 'head', '#111', { pos: [s * 0.09, 1.66, 0.84] }); }
  for (let i = 0; i < 6; i++) B.part(box(0.05, 0.12, 0.1), i < 4 ? 'neck' : 'head', mane, { pos: [0, 1.3 + i * 0.07, 0.43 + i * 0.05], rot: [0.5, 0, 0] });
  B.limb('tail', V(0, 1.1, -0.55), V(0, 0.55, -0.7), 0.06, 0.03, mane);
  for (const [n, x, z] of legs) { B.limb(`upper${n}`, V(x, 0.95, z), V(x, 0.5, z + 0.02), 0.11, 0.07, coat); B.limb(`lower${n}`, V(x, 0.5, z + 0.02), V(x, 0.12, z), 0.065, 0.055, coat); B.part(cyl(0.06, 0.07, 0.1, 10), `hoof${n}`, GOLD, { pos: [x, 0.05, z], metal: true }); }
  // Saddle cloth, tack and the rider seated astride.
  B.part(box(0.62, 0.05, 0.6), 'body', TEAL, { pos: [0, 1.3, -0.02], rot: [0, 0, 0] }); B.part(box(0.64, 0.06, 0.62), 'body', GOLD, { pos: [0, 1.28, -0.02], metal: true, scale: [1, 0.4, 1] });
  B.part(box(0.04, 0.02, 0.5), 'head', BROWN, { pos: [0.1, 1.55, 0.8], rot: [0.55, 0, 0] });
  const rz = -0.02, ry = 1.33;
  B.bone('hips', 'body', V(0, ry + 0.06, rz)).bone('spine', 'hips', V(0, ry + 0.2, rz)).bone('chest', 'spine', V(0, ry + 0.36, rz)).bone('neckR', 'chest', V(0, ry + 0.62, rz)).bone('headR', 'neckR', V(0, ry + 0.72, rz));
  for (const [s, side] of [['L', 1], ['R', -1]]) B.bone(`upperArm${s}`, 'chest', V(side * 0.22, ry + 0.54, rz)).bone(`forearm${s}`, `upperArm${s}`, V(side * 0.26, ry + 0.3, rz)).bone(`hand${s}`, `forearm${s}`, V(side * 0.28, ry + 0.08, rz + 0.01));
  const pants = TEAL_D, top = TEAL, skin = SKIN.warm;
  for (const side of [1, -1]) { B.limb('hips', V(side * 0.12, ry + 0.06, rz), V(side * 0.3, ry - 0.12, rz + 0.18), 0.07, 0.06, pants); B.limb('hips', V(side * 0.3, ry - 0.12, rz + 0.18), V(side * 0.32, ry - 0.42, rz + 0.1), 0.055, 0.05, pants); B.part(sphere(0.07), 'hips', BROWN, { pos: [side * 0.33, ry - 0.48, rz + 0.14], scale: [0.9, 0.7, 1.4] }); }
  B.part(lathe([[0.001, 0], [0.18, 0.02], [0.18, 0.14], [0.2, 0.28], [0.15, 0.36], [0.001, 0.37]]), 'chest', top, { pos: [0, ry + 0.2, rz], scale: [1, 1, 0.78] });
  B.part(box(0.06, 0.5, 0.02), 'chest', GOLD, { pos: [0, ry + 0.4, rz + 0.13], rot: [0.1, 0, 0.72], metal: true });
  for (const [s, side] of [['L', 1], ['R', -1]]) { B.limb(`upperArm${s}`, V(side * 0.22, ry + 0.54, rz), V(side * 0.26, ry + 0.3, rz), 0.058, 0.052, top); B.limb(`forearm${s}`, V(side * 0.26, ry + 0.3, rz), V(side * 0.28, ry + 0.1, rz + 0.01), 0.05, 0.045, skin); B.part(sphere(0.052), `hand${s}`, skin, { pos: [side * 0.285, ry + 0.06, rz + 0.01] }); B.part(halfSphere(0.09), `upperArm${s}`, GOLD, { pos: [side * 0.23, ry + 0.55, rz], rot: [0, 0, -side * 0.35], metal: true }); }
  const hy = ry + 0.87, hr = 0.16;
  B.limb('neckR', V(0, ry + 0.6, rz), V(0, ry + 0.74, rz), 0.06, 0.06, skin, { caps: false });
  B.part(sphere(hr, 14), 'headR', skin, { pos: [0, hy, rz] }); B.part(cyl(hr, hr * 1.02, hr * 0.4, 14), 'headR', top, { pos: [0, hy + hr * 0.6, rz] }); B.part(torus(hr, hr * 0.08, 16), 'headR', GOLD, { pos: [0, hy + hr * 0.45, rz], rot: [Math.PI / 2, 0, 0], metal: true });
  for (const side of [1, -1]) { B.part(sphere(hr * 0.1, 6), 'headR', '#1d1614', { pos: [side * hr * 0.35, hy + hr * 0.06, rz + hr * 0.9] }); B.part(cyl(hr * 0.06, hr * 0.03, hr * 0.5, 6), 'headR', HAIR, { pos: [side * hr * 0.2, hy - hr * 0.33, rz + hr * 0.96], rot: [0, 0, side * (Math.PI / 2 - 0.35)] }); }
  // Lance with pennant.
  const x = -0.285, y = ry + 0.06;
  B.part(cyl(0.018, 0.018, 2.2, 6), 'handR', BROWN, { pos: [x, y, 0.2], rot: [Math.PI / 2 - 0.1, 0, 0] });
  B.part(cone(0.045, 0.24, 6), 'handR', GOLD, { pos: [x, y + 0.12, 1.35], rot: [Math.PI / 2 - 0.1, 0, 0], metal: true });
  B.part(box(0.01, 0.16, 0.3), 'handR', '#e0562e', { pos: [x, y + 0.2, 1.0], rot: [-0.1, 0, 0] });
  B.meta.style = 'thrust'; B.meta.H = { hip: 1.39 };
}
function elephant(B) {
  B.meta.kind = 'elephant';
  const hide = '#9aa3a6', dark = '#7d8588';
  B.bone('root', null, V()).bone('body', 'root', V(0, 1.35, 0)).bone('head', 'body', V(0, 1.6, 0.95)).bone('trunk1', 'head', V(0, 1.4, 1.35)).bone('trunk2', 'trunk1', V(0, 0.95, 1.45)).bone('trunk3', 'trunk2', V(0, 0.5, 1.45))
    .bone('earL', 'head', V(0.42, 1.75, 0.95)).bone('earR', 'head', V(-0.42, 1.75, 0.95)).bone('tail', 'body', V(0, 1.55, -1.0)).bone('mahout', 'head', V(0, 2.05, 0.7));
  const legs = [['FL', 0.38, 0.62], ['FR', -0.38, 0.62], ['BL', 0.38, -0.62], ['BR', -0.38, -0.62]];
  for (const [n, x, z] of legs) B.bone(`upper${n}`, 'body', V(x, 1.15, z)).bone(`lower${n}`, `upper${n}`, V(x, 0.6, z));
  B.part(sphere(0.72, 16), 'body', hide, { pos: [0, 1.45, 0], scale: [0.95, 0.88, 1.5] });
  B.part(sphere(0.5, 16), 'head', hide, { pos: [0, 1.65, 1.02], scale: [1, 1, 0.95] });
  for (const side of [1, -1]) { B.part(sphere(0.06, 8), 'head', '#1d1614', { pos: [side * 0.3, 1.72, 1.35] }); B.part(sphere(0.07, 8), 'head', hide, { pos: [side * 0.3, 1.8, 1.32], scale: [1.3, 0.5, 0.6] }); }
  for (const [s, side] of [['L', 1], ['R', -1]]) { B.part(sphere(0.42, 12), `ear${s}`, dark, { pos: [side * 0.52, 1.62, 0.85], scale: [0.25, 1, 0.9] }); B.part(sphere(0.33, 10), `ear${s}`, '#c39a9a', { pos: [side * 0.555, 1.6, 0.87], scale: [0.12, 0.85, 0.7] }); }
  B.limb('trunk1', V(0, 1.45, 1.38), V(0, 0.95, 1.5), 0.2, 0.15, hide); B.limb('trunk2', V(0, 0.95, 1.5), V(0, 0.5, 1.5), 0.15, 0.1, hide); B.limb('trunk3', V(0, 0.5, 1.5), V(0, 0.2, 1.62), 0.1, 0.075, hide);
  for (let i = 0; i < 3; i++) B.part(torus(0.19 - i * 0.04, 0.025, 12), `trunk${i + 1}`, GOLD, { pos: [0, 1.25 - i * 0.42, 1.44 + i * 0.02], rot: [Math.PI / 2, 0, 0], metal: true });
  for (const side of [1, -1]) { B.part(cone(0.07, 0.55, 8), 'head', '#f5efe0', { pos: [side * 0.22, 1.28, 1.48], rot: [1.9, 0, 0] }); B.part(cyl(0.075, 0.08, 0.12, 8), 'head', GOLD, { pos: [side * 0.22, 1.36, 1.36], rot: [1.9, 0, 0], metal: true }); }
  B.part(box(0.5, 0.45, 0.06), 'head', TEAL, { pos: [0, 1.9, 1.38], rot: [-0.3, 0, 0] }); B.part(torus(0.18, 0.03, 16), 'head', GOLD, { pos: [0, 1.92, 1.42], rot: [-0.3, 0, 0], metal: true });
  for (const [n, x, z] of legs) { B.limb(`upper${n}`, V(x, 1.15, z), V(x, 0.6, z), 0.24, 0.21, hide); B.limb(`lower${n}`, V(x, 0.6, z), V(x, 0.12, z), 0.21, 0.23, hide); B.part(cyl(0.24, 0.24, 0.08, 14), `lower${n}`, GOLD, { pos: [x, 0.22, z], metal: true }); B.part(cyl(0.25, 0.26, 0.1, 14), `lower${n}`, '#c9c2b4', { pos: [x, 0.05, z] }); }
  B.limb('tail', V(0, 1.55, -1.0), V(0, 0.9, -1.12), 0.05, 0.03, dark);
  // Caparison, howdah and canopy.
  for (const side of [1, -1]) { B.part(box(0.05, 0.75, 1.3), 'body', TEAL, { pos: [side * 0.7, 1.45, 0], rot: [0, 0, side * 0.15] }); B.part(box(0.06, 0.08, 1.32), 'body', GOLD, { pos: [side * 0.64, 1.08, 0], rot: [0, 0, side * 0.15], metal: true }); for (let i = 0; i < 5; i++) B.part(cone(0.04, 0.12, 6), 'body', GOLD, { pos: [side * 0.64, 1.0, -0.5 + i * 0.25], rot: [Math.PI, 0, 0], metal: true }); }
  B.part(box(0.9, 0.3, 1.0), 'body', TEAL_D, { pos: [0, 2.2, -0.15] }); B.part(box(0.95, 0.06, 1.05), 'body', GOLD, { pos: [0, 2.37, -0.15], metal: true });
  for (const x of [-0.42, 0.42]) for (const z of [-0.6, 0.3]) B.part(cyl(0.025, 0.025, 0.75, 6), 'body', GOLD, { pos: [x, 2.72, z], metal: true });
  B.part(cone(0.85, 0.4, 4), 'body', '#5fb0b8', { pos: [0, 3.25, -0.15], rot: [0, Math.PI / 4, 0] }); B.part(sphere(0.07), 'body', GOLD, { pos: [0, 3.5, -0.15], metal: true });
  // Mahout on the neck.
  B.part(sphere(0.14, 10), 'mahout', TEAL, { pos: [0, 2.12, 0.62], scale: [1, 1.3, 0.8] }); B.part(sphere(0.11, 10), 'mahout', SKIN.warm, { pos: [0, 2.38, 0.64] }); B.part(sphere(0.12, 10), 'mahout', '#e8d8b0', { pos: [0, 2.46, 0.63], scale: [1, 0.6, 1] });
  B.meta.style = 'gore'; B.meta.H = { hip: 1.35 };
}

// ------------------------------------------------------------------ forge
export class CharacterForge {
  constructor() {
    const make = (roughness, metalness, hero) => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness }); addRimLight(m, hero ? '#ffcf6b' : '#fff1d0', hero ? 0.5 : 0.3); return m; };
    this.materials = { troop: [make(0.78, 0.02, false), make(0.32, 0.85, false)], hero: [make(0.74, 0.02, true), make(0.28, 0.9, true)] };
    this.blueprints = new Map();
  }
  has(id) { return !!ROSTER[id]; }
  blueprint(id) {
    if (!this.blueprints.has(id)) { const B = new Builder(); ROSTER[id](B); this.blueprints.set(id, B.build()); }
    return this.blueprints.get(id);
  }
  spawn(id, { hero = false } = {}) { return new Actor(id, this.blueprint(id), hero ? this.materials.hero : this.materials.troop); }
  dispose() { for (const bp of this.blueprints.values()) bp.geometry.dispose(); for (const set of Object.values(this.materials)) for (const m of set) m.dispose(); this.blueprints.clear(); }
}

// ------------------------------------------------------------------ actor
export class Actor {
  constructor(id, blueprint, materials) {
    this.id = id; this.bp = blueprint; this.style = blueprint.style || 'thrust';
    this.root = new THREE.Group(); this.root.name = `actor:${id}`;
    const bones = blueprint.bones.map(b => { const bone = new THREE.Bone(); bone.name = b.name; bone.position.copy(b.local); return bone; });
    blueprint.bones.forEach((b, i) => { if (b.parent) bones[blueprint.bones.findIndex(p => p.name === b.parent)].add(bones[i]); });
    this.mesh = new THREE.SkinnedMesh(blueprint.geometry, materials); this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = true;
    this.mesh.add(bones[0]); this.mesh.bind(new THREE.Skeleton(bones, blueprint.inverses), new THREE.Matrix4());
    this.root.add(this.mesh); this.b = Object.fromEntries(bones.map(b => [b.name, b])); this.rest = new Map(bones.map(b => [b, b.position.clone()]));
    this.root.userData.actor = this; this.root.userData.visualHeight = blueprint.height;
    this.phase = Math.random(); this.move = 0; this.time = Math.random() * 10; this.last = null; this.action = 'idle'; this.attackT = 0; this.attackBlend = 0;
    this.flinch = 0; this.flinchV = 0; this.cheer = 0; this.dead = 0; this.flying = !!blueprint.flying; this.seed = Math.random() * 10;
    if (blueprint.cape) this.cape = new ClothStrip({ columns: 4, rows: 6, width: blueprint.cape.width, length: blueprint.cape.length, color: blueprint.cape.color, trim: blueprint.cape.trim });
  }
  // action: 'walk' | 'attack' | 'heal' | 'idle'; progress: 0..1 through the attack cycle.
  setAction(action, progress = null) { this.action = action; if (progress != null) this.attackT = progress; }
  hit(strength = 1) { if (!this.dead) this.flinchV += 9 * strength; }
  celebrate() { this.cheer = 1; }
  die() { this.dead = 0.0001; }
  update(dt, time, reduced = false) {
    this.time += dt;
    // Distance-driven gait: the stride advances only as far as the actor really moves.
    const p = this.root.getWorldPosition(_p), scale = this.root.getWorldScale(_s).x || 1;
    let travelled = 0; if (this.last) travelled = Math.hypot(p.x - this.last.x, p.z - this.last.z) / scale; this.last = (this.last || V()).copy(p);
    const moving = travelled > 1e-4 && travelled < 1 && !this.dead;
    const stride = this.bp.kind === 'elephant' ? 1.6 : this.bp.kind === 'horse' ? 1.5 : 0.95;
    if (moving) this.phase = (this.phase + travelled / stride) % 1;
    this.move = damp(this.move, moving || (this.action === 'walk' && this.flying) ? 1 : 0, moving ? 10 : 6, dt);
    const attacking = (this.action === 'attack' || this.action === 'heal') && !this.dead;
    this.attackBlend = damp(this.attackBlend, attacking ? 1 : 0, 10, dt);
    if (this.action !== 'attack' && this.action !== 'heal') this.attackT = (this.attackT + dt) % 1;
    this.flinchV += (-this.flinch * 160 - this.flinchV * 14) * dt; this.flinch += this.flinchV * dt;
    if (this.cheer) this.cheer = Math.max(0, this.cheer - dt * 0.12);
    if (this.dead) this.dead = Math.min(1, this.dead + dt * 2.5);
    this.pose(reduced);
  }
  resetPose() { for (const [bone, rest] of this.rest) { bone.position.copy(rest); bone.rotation.set(0, 0, 0); } }
  pose(reduced) {
    this.resetPose();
    if (this.bp.kind === 'horse') return this.poseHorse(reduced);
    if (this.bp.kind === 'elephant') return this.poseElephant(reduced);
    this.poseBiped(reduced);
  }
  poseBiped(reduced) {
    const b = this.b, m = this.move, ph = this.phase * TAU, t = this.time, s = Math.sin(ph), c = Math.cos(ph), fly = this.flying;
    const run = this.style === 'dive' ? 0 : 1, breathe = reduced ? 0 : Math.sin(t * 2.1 + this.seed) * 0.025;
    // Legs: thigh swing, knee bends in swing phase, foot stays level.
    if (!fly) for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const legPhase = sign * s, swing = Math.max(0, sign * c);
      b[`thigh${side}`].rotation.x = -legPhase * 0.62 * m * run;
      b[`shin${side}`].rotation.x = (Math.pow(swing, 1.4) * 1.05 + 0.05) * m * run;
      b[`foot${side}`].rotation.x = -(b[`thigh${side}`].rotation.x + b[`shin${side}`].rotation.x) * 0.85;
    } else for (const side of ['L', 'R']) { b[`thigh${side}`].rotation.x = -0.35 - Math.sin(t * 3) * 0.08; b[`shin${side}`].rotation.x = 0.7; b[`foot${side}`].rotation.x = 0.5; }
    // Pelvis bob and twist; chest counter-rotates; arms counter-swing.
    b.hips.position.y += (-Math.abs(s) * 0.045 + 0.02) * m - (1 - m) * 0.005;
    b.hips.rotation.y = s * 0.12 * m; b.chest.rotation.y = -s * 0.18 * m; b.spine.rotation.x = 0.06 * m + breathe;
    b.chest.rotation.x = breathe * 0.6; b.head.rotation.y = reduced ? 0 : Math.sin(t * 0.43 + this.seed) * 0.25 * (1 - m);
    b.head.rotation.x = -b.spine.rotation.x * 0.7;
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      b[`upperArm${side}`].rotation.x = sign * s * 0.55 * m;
      b[`upperArm${side}`].rotation.z = sign * (0.12 + (1 - m) * (reduced ? 0 : Math.sin(t * 1.3 + this.seed) * 0.03));
      b[`forearm${side}`].rotation.x = -0.25 - Math.max(0, sign * s) * 0.4 * m;
    }
    if (fly) this.poseWings(); else this.holdStance();
    if (this.attackBlend > 0.01) this.poseAttack(this.attackBlend);
    if (this.cheer > 0 && !this.dead) this.poseCheer(Math.min(1, this.cheer * 4));
    if (this.flinch) { b.chest.rotation.x -= this.flinch * 0.35; b.head.rotation.x -= this.flinch * 0.3; b.hips.position.z -= this.flinch * 0.05; }
    if (this.dead) this.poseLimp(ease(this.dead));
  }
  // How each weapon is carried while walking.
  holdStance() {
    const b = this.b;
    if (this.style === 'thrust' || this.style === 'slash') { b.upperArmL.rotation.x += -0.5; b.forearmL.rotation.x += -0.7; b.upperArmL.rotation.z += 0.1; }
    if (this.style === 'thrust' && this.b.upperArmR) { b.upperArmR.rotation.x = -0.5 + b.upperArmR.rotation.x * 0.3; b.forearmR.rotation.x = -0.9; }
    if (this.style === 'bow') { b.upperArmL.rotation.x += -0.35; b.forearmL.rotation.x += -0.3; }
    if (this.style === 'smash' || this.style === 'pound') { b.upperArmR.rotation.x += -0.3; b.forearmR.rotation.x += -0.5; }
    if (this.style === 'throw') { b.upperArmR.rotation.x = -2.6; b.upperArmR.rotation.z = -0.3; b.forearmR.rotation.x = -1.2; b.upperArmL.rotation.x = -2.5; b.upperArmL.rotation.z = 0.5; b.forearmL.rotation.x = -1.2; }
    if (this.style === 'falcon') { b.upperArmL.rotation.x += -0.9; b.forearmL.rotation.x += -1.1; }
    if (this.style === 'cast') { b.upperArmL.rotation.x += -0.4; b.forearmL.rotation.x += -0.8; }
  }
  // w in [-0.35, 1]: 1 = fully wound up, negative = follow-through.
  poseAttack(blend) {
    const b = this.b, t = this.attackT;
    const w = t < 0.22 ? -0.35 * (1 - ease(t / 0.22)) : t < 0.86 ? ease((t - 0.22) / 0.64) : 1 - 1.35 * ease((t - 0.86) / 0.14);
    const mix = (bone, axis, value) => { bone.rotation[axis] = bone.rotation[axis] * (1 - blend) + value * blend; };
    const lean = (x) => { b.spine.rotation.x += x * blend; };
    switch (this.style) {
      case 'thrust': mix(b.upperArmR, 'x', -1.15 + w * 1.1); mix(b.forearmR, 'x', -0.25 - w * 1.1); mix(b.chest, 'y', -w * 0.45); lean(0.12 - w * 0.14); b.hips.position.z -= w * 0.1 * blend; mix(b.upperArmL, 'x', -1.0); mix(b.forearmL, 'x', -0.8); break;
      case 'slash': mix(b.upperArmR, 'x', -0.6 - w * 2.2); mix(b.upperArmR, 'z', -0.3 - w * 0.3); mix(b.forearmR, 'x', -0.3 - w * 0.8); mix(b.chest, 'y', w * 0.45); lean(0.18 - w * 0.2); mix(b.upperArmL, 'x', -1.1); mix(b.forearmL, 'x', -0.9); mix(b.upperArmL, 'z', 0.3); break;
      case 'bow': { const draw = Math.max(0, w); mix(b.chest, 'y', 0.55); mix(b.head, 'y', -0.45); mix(b.upperArmL, 'x', -1.5); mix(b.upperArmL, 'z', -0.1); mix(b.forearmL, 'x', -0.05); mix(b.upperArmR, 'x', -1.45); mix(b.upperArmR, 'z', -0.35 * draw); mix(b.forearmR, 'x', -0.3 - draw * 1.9); break; }
      case 'smash': mix(b.upperArmR, 'x', -0.5 - w * 2.3); mix(b.upperArmL, 'x', -0.5 - w * 2.3); mix(b.upperArmL, 'z', -0.25); mix(b.upperArmR, 'z', 0.15); mix(b.forearmR, 'x', -0.3 - w * 0.6); mix(b.forearmL, 'x', -0.6 - w * 0.6); lean(0.35 - w * 0.45); b.hips.position.y -= Math.max(0, -w) * 0.12 * blend; break;
      case 'throw': mix(b.upperArmR, 'x', -2.6 + Math.min(0, -w) * 1.8); mix(b.upperArmL, 'x', -2.5 + Math.min(0, -w) * 1.8); lean(-0.15 * w + 0.3 * Math.max(0, -w)); break;
      case 'cast': mix(b.upperArmR, 'x', -1.2 - w * 1.4); mix(b.upperArmR, 'z', -0.2); mix(b.forearmR, 'x', -0.3); mix(b.upperArmL, 'x', -1.2 + w * 0.3); mix(b.upperArmL, 'z', 0.6); mix(b.head, 'x', -0.2 * w); break;
      case 'chakram': mix(b.upperArmR, 'x', -1.4); mix(b.upperArmL, 'x', -1.4); mix(b.upperArmR, 'z', -0.2 - w * 0.9); mix(b.upperArmL, 'z', 0.2 + w * 0.9); mix(b.chest, 'y', w * 0.6); mix(b.forearmR, 'x', -0.6 * w); break;
      case 'falcon': mix(b.upperArmL, 'x', -1.2 - w * 1.2); mix(b.forearmL, 'x', -0.9 + w * 0.8); mix(b.upperArmR, 'x', -0.4); mix(b.chest, 'y', -0.3 * w); break;
      case 'pound': mix(b.upperArmR, 'x', -0.4 - w * 2.6); mix(b.upperArmL, 'x', -0.4 - w * 2.6); mix(b.forearmR, 'x', -0.4); mix(b.forearmL, 'x', -0.4); lean(0.3 - w * 0.5); b.hips.position.y -= Math.max(0, -w) * 0.15 * blend; break;
      case 'dive': lean(0.4 * Math.max(0, -w) + 0.2); mix(b.upperArmR, 'x', -1.6 + w * 0.8); mix(b.upperArmL, 'x', -1.6 + w * 0.8); break;
    }
  }
  poseWings() {
    const b = this.b, f = Math.sin(this.time * 7.5 + this.seed), up = f * 0.75;
    b.wingL.rotation.z = up; b.wingR.rotation.z = -up; b.wingTipL.rotation.z = up * 0.6; b.wingTipR.rotation.z = -up * 0.6;
    b.wingL.rotation.y = -0.2; b.wingR.rotation.y = 0.2; b.hips.position.y += -f * 0.06;
    b.spine.rotation.x += 0.35; b.head.rotation.x -= 0.3;
  }
  poseCheer(k) {
    const b = this.b, pump = Math.sin(this.time * 9 + this.seed) * 0.35;
    b.upperArmR.rotation.x = b.upperArmR.rotation.x * (1 - k) + (-2.9 + pump) * k; b.upperArmR.rotation.z = -0.25 * k;
    b.upperArmL.rotation.x = b.upperArmL.rotation.x * (1 - k) + (-2.7 - pump) * k; b.upperArmL.rotation.z = 0.35 * k;
    b.forearmR.rotation.x *= 1 - k; b.forearmL.rotation.x *= 1 - k; b.head.rotation.x -= 0.35 * k;
    b.hips.position.y += Math.abs(Math.sin(this.time * 9 + this.seed)) * 0.08 * k;
  }
  poseLimp(k) {
    const b = this.b;
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      if (b[`upperArm${side}`]) { b[`upperArm${side}`].rotation.z += sign * 1.1 * k; b[`upperArm${side}`].rotation.x *= 1 - k; b[`forearm${side}`].rotation.x = -0.6 * k; }
      if (b[`thigh${side}`]) { b[`thigh${side}`].rotation.x = -0.35 * k * (sign > 0 ? 1 : 0.4); b[`shin${side}`].rotation.x = 0.8 * k; }
    }
    if (b.head) b.head.rotation.x = 0.5 * k; if (b.spine) b.spine.rotation.x = 0.25 * k;
  }
  poseHorse(reduced) {
    const b = this.b, m = this.move, ph = this.phase * TAU, t = this.time;
    for (const [n, off] of [['FL', 0], ['BR', 0], ['FR', 0.5], ['BL', 0.5]]) {
      const a = ph + off * TAU, s = Math.sin(a), c = Math.cos(a);
      b[`upper${n}`].rotation.x = -s * 0.55 * m; b[`lower${n}`].rotation.x = (n.startsWith('F') ? -1 : 1) * Math.max(0, c) * 0.9 * m; b[`hoof${n}`].rotation.x = -b[`upper${n}`].rotation.x * 0.6;
    }
    b.body.position.y += -Math.abs(Math.sin(ph * 2)) * 0.05 * m; b.body.rotation.x = Math.sin(ph * 2) * 0.04 * m;
    b.neck.rotation.x = Math.sin(ph * 2 + 0.6) * 0.12 * m + (reduced ? 0 : Math.sin(t * 0.7) * 0.05); b.tail.rotation.x = 0.3 + Math.sin(t * 3) * 0.15; b.tail.rotation.z = Math.sin(t * 2.2) * 0.25;
    // Rider rises in the stirrups and levels the lance to strike.
    b.hips.position.y += Math.abs(Math.sin(ph * 2)) * 0.03 * m;
    b.upperArmL.rotation.x = -0.9; b.forearmL.rotation.x = -0.6; b.upperArmR.rotation.x = -0.5; b.forearmR.rotation.x = -0.6;
    b.chest.rotation.y = Math.sin(ph) * 0.1 * m; b.headR.rotation.y = reduced ? 0 : Math.sin(t * 0.5 + this.seed) * 0.2 * (1 - m);
    if (this.attackBlend > 0.01) { const t2 = this.attackT, w = t2 < 0.22 ? -0.35 * (1 - ease(t2 / 0.22)) : t2 < 0.86 ? ease((t2 - 0.22) / 0.64) : 1 - 1.35 * ease((t2 - 0.86) / 0.14), k = this.attackBlend; b.upperArmR.rotation.x = b.upperArmR.rotation.x * (1 - k) + (-1.0 + w * 0.6) * k; b.forearmR.rotation.x = b.forearmR.rotation.x * (1 - k) + (-0.3 - w * 1.0) * k; b.chest.rotation.y += w * 0.3 * k; b.neck.rotation.x -= w * 0.15 * k; }
    if (this.cheer > 0 && !this.dead) { b.upperArmR.rotation.x = -2.8 + Math.sin(this.time * 8) * 0.3; b.neck.rotation.x = -0.4; b.upperFL.rotation.x = -0.9; b.lowerFL.rotation.x = -1.2; b.upperFR.rotation.x = -0.7; b.lowerFR.rotation.x = -1.3; b.body.rotation.x = -0.3; b.body.position.y += 0.15; }
    if (this.flinch) b.body.rotation.z += this.flinch * 0.15;
    if (this.dead) { const k = ease(this.dead); for (const n of ['FL', 'FR', 'BL', 'BR']) b[`upper${n}`].rotation.x = (n.startsWith('F') ? -0.5 : 0.5) * k; b.neck.rotation.x = 0.6 * k; b.upperArmR.rotation.z = -1 * k; }
  }
  poseElephant(reduced) {
    const b = this.b, m = this.move, ph = this.phase * TAU, t = this.time;
    for (const [n, off] of [['FL', 0], ['BL', 0.25], ['FR', 0.5], ['BR', 0.75]]) {
      const a = ph + off * TAU, s = Math.sin(a), c = Math.cos(a);
      b[`upper${n}`].rotation.x = -s * 0.32 * m; b[`lower${n}`].rotation.x = (n.startsWith('F') ? -1 : 1) * Math.max(0, c) * 0.45 * m;
    }
    b.body.position.y += -Math.abs(Math.sin(ph * 2)) * 0.04 * m; b.body.rotation.z = Math.sin(ph) * 0.03 * m;
    b.head.rotation.x = Math.sin(ph * 2) * 0.04 * m + (reduced ? 0 : Math.sin(t * 0.8) * 0.03);
    const sway = reduced ? 0 : Math.sin(t * 1.4 + this.seed);
    b.trunk1.rotation.x = 0.1 + sway * 0.08; b.trunk2.rotation.x = 0.15 + sway * 0.12; b.trunk3.rotation.x = -0.2 + Math.sin(t * 1.4 + 0.6) * 0.18; b.trunk1.rotation.z = Math.sin(t * 0.9) * 0.08;
    const flap = reduced ? 0 : Math.sin(t * 2.3 + this.seed) * 0.35; b.earL.rotation.y = -0.2 + flap; b.earR.rotation.y = 0.2 - flap;
    b.tail.rotation.z = Math.sin(t * 2.5) * 0.3;
    if (this.attackBlend > 0.01) {
      const t2 = this.attackT, w = t2 < 0.22 ? -0.35 * (1 - ease(t2 / 0.22)) : t2 < 0.86 ? ease((t2 - 0.22) / 0.64) : 1 - 1.35 * ease((t2 - 0.86) / 0.14), k = this.attackBlend;
      b.head.rotation.x += (-0.35 * w) * k; b.trunk1.rotation.x += (-1.1 * w) * k; b.trunk2.rotation.x += (-0.8 * w) * k; b.trunk3.rotation.x += (-0.6 * w) * k;
      b.upperFL.rotation.x += -0.5 * Math.max(0, w) * k; b.lowerFL.rotation.x += -0.6 * Math.max(0, w) * k; b.body.rotation.x = -0.12 * Math.max(0, w) * k;
    }
    if (this.cheer > 0) { b.trunk1.rotation.x = -1.4; b.trunk2.rotation.x = -0.9; b.trunk3.rotation.x = -0.6; b.body.rotation.x = -0.18; b.upperFL.rotation.x = -0.6; b.upperFR.rotation.x = -0.6; }
    if (this.flinch) b.body.rotation.z += this.flinch * 0.08;
    if (this.dead) { const k = ease(this.dead); b.trunk1.rotation.x = 0.5 * k; b.earL.rotation.y = 0.4 * k; b.earR.rotation.y = -0.4 * k; }
  }
  // World-space anchors for a cape across the shoulder blades (skinning: bone × inverse bind).
  capeAnchors(a, b) {
    const chest = this.b.chest; if (!chest) return false;
    this.root.updateMatrixWorld(true);
    const bones = this.mesh.skeleton.bones, m = _m4.multiplyMatrices(chest.matrixWorld, this.mesh.skeleton.boneInverses[bones.indexOf(chest)]);
    const sw = (this.bp.sw || 0.25) * 0.8, y = (this.bp.H?.shoulder || 1.2) + 0.03;
    a.set(sw, y, -0.17).applyMatrix4(m); b.set(-sw, y, -0.17).applyMatrix4(m);
    return true;
  }
  // Collision spheres for the cape: back and legs.
  capeSpheres() {
    const out = [], add = (name, r, dz = 0) => { const bone = this.b[name]; if (!bone) return; const c = bone.getWorldPosition(V()); c.z += 0; const scale = this.root.getWorldScale(_s).x; out.push({ center: c, radius: r * scale }); };
    add('spine', 0.26); add('chest', 0.25); add('thighL', 0.12); add('thighR', 0.12); add('shinL', 0.1); add('shinR', 0.1);
    return out;
  }
  dispose() { this.mesh.skeleton.dispose(); this.cape?.dispose(); this.root.parent?.remove(this.root); }
}
const _p = V(), _s = V(), _m4 = new THREE.Matrix4();
export const ROSTER_IDS = Object.keys(ROSTER);
