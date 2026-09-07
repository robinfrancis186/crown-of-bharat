// Deterministic worst-case army-space benchmark; no user save is read or changed.
import assert from 'node:assert/strict';
import * as R from '../src/rules.js';
const state=R.newGame();
state.buildings.forEach(b=>b.level=15);
for(let n=0;n<2;n++){
  let placed=false;
  for(let z=0;z<22&&!placed;z++)for(let x=0;x<22&&!placed;x++)if(R.canPlace(state,'camp',x,z).ok){state.buildings.push({id:`benchmark-camp-${n}`,type:'camp',x,z,w:3,h:3,level:15,readyAt:0,upgradingTo:0,stored:0});placed=true;}
  assert.ok(placed);
}
state.army=Object.fromEntries(Object.keys(R.UNITS).map(type=>[type,type==='guard'?240:0]));
assert.equal(R.capacity(state).army,240);
const result=R.startPractice(state);assert.ok(result.ok,result.reason);const battle=result.battle;
for(let i=0;i<240;i++){const deployment=R.deploy(battle,'guard',.5,3.5+(i%18));assert.ok(deployment.ok,deployment.reason);}
assert.equal(battle.units.length,240);
const ticks=[];
for(let i=0;i<300&&battle.status==='active';i++){const start=performance.now();R.tickBattle(battle,1/30);ticks.push(performance.now()-start);}
ticks.sort((a,b)=>a-b);
assert.ok(battle.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.z)&&Number.isFinite(u.hp)));
console.log(JSON.stringify({scenario:'240 Talwar Guards versus level15 practice village',ticks:ticks.length,simulatedSeconds:battle.elapsed,medianTickMs:ticks[Math.floor(ticks.length*.5)],p95TickMs:ticks[Math.floor(ticks.length*.95)],maxTickMs:ticks.at(-1),remainingUnits:battle.units.filter(u=>u.hp>0).length},null,2));
