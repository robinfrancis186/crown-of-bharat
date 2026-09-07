#!/usr/bin/env node
// Native loader validation for all fifteen building families and fifteen tiers.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CATALOG, MAX_BUILDING_LEVEL } from '../src/rules.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const budgets = { fort: 40000, archer_tower: 30000, market: 30000, barracks: 26000, stepwell: 22000, hero_hall: 22000, laboratory: 18000, wall: 7000 };
const report = [], loader = new GLTFLoader();
for (const [type, spec] of Object.entries(CATALOG)) {
  const familyHashes = new Set(); let previousHash = null;
  for (let level = 1; level <= MAX_BUILDING_LEVEL; level++) {
    const stem = level === 1 ? `assets/buildings/${type}` : `assets/buildings/levels/${type}/${level}`;
    const bytes = await readFile(path.join(root, `${stem}.glb`));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF', `${stem}: GLB signature`);
    assert.equal(bytes.readUInt32LE(8), bytes.length, `${stem}: complete GLB`);
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    gltf.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(gltf.scene), size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
    assert.ok(Math.abs(box.min.y) <= .005, `${stem}: floor ${box.min.y}`);
    assert.ok(Math.abs(center.x) <= .005 && Math.abs(center.z) <= .005, `${stem}: X/Z center`);
    assert.ok(size.x <= spec.w * 2 + .005 && size.z <= spec.h * 2 + .005, `${stem}: footprint overflow ${size.toArray()}`);
    assert.ok(size.x > 0 && size.z > 0 && size.y >= .4, `${stem}: solid architectural volume`);
    let triangles = 0, meshes = 0;
    const materials = new Set(), vertices = new Set(), point = new Vector3();
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      const geometry = object.geometry, position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
      assert.ok(position?.count > 0 && normal?.count === position.count, `${stem}: positions/normals`);
      triangles += (geometry.index?.count ?? position.count) / 3;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        assert.ok(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial, `${stem}: PBR material`);
        assert.ok(Number.isFinite(material.roughness) && Number.isFinite(material.metalness), `${stem}: valid material parameters`);
        materials.add(material.uuid);
      }
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        assert.ok([point.x, point.y, point.z, normal.getX(i), normal.getY(i), normal.getZ(i)].every(Number.isFinite), `${stem}: finite geometry`);
        // World-space positions ignore colors, material names, node order and metadata.
        vertices.add(`${point.x.toFixed(5)},${point.y.toFixed(5)},${point.z.toFixed(5)}`);
      }
    });
    assert.ok(meshes > 0 && meshes <= 3 && materials.size <= 3, `${stem}: draw-call/material budget (${meshes}/${materials.size})`);
    assert.ok(Number.isInteger(triangles) && triangles > 0 && triangles <= (budgets[type] || 18000), `${stem}: triangle budget ${triangles}`);
    const geometryHash = createHash('sha256').update([...vertices].sort().join('\n')).digest('hex');
    assert.notEqual(geometryHash, previousHash, `${type} levels ${level - 1}/${level} repeat geometry`);
    assert.ok(!familyHashes.has(geometryHash), `${type} level ${level} repeats an earlier tier geometry`);
    familyHashes.add(geometryHash); previousHash = geometryHash;
    const png = await readFile(path.join(root, `${stem}.png`));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${stem}: PNG signature`);
    assert.equal(png.readUInt32BE(16), 512, `${stem}: portrait width`); assert.equal(png.readUInt32BE(20), 512, `${stem}: portrait height`);
    report.push({ type, level, file: `${stem}.glb`, portrait: `${stem}.png`, triangles, meshes, materials: materials.size, bytes: bytes.length, bounds: { min: box.min.toArray(), max: box.max.toArray() }, geometryHash, png: [512, 512], passed: true });
    gltf.scene.traverse(object => { if (!object.isMesh) return; object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); });
  }
  console.log(`${type}: ${familyHashes.size} unique geometry tiers; native loader, bounds, budgets and 512px portraits PASS`);
}
assert.equal(report.length, Object.keys(CATALOG).length * MAX_BUILDING_LEVEL);
await mkdir(path.join(root, 'output'), { recursive: true });
await writeFile(path.join(root, 'output/verification-levels.json'), JSON.stringify({ method: 'Native Three.js GLTFLoader, unique world-space geometry across every tier, footprint/floor/PBR/draw-call/triangle checks and exact 512px PNG dimensions', count: report.length, assets: report }, null, 2) + '\n');
console.log(`PASS: ${report.length} building models and portraits across ${Object.keys(CATALOG).length} families; ${(report.reduce((sum, item) => sum + item.bytes, 0) / 1048576).toFixed(2)} MiB GLB data.`);
