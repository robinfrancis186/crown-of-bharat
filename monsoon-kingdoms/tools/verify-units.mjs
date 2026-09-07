// Run: node monsoon-kingdoms/tools/verify-units.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { GLTFLoader } from '../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, AnimationMixer } from '../../node_modules/three/build/three.module.js';
const assets = new URL('../assets/', import.meta.url);
const result = [];
const reinforcementIds = new Set(['bowler', 'miner', 'yeti', 'garuda']);
for (const [kind, ids] of [['units', ['guard', 'archer', 'engineer', 'rider', 'elephant', 'healer', 'bowler', 'miner', 'yeti', 'garuda']], ['environment', ['banyan', 'palm', 'rocks', 'bush', 'cart', 'jars']]]) {
  for (const id of ids) {
    const bytes = fs.readFileSync(new URL(`${kind}/${id}.glb`, assets));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const bounds = new Box3().setFromObject(gltf.scene);
    let triangles = 0, meshes = 0;
    const materials = new Set();
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      meshes++; triangles += o.geometry.index.count / 3; materials.add(o.material.uuid);
      assert(o.geometry.getAttribute('normal'), `${id}: missing normals`);
    });
    assert(Math.abs(bounds.min.y) < .005, `${id}: feet at ${bounds.min.y}`);
    assert(Math.abs(bounds.min.x + bounds.max.x) < .01, `${id}: X center`);
    assert(Math.abs(bounds.min.z + bounds.max.z) < .01, `${id}: Z center`);
    assert(materials.size <= (reinforcementIds.has(id) ? 6 : id === 'elephant' ? 5 : kind === 'units' ? 4 : 6), `${id}: material budget`);
    assert(triangles <= (reinforcementIds.has(id) ? 22000 : id === 'elephant' ? 25000 : kind === 'units' ? 12000 : 18000), `${id}: geometry budget`);
    assert(meshes > 0 && gltf.scene.getObjectByName(id), `${id}: named mesh root`);
    if (reinforcementIds.has(id)) {
      const clip = gltf.animations.find(a => a.name === 'Idle');
      assert(clip && clip.tracks.length > 0 && Math.abs(clip.duration - 2) < .001, `${id}: two-second Idle clip`);
      const node = gltf.scene.getObjectByName(clip.tracks[0].name.split('.')[0]);
      const rest = node.quaternion.clone();
      const mixer = new AnimationMixer(gltf.scene); mixer.clipAction(clip).play(); mixer.setTime(.5);
      assert(node.quaternion.angleTo(rest) > .02, `${id}: joint actually animates`);
      assert(Math.abs(new Box3().setFromObject(gltf.scene).min.y) < .005, `${id}: animated ground anchor`);
      mixer.setTime(2);
      assert(node.quaternion.angleTo(rest) < .001, `${id}: seamless loop returns to rest`);
      mixer.stopAllAction();
    }
    result.push({ animations: gltf.animations.map(a => ({ name: a.name, duration: a.duration, tracks: a.tracks.length })), id, kind, bytes: bytes.length, triangles, materials: materials.size, meshes, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, passed: true });
  }
}
fs.writeFileSync(new URL('units/validation.json', assets), JSON.stringify({ method: 'Native Three.js GLTFLoader round trip: normals, bounds, centering, geometry and material budgets, named root', assets: result }, null, 2));
console.log(`PASS: ${result.length} Blender exports; ${result.reduce((n, a) => n + a.triangles, 0)} triangles total.`);
