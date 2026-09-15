import assert from 'node:assert/strict';
import * as R from '../src/rules.js';
import { decodeSave } from '../src/storage.js';
import { developedVillage } from './developed-village.mjs';

const now = 1_800_000_000_000;
const starter = R.newGame(now);
assert.deepEqual(starter.buildings.map(b => b.type), ['fort', 'farm', 'barracks']);
assert.equal(R.capacity(starter).used, 10);
assert.equal(R.capacity(starter).army, 24, 'Recruitment works before an Army Camp is built');
assert.ok(starter.buildings.every(b => R.canPlace(starter, b.type, b.x, b.z, b.id).ok));
assert.equal(R.heroInfo(starter, 'veer').available, false);
assert.equal(R.heroInfo(starter, 'tara').unlocked, false);
assert.equal(R.train(starter, 'rider', 1, now).ok, false, 'Advanced troops remain gated');

function raid(state, time) {
  const started = R.createBattle(state, 'riverbend');
  assert.equal(started.ok, true);
  const battle = started.battle;
  assert.equal(battle.hero, null, 'A Hall must be earned before a hero joins raids');
  assert.ok(Object.values(battle.spells).every(count => count === 0), 'Spells require a Stepwell');
  for (const type of ['guard', 'engineer', 'archer']) while (battle.reserve[type] > 0) assert.equal(R.deploy(battle, type, 12, 22).ok, true);
  for (let frame = 0; frame < 1900 && battle.status === 'active'; frame++) R.tickBattle(battle, .1);
  assert.equal(battle.status, 'victory', 'The first raid is winnable with the actual starter force');
  const result = R.finishRaid(state, battle, time);
  assert.equal(result.stars, 3);
  assert.ok(result.reward.coin > 0 && result.reward.wood > 0);
}
raid(starter, now);
assert.equal(starter.totalRaids, 1);
assert.equal(R.capacity(starter).used, 0, 'Deployed troops are spent');
// Even a player who spends every resource can rebuild an army and earn raid loot.
starter.resources = { coin: 0, grain: 0, wood: 0, iron: 0 };
assert.equal(R.quickTrain(starter, now).ok, true);
assert.equal(R.capacity(starter).used, 24);
raid(starter, now);
assert.ok(starter.resources.coin > 0 && starter.resources.wood > 0);

// Follow the guide through real build timers, producer collection, combat and upgrade.
const growth = R.newGame(now);
let time = now;
const build = (type, x, z) => {
  const placed = R.placeBuilding(growth, type, x, z, time);
  assert.equal(placed.ok, true, `${type} remains affordable along the starter route`);
  time += (R.CATALOG[type].time + 1) * 1000;
  R.tickHome(growth, time);
  assert.equal(placed.building.level, 1);
};
R.acknowledgeTutorial(growth, 'welcome');
R.acknowledgeTutorial(growth, 'collect');
for (const [step, type, x, z] of [['build','lumber',16,15], ['market','market',5,5], ['mine','mine',17,5]]) {
  assert.equal(R.tutorialState(growth).id, step);
  build(type,x,z);
}
assert.equal(R.tutorialState(growth).id, 'army');
assert.equal(R.quickTrain(growth,time).ok,true);
assert.equal(R.tutorialState(growth).id, 'attack');
raid(growth,time);
assert.equal(R.tutorialState(growth).id, 'defend');
build('archer_tower',10,5);
assert.equal(R.tutorialState(growth).id, 'hero');
build('hero_hall',1,10);
assert.equal(R.heroInfo(growth,'veer').available,true);
assert.equal(R.tutorialState(growth).id,'capital');
for(let cycle=0;cycle<3;cycle++) { time+=600_000; R.tickHome(growth,time); R.collectAll(growth); }
assert.equal(R.upgradeBuilding(growth,growth.buildings[0].id,time).ok,true,'Producer income funds the first capital upgrade without purchases or bonuses');
assert.equal(R.tutorialState(growth),null);
time+=100_000; R.tickHome(growth,time);
assert.equal(growth.buildings[0].level,2);

// Saved veteran and custom sparse villages retain their actual progress and footprint.
for(const saved of [developedVillage(now), R.newGame(now)]) {
  saved.resources.coin=1234; saved.army.guard=7; saved.totalRaids=5;
  const restored=R.hydrate(JSON.stringify(saved),now);
  assert.deepEqual(restored.buildings,saved.buildings,'Hydration neither resets nor adds starter buildings');
  assert.deepEqual(restored.resources,saved.resources);
  assert.deepEqual(restored.army,saved.army);
  assert.equal(restored.totalRaids,5);
  assert.equal(decodeSave(JSON.stringify(saved)).buildings.length,saved.buildings.length);
}
console.log('PASS: three-building starter, ten-troop real victory, zero-resource recovery, sustainable tutorial economy, hero/spell gates and existing-save preservation.');
