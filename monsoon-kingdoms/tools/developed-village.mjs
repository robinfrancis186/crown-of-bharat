import { newGame, CATALOG } from '../src/rules.js';

// A developed village for tests of systems earned after onboarding.
export function developedVillage(now = Date.now()) {
  const state = newGame(now);
  const positions = [['fort', 10, 9], ['farm', 5, 15], ['lumber', 16, 15], ['mine', 17, 5], ['granary', 5, 5], ['stepwell', 5, 10], ['barracks', 10, 16], ['camp', 15, 10], ['archer_tower', 10, 5], ['market', 10, 1], ['laboratory', 1, 5], ['hero_hall', 1, 10], ['gem_mine', 18, 1]];
  // Leave one-cell courtyards and open gates around the original village buildings.
  for (const x of [8, 9, 10, 13, 14, 15]) positions.push(['wall', x, 7], ['wall', x, 14]);
  for (const z of [8, 9, 12, 13]) positions.push(['wall', 8, z]);
  for (const z of [8, 9, 13]) positions.push(['wall', 15, z]);
  state.buildings = positions.map(([type,x,z], i) => ({ id: `b${i+1}`, type, x,z,w:CATALOG[type].w,h:CATALOG[type].h,level:1,builtAt:now,readyAt:0,upgradingTo:0,stored:0 }));
  state.resources = { coin:1900,grain:1500,wood:1600,iron:700 };
  state.army = {...state.army,guard:16,archer:12,engineer:2};
  state.nextId = positions.length + 1;
  return state;
}
