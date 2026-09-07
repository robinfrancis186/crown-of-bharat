import assert from 'node:assert/strict';
import {newGame,MAX_BUILDING_LEVEL} from '../src/rules.js';
import {SAVE,decodeSave,loadSave,storeSave,encodeSave} from '../src/storage.js';
const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
const s=newGame();s.name='Backup test';storeSave(storage,s);s.name='Second version';storeSave(storage,s);
assert.equal(decodeSave(encodeSave(s)).name,s.name);data.set(SAVE,'broken');assert.equal(loadSave(storage).state.name,'Backup test');assert.equal(loadSave(storage).recovered,true);
assert.throws(()=>decodeSave('{"version":1,"buildings":[]}'));assert.throws(()=>decodeSave('x'.repeat(2_000_001)));
const invalid=newGame();invalid.buildings[1].x=invalid.buildings[0].x;invalid.buildings[1].z=invalid.buildings[0].z;assert.throws(()=>decodeSave(JSON.stringify(invalid)));
assert.equal(loadSave({getItem(){throw Error('Disabled');}}).available,false);
for(let level=1;level<=MAX_BUILDING_LEVEL;level++){const tier=newGame();for(const b of tier.buildings)b.level=level;const restored=decodeSave(encodeSave(tier));assert.ok(restored.buildings.every(b=>b.level===level), `Level ${level} import changed village`);}
const tooHigh=newGame();tooHigh.buildings[0].level=MAX_BUILDING_LEVEL+1;assert.throws(()=>decodeSave(encodeSave(tooHigh)),/invalid village/);
console.log('Save roundtrip, all building levels 1–15, level16 rejection, backup recovery, layout validation, size limit and disabled storage pass.');
