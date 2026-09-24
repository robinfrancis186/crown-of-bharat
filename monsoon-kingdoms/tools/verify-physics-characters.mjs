import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PhysicsWorld, RigidBody, Spring, Spring3, ClothStrip } from '../src/physics.js';
import { CharacterForge, ROSTER_IDS } from '../src/characters.js';
import { UNITS, HEROES } from '../src/rules.js';

// ---- Rigid bodies: tumbling blocks land, settle on a face and sleep.
{
  const world = new PhysicsWorld();
  const box = world.add(new RigidBody({ half: new THREE.Vector3(0.4, 0.2, 0.3), position: new THREE.Vector3(0, 3, 0), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, 0.3, 0.5)), velocity: new THREE.Vector3(3, 4, 0), angularVelocity: new THREE.Vector3(2, 5, 1), life: 100 }));
  for (let i = 0; i < 600; i++) world.update(1 / 60);
  assert.ok(box.sleeping, 'a tossed block comes to rest');
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)].map(a => Math.abs(a.applyQuaternion(box.quaternion).y));
  assert.ok(Math.max(...axes) > 0.98, 'it rests flat on a face, not balanced on an edge');
  const halfs = [0.4, 0.2, 0.3], restingHalf = halfs[axes.indexOf(Math.max(...axes))];
  assert.ok(Math.abs(box.position.y - restingHalf) < 0.02, 'its centre sits exactly one half-extent above the ground');
}
{
  const world = new PhysicsWorld(), ball = world.add(new RigidBody({ shape: 'sphere', radius: 0.25, position: new THREE.Vector3(0, 1, 0), velocity: new THREE.Vector3(6, 0, 0), life: 100 }));
  for (let i = 0; i < 400; i++) world.update(1 / 60);
  assert.ok(ball.position.x > 1 && ball.velocity.length() < 0.05, 'a cannonball rolls on and stops through friction and rolling resistance');
  assert.ok(Math.abs(ball.position.y - 0.25) < 0.02, 'it rests on the ground');
}
{
  const world = new PhysicsWorld(); world.setStatics([{ id: 'wall', min: new THREE.Vector3(2, 0, -1), max: new THREE.Vector3(3, 2, 1) }]);
  const ball = world.add(new RigidBody({ shape: 'sphere', radius: 0.25, position: new THREE.Vector3(0, 0.6, 0), velocity: new THREE.Vector3(8, 0, 0), life: 100, restitution: 0.4 }));
  for (let i = 0; i < 240; i++) world.update(1 / 60);
  assert.ok(ball.position.x < 2, 'standing structures stop rubble and cannonballs');
  world.removeStatic('wall'); assert.equal(world.statics.length, 0, 'destroyed structures stop colliding');
}
{
  const world = new PhysicsWorld({ maxBodies: 10 }); let removed = 0; world.onRemove = () => removed++;
  for (let i = 0; i < 25; i++) world.add(new RigidBody({ position: new THREE.Vector3(i, 1, 0), life: 0.5, sink: 2 }));
  assert.equal(world.bodies.length, 10, 'the body budget is enforced');
  for (let i = 0; i < 120; i++) world.update(1 / 60);
  assert.equal(world.bodies.length, 0, 'expired bodies sink and are released'); assert.equal(removed, 25);
}
{
  const a = new RigidBody({ shape: 'sphere', radius: 0.3, position: new THREE.Vector3(0, 0.3, 0), life: 50 }), b = new RigidBody({ shape: 'sphere', radius: 0.3, position: new THREE.Vector3(0.2, 0.3, 0), life: 50 }), world = new PhysicsWorld();
  world.add(a); world.add(b); for (let i = 0; i < 30; i++) world.update(1 / 60);
  assert.ok(a.position.distanceTo(b.position) > 0.55, 'bodies push apart instead of interpenetrating');
}
{
  const spring = new Spring(0.4, 150, 9); spring.target = 1; let overshoot = 0; for (let i = 0; i < 240; i++) { spring.update(1 / 60); overshoot = Math.max(overshoot, spring.value); }
  assert.ok(overshoot > 1.02 && spring.settled, 'squash-and-stretch overshoots then settles');
  const push = new Spring3(70, 9).kick(new THREE.Vector3(5, 0, 0)); push.update(0.1); assert.ok(push.value.x > 0); for (let i = 0; i < 240; i++) push.update(1 / 60); assert.ok(push.value.length() < 0.01, 'knockback returns to rest');
}
{
  const cape = new ClothStrip({ columns: 4, rows: 6, width: 0.5, length: 0.9 }), a = new THREE.Vector3(0.25, 1.2, 0), b = new THREE.Vector3(-0.25, 1.2, 0);
  for (let i = 0; i < 180; i++) cape.update(1 / 60, a, b, { spheres: [{ center: new THREE.Vector3(0, 0.9, 0.18), radius: 0.2 }] });
  const p = cape.pos; assert.ok(Math.abs(p[0] - 0.25) < 1e-6 && Math.abs(p[1] - 1.2) < 1e-6, 'top corners stay pinned to the shoulders');
  const bottom = p[(5 * 4 + 1) * 3 + 1]; assert.ok(bottom < 0.45 && bottom > 0.2, `the cape hangs its own length under gravity (${bottom.toFixed(2)})`);
  cape.dispose();
}

// ---- Characters: every troop and hero is a single skinned mesh on its own skeleton.
const forge = new CharacterForge();
for (const id of [...Object.keys(UNITS), ...Object.keys(HEROES)]) assert.ok(ROSTER_IDS.includes(id), `${id} has a forged character`);
for (const id of ROSTER_IDS) {
  const bp = forge.blueprint(id), actor = forge.spawn(id, { hero: Object.hasOwn(HEROES, id) });
  assert.ok(bp.triangles > 2000 && bp.triangles < 12000, `${id}: detailed but within the mobile triangle budget (${bp.triangles})`);
  assert.ok(bp.bones.length >= 18, `${id}: full skeleton (${bp.bones.length} bones)`);
  const skin = bp.geometry.attributes.skinIndex; for (let i = 0; i < skin.count; i++) assert.ok(skin.getX(i) < bp.bones.length);
  assert.equal(bp.geometry.groups.length, 2, `${id}: two material groups (cloth and metal)`);
  let meshes = 0; actor.root.traverse(o => { if (o.isMesh) meshes++; }); assert.equal(meshes, 1, `${id}: one draw per material, not one per part`);
  assert.notEqual(forge.spawn(id).mesh.skeleton.bones[0], actor.mesh.skeleton.bones[0], 'actors own their bones'); assert.equal(forge.spawn(id).mesh.geometry, actor.mesh.geometry, 'actors share geometry');
  // Walking advances the gait only as far as the actor travels.
  const scene = new THREE.Scene(); scene.add(actor.root); actor.setAction('walk');
  actor.update(1 / 60, 0); const phase = actor.phase; actor.update(1 / 60, 0); assert.equal(actor.phase, phase, `${id}: standing still does not step`);
  for (let i = 0; i < 30; i++) { actor.root.position.z += 0.03; actor.root.updateMatrixWorld(true); actor.update(1 / 60, i / 60); }
  assert.notEqual(actor.phase, phase, `${id}: moving advances the stride`); assert.ok(actor.move > 0.5);
}
{
  // The blow lands when the rules' attack clock wraps: wound up just before, struck just after.
  const hand = id => { const a = forge.spawn(id); new THREE.Scene().add(a.root); return t => { a.setAction('attack', t); for (let i = 0; i < 30; i++) a.update(1 / 60, 0); a.root.updateMatrixWorld(true); return a.b.handR.getWorldPosition(new THREE.Vector3()); }; };
  const guard = hand('guard'), windup = guard(0.8), strike = guard(0.98); assert.ok(strike.z > windup.z + 0.1, 'the spear thrusts forward on the strike');
  const smash = hand('engineer'), raised = smash(0.85), down = smash(0.99); assert.ok(raised.y > down.y + 0.3, 'the mallet is raised overhead then brought down');
  const archer = forge.spawn('archer'); new THREE.Scene().add(archer.root); archer.setAction('attack', 0.8); for (let i = 0; i < 30; i++) archer.update(1 / 60, 0);
  assert.ok(archer.b.forearmR.rotation.x < -1.2, 'the archer draws the string back to the cheek before release');
}
{
  const veer = forge.spawn('veer', { hero: true }); assert.ok(veer.cape, 'heroes with capes carry verlet cloth');
  const a = new THREE.Vector3(), b = new THREE.Vector3(); new THREE.Scene().add(veer.root); assert.ok(veer.capeAnchors(a, b) && a.distanceTo(b) > 0.2 && a.y > 1, 'cape pins sit across the shoulders');
  veer.die(); for (let i = 0; i < 30; i++) veer.update(1 / 60, 0); assert.ok(veer.b.upperArmL.rotation.z > 0.8, 'a fallen warrior goes limp');
  const cheer = forge.spawn('guard'); new THREE.Scene().add(cheer.root); cheer.celebrate(); for (let i = 0; i < 10; i++) cheer.update(1 / 60, i / 60); assert.ok(cheer.b.upperArmR.rotation.x < -2, 'victory raises the arms');
}
forge.dispose();
console.log(`PASS: rigid bodies settle on faces and sleep, spheres roll to rest, static colliders, body budget and sinking, body separation, springs, pinned verlet capes; ${ROSTER_IDS.length} forged single-mesh characters with full skeletons, distance-driven gait, clock-synced thrust/smash/draw attacks, limp falls and cheers.`);
