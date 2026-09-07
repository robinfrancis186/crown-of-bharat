// Guided onboarding and hero equipment: sequencing, costs, combat effect and migration.
import assert from 'node:assert/strict';
import * as R from '../src/rules.js';

const now = Date.UTC(2026, 0, 5);
const fresh = () => R.newGame(now);

// --- Onboarding -------------------------------------------------------------------
const rookie = fresh();
const seen = [];
for (let i = 0; i < 40; i++) {
  const step = R.tutorialState(rookie);
  if (!step) break;
  assert.ok(step.number >= 1 && step.number <= step.total, 'step numbering stays in range');
  assert.ok(step.cta && step.title && step.body, `${step.id} has readable guidance`);
  seen.push(step.id);
  if (step.acknowledge) { assert.equal(R.acknowledgeTutorial(rookie, step.id).ok, true); continue; }
  if (step.id === 'build') rookie.buildings.push({ id: 'bx', type: 'farm', x: 19, z: 19, w: 3, h: 3, level: 1, builtAt: now, readyAt: 0, upgradingTo: 0, stored: 0 });
  if (step.id === 'capital') rookie.buildings.find(b => b.type === 'fort').level = 2;
  if (step.id === 'army') R.quickTrain(rookie, now);
  if (step.id === 'attack') rookie.totalRaids = 1;
  if (step.id === 'defend') rookie.buildings.push({ id: 'by', type: 'archer_tower', x: 1, z: 1, w: 2, h: 2, level: 1, builtAt: now, readyAt: 0, upgradingTo: 0, stored: 0 });
}
assert.deepEqual(seen, ['welcome', 'collect', 'build', 'capital', 'army', 'attack', 'hero', 'defend'], 'every step is reached, in order');
assert.equal(R.tutorialState(rookie), null, 'the guide finishes');
assert.equal(R.acknowledgeTutorial(fresh(), 'defend').ok, false, 'steps cannot be acknowledged out of order');
const skipped = fresh(); R.skipTutorial(skipped);
assert.equal(R.tutorialState(skipped), null, 'the guide can be dismissed');
// A veteran save predating onboarding must not be dragged back to step one.
const veteran = R.hydrate(JSON.stringify({ ...fresh(), totalRaids: 6, tutorial: undefined }), now);
assert.equal(R.tutorialState(veteran), null, 'existing players skip onboarding');
const newcomer = R.hydrate(JSON.stringify(fresh()), now);
assert.equal(R.tutorialState(newcomer).id, 'welcome', 'a new save starts the guide');
const partial = fresh(); R.acknowledgeTutorial(partial, 'welcome');
assert.equal(R.tutorialState(R.hydrate(JSON.stringify(partial), now)).id, 'collect', 'progress survives a save');

// --- Hero equipment ---------------------------------------------------------------
const hall = level => { const s = fresh(); s.buildings.find(b => b.type === 'fort').level = 15; s.buildings.find(b => b.type === 'hero_hall').level = level; s.heroes.tara.level = 1; s.ore = 5000; return s; };
const locked = hall(1);
assert.equal(R.equipmentInfo(locked, 'drum').canUpgrade, false, 'high-tier equipment is gated by the hall');
assert.match(R.equipmentInfo(locked, 'drum').reason, /Hall of Heroes level 3/);
assert.equal(R.heroSlots(locked, 'veer')[1].unlocked, false, 'the second slot is gated by the hall');
assert.equal(R.equipItem(locked, 'veer', 1, 'talwar').ok, false, 'a locked slot rejects equipment');

const kit = hall(3);
assert.equal(R.forgeEquipment(kit, 'talwar').ok, true);
assert.equal(R.heroSlots(kit, 'veer')[0].itemId, 'talwar', 'a newly forged piece is equipped automatically');
assert.equal(R.equipItem(kit, 'veer', 0, 'longbow').ok, false, "Tara's equipment cannot be worn by Veer");
assert.equal(R.equipItem(kit, 'veer', 1, 'bulwark').ok, false, 'unforged equipment cannot be equipped');
assert.equal(R.equipItem(kit, 'tara', 0, 'talwar').ok, false, 'equipment stays with its own hero');

const poor = hall(3); poor.ore = 10;
assert.equal(R.forgeEquipment(poor, 'talwar').ok, false, 'forging needs ore');
assert.match(R.equipmentInfo(poor, 'talwar').reason, /more ore/);

// Costs rise, the ceiling holds, and ore is actually spent.
let spent = 0, level = 0;
for (let i = 0; i < R.MAX_EQUIPMENT_LEVEL; i++) {
  const before = R.equipmentInfo(kit, 'bulwark'), ore = kit.ore;
  const forged = R.forgeEquipment(kit, 'bulwark');
  assert.equal(forged.ok, true, `bulwark reaches level ${i + 1}`);
  assert.equal(kit.ore, ore - before.cost.ore, 'ore is charged exactly once');
  assert.ok(before.cost.ore > spent, 'each level costs more than the last');
  spent = before.cost.ore; level = forged.level;
}
assert.equal(level, R.MAX_EQUIPMENT_LEVEL);
assert.equal(R.forgeEquipment(kit, 'bulwark').ok, false, 'equipment stops at its maximum level');

// The stat panel and the unit that actually fights must agree.
R.equipItem(kit, 'veer', 0, 'talwar'); R.equipItem(kit, 'veer', 1, 'bulwark');
const info = R.heroInfo(kit, 'veer');
assert.ok(info.current.hp > info.base.hp && info.current.damage > info.base.damage, 'equipment improves the hero');
R.quickTrain(kit, now);
const battle = R.createBattle(kit, R.RAIDS[0].id).battle;
const unit = R.deployHero(battle, 11, 22).unit;
assert.deepEqual({ hp: unit.maxHp, damage: unit.spec.damage }, info.current, 'the fielded hero matches the panel');

// Equipment changes the ability itself, not only the stat line.
const bare = hall(3); bare.heroes.veer.level = 1;
R.quickTrain(bare, now);
const plain = R.createBattle(bare, R.RAIDS[0].id).battle, plainHero = R.deployHero(plain, 11, 22).unit;
plainHero.hp = 1; R.heroAbility(plain);
const plainHeal = plainHero.hp, plainRush = plainHero.rushUntil;
const drummed = hall(3); drummed.heroes.veer.level = 1;
R.forgeEquipment(drummed, 'drum'); R.forgeEquipment(drummed, 'drum'); R.forgeEquipment(drummed, 'drum');
R.quickTrain(drummed, now);
const boosted = R.createBattle(drummed, R.RAIDS[0].id).battle, boostedHero = R.deployHero(boosted, 11, 22).unit;
boostedHero.hp = 1; R.heroAbility(boosted);
assert.ok(boostedHero.hp > plainHeal, 'the war drum heals more');
assert.ok(boostedHero.rushUntil > plainRush, 'the war drum lasts longer');

// Ore is won in battle and never appears from nowhere.
const earner = fresh(); R.quickTrain(earner, now);
assert.equal(earner.ore, 0, 'a new kingdom starts with no ore');
const won = R.createBattle(earner, R.RAIDS[0].id).battle;
let i = 0;
for (const type of Object.keys(won.reserve)) while (won.reserve[type] > 0) R.deploy(won, type, 5 + i++ % 14, 22);
for (let f = 0; f < 1850 && won.status === 'active'; f++) R.tickBattle(won, 0.1);
const result = R.finishRaid(earner, won, now);
assert.ok(result.ore > 0 && earner.ore === result.ore, 'a victory awards the ore it reports');
const practiceState = fresh(); R.quickTrain(practiceState, now);
const practice = R.startPractice(practiceState).battle;
for (let f = 0; f < 1850 && practice.status === 'active'; f++) R.tickBattle(practice, 0.1);
assert.equal(R.finishRaid(practiceState, practice, now).ore, 0, 'practice never awards ore');

// Saves carry equipment, ore and slots; nonsense in a save is discarded.
const round = R.hydrate(JSON.stringify(kit), now);
assert.equal(round.ore, kit.ore);
assert.deepEqual(round.equipment.bulwark, { level: R.MAX_EQUIPMENT_LEVEL });
assert.deepEqual(round.heroes.veer.slots, ['talwar', 'bulwark']);
const tampered = R.hydrate(JSON.stringify({ ...kit, ore: 1e12, equipment: { talwar: { level: 99 }, ghost: { level: 3 } }, heroes: { ...kit.heroes, veer: { ...kit.heroes.veer, slots: ['longbow', 'ghost'] } } }), now);
assert.equal(tampered.ore, 999999, 'ore is capped');
assert.equal(tampered.equipment.talwar.level, R.MAX_EQUIPMENT_LEVEL, 'equipment level is capped');
assert.equal(tampered.equipment.ghost, undefined, 'unknown equipment is dropped');
assert.deepEqual(tampered.heroes.veer.slots, [null, null], 'invalid slots are emptied');

console.log('PASS: eight-step onboarding sequences, migrates and skips correctly; equipment gates, costs, combat effect, ability changes, ore economy and save migration all hold.');
