import assert from 'node:assert/strict';
import * as R from '../src/rules.js';
import { decodeSave, encodeSave } from '../src/storage.js';
const now = 1_800_000_000_000;
const fresh = () => R.newGame(now);
const advance = (s, ms) => R.tickHome(s, now + ms);
const resources = s => { s.resources = { coin: 20000, grain: 20000, wood: 20000, iron: 20000 }; };
const level = (s, type, n) => { s.buildings.find(b => b.type === type).level = n; };
assert.equal(Object.keys(R.CATALOG).length, 15); assert.equal(Object.keys(R.UNITS).length, 10); assert.equal(R.RAIDS.length, 6);
const s = fresh();
assert.equal(R.capacity(s).used, 32); assert.equal(R.capacity(s).army, 48);
assert.equal(s.gems, 150); assert.equal(s.builders, 2);
assert.equal(s.army.elephant, 0); assert.equal(s.army.healer, 0);
assert.equal(s.buildings.filter(b => b.type === 'wall').length, 19);
assert.ok(s.buildings.every(b => R.canPlace(s, b.type, b.x, b.z, b.id).ok), 'all 32 starter footprints are valid');
assert.ok(s.nextId > Math.max(...s.buildings.map(b => Number(b.id.slice(1)))));
assert.equal(R.canPlace(s, 'farm', -1, 0).ok, false); assert.equal(R.canPlace(s, 'farm', 10, 9).ok, false);
assert.equal(R.moveBuilding(s, s.buildings[1].id, 0, 18).ok, true);
const walls = R.placeWallLine(s, 0, 22, 4, 22, now); assert.equal(walls.ok, true); assert.equal(walls.count, 5);
assert.ok(walls.buildings.every(b => b.level === 1 && !b.readyAt)); assert.equal(R.capacity(s).busy, 0);
const beforeInvalid = JSON.stringify(s);
assert.equal(R.placeWallLine(s, 0, 22, 5, 22, now).ok, false); assert.equal(JSON.stringify(s), beforeInvalid, 'overlapping line is atomic');
assert.equal(R.placeWallLine(s, 0, 0, 1, 1, now).ok, false); assert.equal(JSON.stringify(s), beforeInvalid);
assert.equal(R.placeWallLine(s, -1, 23, 3, 23, now).ok, false); assert.equal(JSON.stringify(s), beforeInvalid);
assert.equal(new Set(s.buildings.map(b => b.id)).size, s.buildings.length);
const mine = R.placeBuilding(s, 'mine', 20, 18, now); assert.equal(mine.ok, true); assert.equal(mine.building.level, 0);
assert.equal(R.upgradeBuilding(s, s.buildings[0].id, now).ok, true);
assert.equal(R.capacity(s).busy, 2);
assert.equal(R.placeWallLine(s, 0, 23, 2, 23, now).ok, false, 'ordinary wall building needs a free builder');
advance(s, 70_000); assert.equal(s.buildings[0].level, 2); assert.equal(mine.building.level, 1);
assert.equal(s.gems, 160, 'first upgrade achievement granted once');
const wallUpgrade = R.upgradeBuilding(s, walls.building.id, now + 70_000); assert.ok(wallUpgrade.ok);
assert.equal(walls.building.level, 2); assert.equal(walls.building.readyAt, 0); assert.equal(s.gems, 160);
const farm = s.buildings.find(b => b.type === 'farm'); const grain = s.resources.grain;
assert.equal(R.collect(s, farm.id).ok, true); assert.ok(s.resources.grain > grain);
const moneyBeforeTraining = JSON.stringify(s.resources), countBefore = s.army.guard;
assert.equal(R.train(s, 'guard', 2, now + 70_000).ok, true); assert.equal(s.army.guard, countBefore + 2); assert.equal(s.training.length, 0);
assert.equal(JSON.stringify(s.resources), moneyBeforeTraining); assert.equal(R.train(s, 'guard', -1, now).ok, false);
assert.equal(R.train(s, 'healer', 1, now).ok, false); assert.equal(R.train(s, 'guard', 240, now).ok, false);
assert.equal(R.removeTroop(s, 'guard', 2).ok, true); assert.equal(R.removeTroop(s, 'guard', 100).ok, false);
assert.equal(R.quickTrain(s, now + 70_000).ok, true); assert.equal(R.capacity(s).used, R.capacity(s).army);
const legacy = fresh(); delete legacy.gems; delete legacy.builders; delete legacy.unitLevels; delete legacy.research; delete legacy.heroes; delete legacy.activeHero; delete legacy.achievements; delete legacy.ranked;
legacy.buildings = legacy.buildings.filter(b => !['laboratory', 'hero_hall', 'gem_mine'].includes(b.type));
legacy.training = [{ id: 'qlegacy', type: 'guard', readyAt: now + 3000 }];
const migrated = R.hydrate(JSON.stringify(legacy), now);
assert.equal(migrated.buildings.length, legacy.buildings.length, 'migration preserves old layouts without adding overlaps');
assert.equal(migrated.gems, 150); assert.equal(migrated.builders, 2); assert.equal(migrated.unitLevels.guard, 1); assert.equal(migrated.heroes.veer.level, 1);
advance(migrated, 3000); assert.equal(migrated.army.guard, 17, 'old paid training queues still finish');
assert.equal(R.hydrate('{broken', now).version, 1);
const broken = fresh(); broken.resources.coin = Infinity; broken.army.guard = 1e12; broken.gems = -500; broken.builders = 100; broken.buildings.push({ ...broken.buildings[0] });
const safe = R.hydrate(JSON.stringify(broken), now); assert.equal(safe.resources.coin, 0); assert.equal(safe.gems, 0); assert.equal(safe.builders, 4); assert.ok(R.capacity(safe).used <= R.capacity(safe).army);
assert.equal(safe.buildings.filter(b => b.type === 'fort').length, 1);
const offline = fresh(); advance(offline, R.OFFLINE_LIMIT * 20);
assert.equal(offline.buildings.find(b => b.type === 'farm').stored, R.CATALOG.farm.production.cap);
const gemGarden = offline.buildings.find(b => b.type === 'gem_mine'); assert.equal(gemGarden.stored, 16, 'only eight offline hours accrue gems');
assert.equal(R.collect(offline, gemGarden.id).amount, 16); assert.equal(offline.gems, 166);
const builders = fresh(); assert.equal(R.buyBuilder(builders).ok, true); assert.equal(builders.gems, 50); assert.equal(builders.builders, 3);
assert.equal(R.buyBuilder(builders).ok, false); builders.gems = 200; assert.equal(R.buyBuilder(builders).ok, true); assert.equal(builders.builders, 4); assert.equal(R.buyBuilder(builders).ok, false);
const finish = fresh(), fortId = finish.buildings[0].id;
assert.equal(R.upgradeBuilding(finish, fortId, now).ok, true);
const price = R.finishCost(finish, 'building', fortId, now); assert.ok(price.ok); assert.equal(price.cost, 6);
assert.equal(R.finishWithGems(finish, 'building', fortId, now).ok, true); assert.equal(finish.gems, 154);
const balance = finish.gems; assert.equal(R.finishWithGems(finish, 'building', fortId, now).ok, false); assert.equal(finish.gems, balance, 'finish cannot double spend');
resources(finish); assert.equal(R.upgradeBuilding(finish, fortId, now).ok, true);
const balanceStale = finish.gems; assert.equal(R.finishWithGems(finish, 'building', fortId, now + 200000).ok, false); assert.equal(finish.gems, balanceStale, 'naturally finished timer costs no gems');
assert.equal(finish.buildings[0].level, 3);
const research = fresh(); resources(research); level(research, 'fort', 2); level(research, 'laboratory', 2);
assert.equal(R.researchTroop(research, 'guard', now).ok, true); assert.equal(R.researchTroop(research, 'archer', now).ok, false);
assert.equal(R.finishWithGems(research, 'research', 'guard', now).ok, true); assert.equal(research.unitLevels.guard, 2);
assert.equal(R.effectiveUnit(research, 'guard').hp, 264); assert.equal(R.effectiveUnit(research, 'guard').damage, 36);
const boostedBattle = R.createBattle(research, R.RAIDS[0].id).battle, boostedGuard = R.deploy(boostedBattle, 'guard', 10, 22).unit;
assert.equal(boostedGuard.hp, 264); assert.equal(boostedGuard.level, 2);
const target = boostedBattle.buildings.find(b => b.type === 'fort'); boostedGuard.x = target.x - 0.5; boostedGuard.z = target.z + 0.5; boostedGuard.targetId = target.id; boostedGuard.pathRevision = boostedBattle.revision;
const targetHP = target.hp; R.tickBattle(boostedBattle, 0.1); assert.equal(targetHP - target.hp, 36, 'research changes actual combat damage'); R.finishRaid(research, boostedBattle, now);
const escrow = fresh(), started = R.createBattle(escrow, R.RAIDS[0].id); assert.ok(started.ok);
assert.equal(R.deploy(started.battle, 'guard', 12, 12).ok, false); assert.equal(R.deploy(started.battle, 'guard', 12, 22).ok, true);
assert.equal(R.deployHero(started.battle, 11, 22).ok, true);
const recovered = R.hydrate(JSON.stringify(escrow), now); assert.equal(recovered.army.guard, 15); assert.equal(recovered.heroes.veer.level, 1); assert.equal(recovered.activeRaid, null);
const retreat = R.finishRaid(escrow, started.battle, now); assert.equal(retreat.victory, false); assert.equal(escrow.army.guard, 15); assert.equal(escrow.heroes.veer.level, 1);
assert.equal(R.finishRaid(escrow, started.battle, now).ok, false);
function run(home, raidId, shouldDeploy = true) {
  const result = R.createBattle(home, raidId); assert.equal(result.ok, true); const b = result.battle;
  if (shouldDeploy) for (const type of ['elephant', 'guard', 'rider', 'engineer', 'archer', 'healer']) { let i = 0; while (b.reserve[type] > 0) { assert.ok(R.deploy(b, type, 5 + i++ % 14, 22).ok); } }
  for (let i = 0; i < 1850 && b.status === 'active'; i++) {
    R.tickBattle(b, 0.1); if (i === 250) R.castRain(b);
    for (const u of b.units.filter(u => u.hp > 0)) assert.ok(!b.buildings.some(e => e.hp > 0 && u.x > e.x && u.x < e.x + e.w && u.z > e.z && u.z < e.z + e.h), 'troops never walk through intact walls or structures');
  }
  assert.notEqual(b.status, 'active'); return b;
}
const victoryHome = fresh(), victory = run(victoryHome, R.RAIDS[0].id); assert.equal(victory.stars, 3);
const result = R.finishRaid(victoryHome, victory, now); assert.equal(result.reward.coin, R.RAIDS[0].reward.coin); assert.equal(result.gems, 25); assert.equal(victoryHome.gems, 175);
assert.equal(R.createBattle(fresh(), R.RAIDS[1].id).ok, false);
R.quickTrain(victoryHome, now); const repeated = R.finishRaid(victoryHome, run(victoryHome, R.RAIDS[0].id), now); assert.equal(repeated.reward.coin, Math.floor(R.RAIDS[0].reward.coin * 0.3)); assert.equal(repeated.gems, 0);
const defeatHome = fresh(); for (const type of Object.keys(R.UNITS)) defeatHome.army[type] = 0; defeatHome.army.guard = 1;
const defeat = R.createBattle(defeatHome, R.RAIDS[0].id).battle; defeat.hero = null; assert.ok(R.deploy(defeat, 'guard', 11, 22).ok);
for (let i = 0; i < 1850 && defeat.status === 'active'; i++) R.tickBattle(defeat, 0.1);
assert.equal(defeat.status, 'defeat'); assert.equal(defeat.units[0].hp, 0); assert.equal(R.finishRaid(defeatHome, defeat, now).reward.coin, 0);
const timeoutHome = fresh(), timeout = run(timeoutHome, R.RAIDS[0].id, false); assert.equal(timeout.elapsed, 180); assert.equal(timeout.status, 'defeat'); R.finishRaid(timeoutHome, timeout, now); assert.equal(timeoutHome.army.guard, 16);
const campaign = fresh(); level(campaign, 'camp', 3);
for (const raid of R.RAIDS) {
  campaign.army = { ...campaign.army, guard: 20, archer: 18, engineer: 6, rider: 4, elephant: 4, healer: 3 };
  assert.ok(R.capacity(campaign).used <= R.capacity(campaign).army);
  const b = run(campaign, raid.id); assert.equal(b.status, 'victory'); if (raid.difficulty >= 2) assert.ok(b.buildings.some(e => e.type === 'wall' && e.hp === 0));
  R.finishRaid(campaign, b, now); console.log('Campaign:', raid.name, b.stars, 'stars,', Math.round(b.elapsed), 'seconds');
}
const heroes = fresh(); resources(heroes); level(heroes, 'fort', 2); level(heroes, 'hero_hall', 2); advance(heroes, 1);
assert.equal(heroes.heroes.tara.level, 1); const veerUpgradePreview = R.heroInfo(heroes, 'veer').next; assert.equal(R.upgradeHero(heroes, 'veer', now + 1).ok, true); assert.equal(R.capacity(heroes).busy, 1);
const unavailable = R.createBattle(heroes, R.RAIDS[0].id).battle; assert.equal(unavailable.hero, null); R.finishRaid(heroes, unavailable, now + 1);
assert.equal(R.finishWithGems(heroes, 'hero', 'veer', now + 1).ok, true); assert.equal(heroes.heroes.veer.level, 2);
const heroBattle = R.createBattle(heroes, R.RAIDS[0].id).battle, hero = R.deployHero(heroBattle, 11, 22).unit;
assert.deepEqual(R.heroInfo(heroes, 'veer').current, { hp: hero.maxHp, damage: hero.spec.damage }, 'current hero comparison matches actual combat stats');
assert.deepEqual(veerUpgradePreview, { hp: hero.maxHp, damage: hero.spec.damage }, 'next hero comparison predicts upgraded deployment stats');
assert.equal(R.deployHero(heroBattle, 10, 22).ok, false); hero.hp = 100; assert.equal(R.heroAbility(heroBattle).ok, true); assert.ok(hero.hp > 100); assert.equal(hero.rushUntil, 8); assert.equal(R.heroAbility(heroBattle).ok, false);
const heroTarget = heroBattle.buildings.find(b => b.type === 'fort'); hero.x = heroTarget.x - 0.5; hero.z = heroTarget.z + 0.5; hero.targetId = heroTarget.id; hero.pathRevision = heroBattle.revision;
const heroTargetHP = heroTarget.hp; R.tickBattle(heroBattle, 0.1); assert.ok(Math.abs(heroTargetHP - heroTarget.hp - hero.spec.damage * 1.8) < 1e-8, 'Battle Cry boosts real damage');
R.finishRaid(heroes, heroBattle, now + 1); assert.equal(heroes.heroes.veer.level, 2);
assert.equal(R.selectHero(heroes, 'tara').ok, true); const taraBattle = R.createBattle(heroes, R.RAIDS[0].id).battle; R.deployHero(taraBattle, 11, 22);
const totalBefore = taraBattle.buildings.reduce((n, b) => n + b.hp, 0); assert.equal(R.heroAbility(taraBattle).ok, true); assert.ok(taraBattle.buildings.reduce((n, b) => n + b.hp, 0) < totalBefore); assert.equal(R.heroAbility(taraBattle).ok, false); R.finishRaid(heroes, taraBattle, now);
const ranked = fresh(); const initialLeague = R.getRanked(ranked, now); assert.equal(initialLeague.league, 'Copper'); assert.equal(initialLeague.entries.filter(e => e.ai).length, 9);
for (let i = 0; i < 6; i++) {
  const attempt = R.startRanked(ranked, now); assert.ok(attempt.ok); assert.equal(ranked.ranked.attacksUsed, i + 1);
  if (i === 0) { const restored = R.hydrate(JSON.stringify(ranked), now); assert.equal(restored.ranked.attacksUsed, 1, 'refresh does not refund ranked attempts'); }
  for (const b of attempt.battle.buildings) b.hp = 0;
  const settled = R.finishRaid(ranked, attempt.battle, now); assert.equal(settled.scoreGain, 400); assert.equal(R.finishRaid(ranked, attempt.battle, now).ok, false);
}
assert.equal(ranked.ranked.score, 2400); assert.equal(R.startRanked(ranked, now).ok, false); assert.equal(Object.keys(ranked.raidStars).length, 0, 'ranked does not change campaign progression');
const gemsBeforeWeek = ranked.gems, nextWeek = initialLeague.endsAt + 1;
const promoted = R.getRanked(ranked, nextWeek); assert.equal(promoted.tier, 1); assert.equal(promoted.attacksUsed, 0); assert.equal(promoted.score, 0); assert.equal(ranked.gems, gemsBeforeWeek + 30);
R.getRanked(ranked, nextWeek); assert.equal(ranked.gems, gemsBeforeWeek + 30, 'rollover reward cannot repeat');
const roundtrip = R.hydrate(JSON.stringify(ranked), nextWeek); R.getRanked(roundtrip, nextWeek); assert.equal(roundtrip.gems, ranked.gems);
roundtrip.ranked.tier = 2; roundtrip.ranked.attacksUsed = 1; roundtrip.ranked.score = 0; assert.equal(R.getRanked(roundtrip, promoted.endsAt + 1).tier, 1, 'bottom-three participants demote');
const crossing = fresh(); const old = R.startRanked(crossing, now); for (const b of old.battle.buildings) b.hp = 0;
assert.equal(R.finishRaid(crossing, old.battle, nextWeek).scoreGain, 0, 'old-week battles cannot add points to a new week');
const practiceHome = fresh(); level(practiceHome, 'archer_tower', 3); level(practiceHome, 'wall', 2);
const originalArmy = { ...practiceHome.army }, homeLayout = JSON.stringify(practiceHome.buildings);
const practice = R.startPractice(practiceHome).battle;
assert.equal(practice.kind, 'practice'); assert.equal(practice.raid.name, 'Test your defenses');
assert.deepEqual(practice.buildings.map(b => [b.sourceId, b.type, b.x, b.z, b.level]), practiceHome.buildings.map(b => [b.id, b.type, b.x, b.z, b.level]), 'practice copies exact own layout');
const practicedTower = practice.buildings.find(b => b.type === 'archer_tower');
assert.equal(practicedTower.maxHp, R.upgradeInfo(practiceHome, practicedTower.sourceId).current.hp);
assert.equal(practicedTower.damage, 32); assert.equal(practice.buildings.find(b => b.type === 'wall').maxHp, 513);
const practiceGuard = R.deploy(practice, 'guard', 12, 0).unit;
for (let i = 0; i < 3; i++) R.tickBattle(practice, 0.2);
assert.equal(practiceGuard.hp, practiceGuard.maxHp - 32, 'own upgraded tower deals its actual previewed damage');
assert.equal(JSON.stringify(practiceHome.buildings), homeLayout, 'practice damage never mutates the village');
const practiceReload = R.hydrate(JSON.stringify(practiceHome), now); assert.deepEqual(practiceReload.army, originalArmy, 'practice refresh restores deployed and undeployed troops');
const corruptPractice = JSON.parse(JSON.stringify(practiceHome)); corruptPractice.activeRaid.originalArmy.guard = 1e9;
assert.equal(R.hydrate(corruptPractice, now).army.guard, originalArmy.guard - 1, 'invalid practice snapshots cannot grant unbounded refunds');
const otherKind = JSON.parse(JSON.stringify(practiceHome)); otherKind.activeRaid.kind = 'campaign';
assert.equal(R.hydrate(otherKind, now).army.guard, originalArmy.guard - 1, 'campaign cannot use practice refunds');
const beforePracticeMoney = JSON.stringify(practiceHome.resources), beforePracticeGems = practiceHome.gems;
const practiceRetreat = R.finishRaid(practiceHome, practice, now);
assert.equal(practiceRetreat.practice, true); assert.deepEqual(practiceHome.army, originalArmy); assert.equal(practiceRetreat.gems, 0); assert.equal(practiceRetreat.scoreGain, 0);
assert.equal(R.finishRaid(practiceHome, practice, now).ok, false); assert.equal(JSON.stringify(practiceHome.resources), beforePracticeMoney); assert.equal(practiceHome.gems, beforePracticeGems);
assert.equal(practiceHome.totalRaids, 0); assert.equal(practiceHome.ranked.attacksUsed, 0); assert.deepEqual(practiceHome.raidStars, {});
const practiceVictoryHome = fresh(); level(practiceVictoryHome, 'camp', 3);
practiceVictoryHome.army = { ...practiceVictoryHome.army, guard: 20, archer: 18, engineer: 6, rider: 4, elephant: 4, healer: 3 };
const victoryArmy = { ...practiceVictoryHome.army }, victoryResources = JSON.stringify(practiceVictoryHome.resources);
const practiceVictory = R.startPractice(practiceVictoryHome).battle;
for (const type of ['elephant', 'guard', 'rider', 'engineer', 'archer', 'healer']) { let i = 0; while (practiceVictory.reserve[type] > 0) assert.ok(R.deploy(practiceVictory, type, 5 + i++ % 14, 22).ok); }
R.deployHero(practiceVictory, 11, 22);
for (let i = 0; i < 1850 && practiceVictory.status === 'active'; i++) {
  R.tickBattle(practiceVictory, 0.1);
  for (const u of practiceVictory.units.filter(u => u.hp > 0)) assert.ok(!practiceVictory.buildings.some(b => b.hp > 0 && u.x > b.x && u.x < b.x + b.w && u.z > b.z && u.z < b.z + b.h), 'own walls block practice troop movement');
}
assert.equal(practiceVictory.stars, 3, 'practice can complete through real combat');
const practiceResult = R.finishRaid(practiceVictoryHome, practiceVictory, now); assert.deepEqual(practiceResult.reward, { coin: 0, grain: 0, wood: 0, iron: 0 });
assert.equal(practiceResult.firstWin, false); assert.equal(practiceResult.gems, 0); assert.equal(practiceResult.nextRaid, null);
assert.deepEqual(practiceVictoryHome.army, victoryArmy); assert.equal(practiceVictoryHome.heroes.veer.level, 1); assert.equal(JSON.stringify(practiceVictoryHome.resources), victoryResources); assert.equal(practiceVictoryHome.gems, 150);
const expanded = fresh(); level(expanded, 'barracks', 3);
for (const type of ['bowler', 'miner', 'yeti', 'garuda']) { assert.equal(expanded.army[type], 0); assert.equal(expanded.unitLevels[type], 1); assert.equal(R.train(expanded, type, 1, now).ok, true, `${type} can prepare with housing`); if (type !== 'garuda') R.removeTroop(expanded, type); }
const oldRosterSave = fresh(); for (const type of ['bowler', 'miner', 'yeti', 'garuda']) { delete oldRosterSave.army[type]; delete oldRosterSave.unitLevels[type]; }
const updatedRoster = R.hydrate(oldRosterSave, now); for (const type of ['bowler', 'miner', 'yeti', 'garuda']) { assert.equal(updatedRoster.army[type], 0); assert.equal(updatedRoster.unitLevels[type], 1); }
function roleBattle() { const home = fresh(); home.army = Object.fromEntries(Object.keys(R.UNITS).map(type => [type, 1])); return R.createBattle(home, R.RAIDS[0].id).battle; }
function enemy(type, x, z, id = type) { return { id, type, x, z, w: R.CATALOG[type].w, h: R.CATALOG[type].h, level: 1, hp: 10000, maxHp: 10000, attackTimer: 0 }; }
const bowlerBattle = roleBattle(); const bowlerFort = enemy('fort', 10, 10), neighbor = enemy('wall', 9, 10); bowlerBattle.buildings = [bowlerFort, neighbor];
const bowler = R.deploy(bowlerBattle, 'bowler', 0, 10).unit; bowler.x = 7; bowler.z = 10.5; bowler.targetId = bowlerFort.id; bowler.pathRevision = bowlerBattle.revision;
R.tickBattle(bowlerBattle, 0.1); assert.equal(bowlerFort.hp, 10000 - R.UNITS.bowler.damage); assert.equal(neighbor.hp, 10000 - R.UNITS.bowler.damage, 'bowler splashes an adjacent wall');
const minerBattle = roleBattle(); minerBattle.buildings = [enemy('fort', 10, 9), ...Array.from({ length: 24 }, (_, z) => enemy('wall', 8, z, `wall${z}`))];
const miner = R.deploy(minerBattle, 'miner', 0, 10).unit; let passedUnderWall = false;
for (let i = 0; i < 100; i++) { R.tickBattle(minerBattle, 0.1); if (miner.x > 8 && miner.x < 9) passedUnderWall = true; assert.ok(!(miner.x > 10 && miner.x < 14 && miner.z > 9 && miner.z < 13), 'miner cannot tunnel through buildings'); }
assert.ok(passedUnderWall, 'miner crosses a solid wall line'); assert.ok(minerBattle.buildings.filter(b => b.type === 'wall').every(b => b.hp === 10000), 'miner bypasses rather than destroys walls');
const airBattle = roleBattle(); const cannon = enemy('cannon', 4, 10); airBattle.buildings = [cannon, enemy('fort', 10, 9)];
const garuda = R.deploy(airBattle, 'garuda', 0, 11).unit; garuda.spec = { ...garuda.spec, speed: 0 }; garuda.attackTimer = 100;
for (let i = 0; i < 20; i++) R.tickBattle(airBattle, 0.1); assert.equal(garuda.hp, garuda.maxHp, 'cannons cannot damage airborne Garuda');
cannon.type = 'archer_tower'; cannon.attackTimer = 0; R.tickBattle(airBattle, 0.1); assert.ok(garuda.hp < garuda.maxHp, 'watchtowers can target airborne Garuda');
const flyBattle = roleBattle(); flyBattle.buildings = [enemy('fort', 10, 9), ...Array.from({ length: 24 }, (_, z) => enemy('wall', 8, z, `wall${z}`))];
const flier = R.deploy(flyBattle, 'garuda', 0, 10).unit; flier.spec = { ...flier.spec, range: 0.85 }; let flewOverWall = false;
for (let i = 0; i < 60; i++) { R.tickBattle(flyBattle, 0.1); if (flier.x > 8 && flier.x < 9) flewOverWall = true; } assert.ok(flewOverWall);
const yetiBattle = roleBattle(), yeti = R.deploy(yetiBattle, 'yeti', 0, 10).unit; assert.equal(yeti.maxHp, 1700); assert.ok(yeti.maxHp > R.UNITS.elephant.hp); assert.ok(yeti.spec.speed < R.UNITS.guard.speed);
const spellBattle = roleBattle(); const lightningFort = enemy('fort', 10, 10), lightningWall = enemy('wall', 9, 10); spellBattle.buildings = [lightningFort, lightningWall];
assert.equal(R.castSpell(spellBattle, 'lightning', NaN, 10).ok, false); assert.equal(spellBattle.spells.lightning, 1);
assert.equal(R.castSpell(spellBattle, 'lightning', 10, 10).ok, true); assert.equal(lightningFort.hp, 9650); assert.equal(lightningWall.hp, 9650); assert.equal(spellBattle.spells.lightning, 0);
assert.equal(R.castSpell(spellBattle, 'lightning', 10, 10).ok, false); assert.equal(lightningFort.hp, 9650, 'spent spells cannot deal duplicate damage');
const frozenBattle = roleBattle(), frozenTower = enemy('archer_tower', 4, 10); frozenBattle.buildings = [frozenTower, enemy('fort', 10, 9)];
const frozenGuard = R.deploy(frozenBattle, 'guard', 0, 11).unit; frozenGuard.spec = { ...frozenGuard.spec, speed: 0 }; frozenGuard.attackTimer = 100;
assert.equal(R.castSpell(frozenBattle, 'freeze', 5, 11).ok, true);
for (let i = 0; i < 50; i++) R.tickBattle(frozenBattle, 0.1); assert.equal(frozenGuard.hp, frozenGuard.maxHp, 'frozen defense cannot fire');
for (let i = 0; i < 15; i++) R.tickBattle(frozenBattle, 0.1); assert.ok(frozenGuard.hp < frozenGuard.maxHp, 'defense resumes fire after freeze expires'); assert.equal(frozenBattle.spellAreas.length, 0);
const rageBattle = roleBattle(), rageFort = enemy('fort', 10, 10); rageBattle.buildings = [rageFort];
const rageGuard = R.deploy(rageBattle, 'guard', 0, 10).unit; rageGuard.x = 9.5; rageGuard.z = 10.5; rageGuard.targetId = rageFort.id; rageGuard.pathRevision = rageBattle.revision;
assert.equal(R.castSpell(rageBattle, 'rage', 9.5, 10.5).ok, true); R.tickBattle(rageBattle, 0.1); assert.equal(rageFort.hp, 9955, 'rage boosts real damage by 50%');
assert.equal(R.castSpell(rageBattle, 'rage', 9.5, 10.5).ok, false); rageGuard.hp = 50;
assert.equal(R.castSpell(rageBattle, 'rain').ok, true); assert.ok(rageGuard.hp > 50); assert.equal(rageBattle.spells.rain, 0); assert.equal(R.castRain(rageBattle).ok, false);
for (let i = 0; i < 90; i++) R.tickBattle(rageBattle, 0.1); assert.equal(rageBattle.spellAreas.length, 0, 'rage expires');
const noStepwell = fresh(); noStepwell.buildings = noStepwell.buildings.filter(b => b.type !== 'stepwell'); const unprepared = R.createBattle(noStepwell, R.RAIDS[0].id).battle; assert.ok(Object.values(unprepared.spells).every(n => n === 0)); assert.equal(R.castSpell(unprepared, 'rage', 10, 10).ok, false);
assert.equal(R.CATALOG.wall.time, 0); assert.match(R.CATALOG.stepwell.description, /four spells/);
const collecting = fresh(), storage = R.capacity(collecting).storage;
collecting.resources.grain = storage.grain - 4; collecting.gems = 999998;
for (const [type, stored] of [['farm', 10.8], ['lumber', 12.2], ['mine', 7.9], ['market', 5.1], ['gem_mine', 3.9]]) collecting.buildings.find(b => b.type === type).stored = stored;
const bulk = R.collectAll(collecting); assert.equal(bulk.ok, true); assert.deepEqual(bulk.amounts, { coin: 5, grain: 4, wood: 12, iron: 7, gems: 1 });
assert.equal(collecting.resources.grain, storage.grain); assert.equal(collecting.gems, 999999); assert.ok(Math.abs(collecting.buildings.find(b => b.type === 'farm').stored - 6.8) < 1e-8, 'overflow remains at producer');
const afterBulk = JSON.stringify(collecting); assert.equal(R.collectAll(collecting).ok, false); assert.equal(JSON.stringify(collecting), afterBulk, 'nothing collectible leaves state untouched'); assert.equal(R.collectAll(null).ok, false);
const recipes = fresh(), recipeBase = JSON.stringify(recipes);
for (const badRecipe of [null, [], 'army', { guard: -1 }, { guard: 1.5 }, { guard: '2' }, { guard: NaN }, { guard: Infinity }, { guard: 241 }, { unknown: 0 }, { healer: 1 }, { guard: 49 }]) {
  assert.equal(R.applyArmyRecipe(recipes, badRecipe).ok, false); assert.equal(JSON.stringify(recipes), recipeBase, 'invalid or locked recipes are atomic');
}
const dirtyRecipe = R.armyRecipe({ army: { guard: 2.9, archer: Infinity, engineer: -4, rider: 999, invented: 9 } });
assert.equal(Object.keys(dirtyRecipe).length, 10); assert.equal(dirtyRecipe.guard, 2); assert.equal(dirtyRecipe.archer, 0); assert.equal(dirtyRecipe.engineer, 0); assert.equal(dirtyRecipe.rider, 240); assert.equal(dirtyRecipe.invented, undefined);
const requestedRecipe = { guard: 10, archer: 10, engineer: 4 }, recipeResources = JSON.stringify(recipes.resources), recipeGems = recipes.gems;
const applied = R.applyArmyRecipe(recipes, requestedRecipe); assert.ok(applied.ok); assert.equal(applied.used, 28); assert.deepEqual(R.armyRecipe(recipes), applied.recipe);
assert.equal(JSON.stringify(recipes.resources), recipeResources); assert.equal(recipes.gems, recipeGems); requestedRecipe.guard = 200; assert.equal(recipes.army.guard, 10, 'saved recipe is copied rather than aliased');
recipes.training.push({ id: 'legacy-capacity', type: 'guard', readyAt: now + 1000 }); const queuedRecipeState = JSON.stringify(recipes);
assert.equal(R.applyArmyRecipe(recipes, { guard: 48 }).ok, false); assert.equal(JSON.stringify(recipes), queuedRecipeState, 'recipes preserve room for legacy queues');
const recipeBattle = R.createBattle(recipes, R.RAIDS[0].id).battle, activeRecipeState = JSON.stringify(recipes); assert.equal(R.applyArmyRecipe(recipes, {}).ok, false); assert.equal(JSON.stringify(recipes), activeRecipeState); R.finishRaid(recipes, recipeBattle, now);
const scout = fresh(), beforeScout = JSON.stringify(scout);
for (const kind of ['campaign', 'ranked', 'practice']) {
  const preview = R.previewAttack(scout, kind, R.RAIDS[0].id, now); assert.ok(preview.ok); assert.equal(preview.battle.kind, kind); preview.battle.buildings[0].hp = 0;
  assert.equal(JSON.stringify(scout), beforeScout, 'scouting never changes army, attempts, gems or village');
}
assert.equal(R.previewAttack(scout, 'campaign', R.RAIDS[1].id, now).ok, false); assert.equal(R.previewAttack(scout, 'invalid', null, now).ok, false); assert.equal(R.previewAttack(scout, 'ranked', null, NaN).ok, false); assert.equal(JSON.stringify(scout), beforeScout);
scout.ranked.attacksUsed = 5; const lastSlotPreview = R.previewAttack(scout, 'ranked', null, now); assert.ok(lastSlotPreview.ok); assert.equal(scout.ranked.attacksUsed, 5);
const actualLastAttack = R.startRanked(scout, now); assert.ok(actualLastAttack.ok); assert.equal(scout.ranked.attacksUsed, 6); R.finishRaid(scout, actualLastAttack.battle, now);
assert.equal(R.startRanked(scout, now).ok, false, 'actual confirmation rechecks consumed attempts');
const beforeWeekPreview = JSON.stringify(scout), nextScoutWeek = R.getRanked(scout, now).endsAt + 1;
assert.ok(R.previewAttack(scout, 'ranked', null, nextScoutWeek).ok, 'preview uses current clock for weekly rollover'); assert.equal(JSON.stringify(scout), beforeWeekPreview, 'preview rollover does not grant real gems or reset real attempts');
R.tickHome(scout, nextScoutWeek); assert.ok(R.startRanked(scout, nextScoutWeek).ok, 'confirmation revalidates real state at the current time');
assert.equal(R.MAX_BUILDING_LEVEL, 15); assert.equal(R.MAX_ARMY_SPACE, 240);
assert.ok(Object.values(R.CATALOG).every(c => c.maxLevel === 15));
let upgradesChecked = 0;
for (const type of Object.keys(R.CATALOG)) {
  const kingdom = fresh(); let clock = now;
  if (type !== 'fort') level(kingdom, 'fort', 15);
  let building = kingdom.buildings.find(b => b.type === type);
  if (!building) { const built = R.placeBuilding(kingdom, type, 20, 18, clock); assert.ok(built.ok); building = built.building; clock = building.readyAt; R.tickHome(kingdom, clock); }
  assert.equal(building.level, 1);
  for (let nextLevel = 2; nextLevel <= 15; nextLevel++) {
    // A contemporaneous granary proves the displayed prices fit real storage limits.
    if (type === 'fort') level(kingdom, 'granary', Math.max(1, nextLevel - 1));
    kingdom.resources = { ...R.capacity(kingdom).storage };
    const info = R.upgradeInfo(kingdom, building.id);
    assert.equal(info.nextLevel, nextLevel); assert.ok(info.canUpgrade, `${type} ${nextLevel}: ${info.reason}`);
    assert.ok(info.next.hp > info.current.hp, `${type} has a meaningful durability upgrade at every level`);
    if (R.CATALOG[type].production) assert.ok(info.next.production > info.current.production);
    if (R.CATALOG[type].damage) assert.ok(info.next.damage > info.current.damage);
    for (const [resource, cost] of Object.entries(info.cost)) assert.ok(cost <= R.capacity(kingdom).storage[resource], `${type} ${nextLevel} cost exceeds available storage`);
    assert.ok(R.upgradeBuilding(kingdom, building.id, clock).ok);
    if (type === 'wall') assert.equal(building.readyAt, 0);
    else {
      assert.equal(building.level, nextLevel - 1); assert.equal(building.readyAt, clock + info.duration * 1000);
      const pending = R.hydrate(JSON.stringify(kingdom), clock).buildings.find(b => b.id === building.id);
      assert.equal(pending.level, nextLevel - 1); assert.equal(pending.upgradingTo, nextLevel); assert.equal(pending.readyAt, building.readyAt, 'high-level timer survives save validation unchanged');
      clock = building.readyAt; R.tickHome(kingdom, clock);
    }
    assert.equal(building.level, nextLevel);
    assert.equal(R.hydrate(JSON.stringify(kingdom), clock).buildings.find(b => b.id === building.id).level, nextLevel);
    assert.equal(decodeSave(encodeSave(kingdom)).buildings.find(b => b.id === building.id).level, nextLevel, 'every intermediate level imports intact');
    upgradesChecked++;
  }
  const final = R.upgradeInfo(kingdom, building.id); assert.equal(final.canUpgrade, false); assert.equal(final.nextLevel, 15); assert.match(final.reason, /15/);
  const beforeRejectedUpgrade = JSON.stringify(kingdom.resources); assert.equal(R.upgradeBuilding(kingdom, building.id, clock).ok, false); assert.equal(JSON.stringify(kingdom.resources), beforeRejectedUpgrade);
  const finalPractice = R.startPractice(kingdom); assert.ok(finalPractice.ok); const copied = finalPractice.battle.buildings.find(b => b.sourceId === building.id); assert.equal(copied.level, 15); assert.equal(copied.maxHp, final.current.hp); if (R.CATALOG[type].damage) assert.equal(copied.damage, final.current.damage);
}
assert.equal(upgradesChecked, 210);
const largeCamps = fresh(); level(largeCamps, 'fort', 15); level(largeCamps, 'camp', 3);
const existingCamp = largeCamps.buildings.find(b => b.type === 'camp');
largeCamps.buildings.push({ ...existingCamp, id: `b${largeCamps.nextId++}`, x: 0, z: 18 }, { ...existingCamp, id: `b${largeCamps.nextId++}`, x: 20, z: 18 });
assert.ok(largeCamps.buildings.every(b => R.canPlace(largeCamps, b.type, b.x, b.z, b.id).ok));
assert.equal(R.capacity(largeCamps).army, 240); assert.equal(R.quickTrain(largeCamps, now).ok, true); assert.equal(R.capacity(largeCamps).used, 240);
assert.equal(R.capacity(R.hydrate(JSON.stringify(largeCamps), now)).used, 240, 'existing level-three full armies are preserved');
const cappedUpgrade = R.upgradeInfo(largeCamps, existingCamp.id); assert.equal(cappedUpgrade.current.capacity, 240); assert.equal(cappedUpgrade.next.capacity, 240); assert.match(cappedUpgrade.requires, /durability only/); assert.ok(cappedUpgrade.next.hp > cappedUpgrade.current.hp);
for (const camp of largeCamps.buildings.filter(b => b.type === 'camp')) camp.level = 15;
assert.equal(R.capacity(largeCamps).army, 240); assert.equal(R.train(largeCamps, 'guard', 1, now).ok, false);
const oneCamp = fresh(); for (let n = 1; n <= 15; n++) { level(oneCamp, 'camp', n); assert.equal(R.capacity(oneCamp).army, 24 + (n <= 3 ? n * 24 : 72 + (n - 3) * 2)); }
const corruptLevel = fresh(); corruptLevel.buildings[0].level = 16; assert.equal(R.hydrate(corruptLevel, now).buildings[0].level, 15); assert.throws(() => decodeSave(JSON.stringify(corruptLevel)), /invalid village/);
const cappedResearch = fresh(); level(cappedResearch, 'fort', 15); level(cappedResearch, 'laboratory', 15); level(cappedResearch, 'hero_hall', 15); cappedResearch.unitLevels.guard = 3; cappedResearch.heroes.veer.level = 3;
assert.equal(R.researchInfo(cappedResearch, 'guard').canResearch, false); assert.equal(R.heroInfo(cappedResearch, 'veer').canUpgrade, false);
console.log('PASS: complete rules suite plus all 210 building upgrades, levels 1–15 save/import/timers/practice, feasible costs, unchanged troop/hero ceilings and 240-space army protection.');
