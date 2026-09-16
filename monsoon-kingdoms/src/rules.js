// Crown of Bharat: deterministic, renderer-independent game rules.
export const GRID = 24;
export const MAX_BUILDING_LEVEL = 15;
export const MAX_ARMY_SPACE = 240;
export const OFFLINE_LIMIT = 8 * 60 * 60 * 1000;
const currencies = ['coin', 'grain', 'wood', 'iron'];
const fail = reason => ({ ok: false, reason });
const validState = s => s && Array.isArray(s.buildings) && s.resources && s.army && Array.isArray(s.training);
const money = (coin = 0, grain = 0, wood = 0, iron = 0) => ({ coin, grain, wood, iron });
export const CATALOG = {
  fort: { name: 'Taj Mahal', description: 'The heart of your kingdom. Upgrade to unlock your full army.', w: 4, h: 4, cost: money(900, 0, 600, 120), time: 35, hp: 1400, maxLevel: MAX_BUILDING_LEVEL, limit: 1, unlock: 1 },
  farm: { name: 'Rice Fields', description: 'Terraced fields produce grain for your army.', w: 3, h: 3, cost: money(100, 0, 70), time: 12, hp: 350, maxLevel: MAX_BUILDING_LEVEL, limit: 4, unlock: 1, production: { resource: 'grain', rate: 1.1, cap: 500 } },
  lumber: { name: 'Teak Yard', description: 'Seasoned teak supplies buildings and siege engines.', w: 3, h: 3, cost: money(100, 50), time: 12, hp: 350, maxLevel: MAX_BUILDING_LEVEL, limit: 3, unlock: 1, production: { resource: 'wood', rate: 0.85, cap: 450 } },
  mine: { name: 'Iron Quarry', description: 'Quarry iron for stronger walls and weapons.', w: 3, h: 3, cost: money(160, 0, 100), time: 16, hp: 400, maxLevel: MAX_BUILDING_LEVEL, limit: 3, unlock: 1, production: { resource: 'iron', rate: 0.55, cap: 350 } },
  granary: { name: 'Royal Granary', description: 'Expands storage for all four resources.', w: 3, h: 3, cost: money(150, 0, 120), time: 16, hp: 550, maxLevel: MAX_BUILDING_LEVEL, limit: 3, unlock: 1 },
  stepwell: { name: 'Sacred Stepwell', description: 'Prepares four spells per battle: Monsoon Blessing, Thunderbolt, Himalayan Frost and Warrior Spirit.', w: 3, h: 3, cost: money(220, 0, 130, 30), time: 20, hp: 500, maxLevel: MAX_BUILDING_LEVEL, limit: 1, unlock: 1 },
  barracks: { name: 'Warrior Akhara', description: 'Trains soldiers. Higher levels unlock riders, elephants and healers.', w: 3, h: 3, cost: money(230, 80, 160), time: 20, hp: 550, maxLevel: MAX_BUILDING_LEVEL, limit: 1, unlock: 1 },
  camp: { name: 'Army Camp', description: 'Adds 24, 48 and 72 spaces at levels 1–3, then 2 more per level. Total army capacity is capped at 240.', w: 3, h: 3, cost: money(180, 0, 150), time: 18, hp: 420, maxLevel: MAX_BUILDING_LEVEL, limit: 3, unlock: 1 },
  archer_tower: { name: 'Watchtower', description: 'Long-range archers defend against advancing troops.', w: 2, h: 2, cost: money(150, 0, 120, 20), time: 18, hp: 580, maxLevel: MAX_BUILDING_LEVEL, limit: 5, unlock: 1, range: 7, damage: 20, cooldown: 0.9 },
  cannon: { name: 'Thunder Cannon', description: 'Heavy cannonballs damage clustered attackers.', w: 2, h: 2, cost: money(280, 0, 120, 100), time: 25, hp: 700, maxLevel: MAX_BUILDING_LEVEL, limit: 4, unlock: 2, range: 6, damage: 35, cooldown: 1.8 },
  wall: { name: 'Rampart', description: 'Blocks movement. Siege engineers breach it quickly.', w: 1, h: 1, cost: money(20, 0, 15, 5), time: 0, hp: 380, maxLevel: MAX_BUILDING_LEVEL, limit: 100, unlock: 1 },
  laboratory: { name: 'Royal Workshop', description: 'Research permanent troop improvements.', w: 3, h: 3, cost: money(260, 120, 160, 40), time: 25, hp: 550, maxLevel: MAX_BUILDING_LEVEL, limit: 1, unlock: 1 },
  hero_hall: { name: 'Hall of Heroes', description: 'Recruit six champions as your hall grows: Veer, Tara, Nila, Ayaan, Ira and Kabir at levels 1–6. Choose one to lead each battle.', w: 3, h: 3, cost: money(320, 160, 180, 60), time: 30, hp: 700, maxLevel: MAX_BUILDING_LEVEL, limit: 1, unlock: 1 },
  gem_mine: { name: 'Gem Garden', description: 'Produces one gem every 30 minutes per level; stores up to 20.', w: 2, h: 2, cost: money(350, 0, 160, 100), time: 30, hp: 450, maxLevel: MAX_BUILDING_LEVEL, limit: 1, unlock: 1, production: { resource: 'gems', rate: 1 / 1800, cap: 20 } },
  market: { name: 'Spice Bazaar', description: 'Caravans bring coin to your growing settlement.', w: 3, h: 3, cost: money(200, 0, 140), time: 18, hp: 440, maxLevel: MAX_BUILDING_LEVEL, limit: 2, unlock: 1, production: { resource: 'coin', rate: 1.15, cap: 550 } },
};
export const UNITS = {
  guard: { name: 'Talwar Guard', description: 'Sturdy frontline swordsman.', cost: money(12, 18), time: 3, space: 1, hp: 220, damage: 30, range: 0.85, speed: 2.5, cooldown: 0.85, unlock: 1 },
  archer: { name: 'Bamboo Archer', description: 'Shoots over walls from a safe distance.', cost: money(16, 20), time: 4, space: 1, hp: 110, damage: 24, range: 4.5, speed: 2.5, cooldown: 1, unlock: 1 },
  engineer: { name: 'Siege Engineer', description: 'Seeks walls and defenses. Deals triple damage to ramparts.', cost: money(25, 24, 0, 10), time: 5, space: 2, hp: 200, damage: 42, range: 0.85, speed: 2.3, cooldown: 0.9, unlock: 1 },
  rider: { name: 'Maratha Rider', description: 'Fast cavalry that hunts enemy defenses.', cost: money(35, 40), time: 6, space: 3, hp: 450, damage: 48, range: 0.85, speed: 3.5, cooldown: 0.9, unlock: 2 },
  elephant: { name: 'Elephant Rider', description: 'A mighty siege beast with exceptional endurance.', cost: money(90, 100, 0, 20), time: 10, space: 6, hp: 1300, damage: 100, range: 1.2, speed: 1.5, cooldown: 1.35, unlock: 3 },
  bowler: { name: 'Stone Bowler', description: 'Lobs heavy stones that splash nearby structures.', cost: money(), time: 0, space: 4, hp: 360, damage: 48, range: 3.2, speed: 2.1, cooldown: 1.25, unlock: 2, splashRadius: 1.8, targetLabel: 'Buildings · area damage' },
  miner: { name: 'Tunnel Miner', description: 'Burrows beneath ramparts to reach valuable buildings.', cost: money(), time: 0, space: 3, hp: 380, damage: 42, range: 0.85, speed: 2.7, cooldown: 0.9, unlock: 2, burrow: true, targetLabel: 'Buildings · ignores walls' },
  yeti: { name: 'Himalayan Yeti', description: 'A slow, durable melee powerhouse that absorbs heavy fire.', cost: money(), time: 0, space: 7, hp: 1700, damage: 95, range: 1.1, speed: 1.4, cooldown: 1.3, unlock: 3, targetLabel: 'Buildings · frontline tank' },
  garuda: { name: 'Garuda Rider', description: 'Flies over buildings and walls. Watchtowers can target it; cannons cannot.', cost: money(), time: 0, space: 4, hp: 330, damage: 46, range: 2.8, speed: 3, cooldown: 1.1, unlock: 3, flying: true, targetLabel: 'Buildings · airborne' },
  healer: { name: 'Monsoon Healer', description: 'Follows wounded allies and restores their health.', cost: money(55, 50), time: 7, space: 2, hp: 160, damage: 0, heal: 38, range: 3.5, speed: 2.6, cooldown: 1, unlock: 3 },
};
export const RAIDS = [
  ['riverbend', 'The River Toll', 'Konkan Coast', 'A mercenary captain has dammed the river and seized the rice boats. Break his outpost and let the caravans pass.', 'A lightly defended river station. Deploy on the southern bank and send guards ahead of archers.', 1, money(350, 280, 220, 90)],
  ['teakpass', 'Through the Teak', 'Western Ghats', 'The guild scouts have vanished in the teak forests. Their last message spoke of a fortified checkpoint.', 'Watchtowers cover the path. Riders seek defenses; engineers can open a route.', 2, money(500, 380, 300, 130)],
  ['saltroad', 'The Salt Road', 'Rann of Kutch', 'Salt caravans cannot cross the desert while the Iron Regent controls its wells. Reclaim the ancient route.', 'A cannon guards the inner court. Spread your troops to reduce splash damage.', 3, money(650, 480, 380, 190)],
  ['lotusgate', 'Lotus Gate', 'Deccan Plateau', 'A city of artisans waits behind sealed gates. The Regent demands their craft for his war machine.', 'Ramparts encircle the palace. Bring engineers, archers and a strong frontline.', 4, money(850, 600, 500, 260)],
  ['amberhill', 'The Amber Signal', 'Aravalli Hills', 'The last free hill beacon is under siege. Light its signal and the surrounding villages will rise.', 'Overlapping towers punish isolated troops. Keep healers behind your elephants.', 5, money(1050, 750, 650, 340)],
  ['monsoon', 'Return of the Rains', 'Narmada Citadel', 'The Iron Regent holds the headwaters in his final citadel. Open the gates and return the monsoon to the valley.', 'A complete fortified citadel. Upgrade your army camps and deploy from more than one side.', 6, money(1400, 1000, 850, 500)],
].map(([id, name, region, story, briefing, difficulty, reward]) => ({ id, layout: id, name, region, story, briefing, difficulty, reward, duration: 180 }));
const campHousing = level => level <= 3 ? Math.max(0, level) * 24 : 72 + (level - 3) * 2;
const emptyArmy = () => Object.fromEntries(Object.keys(UNITS).map(k => [k, 0]));
const levelOf = (s, type) => Math.max(0, ...s.buildings.filter(b => b.type === type && b.level > 0).map(b => b.level));
const createBuilding = (id, type, x, z, level = 1, now = 0) => ({ id, type, x, z, w: CATALOG[type].w, h: CATALOG[type].h, level, builtAt: now, readyAt: 0, upgradingTo: 0, stored: 0 });
export function newGame(now = Date.now()) {
  if (!Number.isFinite(now)) now = Date.now();
  // A small, playable settlement: food production and troop recruitment are ready.
  const positions = [['fort', 10, 9], ['farm', 5, 15], ['barracks', 10, 16]];
  return { version: 1, name: 'Surajgarh', resources: money(850, 650, 700, 180), buildings: positions.map(([t, x, z], i) => createBuilding(`b${i + 1}`, t, x, z, 1, now)), army: { ...emptyArmy(), guard: 6, archer: 4 }, training: [], lastTick: now, raidStars: {}, raidWins: {}, activeRaid: null, nextId: positions.length + 1, totalRaids: 0, gems: 150, builders: 2, unitLevels: Object.fromEntries(Object.keys(UNITS).map(t => [t, 1])), research: null, heroes: Object.fromEntries(Object.keys(HEROES).map(id => [id, { level: id === 'veer' ? 1 : 0, readyAt: 0, upgradingTo: 0, slots: [null, null] }])), activeHero: 'veer', ore: 0, equipment: {}, achievements: {}, ranked: freshRanked(now), tutorial: { acknowledged: [], skipped: false } };
}
export function capacity(state) {
  if (!validState(state)) return { army: 0, used: 0, queued: 0, builders: 2, busy: 0, storage: money() };
  const storage = 3000 + state.buildings.filter(b => b.type === 'granary').reduce((n, b) => n + b.level * 2000, 0);
  const countSpace = army => Object.entries(UNITS).reduce((n, [type, u]) => n + (army[type] || 0) * u.space, 0);
  return { army: Math.min(MAX_ARMY_SPACE, 24 + state.buildings.filter(b => b.type === 'camp').reduce((n, b) => n + campHousing(b.level), 0)), used: countSpace(state.army) + (state.activeRaid ? countSpace(state.activeRaid.reserve) : 0), queued: state.training.reduce((n, q) => n + UNITS[q.type].space, 0), builders: state.builders || 2, busy: state.buildings.filter(b => b.readyAt > 0).length + Object.values(state.heroes || {}).filter(h => h.readyAt > 0).length, storage: money(storage, storage, storage, storage) };
}
const affordable = (s, cost) => currencies.every(k => s.resources[k] >= (cost[k] || 0));
const charge = (s, cost) => currencies.forEach(k => s.resources[k] -= cost[k] || 0);
const upgradeCost = b => Object.fromEntries(currencies.map(k => [k, Math.ceil(CATALOG[b.type].cost[k] * (b.level + 1) * 0.8)]));
export { upgradeCost };
export function canPlace(state, type, x, z, excludeId) {
  if (!validState(state) || !Object.hasOwn(CATALOG, type)) return fail('Choose a valid building.');
  const c = CATALOG[type];
  if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || z < 0 || x + c.w > GRID || z + c.h > GRID) return fail('Keep the entire building inside your kingdom.');
  if (state.buildings.some(b => b.id !== excludeId && x < b.x + b.w && x + c.w > b.x && z < b.z + b.h && z + c.h > b.z)) return fail('That space is already occupied.');
  return { ok: true };
}
export function placeBuilding(state, type, x, z, now = Date.now()) {
  if (type === 'wall') return placeWallLine(state, x, z, x, z, now);
  const p = canPlace(state, type, x, z);
  if (!p.ok || !Number.isFinite(now)) return p.ok ? fail('Invalid time.') : p;
  tickHome(state, now);
  const c = CATALOG[type];
  if (state.activeRaid) return fail('Finish your raid before building.');
  if (levelOf(state, 'fort') < c.unlock) return fail(`Upgrade Taj Mahal to level ${c.unlock}.`);
  if (state.buildings.filter(b => b.type === type).length >= c.limit) return fail(`You can build up to ${c.limit} ${c.name}.`);
  if (capacity(state).busy >= capacity(state).builders) return fail('All builders are busy.');
  if (!affordable(state, c.cost)) return fail('Gather more resources first.');
  charge(state, c.cost);
  const building = createBuilding(`b${state.nextId++}`, type, x, z, 0, now);
  building.readyAt = now + c.time * 1000; building.upgradingTo = 1;
  state.buildings.push(building);
  return { ok: true, building };
}
export function moveBuilding(state, id, x, z) {
  if (!validState(state)) return fail('Invalid kingdom.');
  const b = state.buildings.find(b => b.id === id);
  if (!b) return fail('Building not found.');
  if (state.activeRaid) return fail('Finish your raid first.');
  if (b.readyAt) return fail('Wait for construction to finish.');
  const result = canPlace(state, b.type, x, z, id);
  if (result.ok) { b.x = x; b.z = z; }
  return result;
}
export function upgradeBuilding(state, id, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  tickHome(state, now);
  const info = upgradeInfo(state, id);
  if (!info.canUpgrade) return fail(info.reason);
  const b = state.buildings.find(b => b.id === id);
  charge(state, info.cost);
  if (b.type === 'wall') { b.level++; award(state, 'first_upgrade', 10); }
  else { b.upgradingTo = b.level + 1; b.readyAt = now + info.duration * 1000; }
  return { ok: true, building: b, cost: info.cost };
}
export function collect(state, id) {
  if (!validState(state)) return fail('Invalid kingdom.');
  const b = state.buildings.find(b => b.id === id), p = b && CATALOG[b.type].production;
  if (!p) return fail('This building does not produce resources.');
  const balance = p.resource === 'gems' ? state.gems : state.resources[p.resource];
  const limit = p.resource === 'gems' ? 999999 : capacity(state).storage[p.resource];
  const amount = Math.min(Math.floor(b.stored), Math.max(0, limit - balance));
  if (amount <= 0) return fail(b.stored < 1 ? 'More resources are on the way.' : 'Your storage is full. Upgrade a granary.');
  b.stored -= amount;
  if (p.resource === 'gems') state.gems += amount; else state.resources[p.resource] += amount;
  return { ok: true, amount, resource: p.resource };
}

export function collectAll(state) {
  const amounts = { ...money(), gems: 0 };
  if (!validState(state)) return { ...fail('Invalid kingdom.'), amounts };
  for (const b of state.buildings) {
    if (!CATALOG[b.type]?.production) continue;
    const result = collect(state, b.id);
    if (result.ok) amounts[result.resource] += result.amount;
  }
  return Object.values(amounts).some(amount => amount > 0) ? { ok: true, amounts } : { ...fail('Nothing can be collected yet, or your storage is full.'), amounts };
}
export function armyRecipe(state) {
  return Object.fromEntries(Object.keys(UNITS).map(type => {
    const count = state?.army?.[type];
    return [type, typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.min(240, Math.floor(count))) : 0];
  }));
}
export function applyArmyRecipe(state, recipe) {
  if (!validState(state)) return fail('Invalid kingdom.');
  if (state.activeRaid) return fail('Finish your battle before changing the army.');
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe) || ![Object.prototype, null].includes(Object.getPrototypeOf(recipe))) return fail('Choose a valid saved army composition.');
  if (Object.keys(recipe).some(type => !Object.hasOwn(UNITS, type))) return fail('This army recipe contains an unknown troop.');
  const army = emptyArmy(), barracks = levelOf(state, 'barracks');
  let used = 0;
  for (const [type, unit] of Object.entries(UNITS)) {
    const count = Object.hasOwn(recipe, type) ? recipe[type] : 0;
    if (!Number.isInteger(count) || count < 0 || count > 240) return fail('Troop counts must be whole numbers between 0 and 240.');
    if (count && unit.unlock > barracks) return fail(`${unit.name} requires Warrior Akhara level ${unit.unlock}.`);
    army[type] = count; used += count * unit.space;
  }
  const cap = capacity(state);
  if (used + cap.queued > cap.army) return fail(`This army needs ${used + cap.queued} spaces including queued troops; your camps hold ${cap.army}.`);
  state.army = army;
  return { ok: true, recipe: { ...army }, used, capacity: cap.army };
}
export function previewAttack(state, kind, id, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  if (!['campaign', 'ranked', 'practice'].includes(kind)) return fail('Choose Campaign, Royal League or Test Defenses.');
  try {
    const preview = structuredClone(state);
    const tick = tickHome(preview, now); if (!tick.ok) return tick;
    if (kind === 'campaign') return createBattle(preview, id);
    if (kind === 'ranked') return startRanked(preview, now);
    return startPractice(preview);
  } catch { return fail('The kingdom could not be prepared for scouting.'); }
}

export function train(state, type, count = 1, now = Date.now()) {
  if (!validState(state) || !Object.hasOwn(UNITS, type) || !Number.isInteger(count) || count < 1 || count > 240 || !Number.isFinite(now)) return fail('Choose a valid troop count.');
  tickHome(state, now);
  if (state.activeRaid) return fail('Finish your raid before preparing troops.');
  const u = UNITS[type];
  if (levelOf(state, 'barracks') < u.unlock) return fail(`Upgrade Warrior Akhara to level ${u.unlock}.`);
  const cap = capacity(state);
  if (cap.used + cap.queued + u.space * count > cap.army) return fail('Army camp is full. Build or upgrade a camp.');
  state.army[type] += count;
  return { ok: true, count, instant: true, cost: money() };
}
export function removeTroop(state, type, count = 1) {
  if (!validState(state) || !Object.hasOwn(UNITS, type) || !Number.isInteger(count) || count < 1 || count > state.army[type]) return fail('Choose troops currently in your army.');
  if (state.activeRaid) return fail('Finish your raid before changing your army.');
  state.army[type] -= count; return { ok: true, count };
}
export function quickTrain(state, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now) || state.activeRaid) return fail('Return to your village to prepare an army.');
  tickHome(state, now);
  const level = levelOf(state, 'barracks'), cap = capacity(state);
  let remaining = cap.army - cap.used - cap.queued, count = 0;
  const pattern = ['guard', 'guard', 'archer', 'archer', 'engineer', 'rider', 'bowler', 'miner', 'elephant', 'yeti', 'garuda', 'healer'].filter(t => UNITS[t].unlock <= level);
  while (pattern.some(t => UNITS[t].space <= remaining)) for (const type of pattern) if (UNITS[type].space <= remaining) { state.army[type]++; remaining -= UNITS[type].space; count++; }
  return count ? { ok: true, count } : fail('Your army camp is full.');
}

export function tickHome(state, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  const previous = Number.isFinite(state.lastTick) ? state.lastTick : now;
  if (now < previous) return { ok: true, changed: false };
  const due = state.buildings.some(b => b.readyAt && b.readyAt <= now) || state.training.some(q => q.readyAt <= now) || (state.research && state.research.readyAt <= now) || Object.values(state.heroes || {}).some(h => h.readyAt && h.readyAt <= now);
  const unlocked = unlockHeroes(state);
  if (now === previous && !due) return { ok: true, changed: unlocked };
  const start = Math.max(previous, now - OFFLINE_LIMIT);
  for (const b of state.buildings) {
    const p = CATALOG[b.type].production;
    if (p) {
      const before = b.readyAt && b.readyAt <= now ? Math.max(0, Math.min(now, b.readyAt) - start) : now - start;
      const after = b.readyAt && b.readyAt <= now ? Math.max(0, now - Math.max(start, b.readyAt)) : 0;
      const produced = (before * b.level + after * (b.upgradingTo || b.level)) * p.rate / 1000;
      b.stored = Math.min(p.cap * (p.resource === 'gems' ? 1 : (b.upgradingTo && b.readyAt <= now ? b.upgradingTo : b.level)), Math.max(0, b.stored + produced));
    }
    if (b.readyAt && b.readyAt <= now) { const wasUpgrade = b.level > 0; b.level = b.upgradingTo; b.upgradingTo = 0; b.readyAt = 0; if (wasUpgrade) award(state, 'first_upgrade', 10); }
  }
  while (state.training.length && state.training[0].readyAt <= now) { const q = state.training.shift(); state.army[q.type]++; }
  if (state.research && state.research.readyAt <= now) { state.unitLevels[state.research.type] = state.research.level; state.research = null; award(state, 'first_research', 15); }
  for (const hero of Object.values(state.heroes || {})) if (hero.readyAt && hero.readyAt <= now) { hero.level = hero.upgradingTo; hero.readyAt = 0; hero.upgradingTo = 0; }
  unlockHeroes(state);
  getRanked(state, now);
  state.lastTick = now;
  return { ok: true, changed: true };
}
export function hydrate(raw, now = Date.now()) {
  if (!Number.isFinite(now)) now = Date.now();
  const clean = newGame(now);
  try {
    const r = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!r || r.version !== 1 || !Array.isArray(r.buildings)) return clean;
    const finite = (v, fallback, min = 0, max = 1e12) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
    clean.name = typeof r.name === 'string' ? r.name.trim().slice(0, 28) || clean.name : clean.name;
    clean.lastTick = finite(r.lastTick, now, 0, now);
    clean.gems = Math.floor(finite(r.gems, 150, 0, 999999));
    clean.builders = Math.floor(finite(r.builders, 2, 2, 4));
    clean.achievements = Object.fromEntries(['first_upgrade', 'first_research', ...RAIDS.map(raid => `raid_${raid.id}`)].filter(k => r.achievements?.[k] === true).map(k => [k, true]));
    for (const type of Object.keys(UNITS)) clean.unitLevels[type] = Math.floor(finite(r.unitLevels?.[type], 1, 1, 3));
    for (const id of Object.keys(HEROES)) { const h = r.heroes?.[id]; clean.heroes[id] = { level: Math.floor(finite(h?.level, id === 'veer' ? 1 : 0, 0, 3)), readyAt: finite(h?.readyAt, 0, 0, now + 3600000), upgradingTo: Math.floor(finite(h?.upgradingTo, 0, 0, 3)), slots: [null, null] }; if (!clean.heroes[id].readyAt) clean.heroes[id].upgradingTo = 0; }
    clean.ore = Math.floor(finite(r.ore, 0, 0, 999999));
    clean.equipment = {};
    for (const [itemId, spec] of Object.entries(EQUIPMENT)) { const level = Math.floor(finite(r.equipment?.[itemId]?.level, 0, 0, MAX_EQUIPMENT_LEVEL)); if (level > 0) clean.equipment[itemId] = { level }; void spec; }
    for (const id of Object.keys(HEROES)) {
      const raw = Array.isArray(r.heroes?.[id]?.slots) ? r.heroes[id].slots.slice(0, 2) : [];
      const chosen = [];
      for (const value of raw) chosen.push(Object.hasOwn(EQUIPMENT, value) && EQUIPMENT[value].hero === id && clean.equipment[value] && !chosen.includes(value) ? value : null);
      clean.heroes[id].slots = [chosen[0] ?? null, chosen[1] ?? null];
    }
    clean.activeHero = Object.hasOwn(HEROES, r.activeHero) ? r.activeHero : 'veer';
    const acknowledged = Array.isArray(r.tutorial?.acknowledged) ? TUTORIAL.map(step => step.id).filter(id => r.tutorial.acknowledged.includes(id)) : [];
    // Saves written before onboarding existed belong to players who are already past it.
    clean.tutorial = { acknowledged, skipped: r.tutorial ? r.tutorial.skipped === true : Number(r.totalRaids) > 0 || Number(r.buildings?.find?.(b => b?.type === 'fort')?.level) > 1 };
    if (r.research && Object.hasOwn(UNITS, r.research.type)) { const type = r.research.type; clean.research = { type, level: Math.min(3, clean.unitLevels[type] + 1), readyAt: finite(r.research.readyAt, now, 0, now + 3600000) }; }
    if (r.ranked && Number.isFinite(r.ranked.weekStart)) { clean.ranked = { weekStart: weekStart(finite(r.ranked.weekStart, now, 0, now)), tier: Math.floor(finite(r.ranked.tier, 0, 0, 5)), attacksUsed: Math.floor(finite(r.ranked.attacksUsed, 0, 0, 6)), score: Math.floor(finite(r.ranked.score, 0, 0, 2400)), history: [], lastReward: null };
      clean.ranked.history = (Array.isArray(r.ranked.history) ? r.ranked.history : []).slice(-6).filter(h => h && Number.isFinite(h.score)).map(h => ({ stars: Math.floor(finite(h.stars, 0, 0, 3)), destruction: Math.floor(finite(h.destruction, 0, 0, 100)), score: Math.floor(finite(h.score, 0, 0, 400)), at: finite(h.at, now, 0, now), opponent: typeof h.opponent === 'string' ? h.opponent.slice(0, 40) : 'Local AI' }));
    }
    if (r.ranked?.lastReward && Number.isFinite(r.ranked.lastReward.weekStart)) { const w = r.ranked.lastReward; clean.ranked.lastReward = { weekStart: finite(w.weekStart, now, 0, now), position: Math.floor(finite(w.position, 10, 1, 10)), gems: Math.floor(finite(w.gems, 0, 0, 30)), previousTier: Math.floor(finite(w.previousTier, 0, 0, 5)), tier: Math.floor(finite(w.tier, 0, 0, 5)), promoted: w.promoted === true, demoted: w.demoted === true }; }
    clean.nextId = Math.floor(finite(r.nextId, 20, 20, 1e9));
    clean.buildings = [];
    const ids = new Set();
    for (const value of r.buildings.slice(0, 150)) {
      if (!value || !Object.hasOwn(CATALOG, value.type)) continue;
      const c = CATALOG[value.type];
      if (clean.buildings.filter(b => b.type === value.type).length >= c.limit || !canPlace(clean, value.type, value.x, value.z).ok) continue;
      const id = typeof value.id === 'string' && /^b\d+$/.test(value.id) && Number.isSafeInteger(Number(value.id.slice(1))) && Number(value.id.slice(1)) < 1e9 && !ids.has(value.id) ? value.id : `b${clean.nextId++}`;
      ids.add(id); clean.nextId = Math.max(clean.nextId, Number(id.slice(1)) + 1);
      const b = createBuilding(id, value.type, value.x, value.z, Math.floor(finite(value.level, 1, 0, MAX_BUILDING_LEVEL)), finite(value.builtAt, now, 0, now));
      b.readyAt = finite(value.readyAt, 0, 0, now + CATALOG[b.type].time * MAX_BUILDING_LEVEL * 1000);
      if (b.level >= MAX_BUILDING_LEVEL) b.readyAt = 0;
      b.upgradingTo = b.readyAt ? Math.min(MAX_BUILDING_LEVEL, b.level + 1) : 0;
      if (!b.readyAt && b.level === 0) b.level = 1;
      b.stored = finite(value.stored, 0, 0, (c.production?.cap || 0) * (c.production?.resource === 'gems' ? 1 : Math.max(1, b.level)));
      clean.buildings.push(b);
    }
    if (!clean.buildings.some(b => b.type === 'fort' && b.level)) return newGame(now);
    // Corrupted saves cannot create extra builders or unbounded queues.
    clean.buildings.filter(b => b.readyAt).slice(clean.builders).forEach(b => { b.readyAt = 0; b.upgradingTo = 0; b.level = Math.max(1, b.level); });
    let heroSlots = Math.max(0, clean.builders - clean.buildings.filter(b => b.readyAt).length);
    for (const h of Object.values(clean.heroes)) if (h.readyAt) { if (heroSlots-- <= 0 || h.level >= 3) { h.readyAt = 0; h.upgradingTo = 0; } else h.upgradingTo = h.level + 1; }
    unlockHeroes(clean);
    if (!clean.heroes[clean.activeHero].level || levelOf(clean, 'hero_hall') < HEROES[clean.activeHero].unlock) clean.activeHero = 'veer';
    const cap = capacity(clean);
    for (const k of currencies) clean.resources[k] = Math.floor(finite(r.resources?.[k], 0, 0, cap.storage[k]));
    const practiceRefund = practiceArmy(r.activeRaid, cap.army);
    let spaces = 0;
    for (const [type, unit] of Object.entries(UNITS)) {
      const count = Math.floor(finite(r.army?.[type], 0, 0, 240)) + Math.floor(finite((practiceRefund || r.activeRaid?.reserve)?.[type], 0, 0, 240));
      clean.army[type] = Math.min(count, Math.floor((cap.army - spaces) / unit.space)); spaces += clean.army[type] * unit.space;
    }
    let queueTime = clean.lastTick;
    clean.training = [];
    for (const q of (Array.isArray(r.training) ? r.training : []).slice(0, 200)) {
      if (!q || !Object.hasOwn(UNITS, q.type) || spaces + UNITS[q.type].space > cap.army) continue;
      queueTime = Math.max(queueTime, finite(q.readyAt, now + UNITS[q.type].time * 1000, 0, now + 60 * 60 * 1000));
      clean.training.push({ id: `q${clean.nextId++}`, type: q.type, readyAt: queueTime }); spaces += UNITS[q.type].space;
    }
    for (const raid of RAIDS) { clean.raidStars[raid.id] = Math.floor(finite(r.raidStars?.[raid.id], 0, 0, 3)); clean.raidWins[raid.id] = Math.floor(finite(r.raidWins?.[raid.id], 0, 0, 1e6)); }
    clean.totalRaids = Math.floor(finite(r.totalRaids, 0, 0, 1e6));
    tickHome(clean, now);
    return clean;
  } catch { return clean; }
}
// Each campaign road has its own authored base. `line`/`ring` build rampart runs; `holes` are gates.
const wallRun = (x1, z1, x2, z2, holes = []) => {
  const cells = [];
  for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++)
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      if (!holes.some(([hx, hz]) => hx === x && hz === z)) cells.push(['wall', x, z]);
  return cells;
};
const wallRing = (x1, z1, x2, z2, holes = []) => [
  ...wallRun(x1, z1, x2, z1, holes), ...wallRun(x1, z2, x2, z2, holes),
  ...wallRun(x1, z1 + 1, x1, z2 - 1, holes), ...wallRun(x2, z1 + 1, x2, z2 - 1, holes),
];
export const LAYOUTS = {
  // An open river station: no ramparts, one tower covering the landing.
  riverbend: () => [
    ['fort', 10, 8], ['granary', 5, 6], ['market', 5, 13], ['farm', 15, 13], ['lumber', 15, 5],
    ['archer_tower', 11, 13, 1.3],
  ],
  // A forest checkpoint: a three-sided pen open to the north, towers set back on the flanks.
  teakpass: () => [
    ['fort', 10, 9], ['granary', 5, 5], ['market', 16, 5], ['farm', 5, 16], ['lumber', 16, 16],
    ['archer_tower', 8, 14], ['archer_tower', 14, 6],
    ...wallRun(9, 13, 14, 13, [[11, 13]]), ...wallRun(9, 9, 9, 12), ...wallRun(14, 9, 14, 12),
  ],
  // A desert compound: one closed ring with staggered gates, stores left outside the wall.
  saltroad: () => [
    ['fort', 10, 9], ['cannon', 8, 8], ['archer_tower', 14, 12], ['archer_tower', 11, 16],
    ['granary', 4, 4], ['market', 17, 4], ['farm', 4, 17], ['lumber', 17, 17],
    ...wallRing(7, 7, 16, 14, [[11, 7], [12, 14]]),
  ],
  // A sealed palace: a full ring with four corner defenses and outer wings on the southern approach.
  lotusgate: () => [
    ['fort', 10, 9], ['cannon', 8, 7], ['cannon', 14, 13], ['archer_tower', 14, 7], ['archer_tower', 8, 13],
    ['granary', 4, 3], ['market', 17, 3], ['farm', 3, 10], ['lumber', 18, 10],
    ...wallRing(7, 6, 16, 15, [[11, 6], [12, 15]]),
    ...wallRun(7, 18, 10, 18), ...wallRun(13, 18, 16, 18), ...wallRun(7, 16, 7, 17), ...wallRun(16, 16, 16, 17),
  ],
  // A hill fort: a tight keep inside overlapping tower fire, with cannons on the approaches.
  amberhill: () => [
    ['fort', 10, 9], ['cannon', 4, 10], ['cannon', 18, 10],
    ['archer_tower', 6, 6], ['archer_tower', 16, 6], ['archer_tower', 6, 16], ['archer_tower', 16, 16],
    ['archer_tower', 11, 5], ['archer_tower', 11, 16],
    ['granary', 3, 4], ['market', 18, 4], ['farm', 3, 17], ['lumber', 18, 17],
    ...wallRing(9, 8, 14, 13, [[11, 8]]),
    ...wallRun(8, 15, 15, 15, [[11, 15], [12, 15]]),
  ],
  // The citadel: two rings with offset gates, defenses in the outer ward and a barracks garrison.
  monsoon: () => [
    ['fort', 10, 9], ['barracks', 5, 12],
    ['cannon', 5, 6], ['cannon', 17, 6], ['cannon', 17, 16],
    ['archer_tower', 6, 10], ['archer_tower', 16, 10], ['archer_tower', 11, 15], ['archer_tower', 11, 3],
    ['granary', 9, 19], ['market', 16, 19], ['farm', 2, 19], ['lumber', 2, 2],
    ...wallRing(8, 7, 15, 14, [[11, 7], [12, 14]]),
    ...wallRing(4, 5, 19, 18, [[11, 5], [12, 5], [8, 18], [9, 18], [4, 11], [4, 12], [19, 8], [19, 9]]),
  ],
};
function enemyBuildings(raid) {
  const d = raid.difficulty, buildings = [];
  const plan = (LAYOUTS[raid.layout] || LAYOUTS[raid.id] || LAYOUTS.riverbend)();
  for (const [type, x, z, scale = 1] of plan) {
    const b = createBuilding(`e${buildings.length}`, type, x, z, Math.min(MAX_BUILDING_LEVEL, Math.ceil(d / 2)));
    b.maxHp = Math.round(CATALOG[type].hp * (0.8 + d * 0.18) * scale); b.hp = b.maxHp; b.attackTimer = 0.4;
    buildings.push(b);
  }
  return buildings;
}
export function createBattle(state, raidId) {
  if (!validState(state)) return fail('Invalid kingdom.');
  const index = RAIDS.findIndex(r => r.id === raidId), raid = RAIDS[index];
  if (!raid) return fail('Choose a campaign destination.');
  if (index > 0 && !(state.raidStars[RAIDS[index - 1].id] > 0)) return fail('Win a star at the previous destination first.');
  return beginBattle(state, raid, 'campaign');
}
function beginBattle(state, raid, kind) {
  if (state.activeRaid) return fail('A raid is already in progress.');
  const selected = state.heroes?.[state.activeHero], heroSpec = HEROES[state.activeHero];
  const hero = selected?.level > 0 && !selected.readyAt && levelOf(state, 'hero_hall') >= heroSpec.unlock ? { id: state.activeHero, name: heroSpec.name, level: selected.level, deployed: false, abilityUsed: false, unitId: null, bonus: heroBonus(state, state.activeHero) } : null;
  if (!Object.entries(state.army).some(([t, n]) => t !== 'healer' && n > 0) && !hero) return fail('Prepare an attacking army or ready a hero first.');
  const id = `raid${state.nextId++}`, reserve = { ...state.army };
  state.army = emptyArmy(); state.activeRaid = { id, raidId: raid.id, kind, reserve, weekStart: state.ranked.weekStart };
  const battle = { id, raidId: raid.id, raid, kind, hero, unitStats: Object.fromEntries(Object.keys(UNITS).map(t => [t, effectiveUnit(state, t)])), buildings: enemyBuildings(raid), units: [], reserve, elapsed: 0, duration: 180, status: 'active', stars: 0, destruction: 0, events: [], eventId: 0, deployed: emptyArmy(), revision: 0, nextUnit: 1, spells: Object.fromEntries(Object.keys(SPELLS).map(id => [id, levelOf(state, 'stepwell') > 0 ? 1 : 0])), spellAreas: [], heroEffects: [], rainUsed: false, rainAvailable: levelOf(state, 'stepwell') > 0, difficulty: raid.difficulty, result: null };
  return { ok: true, battle };
}
function practiceArmy(active, armyCapacity) {
  if (active?.kind !== 'practice' || active.raidId !== 'practice' || typeof active.id !== 'string' || !/^raid\d+$/.test(active.id) || !active.originalArmy || !active.reserve) return null;
  let used = 0;
  for (const [type, unit] of Object.entries(UNITS)) {
    const count = active.originalArmy[type] ?? 0, remaining = active.reserve[type] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > 240 || !Number.isInteger(remaining) || remaining < 0 || remaining > count) return null;
    used += count * unit.space;
  }
  return used <= armyCapacity ? active.originalArmy : null;
}
export function startPractice(state) {
  if (!validState(state)) return fail('Invalid kingdom.');
  if (state.activeRaid) return fail('Finish the active battle first.');
  const layout = { ...state, buildings: [] };
  for (const b of state.buildings.filter(b => b.level > 0)) {
    if (!Object.hasOwn(CATALOG, b.type) || !Number.isInteger(b.level) || b.level > MAX_BUILDING_LEVEL) return fail('Your village contains an invalid building.');
    const check = canPlace(layout, b.type, b.x, b.z); if (!check.ok) return check;
    const stats = buildingStats(b.type, b.level), copy = createBuilding(`practice_${b.id}`, b.type, b.x, b.z, b.level);
    layout.buildings.push({ ...copy, sourceId: b.id, hp: stats.hp, maxHp: stats.hp, damage: stats.damage, attackTimer: 0.4 });
  }
  if (!layout.buildings.some(b => b.type === 'fort')) return fail('A completed Taj Mahal is required to test your village.');
  const result = beginBattle(state, { id: 'practice', name: 'Test your defenses', difficulty: 1, reward: money(), duration: 180 }, 'practice');
  if (result.ok) { state.activeRaid.originalArmy = { ...state.activeRaid.reserve }; result.battle.buildings = layout.buildings; }
  return result;
}
const aliveBuildings = battle => battle.buildings.filter(b => b.hp > 0);
const distanceTo = (u, b) => Math.hypot(Math.max(b.x - u.x, 0, u.x - b.x - (b.w || 0)), Math.max(b.z - u.z, 0, u.z - b.z - (b.h || 0)));
const center = b => ({ x: b.x + (b.w || 0) / 2, z: b.z + (b.h || 0) / 2 });
function blocksUnit(building, unit) { const spec = unit?.spec || UNITS[unit?.type]; return !spec?.flying && !(spec?.burrow && building.type === 'wall'); }
function occupied(battle, x, z, unit) { return aliveBuildings(battle).some(b => blocksUnit(b, unit) && x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.h); }
export function deploy(battle, type, x, z) {
  if (!battle || battle.status !== 'active' || !Object.hasOwn(UNITS, type)) return fail('Choose a troop during an active raid.');
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < 0 || z < 0 || x >= GRID || z >= GRID) return fail('Deploy inside the battlefield.');
  if (x > 3 && x < 21 && z > 3 && z < 21) return fail('Deploy along the outer edge of the battlefield.');
  if (!(battle.reserve[type] > 0)) return fail('No troops of this kind remain.');
  if (occupied(battle, Math.floor(x), Math.floor(z))) return fail('That deployment tile is occupied.');
  const u = battle.unitStats?.[type] || UNITS[type];
  const unit = { id: `u${battle.nextUnit++}`, type, x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5, hp: u.hp, maxHp: u.hp, level: u.level || 1, spec: u, attackTimer: 0, targetId: null, path: [], pathRevision: -1, facing: 0, action: 'walk' };
  battle.reserve[type]--; battle.deployed[type]++; battle.units.push(unit);
  return { ok: true, unit };
}
function event(b, type, target, from) {
  const p = center(target);
  b.events.push({ id: ++b.eventId, type, x: p.x, z: p.z, fromX: from?.x ?? p.x, fromZ: from?.z ?? p.z, targetId: target?.id ?? null, w: target?.w ?? 0, h: target?.h ?? 0 });
  if (b.events.length > 128) b.events.splice(0, b.events.length - 128);
}
function damage(battle, entity, amount, source) {
  if (entity.hp <= 0) return;
  const effects = (battle.heroEffects || []).filter(effect => effect.expiresAt > battle.elapsed);
  if (entity.w && source?.spec) {
    const mark = effects.find(effect => effect.type === 'sky_mark' && effect.targetId === entity.id);
    if (mark) amount *= 1 + mark.bonus;
  }
  if (!entity.w) for (const canopy of effects.filter(effect => effect.type === 'canopy' && effect.remaining > 0 && Math.hypot(entity.x - effect.x, entity.z - effect.z) <= effect.radius)) {
    const absorbed = Math.min(amount, canopy.remaining);
    canopy.remaining -= absorbed; amount -= absorbed;
    if (amount <= 0) break;
  }
  entity.hp = Math.max(0, entity.hp - amount);
  if (entity.hp === 0) { event(battle, 'destroy', entity, source); if (entity.w) battle.revision++; }
}
function pathTo(battle, unit, target, range) {
  const startX = Math.floor(unit.x), startZ = Math.floor(unit.z), start = startZ * GRID + startX;
  const blocked = new Uint8Array(GRID * GRID);
  for (const b of aliveBuildings(battle).filter(b => blocksUnit(b, unit))) for (let z = b.z; z < b.z + b.h; z++) for (let x = b.x; x < b.x + b.w; x++) blocked[z * GRID + x] = 1;
  const previous = new Int16Array(GRID * GRID).fill(-1), queue = [start]; previous[start] = start;
  let destination = -1;
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i], x = n % GRID, z = Math.floor(n / GRID);
    if (!blocked[n] && distanceTo({ x: x + 0.5, z: z + 0.5 }, target) <= range) { destination = n; break; }
    for (const [nx, nz] of [[x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]]) {
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
      const next = nz * GRID + nx;
      if (!blocked[next] && previous[next] === -1) { previous[next] = n; queue.push(next); }
    }
  }
  if (destination < 0) return null;
  const path = [];
  for (let n = destination; n !== start; n = previous[n]) path.push({ x: n % GRID + 0.5, z: Math.floor(n / GRID) + 0.5 });
  return path.reverse();
}
function chooseTarget(battle, unit) {
  let candidates = aliveBuildings(battle);
  const favored = unit.decoy || unit.heroId === 'ayaan' ? candidates.filter(b => CATALOG[b.type].damage) : unit.type === 'engineer' ? candidates.filter(b => b.type === 'wall' || CATALOG[b.type].damage) : unit.type === 'rider' ? candidates.filter(b => CATALOG[b.type].damage) : candidates.filter(b => b.type !== 'wall');
  if (favored.length) candidates = favored;
  candidates.sort((a, b) => distanceTo(unit, a) - distanceTo(unit, b));
  const range = (unit.spec || UNITS[unit.type]).range;
  for (const target of candidates) { const path = pathTo(battle, unit, target, range); if (path !== null) return { target, path }; }
  // Unreachable inner buildings: breach the closest accessible wall instead.
  for (const target of aliveBuildings(battle).filter(b => b.type === 'wall').sort((a, b) => distanceTo(unit, a) - distanceTo(unit, b))) {
    const path = pathTo(battle, unit, target, range); if (path !== null) return { target, path };
  }
  return null;
}
function moveUnit(battle, unit, speed, dt) {
  let remaining = speed * dt;
  while (unit.path.length && remaining > 0) {
    const point = unit.path[0];
    if (occupied(battle, Math.floor(point.x), Math.floor(point.z), unit)) { unit.path = []; unit.pathRevision = -1; return; }
    const dx = point.x - unit.x, dz = point.z - unit.z, distance = Math.hypot(dx, dz);
    unit.facing = Math.atan2(dx, dz);
    if (distance <= remaining) { unit.x = point.x; unit.z = point.z; remaining -= distance; unit.path.shift(); }
    else { unit.x += dx / distance * remaining; unit.z += dz / distance * remaining; remaining = 0; }
  }
}
function updateProgress(battle) {
  const targets = battle.buildings.filter(b => b.type !== 'wall');
  const destroyed = targets.filter(b => b.hp <= 0).length;
  battle.destruction = Math.round(destroyed / targets.length * 100);
  battle.stars = Number(battle.buildings.some(b => b.type === 'fort' && b.hp <= 0)) + Number(destroyed >= targets.length / 2) + Number(destroyed === targets.length);
  const reserveAttackers = (battle.hero && !battle.hero.deployed) || Object.entries(battle.reserve).some(([type, n]) => type !== 'healer' && n > 0);
  const liveAttackers = battle.units.some(u => u.hp > 0 && u.type !== 'healer' && !u.decoy);
  if (destroyed === targets.length || battle.elapsed >= battle.duration || (!reserveAttackers && !liveAttackers)) battle.status = battle.stars > 0 ? 'victory' : 'defeat';
}
export function tickBattle(battle, dt) {
  if (!battle || !Array.isArray(battle.units) || battle.status !== 'active') return fail('No active battle.');
  if (!Number.isFinite(dt) || dt < 0) return fail('Invalid battle time.');
  dt = Math.min(dt, 0.2); battle.elapsed = Math.min(battle.duration, battle.elapsed + dt);
  battle.spellAreas = (battle.spellAreas || []).filter(area => area.expiresAt > battle.elapsed);
  battle.heroEffects = (battle.heroEffects || []).filter(effect => effect.expiresAt > battle.elapsed && (effect.type !== 'canopy' || effect.remaining > 0) && (effect.type !== 'sky_mark' || battle.buildings.some(b => b.id === effect.targetId && b.hp > 0)));
  for (const unit of battle.units) if (unit.decoy && unit.expiresAt <= battle.elapsed) { unit.hp = 0; unit.action = 'idle'; }
  const live = battle.units.filter(u => u.hp > 0);
  for (const unit of live) {
    const spec = unit.spec || UNITS[unit.type]; unit.attackTimer -= dt;
    const raged = battle.spellAreas.some(area => area.type === 'rage' && Math.hypot(unit.x - area.x, unit.z - area.z) <= area.radius);
    const speed = spec.speed * (raged ? 1.3 : 1);
    if (unit.type === 'healer') {
      const ally = live.filter(u => !u.decoy && u.id !== unit.id && u.hp > 0 && u.hp < u.maxHp).sort((a, b) => distanceTo(unit, a) - distanceTo(unit, b))[0];
      if (!ally) { unit.action = 'idle'; continue; }
      if (distanceTo(unit, ally) <= spec.range) {
        unit.action = 'heal'; if (unit.attackTimer <= 0) { ally.hp = Math.min(ally.maxHp, ally.hp + spec.heal); unit.attackTimer = spec.cooldown; event(battle, 'heal', ally, unit); }
      } else { unit.action = 'walk'; unit.path = pathTo(battle, unit, ally, spec.range) || []; moveUnit(battle, unit, speed, dt); }
      continue;
    }
    let target = battle.buildings.find(b => b.id === unit.targetId && b.hp > 0);
    if (!target || unit.pathRevision !== battle.revision) {
      const picked = chooseTarget(battle, unit);
      if (!picked) { unit.action = 'idle'; continue; }
      target = picked.target; unit.targetId = target.id; unit.path = picked.path; unit.pathRevision = battle.revision;
    }
    if (distanceTo(unit, target) <= spec.range + 0.01) {
      unit.action = 'attack'; const c = center(target); unit.facing = Math.atan2(c.x - unit.x, c.z - unit.z);
      if (unit.attackTimer <= 0 && spec.damage > 0) {
        event(battle, unit.heroId === 'nila' ? 'chakram' : unit.heroId === 'ayaan' ? 'falcon_strike' : unit.heroId === 'ira' ? 'water_bolt' : spec.splashRadius ? 'cannon' : spec.range > 2 ? 'arrow' : 'hit', target, unit);
        const amount = spec.damage * (raged ? 1.5 : 1) * (unit.rushUntil > battle.elapsed ? 1.8 : 1) * (unit.type === 'engineer' && target.type === 'wall' ? 3 : 1);
        const impact = { x: Math.max(target.x, Math.min(unit.x, target.x + target.w)), z: Math.max(target.z, Math.min(unit.z, target.z + target.h)) };
        const targets = spec.splashRadius ? aliveBuildings(battle).filter(b => b.id === target.id || distanceTo(impact, b) <= spec.splashRadius) : [target];
        for (const victim of targets) damage(battle, victim, amount, unit);
        unit.attackTimer = spec.cooldown;
      }
    } else { unit.action = 'walk'; moveUnit(battle, unit, speed, dt); }
  }
  for (const b of aliveBuildings(battle)) {
    const spec = CATALOG[b.type]; if (!spec.damage || b.frozenUntil > battle.elapsed) continue;
    b.attackTimer -= dt; if (b.attackTimer > 0) continue;
    const p = center(b), victim = live.filter(u => u.hp > 0 && (b.type !== 'cannon' || !u.spec?.flying) && Math.hypot(u.x - p.x, u.z - p.z) <= spec.range).sort((a, c) => Number(!!c.decoy) - Number(!!a.decoy) || Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0];
    if (!victim) continue;
    const dealt = b.damage ?? spec.damage * (0.9 + battle.difficulty * 0.16);
    event(battle, b.type === 'cannon' ? 'cannon' : 'arrow', victim, p);
    for (const u of live) if (!((b.type === 'cannon') && u.spec?.flying) && (u.id === victim.id || (b.type === 'cannon' && Math.hypot(u.x - victim.x, u.z - victim.z) < 1.5))) damage(battle, u, dealt, p);
    b.attackTimer = spec.cooldown;
  }
  const heroUnit = battle.units.find(u => u.id === battle.hero?.unitId);
  if (heroUnit?.abilityUntil) {
    const active = heroUnit.heroId === 'kabir' ? battle.units.some(u => u.decoy && u.hp > 0 && u.expiresAt > battle.elapsed) : (battle.heroEffects || []).some(e => e.expiresAt > battle.elapsed && (e.type === 'canopy' ? e.remaining > 0 : battle.buildings.some(b => b.id === e.targetId && b.hp > 0)));
    if (!active || heroUnit.hp <= 0) heroUnit.abilityUntil = 0;
  }
  updateProgress(battle);
  return { ok: true, status: battle.status };
}
export function castRain(battle) {
  if (!battle || battle.status !== 'active' || !battle.rainAvailable) return fail('Build a Sacred Stepwell to unlock the blessing.');
  if (battle.rainUsed || battle.spells?.rain === 0) return fail('The monsoon blessing has already been used.');
  if (!battle.units.some(u => u.hp > 0 && u.hp < u.maxHp)) return fail('Wait until your troops need healing.');
  battle.rainUsed = true; if (battle.spells) battle.spells.rain = 0;
  for (const unit of battle.units.filter(u => u.hp > 0)) { unit.hp = Math.min(unit.maxHp, unit.hp + unit.maxHp * 0.4); event(battle, 'heal', unit); }
  return { ok: true };
}
export function finishRaid(state, battle, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now) || !battle || !state.activeRaid || state.activeRaid.id !== battle.id || battle.result) return fail('This raid has already been settled.');
  updateProgress(battle);
  if (battle.status === 'active') battle.status = battle.stars > 0 ? 'victory' : 'defeat';
  const practice = battle.kind === 'practice', rankedBattle = battle.kind === 'ranked', online = battle.kind === 'online', raid = battle.raid || RAIDS.find(r => r.id === battle.raidId);
  if (!raid) return fail('Unknown campaign destination.');
  const previous = rankedBattle || online ? 1 : state.raidStars[raid.id] || 0, won = battle.stars > 0, firstWin = !practice && !rankedBattle && !online && won && previous === 0;
  const multiplier = won && !practice && !online ? battle.stars / 3 * (rankedBattle ? 1 : firstWin ? 1 : 0.3) : 0;
  const reward = Object.fromEntries(currencies.map(k => [k, Math.floor(raid.reward[k] * multiplier)]));
  const cap = capacity(state), received = {}, overflow = {};
  for (const k of currencies) { received[k] = Math.min(reward[k], Math.max(0, cap.storage[k] - state.resources[k])); overflow[k] = reward[k] - received[k]; state.resources[k] += received[k]; }
  let scoreGain = 0;
  if (rankedBattle) {
    getRanked(state, now);
    if (state.activeRaid.weekStart === state.ranked.weekStart) {
      scoreGain = battle.stars * 100 + battle.destruction; state.ranked.score += scoreGain;
      state.ranked.history.push({ stars: battle.stars, destruction: battle.destruction, score: scoreGain, at: now, opponent: raid.name }); state.ranked.history = state.ranked.history.slice(-6);
    }
  } else if (!practice && !online) {
    state.raidStars[raid.id] = Math.max(previous, battle.stars);
    if (won) state.raidWins[raid.id] = (state.raidWins[raid.id] || 0) + 1;
  }
  const gems = firstWin ? award(state, `raid_${raid.id}`, 25) : 0;
  // Ancient Ore only comes from real battles, so equipment tracks how much you actually fight.
  const ore = practice || !won ? 0 : Math.round(battle.stars * (2 + (raid.difficulty || 1)) * (firstWin ? 2 : online ? 1.5 : 1));
  state.ore = Math.min(999999, Math.max(0, Math.floor(state.ore || 0)) + ore);
  const refund = practiceArmy(state.activeRaid, cap.army) || state.activeRaid.reserve;
  for (const type of Object.keys(UNITS)) state.army[type] += refund[type] || 0;
  const opponentId = state.activeRaid.opponentId || null;
  state.activeRaid = null; if (!practice) state.totalRaids++;
  const next = rankedBattle || practice || online ? null : RAIDS[RAIDS.indexOf(raid) + 1];
  battle.result = { ok: true, practice, online, opponentId, opponent: battle.opponent || null, victory: won, stars: battle.stars, destruction: battle.destruction, reward: received, loot: received, overflow, gems, ore, scoreGain, ranked: rankedBattle ? getRanked(state, now) : null, firstWin, title: practice ? 'Defense test complete' : rankedBattle ? 'Royal League result' : online ? (won ? `You broke ${battle.opponent?.name || 'their'} defenses` : 'Their walls held') : won ? 'The valley remembers' : 'Regroup and return', story: online ? `A real player's published village. ${won ? 'Trophies move to you.' : 'Trophies move to them.'} Deployed troops are spent; unused troops and your hero return.` : practice ? 'Friendly practice against your own village. Your full army and hero return safely. No loot, gems or league points are earned.' : rankedBattle ? `Local AI opponent. ${scoreGain} points added to this week's Royal League.` : won ? `${raid.name} is free. ${next ? `Your scouts now chart ${next.region}.` : 'The river flows again. Your kingdom has broken the Iron Regent’s hold.'}` : 'Your undeployed troops return safely. Your hero is ready again. Prepare an army and choose another approach.', nextRaid: won ? next?.id || null : null, deployed: { ...battle.deployed } };
  return battle.result;
}

// Guided onboarding. Each step is derived from observable state, so a step already
// satisfied by an imported or edited save is skipped instead of blocking the player.
export const TUTORIAL = [
  { id: 'welcome', title: 'Your kingdom begins here', body: 'The Taj Mahal, a rice field and the Warrior Akhara are your first settlement. Drag to explore, pinch or scroll to zoom, and tap a building to inspect it.', cta: 'Look around', action: null, acknowledge: true },
  { id: 'collect', title: 'Gather your first harvest', body: 'Your rice field grows grain over time, even while you are away. Collect all gathers the resources stored in every producer.', cta: 'Collect all', action: { type: 'collectAll' }, acknowledge: true },
  { id: 'build', title: 'Build your first Teak Yard', body: 'Wood builds your future village. Place a Teak Yard on open ground to start a steady supply.', cta: 'Build Teak Yard', action: { type: 'selectBuild', value: 'lumber' }, done: s => s.buildings.some(b => b.type === 'lumber') },
  { id: 'market', title: 'Welcome the traders', body: 'A Spice Bazaar brings in coin for new buildings and upgrades. Build it next, then collect its earnings as it fills.', cta: 'Build Spice Bazaar', action: { type: 'selectBuild', value: 'market' }, done: s => s.buildings.some(b => b.type === 'market') },
  { id: 'mine', title: 'Secure your iron supply', body: 'An Iron Quarry supplies metal for defenses and your capital. Together with your fields, yard and bazaar, it completes your resource supply.', cta: 'Build Iron Quarry', action: { type: 'selectBuild', value: 'mine' }, done: s => s.buildings.some(b => b.type === 'mine') },
  { id: 'army', title: 'Prepare your first raiding force', body: 'Your settlement has room for 24 troop spaces. Recruitment is free and instant: Quick fill prepares a balanced force. Build Army Camps later to expand.', cta: 'Open Army', action: { type: 'openPanel', value: 'army' }, done: s => { const c = capacity(s); return s.totalRaids > 0 || c.used >= c.army; } },
  { id: 'attack', title: 'Take the first road', body: 'Scout The River Toll, check its defenses, then send guards ahead of archers from the southern bank. Undeployed troops return; you can recruit replacements for free.', cta: 'Scout the road', action: { type: 'startRaid', value: () => RAIDS[0].id }, done: s => s.totalRaids > 0 },
  { id: 'defend', title: 'Build your first Watchtower', body: 'Your village is growing. Add a Watchtower to protect it, then use Test defenses to try your layout safely.', cta: 'Build Watchtower', action: { type: 'selectBuild', value: 'archer_tower' }, done: s => s.buildings.some(b => b.type === 'archer_tower') },
  { id: 'hero', title: 'Make room for a champion', body: 'Build the Hall of Heroes to unlock Veer. He joins your raids and returns after every battle.', cta: 'Build Hall of Heroes', action: { type: 'selectBuild', value: 'hero_hall' }, done: s => levelOf(s, 'hero_hall') >= 1 },
  { id: 'capital', title: 'Grow beyond your first settlement', body: 'Collect resources and raid to fund the Taj Mahal upgrade. Level two opens stronger defenses and lets you upgrade your Akhara for new troops.', cta: 'Review the upgrade', action: { type: 'openUpgrade', value: s => s.buildings.find(b => b.type === 'fort')?.id }, done: s => levelOf(s, 'fort') >= 2 || s.buildings.some(b => b.type === 'fort' && b.readyAt) },
];
const tutorialDone = (state, step) => step.acknowledge ? state.tutorial.acknowledged.includes(step.id) : step.done(state);
export const tutorialIds = () => TUTORIAL.map(step => step.id);
export function tutorialState(state) {
  if (!validState(state)) return null;
  state.tutorial ||= { acknowledged: [], skipped: false };
  if (state.tutorial.skipped) return null;
  const index = TUTORIAL.findIndex(step => !tutorialDone(state, step));
  if (index < 0) return null;
  const step = TUTORIAL[index], action = step.action ? { type: step.action.type, value: typeof step.action.value === 'function' ? step.action.value(state) : step.action.value } : null;
  return { id: step.id, index, number: index + 1, total: TUTORIAL.length, title: step.title, body: step.body, cta: step.cta, action, acknowledge: !!step.acknowledge };
}
export function acknowledgeTutorial(state, id) {
  const current = tutorialState(state);
  if (!current || current.id !== id) return fail('That lesson is not the current step.');
  if (!state.tutorial.acknowledged.includes(id)) state.tutorial.acknowledged.push(id);
  return { ok: true, next: tutorialState(state) };
}
export function skipTutorial(state) {
  if (!validState(state)) return fail('Invalid kingdom.');
  state.tutorial ||= { acknowledged: [], skipped: false };
  state.tutorial.skipped = true;
  return { ok: true };
}

// Preparing troops is free and instant; permanent improvements are researched.
for (const unit of Object.values(UNITS)) { unit.cost = money(); unit.time = 0; }
export const HEROES = {
  veer: { name: 'Veer the Gatekeeper', shortName: 'Veer', title: 'Gatekeeper', role: 'Frontline', description: 'Battle Cry restores 40% health and boosts Veer’s damage for eight seconds.', type: 'guard', unlock: 1, hp: 1000, damage: 65, range: 1.1, speed: 2.2, cooldown: 0.95, ability: 'Battle Cry' },
  tara: { name: 'Captain Tara', shortName: 'Tara', title: 'Monsoon Ranger', role: 'Ranged burst', description: 'Arrowstorm strikes up to four structures within eight cells.', type: 'archer', unlock: 2, hp: 520, damage: 76, range: 5.5, speed: 2.8, cooldown: 0.85, ability: 'Arrowstorm' },
  nila: { name: 'Nila the Chakram Duelist', shortName: 'Nila', title: 'Chakram Duelist', role: 'Precision', description: 'Twin Arc ricochets between three nearby structures. Each bounce travels up to four cells and deals slightly less damage. Get within seven cells to strike.', type: 'archer', unlock: 3, hp: 650, damage: 68, range: 2.8, speed: 3.3, cooldown: 0.8, ability: 'Twin Arc' },
  ayaan: { name: 'Ayaan the Falcon Warden', shortName: 'Ayaan', title: 'Falcon Warden', role: 'Defense hunter', description: 'Sky Mark tags the nearest defense within eight cells. Your entire army deals 35% extra damage to that defense for ten seconds.', type: 'archer', unlock: 4, hp: 720, damage: 58, range: 4.6, speed: 2.8, cooldown: 1, ability: 'Sky Mark' },
  ira: { name: 'Ira the Rainkeeper', shortName: 'Ira', title: 'Rainkeeper', role: 'Protection', description: 'Monsoon Canopy shelters allies within four cells of its casting point for eight seconds. Its shared shield absorbs 650 damage at hero level one; upgrades strengthen it.', type: 'archer', unlock: 5, hp: 800, damage: 28, range: 3.6, speed: 2.3, cooldown: 1.15, ability: 'Monsoon Canopy' },
  kabir: { name: 'Kabir the Siege Artisan', shortName: 'Kabir', title: 'Siege Artisan', role: 'Deception', description: 'Clockwork Decoys releases two wheeled shields that draw defense fire for ten seconds. Decoys deal no damage and can be destroyed. Kabir deals triple damage to walls.', type: 'engineer', unlock: 6, hp: 920, damage: 42, range: 1.3, speed: 2.1, cooldown: 1, ability: 'Clockwork Decoys' },
};
function unlockHeroes(state) {
  const hall = levelOf(state, 'hero_hall'); let changed = false;
  state.heroes ||= {};
  for (const [id, spec] of Object.entries(HEROES)) {
    if (!state.heroes[id]) { state.heroes[id] = { level: 0, readyAt: 0, upgradingTo: 0, slots: [null, null] }; changed = true; }
    if (hall >= spec.unlock && !state.heroes[id].level) { state.heroes[id].level = 1; changed = true; }
  }
  return changed;
}
export const MAX_EQUIPMENT_LEVEL = 5;
// Hero equipment. Forged and improved with Ancient Ore, which is only won in battle.
// Upgrades are instant and never occupy a builder; two slots per hero, the second
// unlocked by the Hall of Heroes.
export const EQUIPMENT = {
  talwar: { name: 'Sunsteel Talwar', hero: 'veer', description: 'A folded blade that bites deeper with every reforging.', unlock: 1, forge: 40, effects: { damage: 0.12 } },
  bulwark: { name: 'Bulwark of Surajgarh', hero: 'veer', description: 'A layered shield that lets Veer hold a breach alone.', unlock: 2, forge: 60, effects: { hp: 0.14 } },
  drum: { name: 'Campaign War Drum', hero: 'veer', description: 'Battle Cry restores more health and drives Veer harder, for longer.', unlock: 3, forge: 90, effects: { abilityPower: 0.18, abilityDuration: 1.2 } },
  longbow: { name: 'Kalinga Longbow', hero: 'tara', description: 'A tall bow that reaches further and strikes harder.', unlock: 1, forge: 40, effects: { damage: 0.11, range: 0.2 } },
  quiver: { name: 'Monsoon Quiver', hero: 'tara', description: 'Oiled leather and a lighter guard keep Tara standing under fire.', unlock: 2, forge: 60, effects: { hp: 0.15 } },
  hawk: { name: 'Hunting Hawk', hero: 'tara', description: 'Arrowstorm marks additional structures across a wider sweep.', unlock: 3, forge: 90, effects: { abilityTargets: 0.5, abilityRange: 0.8 } },
  chakrams: { name: 'Sunedge Chakrams', hero: 'nila', description: 'Honed ring blades strengthen every throw.', unlock: 3, forge: 45, effects: { damage: 0.1 } },
  silkstep: { name: 'Silkstep Bracers', hero: 'nila', description: 'Twin Arc gains one additional ricochet per forging level.', unlock: 3, forge: 70, effects: { abilityTargets: 1, hp: 0.05 } },
  falcon_crest: { name: 'Falcon Crest', hero: 'ayaan', description: 'A trained falcon keeps its target marked longer.', unlock: 4, forge: 50, effects: { abilityDuration: 1.2, damage: 0.06 } },
  scout_lens: { name: 'Amber Scout Lens', hero: 'ayaan', description: 'Spot distant defenses and strengthen the army’s damage bonus.', unlock: 4, forge: 75, effects: { abilityRange: 0.5, abilityPower: 0.12 } },
  rain_vessel: { name: 'Copper Rain Vessel', hero: 'ira', description: 'Stores more protective water for the canopy.', unlock: 5, forge: 50, effects: { abilityPower: 0.15, hp: 0.05 } },
  canopy_silk: { name: 'Monsoon Silk', hero: 'ira', description: 'A broader, longer-lasting protective canopy.', unlock: 5, forge: 75, effects: { abilityDuration: 1, abilityRange: 0.25 } },
  winding_key: { name: 'Master Winding Key', hero: 'kabir', description: 'Stronger springs give both decoys more endurance.', unlock: 6, forge: 55, effects: { abilityPower: 0.15, abilityDuration: 0.8 } },
  siege_mallet: { name: 'Siege Mallet', hero: 'kabir', description: 'A reinforced mallet for opening stubborn ramparts.', unlock: 6, forge: 75, effects: { damage: 0.12, hp: 0.06 } },
};
const SLOT_UNLOCK = [1, 3];
const EQUIPMENT_BASE = 26;
const NO_BONUS = { hp: 0, damage: 0, range: 0, abilityPower: 0, abilityTargets: 0, abilityDuration: 0, abilityRange: 0, items: [] };
const equipmentCost = level => ({ ore: Math.round(EQUIPMENT_BASE * level * (1 + level * 0.35)) });
const ownedLevel = (state, itemId) => Math.max(0, Math.min(MAX_EQUIPMENT_LEVEL, Math.floor(state.equipment?.[itemId]?.level || 0)));
export function heroSlots(state, id) {
  const hero = state.heroes?.[id];
  const slots = Array.isArray(hero?.slots) ? hero.slots.slice(0, 2) : [null, null];
  while (slots.length < 2) slots.push(null);
  const hall = levelOf(state, 'hero_hall');
  return slots.map((itemId, index) => {
    const spec = Object.hasOwn(EQUIPMENT, itemId) ? EQUIPMENT[itemId] : null;
    const unlocked = hall >= SLOT_UNLOCK[index];
    return { index, itemId: spec && spec.hero === id && ownedLevel(state, itemId) > 0 && unlocked ? itemId : null, unlocked, requires: SLOT_UNLOCK[index] };
  });
}
// Sums the effects of everything a hero actually has equipped in an unlocked slot.
export function heroBonus(state, id) {
  const bonus = { ...NO_BONUS, items: [] };
  if (!validState(state) || !Object.hasOwn(HEROES, id)) return bonus;
  for (const slot of heroSlots(state, id)) {
    if (!slot.itemId) continue;
    const spec = EQUIPMENT[slot.itemId], level = ownedLevel(state, slot.itemId);
    bonus.items.push({ id: slot.itemId, level, name: spec.name });
    for (const [key, value] of Object.entries(spec.effects)) bonus[key] += value * level;
  }
  return bonus;
}
export function equipmentInfo(state, itemId) {
  if (!validState(state) || !Object.hasOwn(EQUIPMENT, itemId)) return { ok: false, reason: 'Unknown equipment.' };
  const spec = EQUIPMENT[itemId], level = ownedLevel(state, itemId), owned = level > 0;
  const nextLevel = Math.min(MAX_EQUIPMENT_LEVEL, level + 1);
  const cost = owned ? equipmentCost(nextLevel) : { ore: spec.forge };
  const hall = levelOf(state, 'hero_hall'), heroLevel = state.heroes?.[spec.hero]?.level || 0;
  const ore = Math.max(0, Math.floor(state.ore || 0));
  const reason = state.activeRaid ? 'Finish your raid first.' : hall < spec.unlock ? `Hall of Heroes level ${spec.unlock} required.` : !heroLevel ? `${HEROES[spec.hero].name} is not in your hall yet.` : level >= MAX_EQUIPMENT_LEVEL ? 'This equipment is fully forged.' : ore < cost.ore ? `Win battles for ${cost.ore - ore} more ore.` : '';
  const effectsAt = n => Object.fromEntries(Object.entries(spec.effects).map(([key, value]) => [key, value * n]));
  const equipped = heroSlots(state, spec.hero).some(slot => slot.itemId === itemId);
  return { ok: true, id: itemId, spec, hero: spec.hero, heroName: HEROES[spec.hero].name, level, owned, equipped, nextLevel, cost, ore, current: effectsAt(level), next: effectsAt(nextLevel), canUpgrade: !reason, reason, unlocked: hall >= spec.unlock };
}
export function forgeEquipment(state, itemId) {
  const info = equipmentInfo(state, itemId);
  if (!info.ok) return fail(info.reason);
  if (!info.canUpgrade) return fail(info.reason);
  state.equipment ||= {};
  state.ore = Math.max(0, Math.floor(state.ore || 0)) - info.cost.ore;
  state.equipment[itemId] = { level: info.nextLevel };
  // A newly forged piece goes straight into a free unlocked slot so it is never idle.
  if (!info.owned) {
    const slots = heroSlots(state, info.hero), free = slots.find(slot => slot.unlocked && !slot.itemId);
    if (free) equipItem(state, info.hero, free.index, itemId);
  }
  return { ok: true, id: itemId, level: info.nextLevel, spent: info.cost.ore, forged: !info.owned };
}
export function equipItem(state, heroId, slotIndex, itemId) {
  if (!validState(state) || !Object.hasOwn(HEROES, heroId)) return fail('Choose a hero.');
  if (state.activeRaid) return fail('Change equipment before starting a raid.');
  const index = Number(slotIndex);
  if (![0, 1].includes(index)) return fail('Choose an equipment slot.');
  const slots = heroSlots(state, heroId);
  if (!slots[index].unlocked) return fail(`Hall of Heroes level ${SLOT_UNLOCK[index]} unlocks this slot.`);
  const hero = state.heroes[heroId];
  if (!Array.isArray(hero.slots) || hero.slots.length !== 2) hero.slots = [slots[0].itemId, slots[1].itemId];
  if (itemId === null || itemId === undefined || itemId === '') { hero.slots[index] = null; return { ok: true, slots: heroSlots(state, heroId) }; }
  if (!Object.hasOwn(EQUIPMENT, itemId)) return fail('Unknown equipment.');
  if (EQUIPMENT[itemId].hero !== heroId) return fail(`${EQUIPMENT[itemId].name} belongs to ${HEROES[EQUIPMENT[itemId].hero].name}.`);
  if (ownedLevel(state, itemId) < 1) return fail('Forge this equipment first.');
  const other = index === 0 ? 1 : 0;
  if (hero.slots[other] === itemId) hero.slots[other] = null;
  hero.slots[index] = itemId;
  return { ok: true, slots: heroSlots(state, heroId) };
}
export function equipmentRoster(state, heroId) {
  return Object.keys(EQUIPMENT).filter(id => EQUIPMENT[id].hero === heroId).map(id => equipmentInfo(state, id));
}
export const LEAGUES = ['Copper', 'Bronze', 'Silver', 'Gold', 'Peacock', 'Maharaja'];
const WEEK = 7 * 24 * 60 * 60 * 1000;
const weekStart = now => Math.floor((now - 4 * 86400000) / WEEK) * WEEK + 4 * 86400000;
function freshRanked(now, tier = 0) { return { weekStart: weekStart(now), tier, attacksUsed: 0, score: 0, history: [], lastReward: null }; }
function award(state, id, gems) {
  state.achievements ||= {};
  if (state.achievements[id]) return 0;
  state.achievements[id] = true;
  const received = Math.min(gems, 999999 - state.gems); state.gems += received;
  return received;
}
function buildingStats(type, level) {
  const c = CATALOG[type];
  return { hp: Math.round(c.hp * (1 + Math.max(0, level - 1) * 0.35)), damage: c.damage ? Math.round(c.damage * (1 + Math.max(0, level - 1) * 0.3)) : 0, production: c.production ? c.production.rate * level : 0, capacity: type === 'camp' ? campHousing(level) : type === 'granary' ? 2000 * level : c.production ? c.production.cap * (type === 'gem_mine' ? 1 : level) : 0 };
}
export function upgradeInfo(state, id) {
  const b = validState(state) && state.buildings.find(b => b.id === id);
  if (!b) return { ok: false, canUpgrade: false, reason: 'Building not found.' };
  const c = CATALOG[b.type], nextLevel = Math.min(MAX_BUILDING_LEVEL, b.level + 1), cost = upgradeCost(b), cap = capacity(state);
  const current = buildingStats(b.type, b.level), next = buildingStats(b.type, nextLevel);
  let capacityNote = '';
  if (b.type === 'camp') {
    current.capacity = cap.army;
    const otherHousing = 24 + state.buildings.filter(other => other.type === 'camp' && other.id !== b.id).reduce((total, camp) => total + campHousing(camp.level), 0);
    next.capacity = Math.min(MAX_ARMY_SPACE, otherHousing + campHousing(nextLevel));
    capacityNote = current.capacity === MAX_ARMY_SPACE ? 'Army capacity is capped at 240. This upgrade improves camp durability only.' : `Army capacity grows by ${next.capacity - current.capacity} spaces; maximum 240.`;
  }
  const requires = (b.type === 'fort' ? 'A free builder and the displayed resources.' : `Taj Mahal level ${nextLevel} and a free builder.`) + (capacityNote ? ` ${capacityNote}` : '');
  const reason = state.activeRaid ? 'Finish your raid first.' : b.readyAt ? 'This building is already under construction.' : b.level >= MAX_BUILDING_LEVEL ? 'Maximum building level 15 reached.' : b.type !== 'fort' && b.level >= levelOf(state, 'fort') ? `Upgrade Taj Mahal to level ${nextLevel} first.` : cap.busy >= cap.builders ? 'All builders are busy.' : !affordable(state, cost) ? `Missing resources: ${currencies.filter(k => state.resources[k] < cost[k]).map(k => `${cost[k] - state.resources[k]} ${k}`).join(', ')}.` : '';
  const unlocks = b.type === 'fort' ? nextLevel === 2 ? 'Thunder Cannon; building level 2' : `Building level ${nextLevel}` : b.type === 'barracks' ? nextLevel === 2 ? 'Maratha Rider, Stone Bowler and Tunnel Miner' : nextLevel === 3 ? 'Elephant Rider, Himalayan Yeti, Garuda Rider and Monsoon Healer' : 'Improved building durability; all troop types already unlocked' : b.type === 'hero_hall' ? Object.values(HEROES).filter(hero => hero.unlock === nextLevel).map(hero => hero.name).join(', ') || 'Improved building durability; heroes remain capped at level 3' : b.type === 'laboratory' && nextLevel > 3 ? 'Improved building durability; troop research remains capped at level 3' : '';
  return { ok: true, id, type: b.type, level: b.level, nextLevel, current, next, cost, duration: b.type === 'wall' ? 0 : c.time * (b.level + 1), requires, canUpgrade: !reason, reason, freeBuilders: cap.builders - cap.busy, unlocks, capacityNote, capacityLabel: b.type === 'camp' ? 'Total army capacity' : 'Capacity' };
}
export function placeWallLine(state, x1, z1, x2, z2, now = Date.now()) {
  if (!validState(state) || ![x1, z1, x2, z2].every(Number.isInteger) || !Number.isFinite(now)) return fail('Choose valid wall tiles.');
  if (x1 !== x2 && z1 !== z2) return fail('Wall lines must be horizontal or vertical.');
  const count = Math.abs(x2 - x1) + Math.abs(z2 - z1) + 1;
  if (count > 24) return fail('Place no more than 24 wall segments at a time.');
  tickHome(state, now);
  if (state.activeRaid) return fail('Finish your raid before building.');
  const cap = capacity(state);
  if (cap.busy >= cap.builders) return fail('A free builder is required for walls.');
  if (state.buildings.filter(b => b.type === 'wall').length + count > CATALOG.wall.limit) return fail('Your kingdom can hold up to 100 wall segments.');
  const cells = Array.from({ length: count }, (_, i) => [x1 + Math.sign(x2 - x1) * i, z1 + Math.sign(z2 - z1) * i]);
  for (const [x, z] of cells) { const check = canPlace(state, 'wall', x, z); if (!check.ok) return check; }
  const cost = Object.fromEntries(currencies.map(k => [k, CATALOG.wall.cost[k] * count]));
  if (!affordable(state, cost)) return fail('Gather enough resources for the entire wall line.');
  charge(state, cost);
  const buildings = cells.map(([x, z]) => createBuilding(`b${state.nextId++}`, 'wall', x, z, 1, now));
  state.buildings.push(...buildings);
  return { ok: true, buildings, building: buildings[0], count, cost };
}
export function effectiveUnit(state, type) {
  if (!Object.hasOwn(UNITS, type)) return null;
  const u = UNITS[type], level = Math.max(1, Math.min(3, state?.unitLevels?.[type] || 1)), boost = 1 + (level - 1) * 0.2;
  return { ...u, level, hp: Math.round(u.hp * boost), damage: Math.round(u.damage * boost), heal: u.heal ? Math.round(u.heal * boost) : 0 };
}
export function researchInfo(state, type) {
  if (!validState(state) || !Object.hasOwn(UNITS, type)) return { ok: false, canResearch: false, reason: 'Choose a troop.' };
  const level = state.unitLevels[type], nextLevel = Math.min(3, level + 1), cost = money(150 * nextLevel, 180 * nextLevel, 0, 25 * nextLevel), duration = 45 * nextLevel;
  const limit = Math.min(levelOf(state, 'laboratory'), levelOf(state, 'fort'));
  const reason = state.activeRaid ? 'Finish your raid first.' : state.research ? 'The Royal Workshop is already researching.' : level >= 3 ? 'Maximum troop level reached.' : levelOf(state, 'barracks') < UNITS[type].unlock ? `Warrior Akhara level ${UNITS[type].unlock} required.` : nextLevel > limit ? `Royal Workshop and Taj Mahal level ${nextLevel} required.` : !affordable(state, cost) ? 'Gather more resources for research.' : '';
  return { ok: true, type, level, nextLevel, cost, duration, current: effectiveUnit(state, type), next: effectiveUnit({ unitLevels: { [type]: nextLevel } }, type), canResearch: !reason, reason, requires: `Royal Workshop and Taj Mahal level ${nextLevel}.` };
}
export function researchTroop(state, type, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  tickHome(state, now);
  const info = researchInfo(state, type); if (!info.canResearch) return fail(info.reason);
  charge(state, info.cost); state.research = { type, level: info.nextLevel, readyAt: now + info.duration * 1000 };
  return { ok: true, research: state.research };
}
function heroStats(spec, level, bonus) {
  const boost = level > 0 ? 1 + (level - 1) * 0.25 : 0;
  return { hp: Math.round(spec.hp * boost * (1 + (bonus?.hp || 0))), damage: Math.round(spec.damage * boost * (1 + (bonus?.damage || 0))) };
}
export function heroInfo(state, id) {
  if (!validState(state) || !Object.hasOwn(HEROES, id)) return { ok: false, canUpgrade: false, reason: 'Choose a hero.' };
  const h = state.heroes[id], spec = HEROES[id], nextLevel = Math.min(3, h.level + 1), cost = money(220 * nextLevel, 240 * nextLevel, 0, 40 * nextLevel), duration = 55 * nextLevel;
  const reason = state.activeRaid ? 'Finish your raid first.' : levelOf(state, 'hero_hall') < spec.unlock || !h.level ? `Hall of Heroes level ${spec.unlock} required.` : h.readyAt ? 'This hero is already upgrading.' : h.level >= 3 ? 'Maximum hero level reached.' : nextLevel > levelOf(state, 'hero_hall') ? `Hall of Heroes level ${nextLevel} required.` : capacity(state).busy >= capacity(state).builders ? 'All builders are busy.' : !affordable(state, cost) ? 'Gather more resources for this hero.' : '';
  const bonus = heroBonus(state, id);
  return { ok: true, id, ...h, nextLevel, cost, duration, spec, bonus, slots: heroSlots(state, id), base: heroStats(spec, h.level), current: heroStats(spec, h.level, bonus), next: heroStats(spec, nextLevel, bonus), canUpgrade: !reason, reason, unlocked: h.level > 0 && levelOf(state, 'hero_hall') >= spec.unlock, available: h.level > 0 && !h.readyAt && levelOf(state, 'hero_hall') >= spec.unlock };
}
export function selectHero(state, id) {
  const info = heroInfo(state, id);
  if (!info.ok || !info.unlocked) return fail(info.reason || 'Hero is locked.');
  if (state.activeRaid) return fail('Choose your hero before starting a raid.');
  state.activeHero = id; return { ok: true, id };
}
export function upgradeHero(state, id, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  tickHome(state, now);
  const info = heroInfo(state, id); if (!info.canUpgrade) return fail(info.reason);
  charge(state, info.cost); state.heroes[id].upgradingTo = info.nextLevel; state.heroes[id].readyAt = now + info.duration * 1000;
  return { ok: true, hero: state.heroes[id] };
}
export function finishCost(state, kind, id, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  const item = kind === 'building' ? state.buildings.find(b => b.id === id) : kind === 'research' && state.research?.type === id ? state.research : kind === 'hero' && Object.hasOwn(HEROES, id) ? state.heroes[id] : null;
  if (!item?.readyAt || item.readyAt <= now) return fail('There is no unfinished timer to complete.');
  const remaining = Math.ceil((item.readyAt - now) / 1000), cost = Math.max(1, Math.ceil(remaining / 12));
  return { ok: true, kind, id, remaining, readyAt: item.readyAt, cost };
}
export function finishWithGems(state, kind, id, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  tickHome(state, now);
  const info = finishCost(state, kind, id, now); if (!info.ok) return info;
  if (state.gems < info.cost) return fail(`You need ${info.cost} gems to finish this timer.`);
  state.gems -= info.cost;
  if (kind === 'building') { const b = state.buildings.find(b => b.id === id); const wasUpgrade = b.level > 0; b.level = b.upgradingTo; b.readyAt = 0; b.upgradingTo = 0; if (wasUpgrade) award(state, 'first_upgrade', 10); if (b.type === 'hero_hall') unlockHeroes(state); }
  if (kind === 'research') { state.unitLevels[id] = state.research.level; state.research = null; award(state, 'first_research', 15); }
  if (kind === 'hero') { const h = state.heroes[id]; h.level = h.upgradingTo; h.readyAt = 0; h.upgradingTo = 0; }
  return { ok: true, spent: info.cost, cost: info.cost };
}
export function buyBuilder(state) {
  if (!validState(state)) return fail('Invalid kingdom.');
  if (state.activeRaid) return fail('Return to your village first.');
  const cost = state.builders === 2 ? 100 : state.builders === 3 ? 200 : null;
  if (cost === null) return fail('You already have all four builders.');
  if (state.gems < cost) return fail(`You need ${cost} gems for this builder.`);
  state.gems -= cost; state.builders++; return { ok: true, cost, builders: state.builders };
}
export function deployHero(battle, x, z) {
  if (!battle || battle.status !== 'active' || !battle.hero) return fail('No hero is ready for this battle.');
  if (battle.hero.deployed) return fail('Your hero has already been deployed.');
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < 0 || z < 0 || x >= GRID || z >= GRID || (x > 3 && x < 21 && z > 3 && z < 21) || occupied(battle, Math.floor(x), Math.floor(z))) return fail('Deploy your hero on an open outer-edge tile.');
  const hero = battle.hero, base = HEROES[hero.id], bonus = hero.bonus || NO_BONUS;
  const spec = { ...UNITS[base.type], ...base, ...heroStats(base, hero.level, bonus), range: base.range + (bonus.range || 0) };
  const unit = { id: `hero_${hero.id}`, heroId: hero.id, type: base.type, x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5, level: hero.level, spec, hp: spec.hp, maxHp: spec.hp, attackTimer: 0, targetId: null, path: [], pathRevision: -1, facing: 0, action: 'walk', rushUntil: 0 };
  hero.deployed = true; hero.unitId = unit.id; battle.units.push(unit);
  return { ok: true, unit };
}
export function heroAbility(battle) {
  if (!battle || battle.status !== 'active' || !battle.hero?.deployed || battle.hero.abilityUsed) return fail('Deploy a living hero with an unused ability.');
  const unit = battle.units.find(u => u.id === battle.hero.unitId && u.hp > 0);
  if (!unit) return fail('Your hero has been defeated.');
  const bonus = battle.hero.bonus || NO_BONUS, power = 1 + (bonus.abilityPower || 0);
  if (unit.heroId === 'veer') { unit.hp = Math.min(unit.maxHp, unit.hp + unit.maxHp * 0.4 * power); unit.rushUntil = battle.elapsed + 8 + (bonus.abilityDuration || 0); event(battle, 'heal', unit); }
  else if (unit.heroId === 'tara') {
    const reach = 8 + (bonus.abilityRange || 0), count = 4 + Math.floor(bonus.abilityTargets || 0);
    const targets = aliveBuildings(battle).filter(b => distanceTo(unit, b) <= reach).sort((a, b) => distanceTo(unit, a) - distanceTo(unit, b)).slice(0, count);
    if (!targets.length) return fail(`Move Tara within ${Math.round(reach)} cells of a structure.`);
    for (const target of targets) { event(battle, 'arrow', target, unit); damage(battle, target, unit.spec.damage * 3.5 * power, unit); }
  }
  else if (unit.heroId === 'nila') {
    const reach = 7 + (bonus.abilityRange || 0), count = 3 + Math.floor(bonus.abilityTargets || 0);
    const candidates = aliveBuildings(battle).filter(b => b.type !== 'wall');
    let from = unit, radius = reach; const targets = [];
    for (let i = 0; i < count; i++) {
      const target = candidates.filter(b => !targets.includes(b) && distanceTo(from, b) <= radius).sort((a, b) => distanceTo(from, a) - distanceTo(from, b))[0];
      if (!target) break;
      targets.push(target); from = center(target); radius = 4;
    }
    if (!targets.length) return fail(`Move Nila within ${Math.round(reach)} cells of a structure.`);
    from = unit;
    targets.forEach((target, i) => { event(battle, 'chakram', target, from); damage(battle, target, unit.spec.damage * 2.6 * power * Math.pow(0.82, i), unit); from = center(target); });
  }
  else if (unit.heroId === 'ayaan') {
    const reach = 8 + (bonus.abilityRange || 0);
    const target = aliveBuildings(battle).filter(b => CATALOG[b.type].damage && distanceTo(unit, b) <= reach).sort((a, b) => distanceTo(unit, a) - distanceTo(unit, b))[0];
    if (!target) return fail(`Move Ayaan within ${Math.round(reach)} cells of an enemy defense.`);
    const expiresAt = battle.elapsed + 10 + (bonus.abilityDuration || 0);
    (battle.heroEffects ||= []).push({ id: ++battle.eventId, type: 'sky_mark', ...center(target), radius: 1.5, targetId: target.id, bonus: 0.35 * power, expiresAt });
    unit.abilityUntil = expiresAt; event(battle, 'sky_mark', target, unit);
  }
  else if (unit.heroId === 'ira') {
    const expiresAt = battle.elapsed + 8 + (bonus.abilityDuration || 0), absorption = Math.round(650 * (1 + (unit.level - 1) * 0.25) * power);
    (battle.heroEffects ||= []).push({ id: ++battle.eventId, type: 'canopy', x: unit.x, z: unit.z, radius: 4 + (bonus.abilityRange || 0), remaining: absorption, maxAbsorb: absorption, expiresAt });
    unit.abilityUntil = expiresAt; event(battle, 'canopy', unit);
  }
  else if (unit.heroId === 'kabir') {
    const cells = [];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const x = Math.floor(unit.x) + dx, z = Math.floor(unit.z) + dz;
      if ((dx || dz) && x >= 0 && z >= 0 && x < GRID && z < GRID && !occupied(battle, x, z) && !battle.units.some(u => u.hp > 0 && Math.hypot(u.x - x - 0.5, u.z - z - 0.5) < 0.6)) cells.push({ x: x + 0.5, z: z + 0.5 });
    }
    const defenses = aliveBuildings(battle).filter(b => CATALOG[b.type].damage);
    const nearest = defenses.sort((a, b) => distanceTo(unit, a) - distanceTo(unit, b))[0];
    cells.sort((a, b) => nearest ? distanceTo(a, nearest) - distanceTo(b, nearest) : Math.hypot(a.x - unit.x, a.z - unit.z) - Math.hypot(b.x - unit.x, b.z - unit.z));
    if (cells.length < 2) return fail('Move Kabir to an open space to release both decoys.');
    const expiresAt = battle.elapsed + 10 + (bonus.abilityDuration || 0), hp = Math.round(260 * (1 + (unit.level - 1) * 0.25) * power);
    for (const cell of cells.slice(0, 2)) battle.units.push({ id: `decoy${battle.nextUnit++}`, type: 'guard', decoy: true, heroOwner: 'kabir', ...cell, expiresAt, level: unit.level, hp, maxHp: hp, spec: { ...UNITS.guard, hp, damage: 0, speed: 2.5, range: 0.85 }, attackTimer: 0, targetId: null, path: [], pathRevision: -1, facing: unit.facing, action: 'walk' });
    unit.abilityUntil = expiresAt; event(battle, 'deploy', unit);
  }
  else return fail('This hero has no battle ability.');
  battle.hero.abilityUsed = true; updateProgress(battle);
  return { ok: true, ability: HEROES[unit.heroId].ability };
}
const aiNames = ['Amber Falcons', 'Teak Wardens', 'Lotus Company', 'Deccan Shields', 'River Sentinels', 'Copper Caravan', 'Saffron Guard', 'Jade Outriders', 'Monsoon Guild'];
function rankedEntries(state) {
  const r = state.ranked, seed = Math.floor(r.weekStart / WEEK) + r.tier * 97;
  const entries = aiNames.map((name, i) => ({ id: `ai${i}`, name, ai: true, isPlayer: false, score: 200 + ((seed * 97 + i * 313) % 1700 + 1700) % 1700 }));
  entries.push({ id: 'player', name: state.name, ai: false, isPlayer: true, score: r.score });
  return entries.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map((entry, i) => ({ ...entry, position: i + 1 }));
}
export function getRanked(state, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return { ok: false, reason: 'Invalid league state.' };
  state.ranked ||= freshRanked(now);
  if (weekStart(now) > state.ranked.weekStart) {
    const old = state.ranked, position = rankedEntries(state).find(e => e.isPlayer).position;
    const tier = old.attacksUsed ? Math.max(0, Math.min(5, old.tier + (position <= 3 ? 1 : position >= 8 ? -1 : 0))) : old.tier;
    const gems = old.attacksUsed ? Math.min(999999 - state.gems, position <= 3 ? 30 : position <= 7 ? 15 : 5) : 0;
    state.gems += gems; state.ranked = freshRanked(now, tier);
    state.ranked.lastReward = { weekStart: old.weekStart, position, gems, previousTier: old.tier, tier, promoted: tier > old.tier, demoted: tier < old.tier };
  }
  const r = state.ranked, entries = rankedEntries(state);
  return { ok: true, league: LEAGUES[r.tier], tier: r.tier, attacksUsed: r.attacksUsed, attacksTotal: 6, score: r.score, position: entries.find(e => e.isPlayer).position, entries, endsAt: r.weekStart + WEEK, weekStart: r.weekStart, history: r.history, lastReward: r.lastReward, label: 'Royal League · Local AI opponents' };
}
export function startRanked(state, now = Date.now()) {
  if (!validState(state) || !Number.isFinite(now)) return fail('Invalid kingdom or time.');
  if (state.activeRaid) return fail('Finish the active raid first.');
  const league = getRanked(state, now);
  if (league.attacksUsed >= 6) return fail('All six weekly Royal League attacks have been used.');
  const difficulty = Math.min(6, 1 + league.tier + Math.floor(league.attacksUsed / 3));
  const raid = { ...RAIDS[difficulty - 1], id: `ranked_${state.ranked.weekStart}_${league.attacksUsed}`, name: `${aiNames[(league.attacksUsed + league.tier) % aiNames.length]} · AI`, difficulty, reward: money(300 + difficulty * 100, 250 + difficulty * 80, 200 + difficulty * 65, 60 + difficulty * 30) };
  const result = beginBattle(state, raid, 'ranked');
  if (result.ok) state.ranked.attacksUsed++;
  return result;
}

// --- Online play -----------------------------------------------------------------
// A published base is a plain list of completed structures. Nothing else about the
// kingdom (resources, army, gems, save data) ever leaves the device.
export function publishableLayout(state) {
  if (!validState(state)) return fail('Invalid kingdom.');
  const layout = state.buildings
    .filter(b => b.level > 0 && Object.hasOwn(CATALOG, b.type))
    .map(b => ({ type: b.type, x: b.x, z: b.z, level: Math.min(MAX_BUILDING_LEVEL, b.level) }));
  if (!layout.some(b => b.type === 'fort')) return fail('A completed Taj Mahal is required before publishing.');
  if (layout.length > 150) return fail('This village has too many structures to publish.');
  return { ok: true, layout, tajLevel: levelOf(state, 'fort'), structures: layout.length };
}
// A downloaded base is written by another player, so it is treated as untrusted input
// and rebuilt from scratch here. Anything that fails a check is rejected outright
// rather than repaired, so a malformed base can never reach the battle simulation.
export function validateLayout(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 150) return fail('That village layout is not valid.');
  const board = { buildings: [], resources: money(), army: emptyArmy(), training: [] }, counts = {};
  const buildings = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') return fail('That village layout is not valid.');
    const { type } = value;
    if (!Object.hasOwn(CATALOG, type)) return fail('That village layout contains an unknown structure.');
    const level = Number(value.level), x = Number(value.x), z = Number(value.z);
    if (!Number.isInteger(level) || level < 1 || level > MAX_BUILDING_LEVEL) return fail('That village layout has an invalid building level.');
    if (!Number.isInteger(x) || !Number.isInteger(z)) return fail('That village layout has an invalid position.');
    const c = CATALOG[type];
    if (x < 0 || z < 0 || x + c.w > GRID || z + c.h > GRID) return fail('That village layout does not fit the battlefield.');
    counts[type] = (counts[type] || 0) + 1;
    if (counts[type] > c.limit) return fail('That village layout exceeds a building limit.');
    if (!canPlace(board, type, x, z).ok) return fail('That village layout overlaps itself.');
    const stats = buildingStats(type, level), b = createBuilding(`o${buildings.length}`, type, x, z, level);
    board.buildings.push(b);
    buildings.push({ ...b, hp: stats.hp, maxHp: stats.hp, damage: stats.damage, attackTimer: 0.4 });
  }
  if (!buildings.some(b => b.type === 'fort')) return fail('That village has no capital to attack.');
  return { ok: true, buildings };
}
export function startOnlineRaid(state, opponent) {
  if (!validState(state)) return fail('Invalid kingdom.');
  if (state.activeRaid) return fail('Finish the active battle first.');
  if (!opponent?.player_id) return fail('Choose an opponent first.');
  const layout = validateLayout(opponent.layout);
  if (!layout.ok) return layout;
  const name = String(opponent.name ?? 'Rival kingdom').slice(0, 28) || 'Rival kingdom';
  const difficulty = Math.max(1, Math.min(6, Math.ceil((Number(opponent.taj_level) || 1) / 2.5)));
  const raid = { id: `online_${opponent.player_id}`, layout: null, name, region: 'Online kingdom', difficulty, reward: money(), duration: 180 };
  const result = beginBattle(state, raid, 'online');
  if (result.ok) {
    result.battle.buildings = layout.buildings;
    result.battle.opponent = { id: opponent.player_id, name, trophies: Number(opponent.trophies) || 0, tajLevel: Number(opponent.taj_level) || 1 };
    state.activeRaid.opponentId = opponent.player_id;
  }
  return result;
}

export const SPELLS = {
  rain: { name: 'Monsoon Blessing', description: 'Restore 40% maximum health to every living deployed troop and hero.', charges: 1, targeted: false, radius: 0, duration: 0 },
  lightning: { name: 'Thunderbolt', description: 'Strike buildings within 2.5 cells for 350 damage.', charges: 1, targeted: true, radius: 2.5, damage: 350, duration: 0 },
  freeze: { name: 'Himalayan Frost', description: 'Freeze defenses within three cells for six seconds.', charges: 1, targeted: true, radius: 3, duration: 6 },
  rage: { name: 'Warrior Spirit', description: 'A three-cell aura grants 50% more damage and 30% more speed for eight seconds.', charges: 1, targeted: true, radius: 3, duration: 8 },
};
export function castSpell(battle, id, x, z) {
  if (!battle || battle.status !== 'active' || !Object.hasOwn(SPELLS, id)) return fail('Choose a spell during an active battle.');
  if (id === 'rain') return castRain(battle);
  if (!(battle.spells?.[id] > 0)) return fail('This spell has no remaining charge. Build a Sacred Stepwell to prepare spells.');
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < 0 || z < 0 || x >= GRID || z >= GRID) return fail('Choose a ground target inside the battlefield.');
  const spell = SPELLS[id], targets = aliveBuildings(battle).filter(b => distanceTo({ x, z }, b) <= spell.radius);
  if (id === 'lightning' && !targets.length) return fail('Aim Thunderbolt near an enemy building.');
  if (id === 'freeze' && !targets.some(b => CATALOG[b.type].damage)) return fail('Aim Himalayan Frost near an enemy defense.');
  battle.spells[id]--;
  if (id === 'lightning') for (const b of targets) damage(battle, b, spell.damage, { x, z });
  if (id === 'freeze') for (const b of targets) if (CATALOG[b.type].damage) b.frozenUntil = battle.elapsed + spell.duration;
  if (spell.duration) battle.spellAreas.push({ id: `spell${battle.eventId + 1}`, type: id, x, z, radius: spell.radius, expiresAt: battle.elapsed + spell.duration });
  event(battle, id, { x, z }); updateProgress(battle);
  return { ok: true, spell: id, remaining: battle.spells[id] };
}
