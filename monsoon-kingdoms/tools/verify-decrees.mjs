import assert from 'node:assert/strict';
import * as R from '../src/rules.js';
import { developedVillage } from './developed-village.mjs';

const DAY = 86400000, t0 = Date.UTC(2026, 8, 20, 9);

// ---- Daily Durbar: one claim per UTC day, a seven-day ladder, reset on a missed day.
{
  const s = R.newGame(t0);
  let info = R.durbarInfo(s, t0); assert.ok(info.available); assert.equal(info.day, 1); assert.equal(info.streak, 0);
  const coin = s.resources.coin, first = R.claimDurbar(s, t0);
  assert.ok(first.ok && first.streak === 1 && s.resources.coin === coin + R.DURBAR[0].coin, 'day one pays out');
  assert.equal(R.claimDurbar(s, t0 + 3600000).ok, false, 'only once per day');
  for (let d = 1; d < 7; d++) assert.equal(R.claimDurbar(s, t0 + d * DAY).day, d + 1, `consecutive day ${d + 1}`);
  const gems = s.gems; const eighth = R.claimDurbar(s, t0 + 7 * DAY); assert.equal(eighth.day, 1, 'the ladder repeats after day seven'); assert.equal(eighth.streak, 8, 'but the streak keeps counting');
  void gems;
  const missed = R.claimDurbar(s, t0 + 10 * DAY); assert.equal(missed.day, 1); assert.equal(missed.streak, 1, 'a missed day restarts the ladder');
  assert.equal(s.stats.durbar, 9, 'every court held counts toward the Devoted Ruler decree');
  // Resources never exceed storage.
  const full = R.newGame(t0); const cap = R.capacity(full); full.resources.coin = cap.storage.coin; const r = R.claimDurbar(full, t0);
  assert.equal(r.received.coin, 0); assert.equal(full.resources.coin, cap.storage.coin, 'storage caps are respected');
  // Day six and seven pay gems and ore.
  const rich = R.newGame(t0); for (let d = 0; d < 7; d++) R.claimDurbar(rich, t0 + d * DAY); assert.equal(rich.gems, 150 + R.DURBAR[5].gems + R.DURBAR[6].gems); assert.equal(rich.ore, R.DURBAR[6].ore);
}

// ---- Decrees: stats come from real play; tiers are claimed in order, once each.
{
  const s = developedVillage(t0), before = R.decreeInfo(s);
  assert.equal(before.length, Object.keys(R.DECREES).length); assert.ok(before.every(d => !d.claimable && d.tier === 0));
  // Collecting resources feeds the treasurer.
  const farm = s.buildings.find(b => b.type === 'farm'); farm.stored = 400; R.collect(s, farm.id); assert.equal(s.stats.collected, 400);
  // A real campaign battle records victories, stars, destruction, deployment and spells.
  const battle = R.createBattle(s, 'riverbend').battle;
  for (const [x, z] of [[1, 12], [1, 11], [1, 13], [2, 12], [22, 12], [12, 1], [12, 22], [1, 10]]) R.deploy(battle, 'guard', x + 0.5, z + 0.5);
  for (const [x, z] of [[1, 6], [1, 18], [22, 6], [22, 18]]) R.deploy(battle, 'archer', x + 0.5, z + 0.5);
  for (let i = 0; i < 180 * 30 && battle.status === 'active'; i++) R.tickBattle(battle, 1 / 30);
  const result = R.finishRaid(s, battle, t0 + 60000);
  assert.ok(result.ok);
  assert.equal(s.stats.battles, 1); assert.equal(s.stats.victories, result.victory ? 1 : 0); assert.equal(s.stats.stars, result.stars);
  assert.equal(s.stats.destroyed, battle.buildings.filter(b => b.hp <= 0).length); assert.equal(s.stats.deployed, 12);
  // Practice never counts.
  const practice = R.startPractice(s); assert.ok(practice.ok); R.finishRaid(s, practice.battle, t0 + 70000); assert.equal(s.stats.battles, 1, 'practice battles are not career battles');
  // Claim tiers in order.
  s.stats.upgrades = 16; const gems = s.gems;
  let claim = R.claimDecree(s, 'builder'); assert.ok(claim.ok && claim.tier === 1 && s.gems === gems + 10);
  claim = R.claimDecree(s, 'builder'); assert.ok(claim.ok && claim.tier === 2 && s.ore >= 10, 'second tier adds ore');
  assert.equal(R.claimDecree(s, 'builder').ok, false, 'the third tier waits for its goal');
  s.stats.upgrades = 60; assert.ok(R.claimDecree(s, 'builder').ok); assert.match(R.claimDecree(s, 'builder').reason, /fulfilled/, 'no double claims');
  assert.equal(R.claimDecree(s, 'nope').ok, false);
  assert.equal(R.claimableDecrees(s), R.decreeInfo(s).filter(d => d.claimable).length);
  // Upgrades completed by the clock count, including gem-finished ones.
  const t = R.newGame(t0); const hall = t.buildings.find(b => b.type === 'fort'); t.resources = { coin: 5000, grain: 5000, wood: 5000, iron: 5000 };
  assert.ok(R.upgradeBuilding(t, hall.id, t0).ok); R.tickHome(t, t0 + 10 * 60 * 60 * 1000); assert.equal(t.stats.upgrades, 1, 'a finished upgrade counts once');
  // Everything survives a save round trip and hostile values are clamped.
  const round = R.hydrate(JSON.parse(JSON.stringify(s)), t0 + 80000);
  assert.deepEqual(round.stats, s.stats); assert.deepEqual(round.decrees, s.decrees); assert.deepEqual(round.durbar, s.durbar);
  const hostile = R.hydrate({ ...JSON.parse(JSON.stringify(s)), stats: { upgrades: -5, collected: 1e20, bogus: 9 }, decrees: { builder: 99, fake: 2 }, durbar: { lastDay: 9e15, streak: -3 } }, t0);
  assert.equal(hostile.stats.upgrades, 0); assert.equal(hostile.stats.collected, 1e9); assert.ok(!('bogus' in hostile.stats));
  assert.equal(hostile.decrees.builder, R.DECREE_REWARDS.length); assert.ok(!('fake' in hostile.decrees));
  assert.ok(hostile.durbar.lastDay <= R.dayIndex(t0) && hostile.durbar.streak === 0, 'future or negative durbar data is clamped');
  // Older saves without the new fields load cleanly.
  const legacy = JSON.parse(JSON.stringify(s)); delete legacy.stats; delete legacy.decrees; delete legacy.durbar;
  const migrated = R.hydrate(legacy, t0); assert.ok(migrated.stats && migrated.decrees && migrated.durbar.lastDay === -1);
}
console.log('PASS: Daily Durbar once-per-day ladder, streak reset, storage caps and gem/ore days; Royal Decrees from real collection, battles (practice excluded), deployments and upgrades; ordered one-time tier claims; save round trip, hostile clamps and legacy migration.');
