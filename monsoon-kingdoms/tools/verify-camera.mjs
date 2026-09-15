import assert from 'node:assert/strict';
import * as THREE from 'three';
import { KingdomView } from '../src/view.js';
import { cameraLimits,villageFocus } from '../src/camera-framing.js';
for(const [w,h] of [[568,320],[844,390],[1280,440],[1920,1080]]){
  const limits=cameraLimits('home',w/h);assert.ok(limits.start<43);assert.ok(limits.max*w/h<=80+.001);
  globalThis.innerWidth=w;globalThis.innerHeight=h;
  const view=Object.create(KingdomView.prototype);Object.assign(view,{mode:'home',span:160,target:new THREE.Vector3(100,0,-100),angle:Math.PI/4,camera:new THREE.OrthographicCamera(),buildings:new Map()});
  view.updateCamera();assert.equal(view.span,limits.max);assert.equal(view.target.x,limits.pan);assert.equal(view.target.z,-limits.pan);
  view.span=1;view.updateCamera();assert.equal(view.span,limits.min);
  view.cameraAction('reset');assert.equal(view.span,limits.start);assert.equal(view.target.length(),0);
  view.mode='battle';view.cameraAction('reset');assert.equal(view.span,57,'battle still has deployment overview');
}
assert.deepEqual(villageFocus([{x:4,z:8,w:4,h:4}]),{x:-12,z:-4});
assert.deepEqual(villageFocus([]),{x:0,z:0});
const view=Object.create(KingdomView.prototype);Object.assign(view,{models:{},scene:new THREE.Scene(),homeHero:null});view.setHomeHero(null);assert.equal(view.homeHero,null);
console.log('PASS: tighter phone framing, bounded pan/zoom, village centering, battle overview and locked home hero.');
