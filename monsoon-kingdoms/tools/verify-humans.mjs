import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { UNITS, HEROES } from '../src/rules.js';
import { LOOKS } from '../src/humans.js';

// Realistic characters: every troop and hero is dressed from the sculpted sources, every clip a look
// asks for exists, mounts carry real animation and seat bones, and the download stays in budget.
const glb = async file => { const b = await readFile(new URL(`../assets/characters/${file}.glb`, import.meta.url)); assert.equal(b.toString('ascii', 0, 4), 'glTF'); return JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12))); };
const male = await glb('human_male'), female = await glb('human_female'), horse = await glb('horse'), elephant = await glb('war_elephant');
const clips = new Set(male.animations.map(a => a.name));
for (const id of [...Object.keys(UNITS), ...Object.keys(HEROES)]) assert.ok(LOOKS[id], `${id} has a realistic look`);
for (const name of ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Hit_Chest', 'Death01', 'Dance_Loop', 'Driving_Loop']) assert.ok(clips.has(name), `shared clip ${name}`);
for (const [id, look] of Object.entries(LOOKS)) {
  for (const clip of [look.clips?.idle, look.clips?.walk, look.clips?.run, look.clips?.attack?.[0]].filter(Boolean)) assert.ok(clips.has(clip), `${id} uses a real clip: ${clip}`);
  const hit = look.clips?.attack?.[1]; if (hit != null) assert.ok(hit > 0 && hit < 1, `${id} strike lands inside its clip`);
  if (look.mount) { assert.ok(LOOKS[look.rider], `${id} rider exists`); if (look.howdah) assert.ok(LOOKS[look.howdah]); }
}
for (const [name, json] of [['male', male], ['female', female]]) {
  const bones = new Set(json.nodes.map(n => n.name));
  for (const bone of ['pelvis', 'spine_03', 'Head', 'hand_r', 'hand_l', 'thigh_l', 'thigh_r']) assert.ok(bones.has(bone), `${name} skeleton has ${bone}`);
  assert.ok(json.skins?.length && json.images?.length, `${name} is skinned and textured`);
}
for (const [name, json, seats] of [['horse', horse, ['prop_rider']], ['elephant', elephant, ['prop-rider', 'prop-rider2']]]) {
  assert.deepEqual(json.animations.map(a => a.name).sort(), ['Attack', 'Death', 'Idle', 'Run', 'Walk'], `${name} clip set`);
  assert.ok(json.animations.every(a => a.channels.length > 50), `${name} clips actually move the skeleton`);
  for (const seat of seats) assert.ok(json.nodes.some(n => n.name === seat), `${name} seat ${seat}`);
}
let bytes = 0; for (const f of ['human_male', 'human_female', 'horse', 'war_elephant']) bytes += (await stat(new URL(`../assets/characters/${f}.glb`, import.meta.url))).size;
assert.ok(bytes < 8 * 1048576, `character download ${(bytes / 1048576).toFixed(2)} MiB stays under 8 MiB`);
const credits = await readFile(new URL('../assets/characters/CREDITS.md', import.meta.url), 'utf8');
assert.match(credits, /Quaternius/); assert.match(credits, /CC BY-SA 3\.0/); assert.match(credits, /Wildfire Games/);
const view = await readFile(new URL('../src/view.js', import.meta.url), 'utf8');
assert.match(view, /this\.quality!=='low'&&this\.humans\?\.has\(id\)\?this\.humans:this\.forge/, 'the view fields realistic characters above Low quality and falls back to the stylised forge');
console.log(`PASS: ${Object.keys(LOOKS).length} realistic looks cover every troop and hero; ${clips.size} motion clips back every role; horse and elephant animate with seat bones; ${(bytes / 1048576).toFixed(2)} MiB of character sources, credited.`);
