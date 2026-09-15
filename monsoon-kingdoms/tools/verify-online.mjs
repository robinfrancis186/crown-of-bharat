import { developedVillage } from './developed-village.mjs';
// Online play: what leaves the device, and what a downloaded base is allowed to do.
import assert from 'node:assert/strict';
import * as R from '../src/rules.js';

const now = Date.UTC(2026, 0, 5);
const fresh = () => developedVillage(now);

// --- What is published ------------------------------------------------------------
const home = fresh();
home.gems = 999; home.ore = 500; home.resources.coin = 4321;
const published = R.publishableLayout(home);
assert.equal(published.ok, true);
const allowed = new Set(['type', 'x', 'z', 'level']);
for (const entry of published.layout) {
  for (const key of Object.keys(entry)) assert.ok(allowed.has(key), `a published structure exposes only ${[...allowed].join('/')}, not ${key}`);
}
const wire = JSON.stringify(published.layout);
for (const secret of ['gems', 'ore', 'resources', 'army', 'heroes', 'equipment', 'achievements', 'ranked', 'coin', '4321', 'name'])
  assert.ok(!wire.includes(secret), `"${secret}" never leaves the device`);
assert.equal(published.layout.some(b => b.type === 'fort'), true);
const noCapital = fresh(); noCapital.buildings = noCapital.buildings.filter(b => b.type !== 'fort');
assert.equal(R.publishableLayout(noCapital).ok, false, 'a village without a capital cannot be published');
const unfinished = fresh(); unfinished.buildings.push({ id: 'bx', type: 'farm', x: 19, z: 19, w: 3, h: 3, level: 0, builtAt: now, readyAt: now + 9e5, upgradingTo: 1, stored: 0 });
assert.equal(R.publishableLayout(unfinished).layout.some(b => b.x === 19 && b.z === 19), false, 'unfinished construction is not published');

// --- What a downloaded base is allowed to be --------------------------------------
// Another player writes this, so it is untrusted input and must be rejected, never repaired.
const hostile = [
  ['not an array', 'nope'], ['a string of json', '[{"type":"fort"}]'], ['empty', []], ['null entries', [null, { type: 'fort', x: 2, z: 2, level: 1 }]],
  ['unknown structure', [{ type: 'nuclear_silo', x: 1, z: 1, level: 1 }]],
  ['off the grid', [{ type: 'fort', x: 22, z: 22, level: 1 }]], ['negative position', [{ type: 'fort', x: -3, z: 2, level: 1 }]],
  ['huge coordinates', [{ type: 'fort', x: 1e9, z: 1e9, level: 1 }]], ['fractional position', [{ type: 'fort', x: 2.5, z: 2, level: 1 }]],
  ['level above the ceiling', [{ type: 'fort', x: 2, z: 2, level: 99 }]], ['level zero', [{ type: 'fort', x: 2, z: 2, level: 0 }]],
  ['overlapping structures', [{ type: 'fort', x: 2, z: 2, level: 1 }, { type: 'cannon', x: 3, z: 3, level: 1 }]],
  ['no capital', [{ type: 'cannon', x: 2, z: 2, level: 1 }]],
  ['over a building limit', [...Array.from({ length: 8 }, (_, i) => ({ type: 'cannon', x: i * 3, z: 0, level: 1 })), { type: 'fort', x: 2, z: 5, level: 1 }]],
  ['too many structures', Array.from({ length: 200 }, (_, i) => ({ type: 'wall', x: i % 24, z: Math.floor(i / 24), level: 1 }))],
];
for (const [label, layout] of hostile) {
  const check = R.validateLayout(layout);
  assert.equal(check.ok, false, `rejects: ${label}`);
  assert.ok(typeof check.reason === 'string' && check.reason.length, `${label} explains itself`);
}
// A well-formed base carrying extra keys is accepted, but only because every structure
// is rebuilt from scratch: the smuggled fields are dropped rather than trusted.
const smuggled = R.validateLayout(JSON.parse('[{"type":"fort","x":2,"z":2,"level":1,"__proto__":{"polluted":true},"hp":999999,"damage":999999,"id":"injected"}]'));
assert.equal(smuggled.ok, true, 'a valid base with extra keys still loads');
assert.equal({}.polluted, undefined, 'a malicious base cannot touch Object.prototype');
assert.equal(smuggled.buildings[0].id, 'o0', 'a smuggled id is replaced');
assert.equal(smuggled.buildings[0].hp, R.CATALOG.fort.hp, 'smuggled health is discarded for the real value');
assert.equal(smuggled.buildings[0].damage, 0, 'a capital cannot smuggle in an attack');

const valid = R.validateLayout(published.layout);
assert.equal(valid.ok, true, 'a real published village is accepted');
assert.equal(valid.buildings.length, published.layout.length);
for (const b of valid.buildings) assert.ok(b.hp > 0 && b.maxHp === b.hp, 'downloaded structures start at full health');

// --- An online raid behaves like a battle, not like the campaign -------------------
const attacker = fresh();
for (const b of attacker.buildings) if (b.type === 'camp') b.level = 3;
R.quickTrain(attacker, now);
const beforeStars = JSON.stringify(attacker.raidStars), beforeGems = attacker.gems, beforeCoin = attacker.resources.coin;
const opponent = { player_id: '0f4d2b1a-0000-4000-8000-000000000001', name: 'Rival Kingdom', trophies: 520, taj_level: 5, layout: published.layout };
assert.equal(R.startOnlineRaid(attacker, { ...opponent, layout: 'garbage' }).ok, false, 'an invalid base never starts a battle');
assert.equal(R.startOnlineRaid(attacker, { name: 'No id' }).ok, false, 'an opponent without an id is refused');
const started = R.startOnlineRaid(attacker, opponent);
assert.equal(started.ok, true);
assert.equal(started.battle.kind, 'online');
assert.deepEqual(started.battle.opponent, { id: opponent.player_id, name: 'Rival Kingdom', trophies: 520, tajLevel: 5 });
assert.equal(R.startOnlineRaid(attacker, opponent).ok, false, 'only one battle at a time');

const battle = started.battle;
let i = 0;
for (const type of Object.keys(battle.reserve)) while (battle.reserve[type] > 0) R.deploy(battle, type, 4 + i++ % 16, 22);
for (let f = 0; f < 1850 && battle.status === 'active'; f++) R.tickBattle(battle, 0.1);
const result = R.finishRaid(attacker, battle, now);
assert.equal(result.online, true);
assert.equal(result.opponentId, opponent.player_id, 'the result names the defender to report to');
assert.equal(Object.values(result.reward).every(n => n === 0), true, 'online raids pay trophies, not campaign loot');
assert.equal(result.gems, 0, 'online raids award no gems');
assert.ok(result.ore > 0, 'a won online raid still earns ore');
assert.equal(JSON.stringify(attacker.raidStars), beforeStars, 'campaign progress is untouched');
assert.equal(attacker.gems, beforeGems, 'gems are untouched');
assert.equal(attacker.resources.coin, beforeCoin, 'resources are untouched');
assert.equal(attacker.activeRaid, null, 'the raid is settled');
assert.equal(attacker.heroes.veer.level, 1, 'the hero comes home');

// A long name from another player is truncated, and stays inert text.
const rude = R.startOnlineRaid(fresh(), { ...opponent, name: '<script>alert(1)</script>'.repeat(4) });
assert.ok(rude.battle.opponent.name.length <= 28, 'an opponent name is truncated');
assert.equal(typeof rude.battle.opponent.name, 'string');

console.log('PASS: published layouts leak nothing, 16 hostile bases rejected with reasons, and online raids settle without touching campaign progress, gems or resources.');
