import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {KingdomView,TROOP_GROUND_Y} from '../src/view.js';
import {stepGroundedMotion,groundGaitSnapshot} from '../src/grounded-motion.js';
const load=async id=>{const bytes=fs.readFileSync(new URL(`../assets/heroes/${id}.glb`,import.meta.url));return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');};
function view(){
 const v=Object.create(KingdomView.prototype);Object.assign(v,{scene:new THREE.Scene(),camera:new THREE.OrthographicCamera(-20,20,12,-12,.1,100),models:{},animations:{},modelTops:{},mixers:new Map(),groundMotion:new Map(),heroEffects:new Map(),spellAreas:new Map(),effects:[],troops:new Map(),unitBars:new Map(),unitDeaths:new Map(),buildings:new Map(),hitShakes:new Map(),deaths:new Map(),quality:'balanced',reducedMotion:false,time:0,lastEvent:0,mode:'home'});return v;
}
const v=view();
for(const id of ['nila','ayaan','ira','kabir']){
 const gltf=await load(id);v.prepareCharacterModel(gltf.scene,id);assert.ok(gltf.scene.userData.groundGait,`${id}: embedded rig metadata adopted`);
 v.models[id]=gltf.scene;v.animations[id]=gltf.animations;v.modelTops[id]=new THREE.Box3().setFromObject(gltf.scene).max.y;
 const before=gltf.animations.map(c=>c.tracks.length);v.setHomeHero(id);assert.equal(v.homeHero.position.y,TROOP_GROUND_Y);assert.equal(v.homeHero.visible,true);assert.equal(v.homeHeroId,id);
 assert.equal(v.groundMotion.size,1,'changing hero releases the previous controller');
 const actor=v.homeHero;stepGroundedMotion(actor,.03,1/30,true);const pose=actor.getObjectByName('GroundHip0').quaternion.clone();v.mixers.get(actor)?.update(.15);
 assert.ok(pose.angleTo(actor.getObjectByName('GroundHip0').quaternion)<1e-6,`${id}: idle mixer cannot overwrite solver leg pose`);
 for(let i=0;i<20;i++)stepGroundedMotion(actor,.015,1/60,true);
 assert.ok(groundGaitSnapshot(actor).weight>.95,`${id}: embedded skin participates in distance-driven locomotion`);
 assert.deepEqual(gltf.animations.map(c=>c.tracks.length),before,'source native clips remain unchanged for export');
}
v.setHomeHero(null);assert.equal(v.groundMotion.size,0);
const battle={elapsed:0,buildings:[{id:'tower',type:'archer_tower',level:1,hp:100,w:2,h:2,x:10,z:10}],heroEffects:[{id:1,type:'sky_mark',x:11,z:11,radius:1.5,targetId:'tower',expiresAt:10},{id:2,type:'canopy',x:12,z:12,radius:4,expiresAt:8,remaining:650,maxAbsorb:650}],units:[],spellAreas:[],events:[]};
v.syncHeroEffects(battle);assert.equal(v.heroEffects.size,2);
const canopy=v.heroEffects.get(2),mark=v.heroEffects.get(1),falcon=mark.userData.falcon,initial=canopy.children[0].material.opacity;
assert.ok(falcon,'sky mark contains a falcon cue');assert.equal(canopy.userData.radius,8,'four game cells become eight world units');
v.time=2;v.stepHeroFields();assert.ok(falcon.position.y>=4,'only the falcon flies, above the marked defense');
const pos=falcon.position.clone();v.reducedMotion=true;v.stepHeroFields();const still=falcon.position.clone();v.time=4;v.stepHeroFields();assert.ok(falcon.position.equals(still),'reduced motion freezes ornamental falcon orbit');v.reducedMotion=false;
battle.heroEffects[1].remaining=100;v.syncHeroEffects(battle);assert.ok(canopy.children[0].material.opacity<initial,'absorption strength is reflected by the canopy');
const geometry=canopy.children[0].geometry;let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);
battle.heroEffects[1].remaining=0;v.syncHeroEffects(battle);assert.equal(v.heroEffects.size,1);assert.ok(disposed,'depleted canopy releases GPU geometry');
battle.buildings[0].hp=0;v.syncHeroEffects(battle);assert.equal(v.heroEffects.size,0,'mark disappears immediately with its target');
battle.buildings[0].hp=100;battle.heroEffects[1].remaining=650;v.syncHeroEffects(battle);battle.elapsed=11;v.syncHeroEffects(battle);assert.equal(v.heroEffects.size,0,'persistent effects expire on simulation time');
v.effect({type:'chakram',fromX:3,fromZ:3,x:10,z:8,targetId:'tower'});assert.equal(v.effects[0].kind,'chakram');const start=v.effects[0].mesh.position.clone();v.stepEffects(.1);assert.ok(v.effects[0].mesh.position.distanceTo(start)>0,'chakram travels between hop targets');v.stepEffects(1);assert.ok(!v.effects.some(e=>e.kind==='chakram'),'completed projectile leaves no orphan');
for(const [type,geometryType,color]of [['falcon_strike','BufferGeometry','#f3d285'],['water_bolt','LatheGeometry','#8bf5e6']]){
 const shots=view();shots.effect({type,fromX:3,fromZ:3,x:10,z:8});const shot=shots.effects[0],mesh=shot.mesh;
 assert.equal(shot.kind,'shot');assert.equal(mesh.geometry.type,geometryType,`${type}: has its own prop-matched silhouette`);
 assert.equal(shots.scene.children.length,1,'one mesh per travelling projectile');
 let geometryDisposed=false,materialDisposed=false;mesh.geometry.addEventListener('dispose',()=>geometryDisposed=true);mesh.material.addEventListener('dispose',()=>materialDisposed=true);
 const distance=mesh.position.distanceTo(shot.end);shots.stepEffects(.1);assert.ok(mesh.position.distanceTo(shot.end)<distance,`${type}: travels toward the target`);
 assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(mesh.quaternion).dot(shot.end.clone().sub(mesh.position).normalize())>.7,`${type}: points along its travel path`);
 shots.stepEffects(1);assert.ok(!shots.effects.includes(shot));assert.ok(geometryDisposed&&materialDisposed,`${type}: releases projectile GPU resources on impact`);
 assert.ok(shots.effects.length>0);for(const impact of shots.effects)assert.ok(impact.mesh.material.color.equals(new THREE.Color(color)),`${type}: impact keeps its hero colour`);
 shots.stepEffects(1);assert.equal(shots.effects.length,0);assert.equal(shots.scene.children.length,0,`${type}: no orphan projectile or impact meshes`);
}
v.effects=[];v.syncBuildings=()=>{};v.mode='battle';battle.heroEffects=[];battle.elapsed=1;
const decoy={id:'decoy1',type:'guard',decoy:true,heroOwner:'kabir',x:8,z:8,hp:90,maxHp:90,action:'walk',facing:0};battle.units=[decoy];v.updateBattle(battle,1/30);
const shield=v.troops.get(decoy.id);assert.ok(shield.userData.decoy);assert.equal(shield.userData.wheels.length,4);let skin=false;shield.traverse(o=>{skin ||= !!o.isSkinnedMesh;});assert.equal(skin,false,'decoy is mechanical, not a floating/cloned humanoid');
assert.equal(shield.position.y,TROOP_GROUND_Y);const bounds=new THREE.Box3().setFromObject(shield);assert.ok(Math.abs(bounds.min.y-TROOP_GROUND_Y)<.005,'wheels contact the ground');assert.ok(v.unitBars.get(decoy.id).position.y<1.8,'health bar sits above the shield rather than a humanoid head');
const turn=shield.userData.wheels[0].rotation.x;decoy.z+=.2;v.updateBattle(battle,1/30);assert.ok(shield.userData.wheels[0].rotation.x>turn,'wheels turn with rendered travel');
let released=false;shield.children[0].geometry.addEventListener('dispose',()=>released=true);battle.units=[];v.updateBattle(battle,1/30);assert.equal(v.troops.size,0);assert.equal(v.unitBars.size,0);assert.ok(released,'expired decoy is removed and its private geometry disposed');
console.log('PASS: four embedded hero rigs load/select/walk safely; native clips preserved; chakram/falcon/water travel and cleanup; mark/canopy lifecycle and reduced motion; grounded mechanical decoys, wheel motion and cleanup.');
