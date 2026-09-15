import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {prepareGroundedModel,stepGroundedMotion,groundGaitSnapshot,footCycle} from '../src/grounded-motion.js';
import {KingdomView,wallVisualScale,TROOP_GROUND_Y} from '../src/view.js';
const loader=new GLTFLoader();
const load=async path=>{const b=fs.readFileSync(new URL(path,import.meta.url));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
for(const id of ['guard','archer','engineer','healer','miner','bowler','yeti','rider','elephant','veer','tara']){
  const {scene}=await load(`../assets/${['veer','tara'].includes(id)?'heroes':'units'}/${id}.glb`);
  assert.equal(prepareGroundedModel(scene,id),true,`${id}: source supports a grounded rig`);
  assert.ok(scene.userData.groundGait.assigned>500,`${id}: boots and legs are bound`);
  const a=clone(scene),b=clone(scene);a.position.y=TROOP_GROUND_Y;
  assert.notEqual(a.getObjectByName('GroundHip0'),b.getObjectByName('GroundHip0'),'actors have independent bones');
  const samples=[];a.traverse(m=>{if(!m.isSkinnedMesh)return;assert.equal(m.geometry,b.getObjectByName(m.name).geometry,'actors share geometry');const ix=m.geometry.attributes.skinIndex;for(let i=0;i<ix.count;i++)if(ix.getX(i)>0&&ix.getX(i)%3===0)samples.push([m,i]);});
  let swingSeen=false,poseChanged=false;
  for(let frame=0;frame<100;frame++){
    stepGroundedMotion(a,.015,1/60,true);a.updateMatrixWorld(true);a.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
    const gait=groundGaitSnapshot(a);let soleMin=Infinity;
    for(const [mesh,i]of samples){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p).applyMatrix4(mesh.matrixWorld);soleMin=Math.min(soleMin,p.y);}
    assert.ok(soleMin>=TROOP_GROUND_Y-.006&&soleMin<=TROOP_GROUND_Y+.012,`${id}: at least one sole stays on the ground (${soleMin})`);
    for(const [i,leg]of gait.legs.entries())if(leg.planted)assert.ok(Math.abs(leg.foot[1]-(scene.userData.groundGait.legs[i].ankle[1]+TROOP_GROUND_Y))<.006,`${id}: stance ankle does not bob`);else swingSeen ||= leg.foot[1]>(scene.userData.groundGait.legs[i].ankle[1]+TROOP_GROUND_Y+.01);
    poseChanged ||= a.getObjectByName('GroundHip0').quaternion.angleTo(new THREE.Quaternion())>.05;
  }
  assert.ok(swingSeen&&poseChanged,`${id}: feet lift during swing and hip/knee joints articulate`);
  assert.equal(b.getObjectByName('GroundHip0').quaternion.angleTo(new THREE.Quaternion()),0,'animating one actor cannot move another');
  const settledWeight=groundGaitSnapshot(a).weight;stepGroundedMotion(a,0,1/60,true);
  assert.ok(groundGaitSnapshot(a).weight>=settledWeight-.00001,'a render frame between 30 Hz simulation ticks does not collapse the gait');
  const phase=groundGaitSnapshot(a).phase;for(let i=0;i<60;i++)stepGroundedMotion(a,0,1/60,false);
  assert.equal(groundGaitSnapshot(a).phase,phase,'stationary troops never walk in place');
  assert.equal(a.getObjectByName('GroundHip0').quaternion.angleTo(new THREE.Quaternion()),0,'idle returns to its authored rest pose');
}
const garuda=await load('../assets/units/garuda.glb');assert.equal(prepareGroundedModel(garuda.scene,'garuda'),false);assert.ok(garuda.animations.some(c=>c.tracks.some(t=>t.name.includes('Wing'))),'intentional flying wing animation is retained');
// On a planted segment, root travel and the foot movement cancel exactly.
const stride=.9,cycleDistance=stride/.6,distance=.04,from=footCycle(.2,stride,.1),to=footCycle(.2+distance/cycleDistance,stride,.1);
assert.equal(from.y,0);assert.equal(to.y,0);assert.ok(Math.abs(to.z-from.z+distance)<1e-10);
// The same presentation scale applies to the existing levels and never mutates rules.
for(const level of [1,8,15]){
  const {scene}=await load(level===1?'../assets/buildings/wall.glb':`../assets/buildings/levels/wall/${level}.glb`),original=new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  scene.scale.set(wallVisualScale.x,wallVisualScale.y,wallVisualScale.z);const smaller=new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());assert.ok(Math.abs(smaller.y/original.y-.58)<.00001);assert.ok(smaller.x<original.x&&smaller.z<original.z);
}
// Labels stay screen upright and do not inherit a flinch or camera shake.
const camera=new THREE.OrthographicCamera(-20,20,12,-12,.1,200),labelCamera=camera.clone(),el={hidden:false,style:{}},building={position:new THREE.Vector3(),userData:{asset:'farm',building:{x:9,z:11,w:3,h:3,type:'farm'}}},bar=new THREE.Group();
const view=Object.create(KingdomView.prototype);globalThis.devicePixelRatio=2;Object.assign(view,{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:844,height:390})},camera,labelCamera,labels:new Map([['farm',el]]),buildings:new Map([['farm',building]]),modelTops:{farm:2},unitBars:new Map([['unit',bar]])});
for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
 camera.position.set(Math.sin(angle)*50,60,Math.cos(angle)*50);camera.lookAt(0,0,0);camera.updateMatrixWorld();labelCamera.copy(camera);view.positionWorldLabels();const stable=el.style.transform;
 assert.match(stable,/^translate3d\([-\d.]+px,[-\d.]+px,0\) translate\(-50%,-100%\)$/);
 building.position.set(.6,.3,-.6);camera.position.x+=.8;camera.updateMatrixWorld();view.positionWorldLabels();assert.equal(el.style.transform,stable,'screen labels ignore impact and shake offsets');assert.ok(bar.quaternion.angleTo(camera.quaternion)<1e-6,'unit health remains camera-facing');
}
console.log('PASS: 11 grounded Blender troop/hero rigs, independent skeletons/shared geometry, planted soles, distance-driven gait, idle settling, Garuda flight, proportional wall levels, and upright shake-stable labels.');
