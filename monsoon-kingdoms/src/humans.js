import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addRimLight } from './atmosphere.js';
import { ClothStrip } from './physics.js';

// Realistic characters for Crown of Bharat.
//
// Bodies: Quaternius "Universal Base Characters" (CC0) — sculpted male and female
// anatomy with 2K PBR skin, a 65-bone Unreal-standard skeleton and 34 motion clips
// from the "Universal Animation Library" (CC0). Mounts: the Marwari horse and the
// armoured Mauryan war elephant from 0 A.D. (Wildfire Games, CC BY-SA 3.0).
//
// Each troop and hero is dressed at load time: garment regions are found from the
// skinning weights (which bone moves each vertex), painted into the body's own UV
// texture with fabric, block-print motifs and gold zari borders at every seam, and
// the normal map is smoothed under cloth. 3D garments (kurta skirts, dhotis, turbans,
// helmets, armour) are skinned by copying weights from the nearest body vertex, so
// they deform with every motion-captured clip. Weapons ride the hand bones.

const TAU = Math.PI * 2, V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const REGION = { skin: 0, torso: 1, hips: 2, upper: 3, fore: 4, thigh: 5, calf: 6, foot: 7, hand: 8, head: 9, neck: 10 };
function boneRegion(name) {
  const n = name.toLowerCase();
  if (/head/.test(n)) return REGION.head; if (/neck/.test(n)) return REGION.neck;
  if (/spine|clavicle/.test(n)) return REGION.torso; if (/pelvis|root/.test(n)) return REGION.hips;
  if (/upperarm/.test(n)) return REGION.upper; if (/lowerarm/.test(n)) return REGION.fore;
  if (/hand|index|middle|ring|pinky|thumb/.test(n)) return REGION.hand;
  if (/thigh/.test(n)) return REGION.thigh; if (/calf/.test(n)) return REGION.calf; if (/foot|ball/.test(n)) return REGION.foot;
  return REGION.skin;
}
const GOLD = '#d9a93f', TEAL = '#1f6f7a', WHITE = '#ece4d2', LEATHER = '#5b3a26';
// Outfit, gear and motion for every unit. Colours follow the original portraits.
export const LOOKS = {
  guard: { body: 'male', skin: 1, top: TEAL, sleeves: 'long', pants: WHITE, boots: LEATHER, skirt: { color: TEAL, length: 0.24 }, hat: { type: 'pagri', color: TEAL }, mustache: true, right: 'spear', left: 'shield', clips: { idle: 'Idle_Shield_Loop', attack: ['Sword_Dash', 0.42] } },
  archer: { body: 'male', skin: 0.9, top: '#2f7f6d', sleeves: 'long', pants: WHITE, boots: LEATHER, skirt: { color: '#2f7f6d', length: 0.22 }, hat: { type: 'bun' }, left: 'bow', back: 'quiver', clips: { idle: 'Idle_Loop', attack: ['Spell_Simple_Shoot', 0.45] } },
  engineer: { body: 'male', skin: 1, top: '#8a5a2b', sleeves: 'short', pants: '#6b4a2e', boots: LEATHER, skirt: { color: '#b0773a', length: 0.22 }, hat: { type: 'pagri', color: '#c9602d' }, beard: true, right: 'mallet', belt: true, clips: { attack: ['TreeChopping_Loop', 0.5] } },
  healer: { body: 'female', skin: 0.9, top: '#3a8f95', sleeves: 'long', pants: '#e9dfca', boots: '#7a5a3a', skirt: { color: '#3a8f95', length: 0.62, flare: 1.35 }, hat: { type: 'veil', color: '#f1ece2' }, right: 'staff', clips: { attack: ['Spell_Simple_Shoot', 0.45], idle: 'Spell_Simple_Idle_Loop' } },
  miner: { body: 'male', skin: 1.05, top: '#4d8a52', sleeves: 'short', pants: '#3a6b3f', boots: LEATHER, skirt: { color: '#4d8a52', length: 0.21 }, hat: { type: 'pagri', color: '#d7b56d' }, mustache: true, right: 'pick', clips: { attack: ['TreeChopping_Loop', 0.5] } },
  bowler: { body: 'male', skin: 1.1, bare: true, pants: '#2f6d8f', dhoti: true, boots: null, hat: { type: 'band' }, beard: true, carry: 'boulder', clips: { attack: ['OverhandThrow', 0.42] } },
  veer: { body: 'male', skin: 1, top: '#b8612c', sleeves: 'long', pants: TEAL, boots: LEATHER, armor: '#c9803f', skirt: { color: '#b8612c', length: 0.27 }, hat: { type: 'helmet', color: '#c46a35' }, mustache: true, right: 'talwar', left: 'sunshield', cape: { color: '#9e2f22' }, hero: true, clips: { idle: 'Sword_Idle', attack: ['Sword_Heavy_Combo', 0.3] } },
  tara: { body: 'female', skin: 0.9, top: '#2e8f7a', sleeves: 'long', pants: '#23705f', boots: LEATHER, skirt: { color: '#2e8f7a', length: 0.45 }, hat: { type: 'topknot' }, left: 'longbow', back: 'quiver', cape: { color: '#2fa39a' }, hero: true, clips: { attack: ['Spell_Simple_Shoot', 0.45] } },
  nila: { body: 'female', skin: 0.9, top: '#8e2f6a', sleeves: 'short', pants: TEAL, boots: LEATHER, skirt: { color: '#e59a2e', length: 0.5, flare: 1.4 }, hat: { type: 'braid' }, right: 'chakram', left: 'chakram', hero: true, clips: { attack: ['Sword_Regular_C', 0.5], idle: 'Sword_Idle' } },
  ayaan: { body: 'male', skin: 1, top: '#3f7f4a', sleeves: 'long', pants: TEAL, boots: LEATHER, skirt: { color: '#3f7f4a', length: 0.27 }, hat: { type: 'pagri', color: '#2f6a3a' }, beard: true, left: 'falcon', cape: { color: '#2f6a3a' }, hero: true, clips: { attack: ['Spell_Simple_Shoot', 0.45] } },
  ira: { body: 'female', skin: 0.9, top: '#2f8c8f', sleeves: 'long', pants: '#2f8c8f', boots: '#7a5a3a', skirt: { color: '#2f8c8f', length: 0.78, flare: 1.3 }, hat: { type: 'veil', color: '#f4efe6' }, right: 'parasol', hero: true, clips: { attack: ['Spell_Simple_Shoot', 0.45], idle: 'Spell_Simple_Idle_Loop' } },
  kabir: { body: 'male', skin: 1.05, top: '#d06a2c', sleeves: 'short', pants: TEAL, boots: LEATHER, skirt: { color: '#d06a2c', length: 0.28 }, hat: { type: 'pagri', color: '#c9602d' }, beard: true, right: 'bigmallet', belt: true, hero: true, clips: { attack: ['TreeChopping_Loop', 0.5] } },
  yeti: { body: 'male', skin: 1, fur: true, scale: 1.32, clips: { attack: ['Punch_Cross', 0.45], idle: 'Idle_Loop' } },
  garuda: { body: 'male', skin: 1, top: '#b0322a', sleeves: 'long', pants: '#1f4a7a', boots: GOLD, armor: GOLD, hat: { type: 'beak' }, wings: true, clips: { attack: ['Sword_Dash', 0.45], idle: 'NinjaJump_Idle_Loop', walk: 'NinjaJump_Idle_Loop', run: 'NinjaJump_Idle_Loop' }, flying: true },
  rider: { mount: 'horse', rider: 'guard' },
  elephant: { mount: 'elephant', rider: 'guard', howdah: 'archer' },
};
// The sculpted head's bind-space bounds, from vertices the head bone owns.
function headBox(body, index) {
  const P = body.geometry.attributes.position, SI = body.geometry.attributes.skinIndex, SW = body.geometry.attributes.skinWeight, box = new THREE.Box3(), v = V();
  for (let i = 0; i < P.count; i++) for (let c = 0; c < 4; c++) if (SI.getComponent(i, c) === index && SW.getComponent(i, c) > 0.5) { box.expandByPoint(v.fromBufferAttribute(P, i)); break; }
  return box;
}
// Normalise a part for merging: non-indexed, the shared attribute set and a vertex colour.
const KEEP = new Set(['position', 'normal', 'uv', 'skinIndex', 'skinWeight']);
function tidy(geometry, color, flatUV = false) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry, n = g.attributes.position.count, c = new THREE.Color(color), col = new Float32Array(n * 3);
  for (const k of Object.keys(g.attributes)) if (!KEEP.has(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv || flatUV) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2).fill(0.004), 2));
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.morphAttributes = {}; g.clearGroups(); return g;
}
// Shared outfit surfaces (one set for troops, one with a warmer rim for heroes).
const KITS = {};
function kit(hero) {
  const key = hero ? 'hero' : 'troop'; if (KITS[key]) return KITS[key];
  const weave = new THREE.CanvasTexture(fabric(256, 256, '#dedede')); weave.colorSpace = THREE.SRGBColorSpace; weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.anisotropy = 4;
  const k = { cloth: new THREE.MeshStandardMaterial({ map: weave, vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), flat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }), metal: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.9, roughness: 0.3 }) };
  for (const m of Object.values(k)) addRimLight(m, hero ? '#ffcf6b' : '#fff1d0', hero ? 0.35 : 0.22);
  return (KITS[key] = k);
}
let PROP = null;
const propMats = () => PROP || (PROP = { metal: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.92, roughness: 0.26 }), matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide }) });
const SKIN_TONES = [0.82, 0.9, 1, 1.08, 1.15];

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// A block-print cotton: base colour, soft weave and a small repeating motif.
function fabric(w, h, color, { motif = true, seed = 1 } = {}) {
  const c = canvas(w, h), g = c.getContext('2d'), base = new THREE.Color(color);
  g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.08; for (let y = 0; y < h; y += 3) { g.fillStyle = y % 6 ? '#000' : '#fff'; g.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 3) { g.fillStyle = x % 6 ? '#000' : '#fff'; g.fillRect(x, 0, 1, h); }
  g.globalAlpha = 1;
  if (motif) {
    const light = base.clone().offsetHSL(0.02, 0.05, 0.16), step = Math.max(24, w / 40);
    g.fillStyle = `#${light.getHexString()}`; g.globalAlpha = 0.55;
    for (let y = 0, row = 0; y < h + step; y += step, row++) for (let x = (row % 2) * step / 2; x < w + step; x += step) {
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.ellipse(x + Math.cos(a) * step * 0.12, y + Math.sin(a) * step * 0.12, step * 0.08, step * 0.04, a, 0, TAU); } g.fill();
      g.beginPath(); g.arc(x, y, step * 0.05, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  return c;
}

export class HumanForge {
  constructor() { this.ready = false; this.templates = new Map(); this.painted = new Map(); }
  async load(base = './assets/characters/', progress = () => {}) {
    const loader = new GLTFLoader(), files = ['human_male', 'human_female', 'horse', 'war_elephant'];
    const [male, female, horse, elephant] = await Promise.all(files.map(async (f, i) => { const g = await loader.loadAsync(`${base}${f}.glb`); progress((i + 1) / files.length); return g; }));
    this.src = { male, female, horse, elephant };
    this.clips = new Map(male.animations.map(c => [c.name, c]));
    this.mountClips = { horse: new Map(horse.animations.map(c => [c.name, c])), elephant: new Map(elephant.animations.map(c => [c.name, c])) };
    this.ready = true;
  }
  has(id) { return this.ready && !!LOOKS[id] && !this.skipped?.has(id); }
  skip(id) { (this.skipped ??= new Set()).add(id); }
  // ---------------------------------------------------------------- dressing
  paint(bodyMesh, look, key, size) {
    if (this.painted.has(key)) return this.painted.get(key);
    const src = bodyMesh.material, image = src.map.image, w = size, h = size;
    const bones = bodyMesh.skeleton.bones, geo = bodyMesh.geometry, uv = geo.attributes.uv, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, index = geo.index.array;
    const region = new Uint8Array(uv.count);
    for (let i = 0; i < uv.count; i++) { let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const wgt = sw.getComponent(i, k); if (wgt > bw) { bw = wgt; best = si.getComponent(i, k); } } region[i] = boneRegion(bones[best]?.name || ''); }
    // Which regions each garment covers.
    const covered = new Set();
    if (!look.bare && !look.fur) { covered.add(REGION.torso); covered.add(REGION.upper); if (look.sleeves === 'long') covered.add(REGION.fore); covered.add(REGION.neck); }
    if (look.pants) { covered.add(REGION.hips); covered.add(REGION.thigh); if (!look.dhoti) covered.add(REGION.calf); }
    const under = look.skirt?.color || (look.dhoti ? look.pants : null);
    const colorFor = r => r === REGION.foot ? look.boots : (r === REGION.hips || r === REGION.thigh) && under ? under : [REGION.hips, REGION.thigh, REGION.calf].includes(r) ? look.pants : look.top;
    // Skin: the base albedo, warmed or deepened per character.
    const out = canvas(w, h), g = out.getContext('2d'); g.drawImage(image, 0, 0, w, h);
    const tone = SKIN_TONES.reduce((a, b) => Math.abs(b - look.skin) < Math.abs(a - look.skin) ? b : a, 1);
    if (look.fur) { g.fillStyle = '#d3dde3'; g.fillRect(0, 0, w, h); g.globalAlpha = 0.25; g.filter = 'grayscale(1) brightness(1.6)'; g.globalCompositeOperation = 'multiply'; g.drawImage(image, 0, 0, w, h); g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    else if (tone !== 1) { g.globalCompositeOperation = 'multiply'; g.fillStyle = tone < 1 ? '#f4e6dc' : '#b98a6a'; g.globalAlpha = tone < 1 ? 0.6 : Math.min(0.9, (tone - 1) * 4); g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    const gray = canvas(w, h), gg = gray.getContext('2d'); gg.filter = 'grayscale(1) contrast(1.35) brightness(1.25)'; gg.drawImage(image, 0, 0, w, h);
    const tri = (ctx, a, b, c, grow = 0.8) => { const ax = uv.getX(a) * w, ay = uv.getY(a) * h, bx = uv.getX(b) * w, by = uv.getY(b) * h, cx = uv.getX(c) * w, cy = uv.getY(c) * h, mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3, s = p => [p[0] + Math.sign(p[0] - mx) * grow, p[1] + Math.sign(p[1] - my) * grow]; const [pa, pb, pc] = [s([ax, ay]), s([bx, by]), s([cx, cy])]; ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.lineTo(pc[0], pc[1]); ctx.closePath(); };
    const garments = new Map(), seams = [];
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t], b = index[t + 1], c = index[t + 2], rs = [region[a], region[b], region[c]];
      const cov = rs.map(r => covered.has(r) || (r === REGION.foot && look.boots));
      const color = cov.every(Boolean) ? colorFor(rs[0]) : null;
      if (cov.some(Boolean) && (!cov.every(Boolean) || new Set(rs.map(colorFor)).size > 1)) seams.push([a, b, c]);
      if (color) { if (!garments.has(color)) garments.set(color, []); garments.get(color).push([a, b, c]); }
    }
    for (const [color, tris] of garments) {
      const mask = canvas(w, h), mg = mask.getContext('2d'); mg.fillStyle = '#fff'; mg.beginPath(); for (const [a, b, c] of tris) tri(mg, a, b, c); mg.fill();
      const layer = fabric(w, h, color, { motif: color !== look.boots && color !== LEATHER }), lg = layer.getContext('2d');
      lg.globalCompositeOperation = 'multiply'; lg.globalAlpha = 0.55; lg.drawImage(gray, 0, 0); lg.globalAlpha = 1;
      lg.globalCompositeOperation = 'destination-in'; lg.drawImage(mask, 0, 0); g.drawImage(layer, 0, 0);
    }
    if (look.armor) {
      // Lamellar armour plates across the chest and shoulders.
      const mask = canvas(w, h), mg = mask.getContext('2d'); mg.fillStyle = '#fff'; mg.beginPath();
      for (let t = 0; t < index.length; t += 3) { const a = index[t], b = index[t + 1], c = index[t + 2]; if ([a, b, c].every(i => region[i] === REGION.torso)) tri(mg, a, b, c); }
      mg.fill(); const plates = canvas(w, h), pg = plates.getContext('2d'); const metal = new THREE.Color(look.armor), step = w / 64;
      for (let y = 0; y < h; y += step) for (let x = ((y / step) % 2) * step / 2; x < w; x += step) { const grd = pg.createLinearGradient(x, y, x, y + step); grd.addColorStop(0, `#${metal.clone().offsetHSL(0, 0, 0.18).getHexString()}`); grd.addColorStop(1, `#${metal.clone().offsetHSL(0, 0, -0.15).getHexString()}`); pg.fillStyle = grd; pg.fillRect(x + 1, y + 1, step - 2, step - 2); }
      pg.globalCompositeOperation = 'destination-in'; pg.drawImage(mask, 0, 0); g.globalAlpha = 0.85; g.drawImage(plates, 0, 0); g.globalAlpha = 1;
    }
    if (seams.length && !look.fur) {
      // Gold zari border wherever cloth meets skin or another garment.
      g.fillStyle = GOLD; g.beginPath(); for (const [a, b, c] of seams) tri(g, a, b, c, 1.4); g.fill();
      g.globalAlpha = 0.5; g.fillStyle = '#fff3c4'; g.beginPath(); for (const [a, b, c] of seams.filter((_, i) => i % 3 === 0)) tri(g, a, b, c, 0.2); g.fill(); g.globalAlpha = 1;
    }
    const map = new THREE.CanvasTexture(out); map.flipY = false; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    // Flatten anatomy under fabric: cloth drapes, it does not show every muscle.
    const nimg = src.normalMap?.image, ncv = canvas(w, h), ng = ncv.getContext('2d'); if (nimg) ng.drawImage(nimg, 0, 0, w, h);
    ng.fillStyle = 'rgba(128,128,255,0.72)'; ng.beginPath(); for (const tris of garments.values()) for (const [a, b, c] of tris) tri(ng, a, b, c); ng.fill();
    const normalMap = new THREE.CanvasTexture(ncv); normalMap.flipY = false;
    const material = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(1, 1), roughnessMap: src.roughnessMap || null, roughness: look.fur ? 0.95 : 0.78, metalness: 0, envMapIntensity: 0.6 });
    addRimLight(material, look.hero ? '#ffcf6b' : '#fff1d0', look.hero ? 0.45 : 0.25);
    this.painted.set(key, material); return material;
  }
  // Skin a garment authored in the body's bind space by copying weights from the nearest body vertices.
  weigh(geometry, body, pelvisBlend = 0) {
    const P = body.geometry.attributes.position, SI = body.geometry.attributes.skinIndex, SW = body.geometry.attributes.skinWeight, pos = geometry.attributes.position;
    const idx = new Uint16Array(pos.count * 4), wts = new Float32Array(pos.count * 4), pelvis = body.skeleton.bones.findIndex(b => /pelvis/i.test(b.name)), v = V(), u = V();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); let best = 0, bd = Infinity;
      for (let j = 0; j < P.count; j += 2) { u.fromBufferAttribute(P, j); const d = u.distanceToSquared(v); if (d < bd) { bd = d; best = j; } }
      const blend = typeof pelvisBlend === 'function' ? pelvisBlend(v) : pelvisBlend;
      const pairs = []; for (let k = 0; k < 4; k++) pairs.push([SI.getComponent(best, k), SW.getComponent(best, k) * (1 - blend)]);
      if (blend && pelvis >= 0) pairs.push([pelvis, blend]);
      const merged = new Map(); for (const [b, w] of pairs) merged.set(b, (merged.get(b) || 0) + w);
      const top = [...merged].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, [, w]) => s + w, 0) || 1;
      top.forEach(([b, w], k) => { idx[i * 4 + k] = b; wts[i * 4 + k] = w / sum; });
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4)); geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
    return geometry;
  }
  boneBind(body, pattern) { const i = body.skeleton.bones.findIndex(b => pattern.test(b.name)); if (i < 0) return null; const m = new THREE.Matrix4().copy(body.skeleton.boneInverses[i]).invert(); return { index: i, bone: body.skeleton.bones[i], matrix: m, position: V().setFromMatrixPosition(m) }; }
  // A rigid part (hat, beard) bound fully to one bone, authored in body bind space.
  pin(geometry, bone) {
    const n = geometry.attributes.position.count, idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { idx[i * 4] = bone; wts[i * 4] = 1; }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4)); geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
    return geometry;
  }
  template(id) {
    if (this.templates.has(id)) return this.templates.get(id);
    const look = LOOKS[id]; let result;
    if (look.mount) result = this.mountTemplate(id, look); else result = this.humanTemplate(id, look);
    this.templates.set(id, result); return result;
  }
  humanTemplate(id, look) {
    const src = look.body === 'female' ? this.src.female : this.src.male, scene = cloneSkinned(src.scene);
    scene.updateMatrixWorld(true);
    let body = null; scene.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
    const size = matchMedia?.('(min-width: 1400px)').matches ? 2048 : 1024;
    body.material = this.paint(body, look, `${id}:${size}`, size);
    scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = true; if (o !== body && o.material && !o.material.userData.rim) { o.material = o.material.clone(); addRimLight(o.material, '#fff1d0', 0.2); } } });
    const parent = body.parent, bb = new THREE.Box3().setFromBufferAttribute(body.geometry.attributes.position), height = bb.max.y - bb.min.y;
    const head = this.boneBind(body, /^head$/i), pelvis = this.boneBind(body, /^pelvis$/i), spine = this.boneBind(body, /spine_03/i);
    // Every garment, hat and trim is collected by surface (printed cloth, plain matte, metal) and merged
    // into one skinned mesh per surface, so a dressed warrior costs three skinned draws plus weapons.
    const cloth = color => ({ kind: 'cloth', color }), metal = color => ({ kind: 'metal', color }), flat = color => ({ kind: 'flat', color });
    const outfit = { cloth: [], flat: [], metal: [] }, wear = (geo, d) => outfit[d.kind].push(tidy(geo, d.color, d.kind === 'flat'));
    const add = mesh => { parent.add(mesh); return mesh; };
    // Kurta skirt / dhoti: a pleated, flared lathe from the waist. The top rides the pelvis;
    // the hem follows the thighs so it swings with every stride.
    const skirt = look.skirt || (look.dhoti ? { color: look.pants, length: 0.26 } : null);
    if (skirt && pelvis) {
      const P = body.geometry.attributes.position, top = pelvis.position.y + height * 0.035, len = height * skirt.length, flare = skirt.flare || 1.28;
      let r = 0; const v = V(); for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i); if (Math.abs(v.y - top) < height * 0.03 && Math.abs(v.x) < height * 0.12) r = Math.max(r, Math.hypot(v.x, (v.z - pelvis.position.z) * 1.2)); }
      r = Math.max(r, height * 0.09) * 1.08;
      const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector2(r * (1 + (flare - 1) * Math.pow(t, 1.4)) + t * height * 0.02, top - t * len)); }
      const geo = new THREE.LatheGeometry(pts.reverse(), 48), gp = geo.attributes.position, long = skirt.length > 0.4;
      for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i), z = gp.getZ(i), t = (top - y) / len, ang = Math.atan2(z, x), k = 1 + t * 0.05 * Math.sin(ang * 16) + t * 0.02 * Math.sin(ang * 5 + 1); gp.setXYZ(i, x * k, y, z * k * 0.84 + pelvis.position.z); }
      geo.computeVertexNormals();
      const uvs = geo.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * 6, uvs.getY(i) * 2);
      const blend = q => { const t = Math.min(1, Math.max(0, (top - q.y) / len)); return long ? 0.85 - t * 0.35 : 0.9 - t * 0.7; };
      wear(this.weigh(geo, body, blend), cloth(skirt.color));
      // A gold zari hem band, and a sash at the waist.
      const hemR = r * flare + height * 0.02, hem = new THREE.TorusGeometry(hemR, height * 0.006, 6, 64); hem.rotateX(Math.PI / 2);
      const hp = hem.attributes.position; for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), z = hp.getZ(i), ang = Math.atan2(z, x), k = 1 + 0.05 * Math.sin(ang * 16) + 0.02 * Math.sin(ang * 5 + 1); hp.setXYZ(i, x * k, hp.getY(i) + top - len + height * 0.004, z * k * 0.84 + pelvis.position.z); }
      wear(this.weigh(hem, body, blend), metal(GOLD));
      const sash = new THREE.TorusGeometry(r * 1.01, height * 0.011, 8, 40); sash.rotateX(Math.PI / 2); sash.scale(1, 1, 0.84); sash.translate(0, top - height * 0.005, pelvis.position.z);
      wear(this.weigh(sash, body, 0.9), look.belt ? flat(LEATHER) : metal(GOLD));
    }
    // Headwear, hair and beards, bound rigidly to the head and fitted to the sculpted skull.
    if (head) {
      const hb = headBox(body, head.index), top = hb.max.y, R = (hb.max.x - hb.min.x) / 2, front = hb.max.z, cz = (hb.min.z + hb.max.z) / 2 - R * 0.1, parts = [];
      const place = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sc = [1, 1, 1]) => { geo.scale(...sc); geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z); return geo; };
      const hat = look.hat?.type, face = Math.PI / 2, gap = (w, h = Math.PI) => [face + w / 2, TAU - w, 0, h];
      if (hat === 'pagri') {
        const c = cloth(look.hat.color);
        for (let i = 0; i < 5; i++) parts.push([place(new THREE.TorusGeometry(R * (1.02 - i * 0.07), R * 0.2, 10, 40), 0, top - R * 0.62 + i * R * 0.19, cz, Math.PI / 2 + (i % 2 ? 0.2 : -0.16), 0, 0, [1, 1, 1.12]), c]);
        parts.push([place(new THREE.SphereGeometry(R * 0.86, 24, 14), 0, top - R * 0.05, cz, 0, 0, 0, [1, 0.62, 1.1]), c]);
        parts.push([place(new THREE.SphereGeometry(R * 0.14, 12, 8), 0, top - R * 0.2, cz + R * 1.08), metal('#c93c3c')]);
        parts.push([place(new THREE.ConeGeometry(R * 0.07, R * 0.8, 8), 0, top + R * 0.15, cz + R * 0.95, 0.35), metal(GOLD)]);
      }
      if (hat === 'helmet') {
        parts.push([place(new THREE.SphereGeometry(R * 1.14, 28, 14, 0, TAU, 0, Math.PI / 2), 0, top - R * 0.72, cz, 0, 0, 0, [1, 1.05, 1.1]), metal(look.hat.color)]);
        parts.push([place(new THREE.TorusGeometry(R * 1.14, R * 0.07, 8, 40), 0, top - R * 0.72, cz, Math.PI / 2, 0, 0, [1, 1.1, 1]), metal(GOLD)]);
        parts.push([place(new THREE.ConeGeometry(R * 0.1, R * 0.8, 10), 0, top + R * 0.7, cz), metal(GOLD)]);
        parts.push([place(new THREE.BoxGeometry(R * 0.1, R * 0.7, R * 0.08), 0, top - R * 1.05, front + R * 0.08), metal(GOLD)]);
        parts.push([place(new THREE.SphereGeometry(R * 1.18, 24, 10, ...gap(Math.PI * 0.9, Math.PI * 0.5)), 0, top - R * 0.7, cz, Math.PI, 0, 0, [1, 0.9, 1.1]), metal('#6b6f73')]);
      }
      if (hat === 'veil') {
        const c = cloth(look.hat.color);
        parts.push([place(new THREE.SphereGeometry(R * 1.22, 28, 16, ...gap(Math.PI * 0.72, Math.PI * 0.62)), 0, top - R * 0.95, cz - R * 0.05, 0, 0, 0, [1, 1.08, 1.1]), c]);
        parts.push([place(new THREE.CylinderGeometry(R * 1.05, R * 1.9, R * 2.6, 24, 1, true, face + Math.PI * 0.42, TAU - Math.PI * 0.84), 0, top - R * 2.6, cz - R * 0.3), c]);
        parts.push([place(new THREE.TorusGeometry(R * 1.12, R * 0.035, 6, 40, Math.PI * 1.2), 0, top - R * 0.55, cz, -Math.PI / 2 - 0.25, 0, -Math.PI * 0.1 + Math.PI), metal(GOLD)]);
      }
      if (hat === 'bun' || hat === 'topknot' || hat === 'braid') {
        const hair = flat('#1f1712');
        parts.push([place(new THREE.SphereGeometry(R * 1.06, 28, 16, 0, TAU, 0, Math.PI * 0.58), 0, top - R * 1.02, cz - R * 0.04, -0.28, 0, 0, [1, 1, 1.08]), hair]);
        const knot = hat === 'topknot' ? [top + R * 0.12, cz - R * 0.25] : [top - R * 0.95, cz - R * 1.12];
        parts.push([place(new THREE.SphereGeometry(R * 0.42, 16, 12), 0, knot[0], knot[1]), hair]);
        if (hat === 'braid') for (let i = 0; i < 6; i++) parts.push([place(new THREE.SphereGeometry(R * (0.24 - i * 0.022), 12, 8), 0, top - R * (1.45 + i * 0.4), cz - R * (1.12 + i * 0.03)), hair]);
        parts.push([place(new THREE.TorusGeometry(R * 0.3, R * 0.06, 8, 20), 0, knot[0] - (hat === 'topknot' ? R * 0.2 : 0), knot[1] + (hat === 'topknot' ? 0 : R * 0.3), hat === 'topknot' ? Math.PI / 2 : 0.1), metal(GOLD)]);
      }
      if (hat === 'band') parts.push([place(new THREE.TorusGeometry(R * 1.04, R * 0.06, 8, 40), 0, top - R * 0.7, cz, Math.PI / 2 + 0.12, 0, 0, [1, 1.12, 1]), metal(GOLD)]);
      if (hat === 'beak') {
        parts.push([place(new THREE.SphereGeometry(R * 1.14, 28, 12, 0, TAU, 0, Math.PI / 2), 0, top - R * 0.75, cz, 0, 0, 0, [1, 1.05, 1.1]), metal('#b0322a')]);
        parts.push([place(new THREE.ConeGeometry(R * 0.28, R * 0.9, 12), 0, top - R * 0.62, front + R * 0.3, Math.PI / 2 + 0.25), metal(GOLD)]);
        for (let i = 0; i < 7; i++) parts.push([place(new THREE.ConeGeometry(R * 0.1, R * 1.2, 6), 0, top + R * 0.25, cz - R * (0.3 + i * 0.2), -0.55 - i * 0.16), cloth(i % 2 ? '#e8b640' : '#d6352c')]);
      }
      // Facial hair sits on the sculpted upper lip and jaw.
      const facial = flat('#1c1410'), lip = top - R * 1.93;
      if (look.mustache || look.beard) { parts.push([place(new THREE.TorusGeometry(R * 0.3, R * 0.07, 8, 16, Math.PI), 0, lip, front - R * 0.22, -0.2, 0, Math.PI, [1.15, 0.5, 1]), facial]); for (const sx of [-1, 1]) parts.push([place(new THREE.SphereGeometry(R * 0.07, 8, 6), sx * R * 0.36, lip + R * 0.05, front - R * 0.3), facial]); }
      if (look.beard) parts.push([place(new THREE.SphereGeometry(R * 0.72, 20, 12, 0, Math.PI, Math.PI * 0.5, Math.PI * 0.45), 0, lip + R * 0.02, cz + R * 0.12, 0, 0, 0, [1.08, 1.05, 1.02]), facial]);
      for (const [geo, d] of parts) wear(this.pin(geo, head.index), d);
    }
    // Shell fur: six offset copies of the skinned body with a sparse strand mask, thinning outward.
    if (look.fur) {
      const strands = furTexture();
      for (let i = 1; i <= 5; i++) {
        const m = new THREE.MeshStandardMaterial({ color: new THREE.Color('#eef3f6').multiplyScalar(0.7 + i * 0.05), alphaMap: strands, alphaTest: 0.2 + i * 0.12, roughness: 1, side: THREE.DoubleSide });
        const off = (i * 0.009).toFixed(4); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>\n  transformed += normalize(objectNormal) * ${off};`); };
        m.customProgramCacheKey = () => `fur${i}`;
        const shell = new THREE.SkinnedMesh(body.geometry, m); shell.bind(body.skeleton, body.bindMatrix); shell.frustumCulled = false; add(shell);
      }
      if (head) { const hb = headBox(body, head.index), R = (hb.max.x - hb.min.x) / 2, horn = flat('#d9cfb8'); for (const sx of [-1, 1]) { const geo = new THREE.ConeGeometry(R * 0.2, R * 1.1, 10); geo.rotateZ(-sx * 0.9); geo.translate(sx * R * 1.1, hb.max.y - R * 0.3, (hb.min.z + hb.max.z) / 2); wear(this.pin(geo, head.index), horn); } }
    }
    const mats = kit(look.hero);
    for (const kind of ['cloth', 'flat', 'metal']) if (outfit[kind].length) { const m = new THREE.SkinnedMesh(mergeGeometries(outfit[kind]), mats[kind]); m.bind(body.skeleton, body.bindMatrix); m.frustumCulled = false; m.name = `outfit:${kind}`; add(m); }
    // Weapons and gear ride the hands and spine as ordinary children of their bones.
    // Hand bones: +Y runs along the fingers, +Z along the thumb; the palm faces -X (right) or +X (left).
    // A prop's +Y is its business end; it is laid along the thumb, tipped toward the elbow for a natural carry.
    const gear = [], k = height / 1.8;
    const hand = side => this.boneBind(body, new RegExp(`^hand_${side}$`, 'i'));
    const attach = (bind, object, offset, quaternion) => { if (!bind) return; const pivot = new THREE.Group(); pivot.position.copy(offset); pivot.quaternion.copy(quaternion); pivot.add(object); gear.push({ bone: bind.bone, pivot }); };
    const grip = (side, tilt = 0.45, roll = 0) => { const dir = V(0, -Math.sin(tilt), Math.cos(tilt)).normalize(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir); if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), roll)); return q; };
    const palm = side => V((side === 'r' ? -1 : 1) * 0.028 * k, 0.085 * k, 0.005 * k);
    const props = { spear: () => spear(height), talwar: () => talwar(height), shield: () => shield(height, TEAL, false), sunshield: () => shield(height, TEAL, true), bow: () => bow(height, GOLD), longbow: () => bow(height * 1.15, '#3a2c24'), mallet: () => mallet(height, 1), bigmallet: () => mallet(height, 1.35), pick: () => pick(height), staff: () => staff(height), chakram: () => chakram(height), parasol: () => parasol(height), falcon: () => falcon(height), boulder: () => boulder(height) };
    const tilts = { spear: 0.55, staff: 0.75, parasol: 0.8, talwar: 0.25, mallet: 0.35, bigmallet: 0.35, pick: 0.35, bow: 0.1, longbow: 0.1, chakram: 0 };
    for (const side of ['r', 'l']) {
      const item = side === 'r' ? look.right : look.left; if (!item || !props[item]) continue;
      if (item === 'shield' || item === 'sunshield') { attach(hand(side), props[item](), V((side === 'r' ? 1 : -1) * 0.07 * k, 0.02 * k, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side === 'r' ? Math.PI : 0))); continue; }
      if (item === 'falcon') { attach(hand(side), props[item](), V((side === 'r' ? 1 : -1) * 0.05 * k, 0.06 * k, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side === 'r' ? Math.PI / 2 : -Math.PI / 2))); continue; }
      attach(hand(side), props[item](), palm(side), grip(side, tilts[item] ?? 0.4));
    }
    if (look.carry) attach(hand('r'), props[look.carry](), V(-0.12 * k, 0.1 * k, 0.02 * k), new THREE.Quaternion());
    // Back gear is authored in body space; cancel the spine bone's bind rotation.
    const bodySpace = bind => { const q = new THREE.Quaternion(); bind.matrix.decompose(V(), q, V()); return q.invert(); };
    if (look.back === 'quiver' && spine) attach(spine, quiver(height), V(), bodySpace(spine));
    const wings = look.wings && spine ? [wing(height, 1), wing(height, -1)] : null;
    if (wings) for (const w of wings) attach(spine, w, V(), bodySpace(spine));
    result: {
      const root = new THREE.Group(); root.add(scene);
      const fit = (look.scale || 1) * 1.78 / height; scene.scale.multiplyScalar(fit);
      return { kind: 'human', scene: root, height: 1.78 * (look.scale || 1), look, gear, wings: !!wings, clipsBody: look.body, fur: !!look.fur };
    }
  }
  mountTemplate(id, look) {
    const src = look.mount === 'horse' ? this.src.horse : this.src.elephant, scene = cloneSkinned(src.scene);
    scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = true; o.material = o.material.clone(); o.material.roughness = 0.82; addRimLight(o.material, '#fff1d0', 0.22); } });
    const box = new THREE.Box3().setFromObject(scene), height = box.max.y - box.min.y, target = look.mount === 'horse' ? 2.15 : 3.5;
    scene.scale.multiplyScalar(target / height); scene.position.y -= box.min.y * target / height;
    const root = new THREE.Group(); root.add(scene);
    return { kind: look.mount, scene: root, height: target + (look.mount === 'horse' ? 0.35 : 0.5), look };
  }
  spawn(id, { hero = false } = {}) { return new RealActor(this, id, this.template(id), hero); }
}

// ---------------------------------------------------------------- props (bind-space, grip at origin)
const gold = () => new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.95, roughness: 0.28 });
const steel = () => new THREE.MeshStandardMaterial({ color: '#d7d9dc', metalness: 1, roughness: 0.22 });
const wood = () => new THREE.MeshStandardMaterial({ color: '#6b4428', roughness: 0.7 });
// Bake a prop's parts into at most two meshes (metal, matte) with vertex colours; glowing parts stay separate.
function group(...meshes) {
  const lists = { metal: [], matte: [] }, out = new THREE.Group();
  for (const m of meshes) {
    const mat = m.material; if (mat.emissiveIntensity > 0.5 && mat.emissive?.getHex()) { out.add(m); continue; }
    m.updateMatrix(); lists[mat.metalness > 0.5 ? 'metal' : 'matte'].push(tidy(m.geometry.clone().applyMatrix4(m.matrix), mat.color)); m.geometry.dispose(); mat.dispose();
  }
  for (const k of ['metal', 'matte']) if (lists[k].length) out.add(new THREE.Mesh(mergeGeometries(lists[k]), propMats()[k]));
  return out;
}
function mesh(geo, mat, p = [0, 0, 0], r = [0, 0, 0]) { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); return m; }
function spear(h) { const s = h / 1.78; return group(mesh(new THREE.CylinderGeometry(0.014 * s, 0.014 * s, 1.9 * s, 8), wood(), [0, 0.35 * s, 0]), mesh(new THREE.ConeGeometry(0.035 * s, 0.24 * s, 8), steel(), [0, 1.38 * s, 0]), mesh(new THREE.TorusGeometry(0.025 * s, 0.008 * s, 6, 12), gold(), [0, 1.24 * s, 0], [Math.PI / 2, 0, 0])); }
function talwar(h) { const s = h / 1.78, blade = new THREE.Shape(); blade.moveTo(0, 0); blade.quadraticCurveTo(0.05 * s, 0.45 * s, -0.06 * s, 0.82 * s); blade.lineTo(-0.02 * s, 0.84 * s); blade.quadraticCurveTo(0.09 * s, 0.45 * s, 0.035 * s, 0); blade.lineTo(0, 0); const geo = new THREE.ExtrudeGeometry(blade, { depth: 0.006 * s, bevelEnabled: true, bevelThickness: 0.003 * s, bevelSize: 0.003 * s, bevelSegments: 1 }); geo.translate(-0.017 * s, 0.06 * s, -0.003 * s); return group(mesh(geo, steel()), mesh(new THREE.CylinderGeometry(0.016 * s, 0.016 * s, 0.1 * s, 8), gold(), [0, 0, 0]), mesh(new THREE.BoxGeometry(0.13 * s, 0.018 * s, 0.03 * s), gold(), [0, 0.055 * s, 0]), mesh(new THREE.SphereGeometry(0.025 * s, 10, 8), gold(), [0, -0.06 * s, 0])); }
function shield(h, face, sun) { const s = h / 1.78, parts = [mesh(new THREE.CylinderGeometry(0.26 * s, 0.26 * s, 0.03 * s, 32), new THREE.MeshStandardMaterial({ color: face, roughness: 0.5, metalness: 0.3 }), [0, 0, 0], [0, 0, Math.PI / 2]), mesh(new THREE.TorusGeometry(0.26 * s, 0.018 * s, 8, 40), gold(), [0, 0, 0], [0, Math.PI / 2, 0]), mesh(new THREE.SphereGeometry(0.06 * s, 16, 10), gold(), [0.02 * s, 0, 0])]; if (sun) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; parts.push(mesh(new THREE.ConeGeometry(0.02 * s, 0.12 * s, 4), gold(), [0.018 * s, Math.cos(a) * 0.15 * s, Math.sin(a) * 0.15 * s], [a, 0, 0])); } const g = group(...parts); g.position.x = 0.06 * s; return g; }
function bow(h, color) {
  // A recurve bow gripped at its centre: limbs along +/-Y, belly toward -Z (the target), string on +Z.
  const s = h / 1.78, L = 0.62 * s, pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 12 - 1, y = t * L, z = -0.11 * s * (1 - t * t) + 0.035 * s * Math.pow(Math.abs(t), 6); pts.push(V(0, y, z + 0.11 * s)); }
  const limb = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.013 * s, 6), mat = new THREE.MeshStandardMaterial({ color, metalness: color === GOLD ? 0.9 : 0.1, roughness: 0.4 });
  const tip = pts.at(-1), string = mesh(new THREE.CylinderGeometry(0.0025 * s, 0.0025 * s, tip.y * 2, 4), new THREE.MeshStandardMaterial({ color: '#f1e8d0' }), [0, 0, tip.z]);
  return group(new THREE.Mesh(limb, mat), string, mesh(new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.1 * s, 8), new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.6 }), [0, 0, 0.11 * s]));
}
function mallet(h, k) { const s = h / 1.78 * k; return group(mesh(new THREE.CylinderGeometry(0.018 * s, 0.018 * s, 0.75 * s, 8), wood(), [0, 0.28 * s, 0]), mesh(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.26 * s, 20), gold(), [0, 0.66 * s, 0], [0, 0, Math.PI / 2])); }
function pick(h) { const s = h / 1.78; return group(mesh(new THREE.CylinderGeometry(0.016 * s, 0.016 * s, 0.75 * s, 8), wood(), [0, 0.28 * s, 0]), mesh(new THREE.ConeGeometry(0.03 * s, 0.4 * s, 6), steel(), [0.17 * s, 0.63 * s, 0], [0, 0, -Math.PI / 2 - 0.3]), mesh(new THREE.ConeGeometry(0.025 * s, 0.22 * s, 6), steel(), [-0.1 * s, 0.63 * s, 0], [0, 0, Math.PI / 2 + 0.3])); }
function staff(h) { const s = h / 1.78; return group(mesh(new THREE.CylinderGeometry(0.014 * s, 0.014 * s, 1.8 * s, 8), gold(), [0, 0.3 * s, 0]), mesh(new THREE.TorusGeometry(0.12 * s, 0.012 * s, 8, 24), gold(), [0, 1.3 * s, 0]), mesh(new THREE.SphereGeometry(0.06 * s, 16, 12), new THREE.MeshStandardMaterial({ color: '#7fe8d8', emissive: '#2a9d8f', emissiveIntensity: 1.4, roughness: 0.2 }), [0, 1.3 * s, 0])); }
function chakram(h) { const s = h / 1.78; return group(mesh(new THREE.TorusGeometry(0.15 * s, 0.014 * s, 8, 32), gold(), [0.12 * s, 0.02 * s, 0], [0, Math.PI / 2, 0])); }
function parasol(h) { const s = h / 1.78; return group(mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 1.35 * s, 8), gold(), [0, 0.5 * s, 0]), mesh(new THREE.ConeGeometry(0.46 * s, 0.18 * s, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#6fc3bd', side: THREE.DoubleSide, roughness: 0.7 }), [0, 1.22 * s, 0]), mesh(new THREE.TorusGeometry(0.455 * s, 0.01 * s, 6, 40), gold(), [0, 1.13 * s, 0], [Math.PI / 2, 0, 0])); }
function falcon(h) { const s = h / 1.78, white = new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.8 }), dark = new THREE.MeshStandardMaterial({ color: '#2d2a28', roughness: 0.8 }); return group(mesh(new THREE.SphereGeometry(0.06 * s, 16, 12), white, [0, 0.1 * s, 0], [0, 0, 0]), mesh(new THREE.SphereGeometry(0.04 * s, 12, 10), white, [0, 0.19 * s, 0.02 * s]), mesh(new THREE.ConeGeometry(0.012 * s, 0.035 * s, 6), gold(), [0, 0.185 * s, 0.065 * s], [Math.PI / 2, 0, 0]), mesh(new THREE.BoxGeometry(0.02 * s, 0.14 * s, 0.09 * s), dark, [0.055 * s, 0.1 * s, -0.01 * s], [0.3, 0, 0.25]), mesh(new THREE.BoxGeometry(0.02 * s, 0.14 * s, 0.09 * s), dark, [-0.055 * s, 0.1 * s, -0.01 * s], [0.3, 0, -0.25])); }
function boulder(h) { const s = h / 1.78; return group(mesh(new THREE.DodecahedronGeometry(0.2 * s, 1), new THREE.MeshStandardMaterial({ color: '#8f8c84', roughness: 0.95, flatShading: true }), [0, 0.12 * s, 0])); }
function quiver(h) { const s = h / 1.78, parts = [mesh(new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.5 * s, 12), new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.6 }), [0.06 * s, 0.05 * s, -0.16 * s], [0.25, 0, -0.35])]; for (let i = 0; i < 5; i++) parts.push(mesh(new THREE.ConeGeometry(0.018 * s, 0.08 * s, 4), new THREE.MeshStandardMaterial({ color: TEAL }), [0.13 * s + (i % 2) * 0.02 * s, 0.33 * s, -0.19 * s + (i - 2) * 0.012 * s], [0.25, 0, -0.35])); return group(...parts); }
function furTexture() {
  const c = canvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) { const v = 90 + Math.random() * 165 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 0.8 + Math.random() * 1.3, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); return t;
}
function feather(len, wid) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(wid, len * 0.45, wid * 0.25, len); sh.quadraticCurveTo(-wid * 0.6, len * 0.5, 0, 0); return new THREE.ShapeGeometry(sh, 6); }
function wing(h, side) {
  // A raptor wing: gold coverts over crimson secondaries and long indigo primaries fanning at the tip.
  const s = h / 1.78, parts = [], mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: c === GOLD ? 0.6 : 0.05, side: THREE.DoubleSide });
  const blue = mat('#1f3f7a'), red = mat('#c8372d'), goldM = mat(GOLD), arm = t => V(side * (0.08 + t * 0.95) * s, (0.12 + Math.sin(t * Math.PI) * 0.14 + t * 0.1) * s, -0.16 * s);
  const put = (geo, m, p, ang, z = 0) => { const f = new THREE.Mesh(geo, m); f.position.copy(p); f.position.z += z; f.rotation.z = ang; f.rotation.y = side * 0.12; parts.push(f); };
  for (let i = 0; i < 9; i++) { const t = 0.55 + i / 8 * 0.45, ang = Math.PI + side * (0.15 + i * 0.2); put(feather((0.42 + i * 0.03) * s, 0.06 * s), blue, arm(t), ang, -0.004 * i); }
  for (let i = 0; i < 10; i++) { const t = 0.05 + i / 9 * 0.55; put(feather((0.36 - i * 0.008) * s, 0.07 * s), red, arm(t), Math.PI + side * (0.05 + t * 0.2), 0.01); }
  for (let i = 0; i < 12; i++) { const t = 0.03 + i / 11 * 0.85; put(feather(0.16 * s, 0.06 * s), goldM, arm(t).add(V(0, 0.02 * s, 0)), Math.PI + side * (0.1 + t * 0.4), 0.02); }
  const bone = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.3, 0.6, 0.9, 1].map(arm)), 16, 0.022 * s, 6), goldM); parts.push(bone);
  const g = group(...parts); g.userData.side = side; return g;
}

// ---------------------------------------------------------------- actor
const _p = V(), _s = V(), _fwd = V(), _rq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _tq = new THREE.Quaternion();
// Rotate a bone about a world-space axis (its parent may be rotated arbitrarily).
function turnWorld(bone, axis, angle) { bone.parent.getWorldQuaternion(_pq).invert(); axis.applyQuaternion(_pq); bone.quaternion.premultiply(_tq.setFromAxisAngle(axis, angle)); }
export class RealActor {
  constructor(forge, id, template, hero) {
    this.forge = forge; this.id = id; this.template = template; this.hero = hero; this.realistic = true;
    this.root = new THREE.Group(); this.root.name = `actor:${id}`; this.root.userData.actor = this; this.root.userData.visualHeight = template.height;
    this.bp = { height: template.height, kind: template.kind === 'human' ? 'biped' : template.kind, flying: !!template.look.flying };
    this.flying = this.bp.flying; this.action = 'idle'; this.attackT = 0; this.move = 0; this.last = null; this.cheer = 0; this.dead = 0; this.flinch = 0; this.flinchV = 0; this.time = Math.random() * 10;
    this.body = this.instance(template); this.root.add(this.body.object);
    if (template.kind !== 'human') {
      // Mount and rider (a mahout on the elephant's neck and an archer in the howdah).
      // Seat bones are authored Z-up, so each holder cancels the bone's rotation and scale.
      const seats = template.kind === 'horse' ? [['prop_rider', template.look.rider]] : [['prop-rider', template.look.rider], ['prop-rider2', template.look.howdah]];
      const bones = new Map(); this.body.object.traverse(o => { if (o.isBone || o.type === 'Object3D') bones.set(o.name, o); });
      this.body.object.updateMatrixWorld(true); this.riders = [];
      for (const [name, riderId] of seats) {
        const seat = bones.get(name); if (!seat || !riderId) continue;
        const rider = this.instance(forge.template(riderId), { seated: true }), holder = new THREE.Group(), q = new THREE.Quaternion(), sc = V(), pos = V();
        seat.matrixWorld.decompose(pos, q, sc); holder.quaternion.copy(q.invert()); holder.scale.set(1 / sc.x, 1 / sc.y, 1 / sc.z);
        rider.object.position.set(0, template.kind === 'horse' ? -0.62 : -0.5, template.kind === 'horse' ? -0.12 : 0); seat.add(holder); holder.add(rider.object); this.riders.push(rider);
      }
      this.rider = this.riders[0] || null;
    }
  }
  instance(template, { seated = false } = {}) {
    const object = cloneSkinned(template.scene); const mixer = new THREE.AnimationMixer(object);
    const clips = template.kind === 'human' ? this.forge.clips : this.forge.mountClips[template.kind];
    const find = name => clips.get(name) || clips.get('Idle_Loop') || clips.get('Idle');
    const look = template.look, human = template.kind === 'human';
    const names = human ? { idle: seated ? 'Driving_Loop' : look.clips?.idle || 'Idle_Loop', walk: look.clips?.walk || 'Walk_Loop', run: look.clips?.run || 'Jog_Fwd_Loop', attack: look.clips?.attack?.[0] || 'Sword_Attack', hit: 'Hit_Chest', death: 'Death01', cheer: 'Dance_Loop' } : { idle: 'Idle', walk: 'Walk', run: 'Run', attack: 'Attack', hit: 'Idle', death: 'Death', cheer: 'Idle' };
    const actions = {}, used = new Set(); for (const [k, n] of Object.entries(names)) { let clip = find(n); if (used.has(clip)) clip = clip.clone(); used.add(clip); const a = mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(k === 'idle' ? 1 : 0); a.play(); actions[k] = a; }
    actions.death.setLoop(THREE.LoopOnce, 1); actions.death.clampWhenFinished = true; actions.death.stop();
    actions.attack.paused = true; mixer.setTime(Math.random() * 3);
    const hitFrac = human ? (look.clips?.attack?.[1] ?? 0.45) : 0.5;
    // Gear: re-parent the template pivots onto this clone's bones.
    const byName = new Map(); object.traverse(o => { if (o.isBone) byName.set(o.name, o); });
    for (const g of template.gear || []) { const bone = byName.get(g.bone.name); if (bone) bone.add(g.pivot.clone()); }
    const wings = []; if (template.wings) object.traverse(o => { if (o.userData?.side) wings.push(o); });
    let cape = null; if (look.cape && !seated) cape = new ClothStrip({ columns: 4, rows: 6, width: 0.42, length: 0.95, color: look.cape.color, trim: GOLD });
    return { object, mixer, actions, weights: { idle: 1, walk: 0, run: 0, attack: 0, cheer: 0 }, hitFrac, bones: byName, wings, cape, seated, human };
  }
  parts() { return this.riders ? [this.body, ...this.riders] : [this.body]; }
  get cape() { return this.body.cape; }
  setAction(action, progress = null) { this.action = action; if (progress != null) this.attackT = progress; }
  hit(strength = 1) { if (!this.dead) this.flinchV += 9 * strength; }
  celebrate() { this.cheer = 1; }
  die() { if (this.dead) return; this.dead = 0.0001; for (const part of this.parts()) { if (!part) continue; const d = part.actions.death; d.reset(); d.setEffectiveWeight(1); d.play(); for (const k of ['idle', 'walk', 'run', 'attack', 'cheer']) part.weights[k] = 0; } }
  update(dt, time, reduced = false) {
    this.time += dt;
    const p = this.root.getWorldPosition(_p), scale = this.root.getWorldScale(_s).x || 1;
    let speed = 0; if (this.last) speed = Math.hypot(p.x - this.last.x, p.z - this.last.z) / Math.max(dt, 1e-4) / scale; this.last = (this.last || V()).copy(p);
    const moving = speed > 0.08 && speed < 30 && !this.dead;
    this.move += ((moving ? 1 : 0) - this.move) * (1 - Math.exp(-dt * (moving ? 10 : 6)));
    if (this.cheer) this.cheer = Math.max(0, this.cheer - dt * 0.12);
    if (this.dead) this.dead = Math.min(1, this.dead + dt);
    this.flinchV += (-this.flinch * 160 - this.flinchV * 14) * dt; this.flinch += this.flinchV * dt;
    for (const part of this.parts()) if (part) this.drive(part, dt, speed, reduced);
  }
  drive(part, dt, speed, reduced) {
    const a = part.actions, w = part.weights, attacking = (this.action === 'attack' || this.action === 'heal') && !this.dead;
    const human = part.human, runSpeed = human ? 2.4 : this.bp.kind === 'horse' ? 3.2 : 2.2, stride = human ? 1.15 : this.bp.kind === 'horse' ? 1.6 : 1.1;
    const run = speed > runSpeed, cheer = this.cheer > 0 && !this.dead && !part.seated;
    const target = this.dead ? {} : part.seated ? { idle: 1 } : cheer ? { cheer: 1 } : attacking ? { attack: 1 } : this.move > 0.5 ? (run ? { run: 1 } : { walk: 1 }) : { idle: 1 };
    const k = 1 - Math.exp(-dt * 10);
    for (const key of ['idle', 'walk', 'run', 'attack', 'cheer']) { w[key] += ((target[key] || 0) - w[key]) * k; a[key].setEffectiveWeight(w[key]); }
    // Locomotion clips play at the speed the actor actually covers ground.
    if (!part.seated) { a.walk.timeScale = Math.max(0.5, Math.min(2.2, speed / stride)); a.run.timeScale = Math.max(0.7, Math.min(2, speed / (stride * 2.2))); }
    // The blow lands exactly when the rules' attack clock wraps.
    const clip = a.attack.getClip(); a.attack.time = (((this.attackT - 1 + part.hitFrac) % 1 + 1) % 1) * clip.duration;
    part.mixer.update(reduced && !this.dead && w.attack < 0.1 ? dt * 0.5 : dt);
    // Additive touches after the mix: flinch, flapping wings.
    const spine = part.bones.get('spine_02'); if (spine && this.flinch) spine.rotation.x -= this.flinch * 0.3;
    // A seated rider straddles the mount: thighs spread and drop around its back.
    if (part.seated && part.human) { const rq = this.root.getWorldQuaternion(_rq); for (const [n, sgn] of [['thigh_l', 1], ['thigh_r', -1]]) { const b = part.bones.get(n); if (!b) continue; turnWorld(b, _fwd.set(0, 1, 0), sgn * 0.42); turnWorld(b, _fwd.set(1, 0, 0).applyQuaternion(rq), 0.75); } }
    for (const wing of part.wings) wing.rotation.z = wing.userData.side * (reduced ? 0.2 : Math.sin(this.time * 7.5) * 0.7);
  }
  capeAnchors(a, b) {
    const spine = this.body.bones.get('spine_03'); if (!spine || !this.body.cape) return false;
    spine.updateWorldMatrix(true, false); const s = this.root.getWorldScale(_s).x;
    a.set(0.13, 0.12, -0.1).applyMatrix4(spine.matrixWorld); b.set(-0.13, 0.12, -0.1).applyMatrix4(spine.matrixWorld);
    if (!Number.isFinite(a.x)) return false; void s; return true;
  }
  capeSpheres() { const out = []; for (const n of ['spine_02', 'spine_03', 'pelvis', 'thigh_l', 'thigh_r']) { const bone = this.body.bones.get(n); if (bone) out.push({ center: bone.getWorldPosition(V()), radius: (n.startsWith('spine') ? 0.2 : 0.1) * this.root.getWorldScale(_s).x }); } return out; }
  dispose() { for (const part of this.parts()) { if (!part) continue; part.mixer.stopAllAction(); part.mixer.uncacheRoot(part.object); part.object.traverse(o => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); part.cape?.dispose(); } this.root.parent?.remove(this.root); }
}
