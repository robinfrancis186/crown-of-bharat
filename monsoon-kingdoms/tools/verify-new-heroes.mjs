import assert from 'node:assert/strict';
import * as R from '../src/rules.js';
import { developedVillage } from './developed-village.mjs';

const now = 1_800_000_000_000;
const ids = ['nila', 'ayaan', 'ira', 'kabir'];
const makeHome = level => {
  const state = developedVillage(now);
  state.buildings.find(b => b.type === 'fort').level = 15;
  state.buildings.find(b => b.type === 'hero_hall').level = level;
  state.resources = { coin: 20000, grain: 20000, wood: 20000, iron: 20000 };
  state.gems = 10000; state.ore = 10000;
  R.tickHome(state, now);
  return state;
};
const structure = (id, type, x, z, extra = {}) => ({ id, type, x, z, w: 1, h: 1, level: 1, hp: 10000, maxHp: 10000, attackTimer: 10000, ...extra });
const makeBattle = id => {
  const state = makeHome(6);
  assert.equal(R.selectHero(state, id).ok, true);
  const battle = R.createBattle(state, 'riverbend').battle;
  assert.equal(R.heroAbility(battle).ok, false, 'Undeployed abilities cannot be spent');
  assert.equal(battle.hero.abilityUsed, false);
  const { unit } = R.deployHero(battle, 2, 2);
  assert.ok(unit);
  assert.equal(unit.hp, R.heroInfo(state, id).current.hp);
  assert.equal(unit.spec.damage, R.heroInfo(state, id).current.damage);
  unit.attackTimer = 10000;
  battle.buildings = [structure('anchor', 'fort', 20, 20)];
  return { state, battle, unit };
};
const addGuard = (battle, x, z) => {
  const result = R.deploy(battle, 'guard', 0, 0);
  assert.equal(result.ok, true);
  Object.assign(result.unit, { x, z, attackTimer: 10000 });
  return result.unit;
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
const once = battle => {
  assert.equal(battle.hero.abilityUsed, true);
  const before = JSON.stringify(battle);
  assert.equal(R.heroAbility(battle).ok, false);
  assert.equal(JSON.stringify(battle), before, 'Second use has no side effects');
};

// Unlock every path, including migration of a genuine two-hero-shaped save.
for (const id of ids) {
  const level = R.HEROES[id].unlock;
  assert.equal(level, { nila: 3, ayaan: 4, ira: 5, kabir: 6 }[id]);
  assert.equal(R.newGame(now).heroes[id].level, 0);
  assert.equal(R.heroInfo(R.newGame(now), id).unlocked, false);
  assert.equal(R.selectHero(makeHome(level - 1), id).ok, false);
  const timed = makeHome(level - 1), hall = timed.buildings.find(b => b.type === 'hero_hall');
  Object.assign(hall, { readyAt: now + 1000, upgradingTo: level });
  R.tickHome(timed, now + 1000);
  assert.equal(timed.heroes[id].level, 1);
  assert.equal(R.heroInfo(timed, id).available, true);
  const gemmed = makeHome(level - 1), gemHall = gemmed.buildings.find(b => b.type === 'hero_hall');
  Object.assign(gemHall, { readyAt: now + 1000, upgradingTo: level });
  assert.equal(R.finishWithGems(gemmed, 'building', gemHall.id, now).ok, true);
  assert.equal(gemmed.heroes[id].level, 1);
  const old = makeHome(level);
  for (const added of ids) delete old.heroes[added];
  const migrated = R.hydrate(JSON.stringify(old), now);
  assert.equal(migrated.version, 1);
  assert.equal(migrated.heroes[id].level, 1);
  assert.deepEqual(migrated.buildings, old.buildings);
  for (const added of ids) if (R.HEROES[added].unlock > level) assert.equal(migrated.heroes[added].level, 0);

  const state = makeHome(6);
  assert.equal(R.selectHero(state, id).ok, true);
  assert.equal(R.upgradeHero(state, id, now).ok, true);
  assert.equal(R.heroInfo(state, id).available, false);
  assert.equal(R.finishWithGems(state, 'hero', id, now).ok, true);
  assert.equal(state.heroes[id].level, 2);
  const item = Object.keys(R.EQUIPMENT).find(key => R.EQUIPMENT[key].hero === id);
  assert.equal(R.forgeEquipment(state, item).ok, true);
  assert.equal(state.heroes[id].slots[0], item);
  assert.equal(R.equipItem(state, 'veer', 0, item).ok, false);
  const restored = R.hydrate(JSON.stringify(state), now);
  assert.equal(restored.activeHero, id);
  assert.equal(restored.heroes[id].level, 2);
  assert.equal(restored.heroes[id].slots[0], item);
  assert.equal(restored.equipment[item].level, 1);
  const battle = R.createBattle(restored, 'riverbend').battle;
  assert.equal(battle.hero.id, id);
  const deployed = R.deployHero(battle, 0, 0);
  assert.equal(deployed.ok, true);
  assert.equal(deployed.unit.maxHp, R.heroInfo(restored, id).current.hp);
  assert.equal(deployed.unit.spec.damage, R.heroInfo(restored, id).current.damage);
  assert.equal(R.deployHero(battle, 1, 0).ok, false);
  deployed.unit.hp = 0;
  assert.equal(R.heroAbility(battle).ok, false);
  assert.equal(battle.hero.abilityUsed, false);
}

// Nila: no target preserves use; distinct chained structures obey each hop range.
{
  const { battle, unit } = makeBattle('nila');
  assert.equal(R.heroAbility(battle).ok, false);
  assert.equal(battle.hero.abilityUsed, false);
  const targets = [structure('a','farm',5,2), structure('b','farm',8,2), structure('c','farm',11,2), structure('d','farm',14,2)];
  battle.buildings.push(structure('wall','wall',3,2), ...targets);
  assert.equal(R.heroAbility(battle).ok, true);
  const hits = battle.events.filter(e => e.type === 'chakram');
  assert.deepEqual(hits.map(e => e.targetId), ['a','b','c']);
  assert.equal(new Set(hits.map(e => e.targetId)).size, 3);
  targets.slice(0,3).forEach((target,i) => close(10000-target.hp, unit.spec.damage*2.6*Math.pow(.82,i)));
  assert.equal(targets[3].hp, 10000);
  assert.equal(battle.buildings.find(b => b.id === 'wall').hp, 10000);
  once(battle);
  const spaced = makeBattle('nila');
  spaced.battle.buildings.push(structure('near','farm',5,2), structure('too-far','farm',11,2));
  assert.equal(R.heroAbility(spaced.battle).ok, true);
  assert.equal(spaced.battle.events.filter(e => e.type === 'chakram').length, 1, 'A chain cannot jump beyond four cells');
}

// Ayaan: a nearer economy building is ignored; regular allied hits benefit until expiry.
{
  const { battle, unit } = makeBattle('ayaan');
  battle.buildings.push(structure('farm','farm',3,2));
  assert.equal(R.heroAbility(battle).ok, false);
  assert.equal(battle.hero.abilityUsed, false);
  const tower = structure('tower','archer_tower',5,2);
  battle.buildings.push(tower);
  assert.equal(R.heroAbility(battle).ok, true);
  assert.equal(battle.heroEffects[0].targetId, 'tower');
  const guard = addGuard(battle,4.5,2.5);
  Object.assign(guard, { targetId:'tower', pathRevision:battle.revision, attackTimer:0 });
  R.tickBattle(battle,0);
  close(10000-tower.hp, R.UNITS.guard.damage*1.35);
  assert.equal(unit.targetId, 'tower', 'Ayaan naturally hunts defenses');
  once(battle);
  const previous = tower.hp;
  battle.elapsed = 10; guard.attackTimer = 0;
  R.tickBattle(battle,0);
  close(previous-tower.hp,R.UNITS.guard.damage);
  assert.equal(battle.heroEffects.length,0);
  const out = makeBattle('ayaan');
  out.battle.buildings.push(structure('far-defense','archer_tower',15,2));
  assert.equal(R.heroAbility(out.battle).ok,false);
  assert.equal(out.battle.hero.abilityUsed,false);
}

// Ira: one pool shared by allies, anchored to casting point, bounded by radius/time.
{
  const { battle, unit } = makeBattle('ira');
  unit.x = .5;
  const cannon = structure('cannon','cannon',5,2,{damage:200,attackTimer:0});
  const outsideTower = structure('outside','archer_tower',11,2,{damage:50,attackTimer:0});
  battle.buildings.push(cannon,outsideTower);
  const a = addGuard(battle,3.5,2.5), b = addGuard(battle,3.5,3.5), outside = addGuard(battle,10.5,2.5);
  assert.equal(R.heroAbility(battle).ok,true);
  const effect = battle.heroEffects[0];
  assert.equal(effect.remaining,650);
  R.tickBattle(battle,0);
  assert.equal(a.hp,a.maxHp); assert.equal(b.hp,b.maxHp);
  assert.equal(effect.remaining,250,'Both allies draw from one pool');
  assert.equal(outside.hp,outside.maxHp-50,'Outside ally receives no absorption');
  cannon.attackTimer=0;
  R.tickBattle(battle,0);
  assert.equal(effect.remaining,0);
  assert.equal(a.hp,a.maxHp); assert.equal(b.hp,b.maxHp-150,'Damage beyond remaining shield reaches HP');
  once(battle);
  R.tickBattle(battle,0); assert.equal(battle.heroEffects.length,0);
  const timed = makeBattle('ira');
  const enemy = structure('enemy','archer_tower',5,2,{damage:20,attackTimer:0});
  timed.battle.buildings.push(enemy);
  assert.equal(R.heroAbility(timed.battle).ok,true);
  timed.battle.elapsed=8;
  R.tickBattle(timed.battle,0);
  assert.equal(timed.unit.hp,timed.unit.maxHp-20,'Expired canopy absorbs nothing');
}

// Kabir: insufficient cells are retryable; two ground decoys draw fire without attacking.
{
  const { battle, unit } = makeBattle('kabir');
  for(let z=0;z<=4;z++)for(let x=0;x<=4;x++)if(x!==2||z!==2)battle.buildings.push(structure(`block-${x}-${z}`,'wall',x,z));
  assert.equal(R.heroAbility(battle).ok,false);
  assert.equal(battle.hero.abilityUsed,false);
  assert.equal(battle.units.filter(u=>u.decoy).length,0);
  battle.buildings=[structure('anchor','fort',20,20),structure('farm','farm',3,2),structure('tower','archer_tower',8,2,{damage:20,attackTimer:0})];
  assert.equal(R.heroAbility(battle).ok,true);
  const decoys=battle.units.filter(u=>u.decoy);
  assert.equal(decoys.length,2);
  assert.notDeepEqual([decoys[0].x,decoys[0].z],[decoys[1].x,decoys[1].z]);
  for(const decoy of decoys){
    assert.equal(decoy.spec.damage,0);
    assert.ok(decoy.x>=0&&decoy.x<R.GRID&&decoy.z>=0&&decoy.z<R.GRID);
    assert.ok(!battle.buildings.some(b=>decoy.x>=b.x&&decoy.x<b.x+b.w&&decoy.z>=b.z&&decoy.z<b.z+b.h));
  }
  const closeGuard=addGuard(battle,7.5,2.5);
  const hps=battle.buildings.map(b=>b.hp);
  R.tickBattle(battle,0);
  assert.ok(decoys.every(d=>d.targetId==='tower'),'Decoys seek defenses ahead of nearer farms');
  assert.ok(decoys.some(d=>d.hp<d.maxHp));
  assert.equal(unit.hp,unit.maxHp,'Defense fire is diverted');
  assert.equal(closeGuard.hp,closeGuard.maxHp,'Decoys take priority over a closer attacking soldier');
  assert.deepEqual(battle.buildings.map(b=>b.hp),hps,'Decoys do not damage structures');
  once(battle);
  // Put decoys next to a defense and let them attempt attacks: damage stays zero.
  battle.buildings.find(b=>b.id==='tower').attackTimer=10000;
  for(const decoy of decoys)Object.assign(decoy,{x:7.5,z:2.5,attackTimer:0,pathRevision:battle.revision});
  R.tickBattle(battle,0);
  assert.deepEqual(battle.buildings.map(b=>b.hp),hps);
  battle.elapsed=10; R.tickBattle(battle,0);
  assert.ok(decoys.every(d=>d.hp===0),'Decoys expire at ten seconds');
  const alone=makeBattle('kabir');
  assert.equal(R.heroAbility(alone.battle).ok,true);
  alone.unit.hp=0;
  for(const key of Object.keys(alone.battle.reserve))alone.battle.reserve[key]=0;
  R.tickBattle(alone.battle,0);
  assert.equal(alone.battle.status,'defeat','Living decoys cannot keep an attack alive');
}
console.log('PASS: four hero unlock/migration/timer paths, equipment and upgraded deployment, unique chains, defense marks, shared shields, decoy targeting/expiry, once-only abilities and retryable failures.');
