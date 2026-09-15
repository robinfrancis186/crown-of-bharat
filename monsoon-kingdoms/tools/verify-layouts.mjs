import { developedVillage } from './developed-village.mjs';
// Every campaign road must be a distinct, well-formed, winnable base.
import assert from 'node:assert/strict';
import * as R from '../src/rules.js';

const now = Date.UTC(2026, 0, 5);
const footprint = type => ({ w: R.CATALOG[type].w, h: R.CATALOG[type].h });
const signature = buildings => buildings.map(b => `${b.type}@${b.x},${b.z}`).sort().join('|');

assert.equal(Object.keys(R.LAYOUTS).length, 6, 'one authored layout per campaign road');
const seen = new Map();
for (const raid of R.RAIDS) {
  assert.ok(R.LAYOUTS[raid.layout], `${raid.id} has an authored layout`);
  const battle = R.createBattle(Object.assign(developedVillage(now), { raidStars: Object.fromEntries(R.RAIDS.map(r => [r.id, 3])) }), raid.id).battle;
  const buildings = battle.buildings;

  // Bounds, overlap and a reachable capital.
  const occupied = new Map();
  for (const b of buildings) {
    const { w, h } = footprint(b.type);
    assert.ok(b.x >= 0 && b.z >= 0 && b.x + w <= R.GRID && b.z + h <= R.GRID, `${raid.id}: ${b.type} inside the battlefield`);
    for (let z = b.z; z < b.z + h; z++) for (let x = b.x; x < b.x + w; x++) {
      assert.ok(!occupied.has(`${x},${z}`), `${raid.id}: ${b.type} does not overlap ${occupied.get(`${x},${z}`)}`);
      occupied.set(`${x},${z}`, b.type);
    }
  }
  assert.equal(buildings.filter(b => b.type === 'fort').length, 1, `${raid.id} has exactly one capital`);

  // Enough clear deployment band for a full army.
  let free = 0;
  for (let z = 0; z < R.GRID; z++) for (let x = 0; x < R.GRID; x++) {
    if (x > 3 && x < 21 && z > 3 && z < 21) continue;
    if (!occupied.has(`${x},${z}`)) free++;
  }
  assert.ok(free >= 200, `${raid.id} leaves ${free} deployment tiles`);

  // Distinct from every other road, not one template with extra pieces.
  const key = signature(buildings);
  for (const [other, otherKey] of seen) assert.notEqual(key, otherKey, `${raid.id} differs from ${other}`);
  seen.set(raid.id, key);

  if (raid.difficulty >= 2) assert.ok(buildings.some(b => b.type === 'wall'), `${raid.id} is fortified`);
  const defenses = buildings.filter(b => R.CATALOG[b.type].damage).length;
  console.log(`${raid.id.padEnd(10)} ${String(buildings.filter(b => b.type !== 'wall').length).padStart(3)} structures, ${String(buildings.filter(b => b.type === 'wall').length).padStart(3)} walls, ${defenses} defenses, ${free} deployment tiles`);
}

// Difficulty must actually rise along the road, measured by how long a fixed army takes.
const times = [];
for (const raid of R.RAIDS) {
  const home = developedVillage(now);
  for (const b of home.buildings) if (b.type === 'camp') b.level = 3;
  home.raidStars = Object.fromEntries(R.RAIDS.map(r => [r.id, 3]));
  home.army = { ...home.army, guard: 20, archer: 18, engineer: 6, rider: 4, elephant: 4, healer: 3 };
  const battle = R.createBattle(home, raid.id).battle;
  let i = 0;
  for (const type of ['elephant', 'guard', 'rider', 'engineer', 'archer', 'healer']) while (battle.reserve[type] > 0) R.deploy(battle, type, 5 + i++ % 14, 22);
  for (let f = 0; f < 1850 && battle.status === 'active'; f++) R.tickBattle(battle, 0.1);
  assert.equal(battle.status, 'victory', `${raid.id} is winnable with a full campaign army`);
  times.push(Math.round(battle.elapsed));
}
assert.ok(times.at(-1) > times[0] * 1.6, `the citadel resists longer than the first outpost (${times.join('s, ')}s)`);
console.log('Clear times:', times.map(t => `${t}s`).join(' → '));
console.log('PASS: six distinct, in-bounds, winnable campaign layouts with rising resistance.');
