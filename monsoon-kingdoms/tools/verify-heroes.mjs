// Native runtime-loader checks for original heroes and the new crewed elephant.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { GLTFLoader } from '../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { Box3 } from '../../node_modules/three/build/three.module.js';
const assets = new URL('../assets/', import.meta.url);
const result = [];
for (const [id, folder, budget, name] of [
  ['veer', 'heroes', 18000, 'Veer the Lion Commander'],
  ['tara', 'heroes', 18000, 'Tara the Monsoon Ranger'],
  ['elephant', 'units', 25000, 'Guardian elephant with mahout and howdah archer']
]) {
  const bytes = fs.readFileSync(new URL(`${folder}/${id}.glb`, assets));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const bounds = new Box3().setFromObject(gltf.scene);
  let triangles = 0;
  const materials = new Set();
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    assert(o.geometry.getAttribute('normal'), `${id}: missing normals`);
    triangles += o.geometry.index.count / 3;
    materials.add(o.material.uuid);
  });
  assert(Math.abs(bounds.min.y) < .005, `${id}: ground anchor`);
  assert(Math.abs(bounds.min.x + bounds.max.x) < .01, `${id}: X centered`);
  assert(Math.abs(bounds.min.z + bounds.max.z) < .01, `${id}: Z centered`);
  assert(triangles > 0 && triangles <= budget, `${id}: triangle budget`);
  assert(materials.size <= 5, `${id}: material budget`);
  assert.equal(gltf.scene.getObjectByName(id)?.userData.identity, name);
  assert.equal(gltf.animations.length, 0, `${id}: static root-motion asset`);
  if (folder === 'heroes') assert(bounds.max.y >= 1.8 && bounds.max.y <= 2.01, `${id}: 1.8–2m hero height`);
  result.push({ id, name, triangles, materials: materials.size, bytes: bytes.length, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, passed: true });
}
fs.writeFileSync(new URL('heroes/validation.json', assets), JSON.stringify({ method: 'Native Three.js GLTFLoader round trip; static geometry, normals, identity, bounds, material and triangle budgets', assets: result }, null, 2));
console.log(`PASS: ${result.length} hero/crewed-elephant exports, ${result.reduce((sum, row) => sum + row.triangles, 0)} triangles total.`);
