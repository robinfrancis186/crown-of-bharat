import assert from 'node:assert/strict';
import { KingdomView } from '../src/view.js';

const view = Object.create(KingdomView.prototype);
const disposed = new Map();
let textureDisposals = 0;
const sharedTexture = { dispose() { textureDisposals++; } };
Object.assign(view, {
  models: {}, animations: {}, modelTops: {}, variantCache: new Map(),
  buildings: new Map(), textures: { marble: { basecolor: sharedTexture } },
});
function add(key) {
  const counters = { geometry: 0, material: 0 };
  disposed.set(key, counters);
  const geometry = { dispose() { counters.geometry++; } };
  const material = { map: sharedTexture, normalMap: sharedTexture, dispose() { counters.material++; } };
  view.models[key] = { traverse(visit) { visit({ geometry, material }); } };
  view.animations[key] = []; view.modelTops[key] = 3;
  view.variantCache.set(key, true);
}
assert.equal(view.buildingAsset('fort', 1), 'fort');
assert.equal(view.buildingAsset('fort', 15), 'fort_15');
assert.equal(view.buildingAsset('hero_hall', 15), 'hero_hall_15');

// Even the oldest entries must survive when displayed or requested by a building.
for (const key of ['fort_2', 'wall_15', 'farm_15']) add(key);
view.buildings.set('capital', { userData: { asset: 'fort_2', wanted: 'farm_15' } });
view.buildings.set('wall', { userData: { asset: 'wall_15', wanted: 'wall_15' } });
for (let i = 0; i < 20; i++) add(`spare_${i}`);
view.trimModelCache();
assert.equal(view.variantCache.size, 19, 'three protected models plus sixteen spare models');
for (const key of ['fort_2', 'wall_15', 'farm_15']) {
  assert.ok(view.models[key], `protected ${key} retained`);
  assert.deepEqual(disposed.get(key), { geometry: 0, material: 0 });
}
for (let i = 0; i < 20; i++) {
  const key = `spare_${i}`, evicted = i < 4;
  assert.equal(key in view.models, !evicted, 'evict oldest spare first');
  assert.equal(key in view.animations, !evicted);
  assert.equal(key in view.modelTops, !evicted);
  assert.equal(view.variantCache.has(key), !evicted);
  assert.deepEqual(disposed.get(key), { geometry: +evicted, material: +evicted });
}
view.trimModelCache();
assert.equal(view.variantCache.size, 19, 'repeat trim does not evict extra entries');
assert.equal(textureDisposals, 0, 'shared global texture maps remain alive');

// The sixteen-spare limit must never become a sixteen-total-model limit.
for (let i = 0; i < 25; i++) {
  const key = `displayed_${i}`; add(key);
  view.buildings.set(key, { userData: { asset: key, wanted: key } });
}
view.trimModelCache();
assert.equal(view.variantCache.size, 44);
for (let i = 0; i < 25; i++) assert.deepEqual(disposed.get(`displayed_${i}`), { geometry: 0, material: 0 });
assert.equal(textureDisposals, 0);
console.log('PASS: level asset paths; cache retains displayed/wanted models plus 16 newest spare models, disposes evicted geometry/materials once, and preserves shared textures.');

// A tier requested by multiple buildings must download once; failures retry safely.
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const THREE = await import('three');
const originalLoad = GLTFLoader.prototype.loadAsync;
const originalDispatch = globalThis.dispatchEvent;
const notices = [];
globalThis.dispatchEvent = event => { notices.push(event.detail); return true; };
const lazy = Object.create(KingdomView.prototype);
Object.assign(lazy, { models: {}, animations: {}, modelTops: {}, modelLoads: new Map(), modelFailures: new Map(), variantCache: new Map(), detailModel() {} });
let downloads = 0, resolve;
const scene = new THREE.Group();
scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial()));
try {
  GLTFLoader.prototype.loadAsync = () => { downloads++; return new Promise(done => { resolve = done; }); };
  const first = lazy.preloadBuilding('fort', 15), second = lazy.preloadBuilding('fort', 15);
  assert.equal(downloads, 1); assert.equal(lazy.modelLoads.size, 1);
  resolve({ scene, animations: [] }); await Promise.all([first, second]);
  assert.equal(lazy.models.fort_15, scene); assert.equal(lazy.modelLoads.size, 0);
  assert.equal(lazy.modelTops.fort_15, 1);
  await lazy.preloadBuilding('fort', 15); assert.equal(downloads, 1, 'cached model reuses geometry');
  GLTFLoader.prototype.loadAsync = async () => { downloads++; throw new Error('temporary offline'); };
  await assert.rejects(lazy.preloadBuilding('farm', 14), /temporary offline/);
  assert.equal(lazy.modelLoads.size, 0); assert.deepEqual(notices, [{ type: 'farm', level: 14 }]);
  await lazy.preloadBuilding('farm', 14); assert.equal(downloads, 2, 'failed request is throttled');
  lazy.modelFailures.set('farm_14', Date.now() - 31000);
  GLTFLoader.prototype.loadAsync = async () => { downloads++; return { scene, animations: [] }; };
  await lazy.preloadBuilding('farm', 14);
  assert.equal(downloads, 3); assert.equal(lazy.models.farm_14, scene); assert.equal(lazy.modelFailures.size, 0);
  await lazy.preloadBuilding('fort', 1); await lazy.preloadBuilding('fort', 16);
  assert.equal(downloads, 3, 'base and out-of-range tiers are not fetched');
} finally {
  GLTFLoader.prototype.loadAsync = originalLoad;
  if (originalDispatch === undefined) delete globalThis.dispatchEvent; else globalThis.dispatchEvent = originalDispatch;
  scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
}
console.log('PASS: lazy tier loads deduplicate, reuse models, throttle failures and recover on retry.');

const collectionView=Object.create(KingdomView.prototype);
Object.assign(collectionView,{mode:'home',scene:new THREE.Scene(),effects:[],modelTops:{},quality:'balanced',reducedMotion:false});
const producer={type:'farm',level:1,x:5,z:15,w:3,h:3};
collectionView.collectionFeedback(producer,{grain:0,coin:NaN,unknown:10});
assert.equal(collectionView.effects.length,0,'invalid or empty collections create no effects');
collectionView.collectionFeedback(producer,{grain:20});
assert.equal(collectionView.effects.length,6);
let disposedParticles=0;
for(const effect of collectionView.effects){effect.mesh.geometry.addEventListener('dispose',()=>disposedParticles++);effect.mesh.material.addEventListener('dispose',()=>disposedParticles++);}
collectionView.stepEffects(2);
assert.equal(collectionView.effects.length,0);assert.equal(collectionView.scene.children.length,0);assert.equal(disposedParticles,12);
collectionView.reducedMotion=true;collectionView.collectionFeedback(producer,{grain:20});
assert.equal(collectionView.effects.length,1);
const startPosition=collectionView.effects[0].mesh.position.clone();collectionView.stepEffects(.5);
assert.ok(collectionView.effects[0].mesh.position.equals(startPosition),'reduced-motion collection stays stationary');
collectionView.stepEffects(2);
console.log('PASS: collection effects validate amounts, respect reduced motion and release their GPU resources.');
