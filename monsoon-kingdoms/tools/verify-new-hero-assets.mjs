import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {stepGroundedMotion} from '../src/grounded-motion.js';
for(const id of ['nila','ayaan','ira','kabir']){
 const b=fs.readFileSync(new URL(`../assets/heroes/${id}.glb`,import.meta.url));
 const {scene:source,animations}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 source.userData.groundGait=source.getObjectByName(id+'Rig').userData.groundGait;const scene=clone(source);
 assert.equal(animations.length,2);assert(animations.find(c=>c.name===id+'_Walk')?.tracks.length);
 let tris=0,skins=0;const soles=[];
 scene.traverse(o=>{if(!o.isSkinnedMesh)return;skins++;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.equal(o.skeleton.bones.length,7);const si=o.geometry.attributes.skinIndex;for(let i=0;i<si.count;i++){const bone=o.skeleton.bones[si.getX(i)];if(bone.name.startsWith('GroundFoot'))soles.push([o,i]);}});
 assert(tris<20000&&skins>0&&soles.length>40);
 const other=clone(scene);assert.notEqual(scene.getObjectByName('GroundHip0'),other.getObjectByName('GroundHip0'));
 for(let f=0;f<120;f++){
  assert(stepGroundedMotion(scene,.012,1/60,true));scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
  let low=Infinity;for(const [o,i]of soles){const p=o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld);low=Math.min(low,p.y);}
  assert(low>=-.006&&low<=.012,`${id} planted sole ${low}`);
 }
 assert.equal(other.getObjectByName('GroundHip0').quaternion.angleTo(new THREE.Quaternion()),0);
 const copy=clone(other),mix=new THREE.AnimationMixer(copy);mix.clipAction(animations.find(c=>c.name.endsWith('_Walk'))).play();mix.setTime(.1);const a=copy.getObjectByName('GroundHip0').quaternion.clone();mix.setTime(.3);assert(a.angleTo(copy.getObjectByName('GroundHip0').quaternion)>.03,'baked walk moves leg');
 for(let f=0;f<60;f++){mix.setTime(f/60);copy.updateMatrixWorld(true);let low=Infinity;copy.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const si=o.geometry.attributes.skinIndex;for(let i=0;i<si.count;i++){if(o.skeleton.bones[si.getX(i)].name.startsWith('GroundFoot'))low=Math.min(low,o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).y);}});assert(low>=-.007&&low<=.015,`${id} native baked clip planted sole ${low}`);}
 console.log(`${id}: ${tris} triangles; ${skins} skin material groups; seven bones; two clips; 120 grounded frames PASS`);
}

const manifest=JSON.parse(fs.readFileSync(new URL('../assets/heroes/manifest.json',import.meta.url)));
for(const id of ['nila','ayaan','ira','kabir']){
 const e=manifest.heroes.find(e=>e.id===id);
 assert.equal(typeof e.master,'string');assert.match(e.masterSha256,/^[a-f0-9]{64}$/);assert.deepEqual(e.masterDimensions,[4096,4096]);
 const files=[[`assets/heroes/${id}.png`,768,e.portraitSha256]];if(process.argv.includes('--masters'))files.push([e.master,4096,e.masterSha256]);
 for(const [path,dim,hash]of files){
  const png=fs.readFileSync(new URL('../'+path,import.meta.url));assert.equal(png.readUInt32BE(16),dim);assert.equal(png.readUInt32BE(20),dim);assert.equal(png[25],6,'RGBA transparent portrait');assert.equal(crypto.createHash('sha256').update(png).digest('hex'),hash);
 }
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+e.source,import.meta.url))).digest('hex'),e.sourceSha256);
 console.log(`${id}: 768 RGBA portrait + source/hash/master metadata${process.argv.includes('--masters')?' + native4096 master':''} PASS`);
}
